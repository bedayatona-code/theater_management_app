import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  // Authentication disabled for testing

  const events = await prisma.event.findMany({
    include: {
      eventPlayers: {
        include: {
          player: true,
        },
      },
    },
    orderBy: {
      date: "desc",
    },
  })

  return NextResponse.json(events)
}

export async function POST(request: NextRequest) {
  // Authentication disabled for testing

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

  const event = await prisma.event.create({
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
    },
    include: {
      eventPlayers: {
        include: {
          player: true,
        },
      },
    },
  } as any)

  return NextResponse.json(event)
}
