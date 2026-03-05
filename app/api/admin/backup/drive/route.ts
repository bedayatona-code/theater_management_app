import { NextResponse } from "next/server"
import { listDriveBackups, downloadFromDrive } from "@/lib/googleDrive"
import path from "path"
import fs from "fs"

export const dynamic = 'force-dynamic'


export async function GET() {
    try {
        const { files: backups, authType } = await listDriveBackups()
        console.log(`API listing Drive backups: ${backups.length} found, Auth: ${authType}`);

        return NextResponse.json({
            files: backups,
            authType: authType
        })
    } catch (error: any) {
        console.error("Failed to list Google Drive backups:", error)
        if (error.message.includes('expired') || error.message.includes('connect')) {
            return NextResponse.json({ error: 'expired' }, { status: 401 })
        }
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const { fileId, filename } = await req.json()
        if (!fileId || !filename) {
            return NextResponse.json({ error: "Missing fileId or filename" }, { status: 400 })
        }

        const backupDir = path.join(process.cwd(), "backups")
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true })
        }

        const destPath = path.join(backupDir, filename)
        await downloadFromDrive(fileId, destPath)

        return NextResponse.json({ success: true, filename })
    } catch (error: any) {
        console.error("Failed to download backup from Google Drive:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
