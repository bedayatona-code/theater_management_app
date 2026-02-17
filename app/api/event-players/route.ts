import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  // Authentication disabled for testing

  const body = await request.json()
  const { eventId, playerId, fee, role, paymentDueDate, notes } = body

  const eventPlayer = await prisma.eventPlayer.create({
    data: {
      eventId,
      playerId,
      fee: parseFloat(fee),
      role,
      paymentDueDate: paymentDueDate ? new Date(paymentDueDate) : null,
      notes,
    },
    include: {
      event: true,
      player: true,
    },
  })

  return NextResponse.json(eventPlayer)
}

export async function PUT(request: NextRequest) {
  // Authentication disabled for testing

  const body = await request.json()
  const { id, fee, role, paymentDueDate, notes, paymentStatus } = body

  const eventPlayer = await prisma.eventPlayer.update({
    where: { id },
    data: {
      fee: fee ? parseFloat(fee) : undefined,
      role,
      paymentDueDate: paymentDueDate ? new Date(paymentDueDate) : null,
      notes,
      paymentStatus,
    },
    include: {
      event: true,
      player: true,
    },
  })

  return NextResponse.json(eventPlayer)
}

export async function DELETE(request: NextRequest) {
  // Authentication disabled for testing

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 })
  }

  await prisma.eventPlayer.delete({
    where: { id },
  })

  return NextResponse.json({ success: true })
}

