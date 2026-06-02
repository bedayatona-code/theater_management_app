"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { formatCurrency } from "@/lib/formatters"
import { useLanguage } from "@/contexts/LanguageContext"

export default function UnpaidItemsPage() {
    const { t, language } = useLanguage()
    const router = useRouter()
    const [unpaidItems, setUnpaidItems] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [fromDate, setFromDate] = useState("")
    const [toDate, setToDate] = useState("")
    const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(new Set())

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

    const isFiltering = fromDate !== "" || toDate !== ""
    const from = fromDate ? new Date(fromDate) : null
    const to = toDate ? new Date(toDate + "T23:59:59") : null

    const filteredItems = isFiltering
        ? unpaidItems.filter((item) => {
            const eventDate = new Date(item.eventDate)
            return (!from || eventDate >= from) && (!to || eventDate <= to)
        })
        : unpaidItems

    const totalUnpaid = filteredItems.reduce((sum, item) => sum + item.remaining, 0)

    const togglePlayer = (playerId: string) => {
        setExpandedPlayers(prev => {
            const next = new Set(prev)
            next.has(playerId) ? next.delete(playerId) : next.add(playerId)
            return next
        })
    }

    // Group filtered items by player
    const groupedByPlayer: { playerId: string; playerName: string; items: typeof filteredItems; totalFee: number; totalPaid: number; totalRemaining: number }[] = []
    const playerMap = new Map<string, typeof groupedByPlayer[0]>()
    for (const item of filteredItems) {
        if (!playerMap.has(item.playerId)) {
            const group = { playerId: item.playerId, playerName: item.playerName, items: [], totalFee: 0, totalPaid: 0, totalRemaining: 0 }
            playerMap.set(item.playerId, group)
            groupedByPlayer.push(group)
        }
        const group = playerMap.get(item.playerId)!
        group.items.push(item)
        group.totalFee += item.fee
        group.totalPaid += item.paid
        group.totalRemaining += item.remaining
    }

    return (
        <div className="space-y-6" dir={language === "he" ? "rtl" : "ltr"}>
            <div className="flex justify-between items-center">
                <div>
                    <Link href="/admin" className="text-primary hover:text-primary/80 mb-2 block font-medium">
                        {language === "he" ? "← חזרה ללוח הבקרה" : "← Back to Dashboard"}
                    </Link>
                    <h1 className="text-3xl font-bold text-red-500">{t("nav.unpaid_items")}</h1>
                    <p className="text-muted-foreground mt-2 font-medium">
                        {t("player.outstanding")}: {formatCurrency(totalUnpaid)} ({filteredItems.length} {t("dashboard.items")})
                    </p>
                </div>
                <div className={`flex flex-wrap items-center gap-2 ${language === "he" ? "flex-row-reverse" : ""}`}>
                    <div className={`flex items-center gap-1 ${language === "he" ? "flex-row-reverse" : ""}`}>
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest whitespace-nowrap">{t("filter.from_date")}</label>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
                        />
                    </div>
                    <div className={`flex items-center gap-1 ${language === "he" ? "flex-row-reverse" : ""}`}>
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest whitespace-nowrap">{t("filter.to_date")}</label>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
                        />
                    </div>
                    {isFiltering && (
                        <button
                            onClick={() => { setFromDate(""); setToDate("") }}
                            className="px-3 py-2 bg-muted hover:bg-muted/80 text-muted-foreground border border-border rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                        >
                            {t("filter.clear")}
                        </button>
                    )}
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
                            {groupedByPlayer.map((group) => {
                                const isExpanded = expandedPlayers.has(group.playerId)
                                return (
                                    <React.Fragment key={group.playerId}>
                                        {/* Player summary row */}
                                        <tr
                                            className="hover:bg-muted/20 transition-colors cursor-pointer bg-muted/5"
                                            onClick={() => togglePlayer(group.playerId)}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Link
                                                    href={`/admin/players/${group.playerId}`}
                                                    className="text-sm font-bold text-primary hover:text-primary/80 transition-all underline decoration-primary/30 underline-offset-4"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {group.playerName}
                                                </Link>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                                                    <span className="px-2 py-0.5 bg-muted rounded-full border border-border">
                                                        {group.items.length} {t("nav.events").toLowerCase()}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground/60 transition-transform duration-200" style={{ display: "inline-block", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground/60">—</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-foreground">
                                                {formatCurrency(group.totalFee)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-500 font-medium">
                                                {formatCurrency(group.totalPaid)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-500 font-bold">
                                                {formatCurrency(group.totalRemaining)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground font-medium">
                                                {isExpanded ? (language === "he" ? "סגור ▲" : "Collapse ▲") : (language === "he" ? "פרט ▼" : "Expand ▼")}
                                            </td>
                                        </tr>
                                        {/* Expanded individual event rows */}
                                        {isExpanded && group.items.map((item) => (
                                            <tr key={item.id} className="hover:bg-muted/30 transition-colors bg-muted/10 border-t border-border/30">
                                                <td className="px-6 py-3 whitespace-nowrap">
                                                    <div className={`${language === "he" ? "pr-4 border-r-2 border-primary/20" : "pl-4 border-l-2 border-primary/20"}`} />
                                                </td>
                                                <td className="px-6 py-3 whitespace-nowrap text-sm text-muted-foreground">
                                                    {item.eventName}
                                                </td>
                                                <td className="px-6 py-3 whitespace-nowrap text-sm text-muted-foreground">
                                                    {new Date(item.eventDate).toLocaleDateString(language === "he" ? "he-IL" : "en-US")}
                                                </td>
                                                <td className="px-6 py-3 whitespace-nowrap text-sm text-muted-foreground">
                                                    {formatCurrency(item.fee)}
                                                </td>
                                                <td className="px-6 py-3 whitespace-nowrap text-sm text-green-500 font-medium">
                                                    {formatCurrency(item.paid)}
                                                </td>
                                                <td className="px-6 py-3 whitespace-nowrap text-sm text-red-500 font-bold">
                                                    {formatCurrency(item.remaining)}
                                                </td>
                                                <td className="px-6 py-3 whitespace-nowrap">
                                                    <button
                                                        onClick={() => handleStatusClick(item)}
                                                        className="px-3 py-1 text-[10px] font-bold rounded-full bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all uppercase shadow-sm"
                                                    >
                                                        {t("payment.record")}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {filteredItems.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        <p className="text-xl font-bold">{t("alert.no_unpaid_found")}</p>
                        <p className="text-sm mt-2 font-medium">{t("alert.no_unpaid_items")}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
