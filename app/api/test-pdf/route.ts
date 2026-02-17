
import { NextResponse } from 'next/server';
import { generateTestPdfBlob } from '@/lib/pdfGenerator';

export async function GET() {
    try {
        console.log("Generating Test PDF...");
        const pdfBlob = generateTestPdfBlob();

        // Convert Blob to Buffer
        const arrayBuffer = await pdfBlob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'inline; filename="test_hebrew.pdf"',
            },
        });
    } catch (e) {
        console.error("Error creating test PDF:", e);
        return NextResponse.json({ error: "Failed to generate PDF", details: String(e) }, { status: 500 });
    }
}
