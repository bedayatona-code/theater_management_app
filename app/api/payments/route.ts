import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const playerId = searchParams.get("playerId")
  const eventId = searchParams.get("eventId")
  const eventPlayerId = searchParams.get("eventPlayerId")
  const category = searchParams.get("category")
  const type = searchParams.get("type")
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")

  const where: any = {}
  if (playerId) where.playerId = playerId
  if (category && category !== "all") where.category = category
  if (type && type !== "all") where.type = type

  if (startDate || endDate) {
    where.paymentDate = {}
    if (startDate) where.paymentDate.gte = new Date(startDate)
    if (endDate) where.paymentDate.lte = new Date(endDate)
  }

  // For filtering by event or eventPlayer, we need to use paymentEvents
  const payments = await (prisma.payment as any).findMany({
    where,
    include: {
      player: true,
      paymentEvents: {
        include: {
          eventPlayer: {
            include: {
              event: true,
            },
          },
        },
      },
    },
    orderBy: {
      paymentDate: "desc",
    },
  })

  // If filtering by eventId or eventPlayerId, filter the results
  let filteredPayments = payments
  if (eventId || eventPlayerId) {
    filteredPayments = payments.filter((payment: any) => {
      if (eventId && payment.eventId === eventId) return true;
      return (payment.paymentEvents || []).some((pe: any) => {
        if (eventPlayerId) return pe.eventPlayerId === eventPlayerId
        if (eventId) return pe.eventPlayer.eventId === eventId
        return false
      })
    })
  }

  return NextResponse.json(filteredPayments)
}

