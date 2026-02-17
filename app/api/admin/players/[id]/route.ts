import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()
        const { fullName, email, phone, address, taxId, password, imageUrl } = body

        // Start transaction
        const updatedPlayer = await prisma.player.update({
            where: { id },
            data: {
                fullName,
                email,
                phone: phone || null,
                address: address || null,
                taxId: taxId || null,
                imageUrl: imageUrl || null,
                user: {
                    update: {
                        email,
                        username: fullName, // Update login handle to full name
                        ...(password ? { password: await bcrypt.hash(password, 10) } : {})
                    }
                }
            },
            include: { user: true }
        })

        return NextResponse.json(updatedPlayer)
    } catch (error: any) {
        console.error("Update player error:", error)
        return NextResponse.json({ error: error.message || "Failed to update player" }, { status: 500 })
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        // Check if player has unpaid items? Maybe, but user said "Ask user twice before removing anything", implying they can remove provided they confirm.
        // So we just delete. Prisma Cascade delete should handle relations if configured.
        // Schema says:
        // EventPlayer -> onDelete: Cascade
        // Payment -> onDelete: Cascade
        // Invoice -> onDelete: Cascade
        // So it should be fine.

        await prisma.player.delete({
            where: { id },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Delete player error:", error)
        return NextResponse.json(
            { error: "Failed to delete player" },
            { status: 500 }
        )
    }
}
