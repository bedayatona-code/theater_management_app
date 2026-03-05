import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const yearStr = searchParams.get("year")
    const year = yearStr ? parseInt(yearStr) : new Date().getFullYear()

    // Fetch category budgets
    const budgets = await prisma.budget.findMany({
        where: { year },
        orderBy: { category: "asc" }
    })

    // Fetch yearly total budget (from yearly_budgets table)
    const yearlyBudget = await prisma.yearlyBudget.findUnique({
        where: { year }
    })

    // Fetch actual expenses for the year grouped by category
    // We use Prisma's groupBy which is cleaner than raw SQL for this
    const expenseAggregates = await prisma.payment.groupBy({
        by: ['category'],
        where: {
            type: 'EXPENSE',
            paymentDate: {
                gte: new Date(year, 0, 1),
                lte: new Date(year, 11, 31)
            }
        },
        _sum: {
            amount: true
        }
    })

    // Create a map of category -> actual amount
    const actualsMap: Record<string, number> = {}
    expenseAggregates.forEach(agg => {
        if (agg.category) {
            actualsMap[agg.category] = agg._sum.amount || 0
        }
    })

    // Merge actuals into budgets
    const budgetsWithActuals = (budgets as any[]).map(b => ({
        ...b,
        actual: actualsMap[b.category] || 0
    }))

    return NextResponse.json({
        budgets: budgetsWithActuals,
        yearlyTotal: yearlyBudget?.totalAmount || 0
    })
}

export async function POST(request: NextRequest) {
    const body = await request.json()
    const { year, category, amount, type } = body

    if (!year) {
        return NextResponse.json({ error: "Year is required" }, { status: 400 })
    }

    const yearInt = parseInt(year)
    const amountFloat = parseFloat(amount)

    try {
        if (type === "yearlyTotal") {
            await prisma.yearlyBudget.upsert({
                where: { year: yearInt },
                update: {
                    totalAmount: amountFloat,
                    updatedAt: new Date()
                },
                create: {
                    year: yearInt,
                    totalAmount: amountFloat
                }
            })
            return NextResponse.json({ success: true })
        }

        if (!category) {
            return NextResponse.json({ error: "Category is required" }, { status: 400 })
        }

        await prisma.budget.upsert({
            where: {
                year_category: {
                    year: yearInt,
                    category: category
                }
            },
            update: {
                amount: amountFloat,
                updatedAt: new Date()
            },
            create: {
                year: yearInt,
                category: category,
                amount: amountFloat
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Budget update failed", error)
        return NextResponse.json({ error: "Failed to update budget" }, { status: 500 })
    }
}
