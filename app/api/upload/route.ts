import { writeFile } from "fs/promises"
import { NextRequest, NextResponse } from "next/server"
import path from "path"

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get("file") as File

        if (!file) {
            return NextResponse.json(
                { error: "No file uploaded" },
                { status: 400 }
            )
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Create a unique filename
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
        const filename = `${uniqueSuffix}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "")}`

        // Ensure uploads directory exists (you might need to create this manually or check existence)
        // For simplicity, we assume public/uploads exists or we write to it.
        // In production, use S3 or Blob storage. For local, public folder is fine.

        const uploadDir = path.join(process.cwd(), "public", "uploads")
        // Note: In some environments writing to public at runtime isn't persistent.
        // But for a local tool/app it's usually okay.

        // We'll try to save it
        const filepath = path.join(uploadDir, filename)

        // Ensure directory exists
        const fs = require("fs")
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        await writeFile(filepath, buffer)

        return NextResponse.json({
            url: `/uploads/${filename}`,
            success: true
        })

    } catch (error) {
        console.error("Upload error:", error)
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        )
    }
}
