"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { formatCurrency } from "@/lib/formatters"
import { useLanguage } from "@/contexts/LanguageContext"

export default function UnpaidItemsPage() {
    const { t, language } = useLanguage()
    const router = useRouter()
    const [unpaidItems, setUnpaidItems] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchUnpaidItems()
    }, [])

    const fetchUnpaidItems = async () => {
        const res = await fetch("/api/players")
        const players = await res.json()

        // Flatten all unpaid event players
        const allUnpaid: any[] = []
        players.forEach((player: any) => {
            player.eventPlayers.forEach((ep: any) => {
                const paid = (ep.paymentEvents || []).reduce((sum: number, p: any) => sum + p.amount, 0)
                const remaining = ep.fee - paid

                if (remaining > 0) {
                    allUnpaid.push({
                        id: ep.id,
                        playerName: player.fullName,
                        playerId: player.id,
                        eventName: ep.event.name,
                        eventDate: ep.event.date,
                        fee: ep.fee,
                        paid,
                        remaining,
                    })
                }
            })
        })

        // Sort by remaining amount (highest first)
        allUnpaid.sort((a, b) => b.remaining - a.remaining)
        setUnpaidItems(allUnpaid)
        setLoading(false)
    }

    const handleStatusClick = (item: any) => {
        const queryParams = new URLSearchParams({
            playerId: item.playerId,
            playerName: item.playerName,
            eventPlayerId: item.id,
            autoOpen: 'true'
        })
        router.push(`/admin/payments?${queryParams.toString()}`)
    }

    if (loading) {
        return <div className="flex justify-center items-center h-64 text-foreground">{t("common.loading")}</div>
    }

    const totalUnpaid = unpaidItems.reduce((sum, item) => sum + item.remaining, 0)

    return (
        <div className="space-y-6" dir={language === "he" ? "rtl" : "ltr"}>
            <div className="flex justify-between items-center">
                <div>
                    <Link href="/admin" className="text-primary hover:text-primary/80 mb-2 block font-medium">
                        {language === "he" ? "← חזרה ללוח הבקרה" : "← Back to Dashboard"}
                    </Link>
                    <h1 className="text-3xl font-bold text-red-500">{t("nav.unpaid_items")}</h1>
                    <p className="text-muted-foreground mt-2 font-medium">
                        {t("player.outstanding")}: {formatCurrency(totalUnpaid)} ({unpaidItems.length} {t("dashboard.items")})
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
                                    {t("player.remaining")}
                                </th>
                                <th className={`px-6 py-3 font-bold text-muted-foreground text-xs uppercase tracking-wider ${language === "he" ? "text-right" : "text-left"}`}>
                                    {t("table.actions")}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-foreground">
                            {unpaidItems.map((item) => (
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
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-500 font-medium">
                                        {formatCurrency(item.paid)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-500 font-bold">
                                        {formatCurrency(item.remaining)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button
                                            onClick={() => handleStatusClick(item)}
                                            className="px-3 py-1 text-[10px] font-bold rounded-full bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all uppercase shadow-sm"
                                        >
                                            {t("payment.record")}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {unpaidItems.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        <p className="text-xl font-bold">{t("alert.no_unpaid_found")}</p>
                        <p className="text-sm mt-2 font-medium">{t("alert.no_unpaid_items")}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
