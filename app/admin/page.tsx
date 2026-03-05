import { prisma } from "@/lib/prisma"
import { DashboardClient } from "@/components/DashboardClient"

export const dynamic = "force-dynamic"
import { startOfMonth, subMonths, endOfMonth, differenceInDays } from "date-fns"
import fs from "fs"
import path from "path"

import { exportDbToJson } from "@/lib/dbBackup"
import { uploadToDrive } from "@/lib/googleDrive"

async function checkAndPerformAutoBackup() {
  try {
    const backupDir = path.join(process.cwd(), "backups")

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }

    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith("auto-backup-") && f.endsWith(".json"))
      .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time)

    const lastBackupTime = files.length > 0 ? files[0].time : 0
    const now = new Date()
    const hoursSinceLastBackup = (now.getTime() - lastBackupTime) / (1000 * 60 * 60)

    // Run every 24 hours
    if (hoursSinceLastBackup >= 24 || files.length === 0) {
      const data = await exportDbToJson()
      const timestamp = now.toISOString().replace(/[:.]/g, "-")
      const filename = `auto-backup-${timestamp}.json`
      const backupPath = path.join(backupDir, filename)

      fs.writeFileSync(backupPath, JSON.stringify(data, null, 2))
      console.log(`Auto-backup created: ${filename}`)

      // Sync to Google Drive
      try {
        await uploadToDrive(backupPath, filename)
        console.log(`Auto-backup synced to Drive: ${filename}`)
      } catch (driveErr) {
        console.error("Auto-backup Drive sync failed", driveErr)
      }

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
  console.log("ADMIN DASHBOARD: Starting page fetch...");
  // Fire and forget the auto-backup so it doesn't block page load
  checkAndPerformAutoBackup().catch(console.error);

  // Get general statistics
  let totalEvents = 0;
  let totalPlayers = 0;
  let totalUnpaidCount = 0;
  let totalPaidCount = 0;
  let totalPendingReports = 0;

  try {
    const counts = await Promise.all([
      prisma.event.count().catch(e => { console.error("Event count error:", e); throw e; }),
      prisma.player.count().catch(e => { console.error("Player count error:", e); throw e; }),
      prisma.eventPlayer.count({
        where: {
          paymentStatus: {
            in: ["UNPAID", "PARTIALLY_PAID"],
          },
        },
      }).catch(e => { console.error("EventPlayer count error:", e); throw e; }),
      prisma.eventPlayer.count({
        where: {
          paymentStatus: "FULLY_PAID",
        },
      }).catch(e => { console.error("Paid EventPlayer count error:", e); throw e; }),
      prisma.errorReport.count({
        where: {
          status: "pending",
        },
      }).catch(e => { console.error("ErrorReport count error:", e); throw e; }),
    ])
    totalEvents = counts[0];
    totalPlayers = counts[1];
    totalUnpaidCount = counts[2];
    totalPaidCount = counts[3];
    totalPendingReports = counts[4];
    console.log("ADMIN DASHBOARD: Counts fetched successfully");
  } catch (err: any) {
    console.error("CRITICAL DASHBOARD DATA ERROR:", err);
    // Return a fallback UI or throw to show the next error boundary
    throw new Error(`Dashboard data fetch failed: ${err.message || "Unknown error"}`);
  }
  console.log("ADMIN DASHBOARD: Counts fetched successfully");

  // Calculate accurate unpaid amount by summing individual event players' remaining balances
  console.log("ADMIN DASHBOARD: Fetching eventPlayersWithDebt...");
  const eventPlayersWithDebt = await (prisma.eventPlayer as any).findMany({
    where: {
      paymentStatus: {
        in: ["UNPAID", "PARTIALLY_PAID"],
      },
    },
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
  const monthsDataPromises = []
  for (let i = 11; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(new Date(), i))
    const monthEnd = endOfMonth(monthStart)
    const monthLabel = monthStart.toLocaleString('default', { month: 'short', year: '2-digit' })

    const incomePromise = (prisma.payment as any).aggregate({
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

    const expensesPromise = (prisma.payment as any).aggregate({
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

    monthsDataPromises.push(Promise.all([incomePromise, expensesPromise]).then(([income, expenses]) => ({
      label: monthLabel,
      income: (income as any)._sum.amount || 0,
      expenses: (expenses as any)._sum.amount || 0,
    })))
  }

  const monthlyData = await Promise.all(monthsDataPromises)
  const overpaidPlayers = await prisma.player.findMany({
    where: {
      overpaymentDismissed: false,
      payments: {
        some: {} // Only fetch players who actually made payments
      }
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
  const budgets = await prisma.budget.findMany({
    where: { year: currentYear }
  })

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

  const yearlyBudget = await prisma.yearlyBudget.findUnique({
    where: { year: currentYear }
  })
  const yearlyTotalBudget = yearlyBudget?.totalAmount || 0

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
