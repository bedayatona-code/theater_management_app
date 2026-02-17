import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/auth"

export async function POST(request: NextRequest) {
  const session = await getServerSession()

  const body = await request.json()
  const { type, title, description } = body

  const report = await prisma.errorReport.create({
    data: {
      playerId: session?.user?.playerId || null,
      type,
      title,
      description,
      status: "pending",
    },
  })

  return NextResponse.json(report)
}

export async function GET(request: NextRequest) {
  const session = await getServerSession()
  const { searchParams } = new URL(request.url)
  const playerId = searchParams.get("playerId")

  const where: any = {}

  // If a playerId is provided, filter by it (used by player portal)
  if (playerId) {
    where.playerId = playerId
  } else if (session?.user?.role !== "ADMIN") {
    // If not an admin and no playerId provided, default to current player
    if (session?.user?.playerId) {
      where.playerId = session.user.playerId
    } else {
      // Should not happen if authenticated, but for safety:
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const reports = await prisma.errorReport.findMany({
    where,
    orderBy: {
      createdAt: "desc",
    },
  })

  return NextResponse.json(reports)
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession()
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { id, status } = body

  if (!id || !status) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const updatedReport = await prisma.errorReport.update({
    where: { id },
    data: { status },
  })

  return NextResponse.json(updatedReport)
}
