import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

function parseCSV(csvData: string): string[][] {
    const lines = csvData.trim().split('\n')
    return lines.map(line => {
        const values: string[] = []
        let current = ''
        let inQuotes = false

        for (let i = 0; i < line.length; i++) {
            const char = line[i]
            if (char === '"') {
                inQuotes = !inQuotes
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim())
                current = ''
            } else {
                current += char
            }
        }
        values.push(current.trim())
        return values
    })
}

export async function POST(request: NextRequest) {
    try {
        const { csvData } = await request.json()

        if (!csvData) {
            return NextResponse.json({ error: "CSV data is required" }, { status: 400 })
        }

        const rows = parseCSV(csvData)
        if (rows.length < 2) {
            return NextResponse.json({ error: "CSV must have headers and at least one row" }, { status: 400 })
        }

        // Skip header row
        const dataRows = rows.slice(1)
        const errors: string[] = []
        let successCount = 0

        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i]
            const rowNum = i + 2 // +2 because: 1-indexed and skip header

            // Expected columns: Full Name, Email, Phone, Address, Tax ID
            if (row.length < 2) {
                errors.push(`Row ${rowNum}: Missing required fields`)
                continue
            }

            const [fullName, email, phone, address, taxId] = row

            if (!fullName || !email) {
                errors.push(`Row ${rowNum}: Full Name and Email are required`)
                continue
            }

            try {
                // Check if player already exists
                const existing = await prisma.player.findFirst({
                    where: { email }
                })

                if (existing) {
                    errors.push(`Row ${rowNum}: Player with email ${email} already exists`)
                    continue
                }

                await prisma.player.create({
                    data: {
                        fullName: fullName.replace(/^"|"$/g, ''),
                        email: email.replace(/^"|"$/g, ''),
                        phone: phone ? phone.replace(/^"|"$/g, '') : null,
                        address: address ? address.replace(/^"|"$/g, '') : null,
                        taxId: taxId ? taxId.replace(/^"|"$/g, '') : null,
                    }
                })

                successCount++
            } catch (error) {
                console.error(`Error importing row ${rowNum}:`, error)
                errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : 'Unknown error'}`)
            }
        }

        return NextResponse.json({
            success: successCount,
            errors,
            total: dataRows.length
        })

    } catch (error) {
        console.error("Import error:", error)
        return NextResponse.json(
            { error: "Failed to import players" },
            { status: 500 }
        )
    }
}
