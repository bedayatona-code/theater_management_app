import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const type = formData.get("type") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const text = await file.text()
    // Handle both \r\n and \n and filter out empty lines
    const lines = text.split(/\r?\n/).filter((line) => line.trim())
    if (lines.length < 2) {
      return NextResponse.json({ error: "CSV file is empty or missing data" }, { status: 400 })
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())
    const dataRows = lines.slice(1).map(line => {
      const values = line.split(",").map((v) => v.trim())
      const row: any = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || null
      })
      return row
    })

    if (type === "players") {
      let count = 0
      const passwordHash = await bcrypt.hash("theater123", 10)

      for (const row of dataRows) {
        const email = row.email || row.Email
        const fullName = row.fullname || row.fullName || row.name

        if (!email || !fullName) continue

        // Check if user exists (User email IS unique)
        const existingUser = await prisma.user.findUnique({ where: { email } })
        if (existingUser) continue

        await prisma.player.create({
          data: {
            fullName,
            email,
            phone: row.phone || null,
            address: row.address || null,
            taxId: row.taxid || row.taxId || null,
            user: {
              create: {
                email,
                username: fullName,
                password: passwordHash,
                role: "PLAYER",
              },
            },
          },
        })
        count++
      }
      return NextResponse.json({ success: true, count })

    } else if (type === "events") {
      // Group by event (name + date)
      const eventGroups: Record<string, any[]> = {}
      for (const row of dataRows) {
        const name = row.name || row.eventName || row.event
        const date = row.date || row.eventDate
        if (!name || !date) continue

        const key = `${name}_${new Date(date).toISOString().split('T')[0]}`
        if (!eventGroups[key]) eventGroups[key] = []
        eventGroups[key].push(row)
      }

      let countEvents = 0
      let countAssignments = 0

      for (const key in eventGroups) {
        const rows = eventGroups[key]
        const firstRow = rows[0]

        const name = firstRow.name || firstRow.eventName || firstRow.event
        const date = new Date(firstRow.date || firstRow.eventDate)

        // Find or create event
        let event = await prisma.event.findFirst({
          where: { name, date }
        })

        if (!event) {
          event = await prisma.event.create({
            data: {
              name,
              date,
              venue: firstRow.venue || null,
              description: firstRow.description || null,
              totalBudget: firstRow.totalbudget || firstRow.budget ? parseFloat(firstRow.totalbudget || firstRow.budget) : null,
              commissioner: firstRow.commissioner || null,
            }
          })
          countEvents++
        }

        // Process player assignments
        for (const row of rows) {
          const playerEmail = row.playeremail || row.playerEmail || row.email
          const fee = parseFloat(row.fee || "0")

          if (!playerEmail) continue

          // Use findFirst because Player.email is not marked @unique in schema
          const player = await prisma.player.findFirst({ where: { email: playerEmail } })
          if (!player) continue

          // Check if already assigned
          const existingAssignment = await prisma.eventPlayer.findUnique({
            where: {
              eventId_playerId: {
                eventId: event.id,
                playerId: player.id
              }
            }
          })

          if (!existingAssignment) {
            await prisma.eventPlayer.create({
              data: {
                eventId: event.id,
                playerId: player.id,
                fee: fee,
                role: row.role || null
              }
            })
            countAssignments++
          }
        }
      }
      return NextResponse.json({ success: true, countEvents, countAssignments })

    } else if (type === "payments") {
      let count = 0
      for (const row of dataRows) {
        const playerEmail = row.playeremail || row.playerEmail || row.email
        const eventName = row.eventname || row.eventName || row.event
        const amount = parseFloat(row.amount || "0")
        const date = row.date || row.paymentDate || new Date()

        if (!playerEmail || !eventName || isNaN(amount)) continue

        const player = await prisma.player.findFirst({ where: { email: playerEmail } })
        if (!player) continue

        const event = await prisma.event.findFirst({ where: { name: eventName } })
        if (!event) continue

        const eventPlayer = await prisma.eventPlayer.findUnique({
          where: {
            eventId_playerId: {
              eventId: event.id,
              playerId: player.id
            }
          }
        })

        if (!eventPlayer) continue

        await prisma.payment.create({
          data: {
            eventPlayerId: eventPlayer.id,
            playerId: player.id,
            amount: amount,
            paymentDate: new Date(date),
            bankAccount: (row.bankaccount || row.bankAccount || null) as string | null,
            bankNumber: (row.banknumber || row.bankNumber || null) as string | null,
            notes: row.notes || null,
          } as any
        })
        count++
      }
      return NextResponse.json({ success: true, count })
    }

    return NextResponse.json({ error: "Invalid import type" }, { status: 400 })
  } catch (error: any) {
    console.error("CSV import error:", error)
    return NextResponse.json({ error: error.message || "Failed to import CSV" }, { status: 500 })
  }
}
