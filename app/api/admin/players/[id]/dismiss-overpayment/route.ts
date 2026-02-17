import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

    try {
        await prisma.player.update({
            where: { id },
            data: { overpaymentDismissed: true },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Failed to dismiss overpayment", error)
        return NextResponse.json({ error: "Failed to dismiss notification" }, { status: 500 })
    }
}
