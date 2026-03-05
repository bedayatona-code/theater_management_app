import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { exportDbToJson, importDbFromJson } from "@/lib/dbBackup"

export async function POST(request: NextRequest) {
    try {
        const { filename } = await request.json()
        if (!filename) {
            return NextResponse.json({ error: "Filename is required" }, { status: 400 })
        }

        const backupPath = path.join(process.cwd(), "backups", filename)

        if (filename.toLowerCase().endsWith('.db')) {
            return NextResponse.json({
                error: "Legacy SQLite backup detected (.db). These are not compatible with the new Supabase-based system. Please restore from a .json backup instead."
            }, { status: 400 })
        }

        if (!fs.existsSync(backupPath)) {
            return NextResponse.json({ error: "Backup file not found" }, { status: 404 })
        }

        // Before restoring, make a safety backup of current state
        const safetyData = await exportDbToJson()
        const safetyTimestamp = new Date().toISOString().replace(/[:.]/g, "-")
        const safetyPath = path.join(process.cwd(), "backups", `pre-restore-safety-${safetyTimestamp}.json`)
        fs.writeFileSync(safetyPath, JSON.stringify(safetyData, null, 2))

        // Perform restore from JSON
        const backupContent = fs.readFileSync(backupPath, 'utf8')
        const dataToRestore = JSON.parse(backupContent)
        await importDbFromJson(dataToRestore)

        return NextResponse.json({ success: true, message: "Database restored successfully" })
    } catch (error: any) {
        console.error("Restore error:", error)
        return NextResponse.json({ error: error.message || "Failed to restore backup" }, { status: 500 })
    }
}
