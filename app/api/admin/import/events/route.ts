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

            // Expected columns: Name, Date (YYYY-MM-DD), Venue, Description, Budget, Commissioner, Contact
            if (row.length < 2) {
                errors.push(`Row ${rowNum}: Missing required fields`)
                continue
            }

            const [name, dateStr, venue, description, budgetStr, commissioner, contact] = row

            if (!name || !dateStr) {
                errors.push(`Row ${rowNum}: Name and Date are required`)
                continue
            }

            try {
                // Parse date
                const date = new Date(dateStr.replace(/^"|"$/g, ''))
                if (isNaN(date.getTime())) {
                    errors.push(`Row ${rowNum}: Invalid date format. Use YYYY-MM-DD`)
                    continue
                }

                // Parse budget
                const totalBudget = budgetStr ? parseFloat(budgetStr.replace(/^"|"$/g, '').replace(/,/g, '')) : null

                // Check if event already exists
                const existing = await prisma.event.findFirst({
                    where: {
                        name: name.replace(/^"|"$/g, ''),
                        date: date
                    }
                })

                if (existing) {
                    errors.push(`Row ${rowNum}: Event "${name}" on ${dateStr} already exists`)
                    continue
                }

                await prisma.event.create({
                    data: {
                        name: name.replace(/^"|"$/g, ''),
                        date,
                        venue: venue ? venue.replace(/^"|"$/g, '') : null,
                        description: description ? description.replace(/^"|"$/g, '') : null,
                        totalBudget: totalBudget && !isNaN(totalBudget) ? totalBudget : null,
                        commissioner: commissioner ? commissioner.replace(/^"|"$/g, '') : null,
                        commissionerContact: contact ? contact.replace(/^"|"$/g, '') : null,
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
            { error: "Failed to import events" },
            { status: 500 }
        )
    }
}
