"use client"

import { useState } from "react"
import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatCurrency } from "@/lib/formatters"
import { generateAllPlayersPaymentSummary } from "@/lib/pdfGenerator"

interface PlayerSummary {
    id: string
    fullName: string
    email: string
    totalFees: number
    totalPaid: number
    outstanding: number
}

interface PlayersPaymentsSummaryClientProps {
    players: PlayerSummary[]
}

export function PlayersPaymentsSummaryClient({ players }: PlayersPaymentsSummaryClientProps) {
    const { t, language } = useLanguage()
    const [isExporting, setIsExporting] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

    const filteredPlayers = players.filter(p =>
        p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleExportPDF = async () => {
        setIsExporting(true)
        try {
            await generateAllPlayersPaymentSummary(players)
        } catch (error) {
            console.error("Failed to export PDF", error)
            alert(t("alert.process_error"))
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <div className="space-y-6" dir={language === "he" ? "rtl" : "ltr"}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <Link href="/admin" className="text-xs font-bold text-primary hover:underline uppercase tracking-widest mb-2 block">
                        ← {t("nav.admin")}
                    </Link>
                    <h1 className="text-3xl font-black text-foreground tracking-tight uppercase tracking-tighter">
                        {t("nav.payments_summary")}
                    </h1>
                </div>
                <button
                    onClick={handleExportPDF}
                    disabled={isExporting}
                    className="bg-primary hover:bg-primary/90 text-black px-6 py-3 rounded-xl transition-all font-bold shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50 text-xs uppercase tracking-widest"
                >
                    {isExporting ? t("action.exporting") : (language === "he" ? "ייצא ל-PDF" : "Export to PDF")}
                </button>
            </div>

            <div className="bg-secondary p-6 rounded-2xl border border-border shadow-sm">
                <input
                    type="text"
                    placeholder={language === "he" ? "חיפוש לפי שם או אימייל..." : "Search by name or email..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
            </div>

            <div className="bg-secondary rounded-2xl border border-border shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border/50">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className={`px-6 py-4 font-black text-muted-foreground text-[10px] uppercase tracking-widest ${language === "he" ? "text-right" : "text-left"}`}>{t("table.name")}</th>
                                <th className={`px-6 py-4 font-black text-muted-foreground text-[10px] uppercase tracking-widest ${language === "he" ? "text-right" : "text-left"}`}>{t("player.total_fees")}</th>
                                <th className={`px-6 py-4 font-black text-muted-foreground text-[10px] uppercase tracking-widest ${language === "he" ? "text-right" : "text-left"}`}>{t("dashboard.paid")}</th>
                                <th className={`px-6 py-4 font-black text-muted-foreground text-[10px] uppercase tracking-widest ${language === "he" ? "text-right" : "text-left"}`}>{t("player.outstanding")}</th>
                                <th className={`px-6 py-4 font-black text-muted-foreground text-[10px] uppercase tracking-widest ${language === "he" ? "text-right" : "text-left"}`}>{t("table.actions")}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30 text-foreground">
                            {filteredPlayers.map((p) => (
                                <tr key={p.id} className="hover:bg-muted/30 transition-colors group">
                                    <td className="px-6 py-5 whitespace-nowrap">
                                        <div className="font-bold text-sm">{p.fullName}</div>
                                        <div className="text-[10px] text-muted-foreground opacity-70">{p.email}</div>
                                    </td>
                                    <td className="px-6 py-5 whitespace-nowrap font-bold text-sm">{formatCurrency(p.totalFees)}</td>
                                    <td className="px-6 py-5 whitespace-nowrap font-bold text-sm text-green-500">{formatCurrency(p.totalPaid)}</td>
                                    <td className="px-6 py-5 whitespace-nowrap font-black text-sm text-red-500">
                                        {formatCurrency(p.outstanding)}
                                    </td>
                                    <td className="px-6 py-5 whitespace-nowrap">
                                        <Link href={`/admin/players/${p.id}`} className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest">
                                            {t("common.view_details")}
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {filteredPlayers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground italic">
                                        {language === "he" ? "לא נמצאו שחקנים" : "No players found"}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
