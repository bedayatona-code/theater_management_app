import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { uploadToDrive } from "@/lib/googleDrive"

export async function GET() {
    try {
        const backupDir = path.join(process.cwd(), "backups")
        if (!fs.existsSync(backupDir)) {
            return NextResponse.json([])
        }

        const files = fs.readdirSync(backupDir)
            .map(f => {
                const filePath = path.join(backupDir, f)
                const stat = fs.statSync(filePath)
                return {
                    filename: f,
                    createdAt: stat.mtime,
                    size: stat.size
                }
            })
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

        return NextResponse.json(files)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST() {
    try {
        const dbPath = path.join(process.cwd(), "dev.db")
        const backupDir = path.join(process.cwd(), "backups")

        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true })
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
        const filename = `backup-${timestamp}.db`
        const backupPath = path.join(backupDir, filename)

        if (fs.existsSync(dbPath)) {
            fs.copyFileSync(dbPath, backupPath)

            // Auto-sync to Google Drive
            try {
                await uploadToDrive(backupPath, filename)
            } catch (driveError) {
                console.error("Google Drive Auto-Sync Error:", driveError)
                // We don't fail the whole request if Drive sync fails, but we log it
            }

            // Cleanup: Keep only last 10 local backups
            const files = fs.readdirSync(backupDir)
                .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
                .sort((a, b) => b.time - a.time)

            if (files.length > 10) {
                files.slice(10).forEach(f => fs.unlinkSync(path.join(backupDir, f.name)))
            }

            return NextResponse.json({ success: true, filename })
        } else {
            return NextResponse.json({ error: "Database file not found" }, { status: 404 })
        }
    } catch (error: any) {
        console.error("Backup error:", error)
        return NextResponse.json({ error: error.message || "Failed to create backup" }, { status: 500 })
    }
}
