import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      eventPlayers: {
        include: {
          player: true,
          paymentEvents: true,
        },
      },
    },
  })

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 })
  }

  return NextResponse.json(event)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const {
    name,
    date,
    venue,
    description,
    totalBudget,
    commissioner,
    commissionerContact,
    commissionerPhone,
    commissionerTaxId,
    commissionerAddress,
  } = body

  const event = await prisma.event.update({
    where: { id },
    data: {
      name,
      date: date ? new Date(date) : undefined,
      venue,
      description,
      totalBudget: totalBudget ? parseFloat(totalBudget) : null,
      commissioner,
      commissionerContact,
      commissionerPhone,
      commissionerTaxId,
      commissionerAddress,
      invoiceNumber: body.invoiceNumber,
      receiptNumber: body.receiptNumber,
      audienceCount: body.audienceCount ? parseInt(body.audienceCount) : null,
    } as any,
  })

  return NextResponse.json(event)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.event.delete({
    where: { id },
  })

  return NextResponse.json({ success: true })
}

