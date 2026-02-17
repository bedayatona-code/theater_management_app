import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")

    if (!type) {
        return NextResponse.json({ error: "Type is required" }, { status: 400 })
    }

    let csvContent = ""
    let filename = ""

    try {
        if (type === "players") {
            const players = await prisma.player.findMany({
                include: {
                    eventPlayers: true,
                }
            })

            filename = "players.csv"
            csvContent = "מזהה,שם מלא,אימייל,טלפון,כתובת,מספר עוסק מורשה,תאריך יצירה,סה\"כ אירועים\n"

            players.forEach(player => {
                csvContent += `"${player.id}","${player.fullName}","${player.email}","${player.phone || ""}","${player.address || ""}","${player.taxId || ""}","${player.createdAt.toISOString()}","${player.eventPlayers.length}"\n`
            })

        } else if (type === "events") {
            const events = await prisma.event.findMany({
                include: {
                    eventPlayers: true,
                }
            })

            filename = "events.csv"
            csvContent = "מזהה,שם,תאריך,מקום,תיאור,תקציב,מזמין,איש קשר,תאריך יצירה,סה\"כ שחקנים\n"

            events.forEach(event => {
                csvContent += `"${event.id}","${event.name}","${event.date.toISOString()}","${event.venue || ""}","${event.description || ""}","${event.totalBudget || 0}","${event.commissioner || ""}","${event.commissionerContact || ""}","${event.createdAt.toISOString()}","${event.eventPlayers.length}"\n`
            })

        } else if (type === "payments") {
            const payments = await prisma.payment.findMany({
                include: {
                    player: true,
                    paymentEvents: {
                        include: {
                            eventPlayer: {
                                include: {
                                    event: true,
                                }
                            }
                        }
                    }
                }
            })

            filename = "payments.csv"
            csvContent = "מזהה תשלום,שחקן,אירועים,סכום,תאריך תשלום,שיטת תשלום,אסמכתא/מספר צ'ק,חשבון בנק,סניף,הערות,תאריך יצירה\n"

            payments.forEach((payment: any) => {
                const events = payment.paymentEvents?.map((pe: any) => pe.eventPlayer?.event?.name || "").join("; ") || ""
                const method = payment.paymentMethod === "CHECK" ? "צ'ק" : "העברה"
                const reference = payment.paymentMethod === "CHECK" ? (payment.checkNumber || "") : (payment.transactionReference || "")
                const bankAccount = payment.bankAccount || ""
                const bankNumber = payment.bankNumber || ""
                csvContent += `"${payment.id}","${payment.player?.fullName || ""}","${events}","${payment.amount}","${payment.paymentDate.toISOString()}","${method}","${reference}","${bankAccount}","${bankNumber}","${payment.notes || ""}","${payment.createdAt.toISOString()}"\n`
            })

        } else {
            return NextResponse.json({ error: "Invalid type" }, { status: 400 })
        }

        const BOM = "\uFEFF"
        return new NextResponse(BOM + csvContent, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        })

    } catch (error) {
        console.error("Export error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
