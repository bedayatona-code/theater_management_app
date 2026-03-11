import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const suppliers = await (prisma as any).supplier.findMany({
    orderBy: { name: "asc" },
  })
  return NextResponse.json(suppliers)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, address } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Supplier name is required" }, { status: 400 })
    }

    // Upsert: update address if supplier exists, create if not
    const supplier = await (prisma as any).supplier.upsert({
      where: { name: name.trim() },
      update: { address: address || null },
      create: { name: name.trim(), address: address || null },
    })

    return NextResponse.json(supplier)
  } catch (error: any) {
    console.error("POST /api/suppliers error:", error)
    return NextResponse.json({ error: error.message || "Failed to save supplier" }, { status: 500 })
  }
}
