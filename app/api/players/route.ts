import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function GET(request: NextRequest) {
  const players = await prisma.player.findMany({
    include: {
      eventPlayers: {
        include: {
          event: true,
          paymentEvents: true,
        },
      },
    },
    orderBy: {
      fullName: "asc",
    },
  })

  return NextResponse.json(players)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { fullName, email, phone, address, taxId, password, imageUrl } = body

  const hashedPassword = await bcrypt.hash(password || "password123", 10)

  const player = await prisma.player.create({
    data: {
      fullName,
      email,
      phone,
      address,
      taxId,
      imageUrl,
      user: {
        create: {
          email,
          username: fullName,
          password: hashedPassword,
          image: imageUrl,
          role: "PLAYER",
        },
      },
    },
  })

  return NextResponse.json(player)
}