// Helper function to update payment status for an EventPlayer
async function updatePaymentStatus(eventPlayerId: string) {
  const eventPlayer = await (prisma.eventPlayer as any).findUnique({
    where: { id: eventPlayerId },
    include: { paymentEvents: true },
  })

  if (eventPlayer) {
    const totalPaid = (eventPlayer as any).paymentEvents.reduce((sum: number, pe: any) => sum + pe.amount, 0)
    let paymentStatus = "UNPAID"
    if (totalPaid >= eventPlayer.fee) {
      paymentStatus = "FULLY_PAID"
    } else if (totalPaid > 0) {
      paymentStatus = "PARTIALLY_PAID"
    }

    await prisma.eventPlayer.update({
      where: { id: eventPlayerId },
      data: { paymentStatus },
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()

    const body = await request.json()
    const {
      eventPlayerIds,
      eventId,
      playerId,
      amount,
      paymentDate,
      type = "INCOME",
      category,
      paymentMethod = "TRANSFER",
      transactionReference,
      checkNumber,
      bankAccount,
      bankNumber,
      receiptLink,
      notes,
      forMonth,
      receiptNumber,
      invoiceNumber,
      checkCashedDate,
      supplierName,
      supplierAddress,
    } = body

    // Support both single and multiple events
    const eventPlayerIdArray = Array.isArray(eventPlayerIds) ? eventPlayerIds : (eventPlayerIds ? [eventPlayerIds] : [])


    const totalAmount = parseFloat(amount)

    // Fetch EventPlayers to know their fees and current paid amounts
    const eventPlayers = await (prisma.eventPlayer as any).findMany({
      where: { id: { in: eventPlayerIdArray } },
      include: { paymentEvents: true }
    })

    // Create a single payment record
    const payment = await (prisma.payment as any).create({
      data: {
        playerId: playerId || null,
        eventId: eventId || null,
        amount: totalAmount,
        paymentDate: new Date(paymentDate),
        type,
        category,
        paymentMethod,
        transactionReference,
        checkNumber,
        creditCardNumber: body.creditCardNumber || null,
        creditCardHolder: body.creditCardHolder || null,
        bankAccount,
        bankNumber,
        receiptLink,
        notes,
        forMonth: forMonth ? new Date(forMonth) : null,
        receiptNumber: receiptNumber || null,
        invoiceNumber: invoiceNumber || null,
        checkCashedDate: checkCashedDate ? new Date(checkCashedDate) : null,
        supplierName: supplierName || null,
        supplierAddress: supplierAddress || null,
      },
    })

    // Auto-save supplier for future reuse
    if (supplierName && supplierName.trim()) {
      try {
        await (prisma as any).supplier.upsert({
          where: { name: supplierName.trim() },
          update: { address: supplierAddress || null },
          create: { name: supplierName.trim(), address: supplierAddress || null },
        })
      } catch (e) {
        // Non-critical, don't fail the payment
        console.error("Failed to save supplier:", e)
      }
    }

    // Distribute the payment amount across the selected events
    let remainingAmount = totalAmount

    for (const ep of eventPlayers) {
      if (remainingAmount <= 0) break

      const paid = (ep as any).paymentEvents.reduce((sum: number, pe: any) => sum + pe.amount, 0)
      const outstanding = ep.fee - paid

      // Determine how much of the payment goes to this event
      const allocationAmount = Math.min(remainingAmount, outstanding > 0 ? outstanding : ep.fee)

      // Create PaymentEvent junction record
      await (prisma as any).paymentEvent.create({
        data: {
          paymentId: payment.id,
          eventPlayerId: ep.id,
          amount: allocationAmount,
        }
      })

      remainingAmount -= allocationAmount
      await updatePaymentStatus(ep.id)
    }

    // If there's still money left over (overpayment), attach it to the LAST event
    if (remainingAmount > 0 && eventPlayers.length > 0) {
      const lastEventPlayer = eventPlayers[eventPlayers.length - 1]

      // Find the PaymentEvent for the last event player and update it
      const lastPaymentEvent = await (prisma as any).paymentEvent.findFirst({
        where: {
          paymentId: payment.id,
          eventPlayerId: lastEventPlayer.id
        }
      })

      if (lastPaymentEvent) {
        await (prisma as any).paymentEvent.update({
          where: { id: lastPaymentEvent.id },
          data: { amount: lastPaymentEvent.amount + remainingAmount }
        })
        await updatePaymentStatus(lastEventPlayer.id)
      }
    }

    // Return the created payment with its event associations
    const createdPayment = await (prisma.payment as any).findUnique({
      where: { id: payment.id },
      include: {
        player: true,
        event: true,
        paymentEvents: {
          include: {
            eventPlayer: {
              include: {
                event: true,
              },
            },
          },
        },
      } as any,
    })

    return NextResponse.json(createdPayment)
  } catch (error: any) {
    console.error("POST /api/payments error:", error)
    return NextResponse.json({ error: error.message || "Failed to create payment" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession()

    const body = await request.json()
    const {
      id,
      amount,
      paymentDate,
      type,
      category,
      eventId,
      paymentMethod,
      transactionReference,
      checkNumber,
      bankAccount,
      bankNumber,
      receiptLink,
      notes
    } = body

    if (!id) {
      return NextResponse.json({ error: "Payment ID required" }, { status: 400 })
    }

    // Get the payment with its event associations
    const oldPayment = await (prisma.payment as any).findUnique({
      where: { id },
      include: { paymentEvents: true }
    })

    if (!oldPayment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    // Update the payment record
    const payment = await (prisma.payment as any).update({
      where: { id },
      data: {
        playerId: body.playerId || null,
        amount: parseFloat(amount),
        paymentDate: new Date(paymentDate),
        type,
        category,
        eventId: eventId || null,
        paymentMethod,
        transactionReference,
        checkNumber,
        creditCardNumber: body.creditCardNumber || null,
        creditCardHolder: body.creditCardHolder || null,
        bankAccount,
        bankNumber,
        receiptLink,
        notes,
        forMonth: body.forMonth ? new Date(body.forMonth) : null,
        receiptNumber: body.receiptNumber || null,
        invoiceNumber: body.invoiceNumber || null,
        checkCashedDate: body.checkCashedDate ? new Date(body.checkCashedDate) : null,
        supplierName: body.supplierName || null,
        supplierAddress: body.supplierAddress || null,
      } as any,
      include: {
        player: true,
        event: true,
        paymentEvents: {
          include: {
            eventPlayer: {
              include: {
                event: true,
              },
            },
          },
        },
      },
    })

    // Update payment statuses for all associated events
    for (const pe of oldPayment.paymentEvents) {
      await updatePaymentStatus(pe.eventPlayerId)
    }

    return NextResponse.json(payment)
  } catch (error: any) {
    console.error("PUT /api/payments error:", error)
    return NextResponse.json({ error: error.message || "Failed to update payment" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  // const session = await getServerSession()

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "Payment ID required" }, { status: 400 })
  }

  // Get the payment to know which EventPlayers to update
  const payment = await (prisma.payment as any).findUnique({
    where: { id },
    include: { paymentEvents: true }
  })

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 })
  }

  const eventPlayerIds = (payment as any).paymentEvents.map((pe: any) => pe.eventPlayerId)

  // Delete the payment (cascade will delete PaymentEvents)
  await prisma.payment.delete({
    where: { id },
  })

  // Update payment statuses for all affected events
  for (const epId of eventPlayerIds) {
    await updatePaymentStatus(epId)
  }

  return NextResponse.json({ success: true })
}

