import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
    const cards = await (prisma as any).creditCard.findMany({
        orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(cards)
}

export async function POST(request: NextRequest) {
    const body = await request.json()
    const { number, holderName } = body

    if (!number) {
        return NextResponse.json({ error: "Card number required" }, { status: 400 })
    }

    // Get last four digits for display
    const lastFour = number.slice(-4)

    const card = await (prisma as any).creditCard.upsert({
        where: { number },
        update: { name: holderName },
        create: {
            number,
            lastFour,
            name: holderName,
        },
    })

    return NextResponse.json(card)
}
