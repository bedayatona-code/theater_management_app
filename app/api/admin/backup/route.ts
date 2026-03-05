import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { uploadToDrive } from "@/lib/googleDrive"
import { exportDbToJson } from "@/lib/dbBackup"

export async function GET() {
    try {
        const backupDir = path.join(process.cwd(), "backups")
        if (!fs.existsSync(backupDir)) {
            return NextResponse.json([])
        }

        const files = fs.readdirSync(backupDir)
            .filter(f => f.endsWith(".json")) // Only show JSON backups
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
        const backupDir = path.join(process.cwd(), "backups")

        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true })
        }

        const data = await exportDbToJson()
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
        const filename = `backup-${timestamp}.json`
        const backupPath = path.join(backupDir, filename)

        fs.writeFileSync(backupPath, JSON.stringify(data, null, 2))

        let driveSync = { success: false, fileId: null as string | null, error: null as string | null };
        // Auto-sync to Google Drive
        try {
            const fileId = await uploadToDrive(backupPath, filename)
            console.log(`Manual backup uploaded to Drive with ID: ${fileId}`)
            driveSync.success = true;
            driveSync.fileId = fileId ?? null;
        } catch (driveError: any) {
            console.error("Google Drive Auto-Sync Error:", driveError)
            driveSync.error = driveError.message;
        }

        // Cleanup: Keep only last 10 local backups
        const files = fs.readdirSync(backupDir)
            .filter(f => f.endsWith(".json"))
            .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
            .sort((a, b) => b.time - a.time)

        if (files.length > 10) {
            files.slice(10).forEach(f => fs.unlinkSync(path.join(backupDir, f.name)))
        }

        // Return 400 if cloud sync failed so the UI can show the specific error
        if (!driveSync.success) {
            return NextResponse.json({
                success: false,
                filename,
                driveSync,
                error: driveSync.error
            }, { status: 400 })
        }

        return NextResponse.json({ success: true, filename, driveSync })
    } catch (error: any) {
        console.error("Backup error:", error)
        const status = error.message?.includes('expired') || error.message?.includes('connect') ? 401 : 500
        return NextResponse.json({ error: error.message || "Failed to create backup" }, { status })
    }
}
