import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function POST(request: NextRequest) {
    try {
        const { filename } = await request.json()
        if (!filename) {
            return NextResponse.json({ error: "Filename is required" }, { status: 400 })
        }

        const dbPath = path.join(process.cwd(), "prisma", "dev.db")
        const backupPath = path.join(process.cwd(), "backups", filename)

        if (!fs.existsSync(backupPath)) {
            return NextResponse.json({ error: "Backup file not found" }, { status: 404 })
        }

        // Before restoring, make a safety backup of current state
        const safetyTimestamp = new Date().toISOString().replace(/[:.]/g, "-")
        const safetyPath = path.join(process.cwd(), "backups", `pre-restore-safety-${safetyTimestamp}.db`)
        if (fs.existsSync(dbPath)) {
            fs.copyFileSync(dbPath, safetyPath)
        }

        // Perform restore
        fs.copyFileSync(backupPath, dbPath)

        return NextResponse.json({ success: true, message: "Database restored successfully" })
    } catch (error: any) {
        console.error("Restore error:", error)
        return NextResponse.json({ error: error.message || "Failed to restore backup" }, { status: 500 })
    }
}
