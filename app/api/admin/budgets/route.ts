import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const yearStr = searchParams.get("year")
    const year = yearStr ? parseInt(yearStr) : new Date().getFullYear()

    // Fetch category budgets
    const budgets = await prisma.$queryRaw`
        SELECT * FROM budgets 
        WHERE year = ${year}
        ORDER BY category ASC
    `

    // Fetch yearly total budget (from yearly_budgets table)
    const yearlyTotalRes: any[] = await prisma.$queryRaw`
        SELECT totalAmount FROM yearly_budgets 
        WHERE year = ${year}
        LIMIT 1
    `

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
        yearlyTotal: yearlyTotalRes[0]?.totalAmount || 0
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
            const existing: any[] = await prisma.$queryRaw`
                SELECT id FROM yearly_budgets WHERE year = ${yearInt}
            `
            if (existing.length > 0) {
                await prisma.$executeRaw`
                    UPDATE yearly_budgets SET totalAmount = ${amountFloat}, updatedAt = ${new Date().toISOString()}
                    WHERE id = ${existing[0].id}
                `
            } else {
                const id = Math.random().toString(36).substring(2, 15)
                await prisma.$executeRaw`
                    INSERT INTO yearly_budgets (id, year, totalAmount, createdAt, updatedAt)
                    VALUES (${id}, ${yearInt}, ${amountFloat}, ${new Date().toISOString()}, ${new Date().toISOString()})
                `
            }
            return NextResponse.json({ success: true })
        }

        if (!category) {
            return NextResponse.json({ error: "Category is required" }, { status: 400 })
        }

        // Check if exists
        const existing: any[] = await prisma.$queryRaw`
            SELECT id FROM budgets 
            WHERE year = ${yearInt} AND category = ${category}
        `

        if (existing.length > 0) {
            // Update
            await prisma.$executeRaw`
                UPDATE budgets 
                SET amount = ${amountFloat}, updatedAt = ${new Date().toISOString()}
                WHERE id = ${existing[0].id}
            `
        } else {
            // Insert
            const id = Math.random().toString(36).substring(2, 15)
            await prisma.$executeRaw`
                INSERT INTO budgets (id, year, category, amount, createdAt, updatedAt)
                VALUES (${id}, ${yearInt}, ${category}, ${amountFloat}, ${new Date().toISOString()}, ${new Date().toISOString()})
            `
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Budget update failed", error)
        return NextResponse.json({ error: "Failed to update budget" }, { status: 500 })
    }
}
