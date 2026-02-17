import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const month = parseInt(searchParams.get("month") || new Date().getMonth().toString())
        const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString())

        // Date range for the selected month
        const startDate = new Date(year, month, 1)
        const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999)

        // Fetch income payments for the month
        const incomePayments = await prisma.payment.findMany({
            where: {
                type: "INCOME",
                paymentDate: { gte: startDate, lte: endDate },
            },
            include: { player: true },
            orderBy: { paymentDate: "asc" },
        })

        // Fetch expense payments for the month
        const expensePayments = await prisma.payment.findMany({
            where: {
                type: "EXPENSE",
                paymentDate: { gte: startDate, lte: endDate },
            },
            include: { player: true },
            orderBy: { paymentDate: "asc" },
        })

        // Fetch budget data for the year
        const budgets = await prisma.budget.findMany({
            where: { year },
        })

        // Calculate actual spending per category for the year so far
        const budgetData = await Promise.all(
            budgets.map(async (b) => {
                const actual = await prisma.payment.aggregate({
                    where: {
                        type: "EXPENSE",
                        category: b.category,
                        paymentDate: {
                            gte: new Date(year, 0, 1),
                            lte: new Date(year, 11, 31, 23, 59, 59, 999),
                        },
                    },
                    _sum: { amount: true },
                })
                return {
                    category: b.category,
                    budget: b.amount,
                    actual: actual._sum.amount || 0,
                }
            })
        )

        // Outstanding receivables - players with unpaid event fees
        const players = await prisma.player.findMany({
            include: {
                eventPlayers: {
                    include: {
                        event: true,
                        paymentEvents: true,
                    },
                },
            },
        })

        const outstandingReceivables = players
            .map((player) => {
                const totalFees = player.eventPlayers.reduce((s, ep) => s + ep.fee, 0)
                const totalPaid = player.eventPlayers.reduce(
                    (s, ep) => s + ep.paymentEvents.reduce((ps, pe) => ps + pe.amount, 0),
                    0
                )
                const outstanding = totalFees - totalPaid
                return {
                    playerName: player.fullName,
                    totalFees,
                    totalPaid,
                    outstanding,
                }
            })
            .filter((r) => r.outstanding > 0)
            .sort((a, b) => b.outstanding - a.outstanding)

        return NextResponse.json({
            incomePayments,
            expensePayments,
            budgetData,
            outstandingReceivables,
        })
    } catch (error) {
        console.error("Accountant report error:", error)
        return NextResponse.json({ error: "Failed to generate report data" }, { status: 500 })
    }
}
