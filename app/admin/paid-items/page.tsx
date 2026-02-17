"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { formatCurrency } from "@/lib/formatters"
import { useLanguage } from "@/contexts/LanguageContext"

export default function PaidItemsPage() {
    const { t, language } = useLanguage()
    const [paidItems, setPaidItems] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchPaidItems()
    }, [])

    const fetchPaidItems = async () => {
        const res = await fetch("/api/players")
        const players = await res.json()

        // Flatten all fully paid event players
        const allPaid: any[] = []
        players.forEach((player: any) => {
            player.eventPlayers.forEach((ep: any) => {
                const paid = (ep.paymentEvents || []).reduce((sum: number, pe: any) => sum + pe.amount, 0)

                if (paid >= ep.fee && paid > 0) {
                    allPaid.push({
                        id: ep.id,
                        playerName: player.fullName,
                        playerId: player.id,
                        eventName: ep.event.name,
                        eventDate: ep.event.date,
                        fee: ep.fee,
                        paid,
                    })
                }
            })
        })

        // Sort by event date (most recent first)
        allPaid.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())
        setPaidItems(allPaid)
        setLoading(false)
    }

    if (loading) {
        return <div className="flex justify-center items-center h-64 text-foreground">{t("common.loading")}</div>
    }

    const totalPaid = paidItems.reduce((sum, item) => sum + item.paid, 0)

    return (
        <div className="space-y-6" dir={language === "he" ? "rtl" : "ltr"}>
            <div className="flex justify-between items-center">
                <div>
                    <Link href="/admin" className="text-primary hover:text-primary/80 mb-2 block font-medium">
                        {language === "he" ? "← חזרה ללוח הבקרה" : "← Back to Dashboard"}
                    </Link>
                    <h1 className="text-3xl font-bold text-green-500">{t("nav.paid_items")}</h1>
                    <p className="text-muted-foreground mt-2 font-medium">
                        {t("dashboard.paid")}: {formatCurrency(totalPaid)} ({paidItems.length} {t("dashboard.items")})
                    </p>
                </div>
            </div>

            <div className="bg-secondary rounded-lg shadow-sm border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className={`px-6 py-3 font-bold text-muted-foreground text-xs uppercase tracking-wider ${language === "he" ? "text-right" : "text-left"}`}>
                                    {t("table.player")}
                                </th>
                                <th className={`px-6 py-3 font-bold text-muted-foreground text-xs uppercase tracking-wider ${language === "he" ? "text-right" : "text-left"}`}>
                                    {t("nav.events")}
                                </th>
                                <th className={`px-6 py-3 font-bold text-muted-foreground text-xs uppercase tracking-wider ${language === "he" ? "text-right" : "text-left"}`}>
                                    {t("table.date")}
                                </th>
                                <th className={`px-6 py-3 font-bold text-muted-foreground text-xs uppercase tracking-wider ${language === "he" ? "text-right" : "text-left"}`}>
                                    {t("player.fee")}
                                </th>
                                <th className={`px-6 py-3 font-bold text-muted-foreground text-xs uppercase tracking-wider ${language === "he" ? "text-right" : "text-left"}`}>
                                    {t("dashboard.paid")}
                                </th>
                                <th className={`px-6 py-3 font-bold text-muted-foreground text-xs uppercase tracking-wider ${language === "he" ? "text-right" : "text-left"}`}>
                                    {t("player.status")}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-foreground">
                            {paidItems.map((item) => (
                                <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Link
                                            href={`/admin/players/${item.playerId}`}
                                            className="text-sm font-bold text-primary hover:text-primary/80 transition-all underline decoration-primary/30 underline-offset-4"
                                        >
                                            {item.playerName}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                        {item.eventName}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                        {new Date(item.eventDate).toLocaleDateString(language === "he" ? "he-IL" : "en-US")}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                        {formatCurrency(item.fee)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-500 font-bold">
                                        {formatCurrency(item.paid)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 py-1 text-[10px] font-bold rounded-full bg-green-500/20 text-green-500 uppercase">
                                            {t("player.status.fully_paid")}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {paidItems.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        <p className="text-xl font-bold">{t("alert.no_paid_items")}</p>
                        <p className="text-sm mt-2">{t("alert.start_recording")}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
