import { prisma } from "@/lib/prisma"
import { DashboardClient } from "@/components/DashboardClient"
import { startOfMonth, subMonths, endOfMonth, differenceInDays } from "date-fns"
import fs from "fs"
import path from "path"

async function checkAndPerformAutoBackup() {
  try {
    const backupDir = path.join(process.cwd(), "backups")
    const dbPath = path.join(process.cwd(), "prisma", "dev.db")

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }

    const files = fs.readdirSync(backupDir)
      .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time)

    const lastBackupTime = files.length > 0 ? files[0].time : 0
    const daysSinceLastBackup = differenceInDays(new Date(), new Date(lastBackupTime))

    if (daysSinceLastBackup >= 7 || files.length === 0) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
      const filename = `auto-backup-${timestamp}.db`
      fs.copyFileSync(dbPath, path.join(backupDir, filename))
      console.log(`Auto-backup created: ${filename}`)

      // Keep only 10
      if (files.length >= 10) {
        files.slice(9).forEach(f => {
          try { fs.unlinkSync(path.join(backupDir, f.name)) } catch (e) { }
        })
      }
    }
  } catch (err) {
    console.error("Auto-backup failed", err)
  }
}

export default async function AdminDashboard() {
  await checkAndPerformAutoBackup()
  // Get general statistics
  const [totalEvents, totalPlayers, totalUnpaidCount, totalPaidCount, totalPendingReports] = await Promise.all([
    prisma.event.count(),
    prisma.player.count(),
    prisma.eventPlayer.count({
      where: {
        paymentStatus: {
          in: ["UNPAID", "PARTIALLY_PAID"],
        },
      },
    }),
    prisma.eventPlayer.count({
      where: {
        paymentStatus: "FULLY_PAID",
      },
    }),
    prisma.errorReport.count({
      where: {
        status: "pending",
      },
    }),
  ])

  // Calculate accurate unpaid amount by summing individual event players' remaining balances
  const eventPlayersWithDebt = await (prisma.eventPlayer as any).findMany({
    include: {
      paymentEvents: true,
    }
  })

  let actualUnpaidAmount = 0
  for (const ep of eventPlayersWithDebt) {
    const paid = ((ep as any).paymentEvents || []).reduce((sum: number, pe: any) => sum + pe.amount, 0)
    if (ep.fee > paid) {
      actualUnpaidAmount += (ep.fee - paid)
    }
  }

  const paidAmountAgg = await (prisma.payment as any).aggregate({
    _sum: {
      amount: true,
    },
  })

  const totalPaidAmount = (paidAmountAgg as any)._sum.amount || 0

  // Fetch monthly data for the last 12 months
  const monthlyData = []
  for (let i = 11; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(new Date(), i))
    const monthEnd = endOfMonth(monthStart)
    const monthLabel = monthStart.toLocaleString('default', { month: 'short', year: '2-digit' })

    const income = await (prisma.payment as any).aggregate({
      where: {
        type: "INCOME",
        paymentDate: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      _sum: {
        amount: true,
      },
    })

    const expenses = await (prisma.payment as any).aggregate({
      where: {
        type: "EXPENSE",
        paymentDate: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      _sum: {
        amount: true,
      },
    })

    monthlyData.push({
      label: monthLabel,
      income: (income as any)._sum.amount || 0,
      expenses: (expenses as any)._sum.amount || 0,
    })
  }

  const overpaidPlayers = await prisma.player.findMany({
    where: {
      overpaymentDismissed: false,
    },
    include: {
      eventPlayers: {
        select: {
          fee: true,
        }
      },
      payments: { // Wait, model is Payment, but relation is 'payments'
        select: {
          amount: true
        }
      }
    }
  } as any)

  const overpaidList = overpaidPlayers.filter(p => {
    const totalFees = (p as any).eventPlayers.reduce((sum: number, ep: any) => sum + ep.fee, 0)
    const totalPaid = ((p as any).payments || []).reduce((sum: number, pay: any) => sum + pay.amount, 0)
    return totalPaid > totalFees
  }).map(p => {
    const totalFees = (p as any).eventPlayers.reduce((sum: number, ep: any) => sum + ep.fee, 0)
    const totalPaid = ((p as any).payments || []).reduce((sum: number, pay: any) => sum + pay.amount, 0)
    return {
      id: p.id,
      name: (p as any).fullName,
      overpaidAmount: totalPaid - totalFees
    }
  })

  // Fetch category-based budget vs actual for the current year
  const currentYear = new Date().getFullYear()
  // Use raw query because prisma.budget might not be generated yet in the client
  const budgets: any[] = await prisma.$queryRaw`SELECT * FROM budgets WHERE year = ${currentYear}`

  // Use Prisma Client for consistent text encoding/decoding of Hebrew categories
  const yearPayments = await prisma.payment.findMany({
    where: {
      type: "EXPENSE",
      paymentDate: {
        gte: new Date(currentYear, 0, 1),
        lte: new Date(currentYear, 11, 31),
      }
    },
    select: {
      amount: true,
      category: true
    }
  })

  const recognizedCategories = [
    "מנהל אומנותי",
    "אמנים ושחקנים",
    "אחזקת אולם פעילות",
    "דלק ואחזקת רכב",
    "ציוד עזר ותפאורה",
    "צרכי סדנאות",
    "משרדיות",
    "הנהלת חשבונות",
    "פרסום וקידום מכירות",
    "כיבודים"
  ];

  const categoryActuals: Record<string, number> = {}
  yearPayments.forEach((p: any) => {
    let cat = p.category;
    // Normalize synonyms
    if (cat === "מנהלת אומנותית") cat = "מנהל אומנותי";

    // Check if category is recognized
    if (cat && recognizedCategories.includes(cat)) {
      categoryActuals[cat] = (categoryActuals[cat] || 0) + p.amount
    }
  })

  // Map budgets and deduplicate by normalized category
  const normalizedBudgets: Record<string, number> = {};
  budgets.forEach((b: any) => {
    let cat = b.category;
    if (cat === "מנהלת אומנותית") cat = "מנהל אומנותי";

    if (recognizedCategories.includes(cat)) {
      normalizedBudgets[cat] = (normalizedBudgets[cat] || 0) + b.amount;
    }
  });

  const budgetData = recognizedCategories.map(cat => ({
    category: cat,
    budget: normalizedBudgets[cat] || 0,
    actual: categoryActuals[cat] || 0
  })).filter(b => b.budget > 0 || b.actual > 0);

  const yearlyBudgets: any[] = await prisma.$queryRaw`SELECT totalAmount FROM yearly_budgets WHERE year = ${currentYear} LIMIT 1`
  const yearlyTotalBudget = yearlyBudgets[0]?.totalAmount || 0

  const stats = {
    totalEvents,
    totalPlayers,
    totalUnpaid: totalUnpaidCount,
    totalPaid: totalPaidCount,
    unpaidAmount: actualUnpaidAmount,
    paidAmount: totalPaidAmount,
    monthlyData,
    overpaidList,
    pendingReportsCount: totalPendingReports,
    budgetData,
    yearlyTotalBudget,
    pieData: {
      paid: totalPaidAmount,
      unpaid: actualUnpaidAmount,
    }
  }

  return <DashboardClient stats={stats} />
}
