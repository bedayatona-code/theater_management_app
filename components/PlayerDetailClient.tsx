"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { useLanguage } from "@/contexts/LanguageContext"
import { generatePlayerStatement } from "@/lib/pdfGenerator"

interface PlayerDetailClientProps {
    player: any
}

export function PlayerDetailClient({ player }: PlayerDetailClientProps) {
    const { t, language } = useLanguage()
    const router = useRouter()
    const [isGenerating, setIsGenerating] = useState(false)

    const handleDownloadStatement = async () => {
        setIsGenerating(true)
        try {
            // Filter only unpaid events for the statement
            const unpaidEvents = player.eventPlayers.filter((ep: any) => {
                const paid = (ep.paymentEvents || []).reduce((sum: number, pe: any) => sum + pe.amount, 0)
                return ep.fee - paid > 0
            })
            await generatePlayerStatement(player, unpaidEvents)
        } catch (error) {
            console.error("Failed to generate statement", error)
            alert(t("alert.process_error"))
        } finally {
            setIsGenerating(false)
        }
    }

    const totalFees = player.eventPlayers.reduce((sum: number, ep: any) => sum + ep.fee, 0)
    // Calculate total paid from all paymentEvents across all eventPlayers
    const totalPaid = player.eventPlayers.reduce((sum: number, ep: any) => {
        const paidForEvent = (ep.paymentEvents || []).reduce((pSum: number, pe: any) => pSum + pe.amount, 0)
        return sum + paidForEvent
    }, 0)
    const outstanding = Math.max(0, totalFees - totalPaid)

    return (
        <div className="space-y-8 animate-in fade-in duration-500" dir={language === "he" ? "rtl" : "ltr"}>
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <Link href="/admin/players" className={`inline-flex items-center gap-2 text-primary hover:text-primary/80 mb-4 font-bold uppercase text-[10px] tracking-widest transition-all ${language === "he" ? "flex-row-reverse" : ""}`}>
                        ← {t("player.back_to_players")}
                    </Link>
                    <div className={`flex items-center gap-6 ${language === "he" ? "flex-row-reverse" : ""}`}>
                        <div className="w-24 h-24 rounded-full bg-secondary border-4 border-primary/20 overflow-hidden flex items-center justify-center shadow-xl group">
                            {player.imageUrl ? (
                                <img src={player.imageUrl} alt={player.fullName} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            ) : (
                                <span className="text-4xl font-black text-primary/30 uppercase">{player.fullName.charAt(0)}</span>
                            )}
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-foreground tracking-tight">{player.fullName}</h1>
                            <p className="text-muted-foreground font-medium mt-1">{player.email}</p>
                            {player.phone && <p className="text-xs text-muted-foreground/60 mt-1 font-mono">{player.phone}</p>}
                        </div>
                    </div>
                </div>
                <div className={`flex flex-wrap gap-3 ${language === "he" ? "flex-row-reverse" : ""}`}>
                    <Link
                        href={`/admin/players/${player.id}/edit`}
                        className="bg-secondary hover:bg-muted text-foreground px-6 py-2.5 rounded-xl transition-all font-bold border border-border shadow-sm active:scale-95 text-xs uppercase tracking-widest"
                    >
                        {t("player.edit_player")}
                    </Link>
                    <button
                        onClick={handleDownloadStatement}
                        disabled={isGenerating}
                        className="bg-primary hover:bg-primary/90 text-black px-6 py-2.5 rounded-xl transition-all font-bold shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50 text-xs uppercase tracking-widest"
                    >
                        {isGenerating ? t("player.generating") : t("player.download_statement")}
                    </button>
                    <button
                        onClick={async () => {
                            if (confirm(t("alert.confirm_delete_player"))) {
                                const res = await fetch(`/api/admin/players/${player.id}`, { method: "DELETE" })
                                if (res.ok) router.push("/admin/players")
                            }
                        }}
                        className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 px-6 py-2.5 rounded-xl transition-all font-bold text-xs uppercase tracking-widest"
                    >
                        {t("common.delete")}
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-secondary p-6 rounded-2xl border border-border shadow-sm group hover:shadow-md transition-all">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t("player.financial_summary")}</p>
                    <p className="text-2xl font-black mt-3 text-foreground group-hover:text-primary transition-colors">₪{totalFees.toFixed(2)}</p>
                    <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase opacity-60 tracking-tighter">{t("player.total_fees")}</p>
                </div>
                <div className="bg-secondary p-6 rounded-2xl border border-border shadow-sm group hover:shadow-md transition-all">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t("dashboard.paid")}</p>
                    <p className="text-2xl font-black mt-3 text-green-500">₪{totalPaid.toFixed(2)}</p>
                    <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase opacity-60 tracking-tighter">{t("player.remaining")}: ₪{(totalFees - totalPaid).toFixed(2)}</p>
                </div>
                <div className="bg-secondary p-6 rounded-2xl border border-border shadow-sm group hover:shadow-md transition-all">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t("player.outstanding")}</p>
                    <p className={`text-2xl font-black mt-3 ${outstanding > 0 ? "text-red-500" : "text-green-500"}`}>₪{outstanding.toFixed(2)}</p>
                    <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase opacity-60 tracking-tighter">{t("player.remaining_amount")}</p>
                </div>
                <div className="bg-secondary p-6 rounded-2xl border border-border shadow-sm group hover:shadow-md transition-all">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t("nav.events")}</p>
                    <p className="text-2xl font-black mt-3 text-foreground">{player.eventPlayers.length}</p>
                    <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase opacity-60 tracking-tighter">{t("player.total_events")}</p>
                </div>
            </div>

            {/* Payment Action Button - Only show if there's outstanding balance */}
            {outstanding > 0 && (
                <div className="bg-orange-500/10 border-2 border-orange-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-300">
                    <div className={`flex items-center gap-3 ${language === "he" ? "flex-row-reverse" : ""}`}>
                        <span className="text-orange-500 text-2xl">💳</span>
                        <div>
                            <p className="text-sm font-bold text-foreground">{t("player.outstanding")}: <span className="text-orange-600">₪{outstanding.toFixed(2)}</span></p>
                            <p className="text-xs text-muted-foreground mt-0.5">{t("payment.pay_now")} for this player</p>
                        </div>
                    </div>
                    <Link
                        href={`/admin/payments?mode=pay_all&playerId=${player.id}`}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl transition-all font-bold shadow-lg shadow-orange-500/20 active:scale-95 text-xs uppercase tracking-widest whitespace-nowrap">
                        {t("payment.pay_now")}
                    </Link>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Event Participation Table */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-black text-foreground tracking-tight uppercase tracking-tighter">{t("player.events_fees")}</h2>
                    </div>
                    <div className="bg-secondary rounded-2xl border border-border shadow-md overflow-hidden animate-in slide-in-from-bottom-4 duration-500 delay-150">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-border/50">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className={`px-6 py-4 font-black text-muted-foreground text-[10px] uppercase tracking-widest ${language === "he" ? "text-right" : "text-left"}`}>{t("table.name")}</th>
                                        <th className={`px-6 py-4 font-black text-muted-foreground text-[10px] uppercase tracking-widest ${language === "he" ? "text-right" : "text-left"}`}>{t("player.role")}</th>
                                        <th className={`px-6 py-4 font-black text-muted-foreground text-[10px] uppercase tracking-widest ${language === "he" ? "text-right" : "text-left"}`}>{t("player.fee")}</th>
                                        <th className={`px-6 py-4 font-black text-muted-foreground text-[10px] uppercase tracking-widest ${language === "he" ? "text-right" : "text-left"}`}>{t("player.payment_status")}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30 text-foreground">
                                    {player.eventPlayers.map((ep: any) => {
                                        const paid = (ep.paymentEvents || []).reduce((sum: number, pe: any) => sum + pe.amount, 0)
                                        let statusColor = "bg-red-500/10 text-red-500"
                                        if (paid >= ep.fee) statusColor = "bg-green-500/10 text-green-500"
                                        else if (paid > 0) statusColor = "bg-orange-500/10 text-orange-500"

                                        let displayStatus = "UNPAID"
                                        if (paid >= ep.fee) displayStatus = "FULLY_PAID"
                                        else if (paid > 0) displayStatus = "PARTIALLY_PAID"

                                        return (
                                            <tr key={ep.id} className="hover:bg-muted/30 transition-colors group">
                                                <td className="px-6 py-5 whitespace-nowrap">
                                                    <Link href={`/admin/events/${ep.event.id}`} className="font-bold text-sm text-primary hover:text-primary/80 transition-all underline decoration-primary/20 underline-offset-4 decoration-2">
                                                        {ep.event.name}
                                                    </Link>
                                                    <div className="text-[10px] text-muted-foreground font-medium mt-1 uppercase tracking-tighter opacity-70">
                                                        {format(new Date(ep.event.date), language === "he" ? "dd/MM/yyyy" : "MMM dd, yyyy")}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap text-sm font-medium italic opacity-80">{ep.role || "-"}</td>
                                                <td className="px-6 py-5 whitespace-nowrap font-black text-sm">₪{ep.fee.toFixed(2)}</td>
                                                <td className="px-6 py-5 whitespace-nowrap">
                                                    {paid >= ep.fee ? (
                                                        <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full shadow-inner border border-current opacity-90 ${statusColor}`}>
                                                            {t(`player.status.${displayStatus.toLowerCase()}` as any)} (₪{paid.toFixed(0)}/₪{ep.fee.toFixed(0)})
                                                        </span>
                                                    ) : (
                                                        <Link
                                                            href={`/admin/payments?autoOpen=true&playerId=${player.id}&eventPlayerId=${ep.id}`}
                                                            className={`px-3 py-1 text-[10px] font-black uppercase rounded-full shadow-inner border border-current opacity-90 hover:opacity-100 transition-opacity inline-block ${statusColor}`}
                                                        >
                                                            {t(`player.status.${displayStatus.toLowerCase()}` as any)} (₪{paid.toFixed(0)}/₪{ep.fee.toFixed(0)})
                                                        </Link>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Column: Profile Details & Recent Payments */}
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-500 delay-300">
                    <div className="bg-secondary p-8 rounded-2xl border border-border shadow-md">
                        <h2 className="text-xl font-black text-primary mb-6 border-b border-border/50 pb-3 uppercase tracking-tighter">{t("player.profile_details")}</h2>
                        <div className="space-y-5">
                            <div className="group">
                                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-60 group-hover:opacity-100 transition-opacity">{t("table.taxId")}</label>
                                <p className="font-bold text-foreground text-sm tracking-wider">{player.taxId || t("player.not_provided")}</p>
                            </div>
                            <div className="group">
                                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-60 group-hover:opacity-100 transition-opacity">{t("table.address")}</label>
                                <p className="font-bold text-foreground text-sm tracking-wider">{player.address || t("player.not_provided")}</p>
                            </div>
                            <div className="group">
                                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-60 group-hover:opacity-100 transition-opacity">{t("player.joined_on")}</label>
                                <p className="font-bold text-foreground text-sm tracking-wider">{format(new Date(player.createdAt), language === "he" ? "dd/MM/yyyy" : "MMMM dd, yyyy")}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-secondary p-8 rounded-2xl border border-border shadow-md">
                        <div className="flex justify-between items-center mb-6 border-b border-border/50 pb-3">
                            <h2 className="text-xl font-black text-primary uppercase tracking-tighter">{t("payment.history")}</h2>
                            <Link href="/admin/payments" className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest">{t("dashboard.viewAll")}</Link>
                        </div>
                        <div className="space-y-4">
                            {(player.payments || []).slice(0, 5).map((payment: any) => {
                                const eventNames = payment.paymentEvents
                                    ?.map((pe: any) => pe.eventPlayer?.event?.name)
                                    .filter(Boolean)
                                    .join(", ")

                                return (
                                    <Link
                                        key={payment.id}
                                        href={`/admin/payments/${payment.id}`}
                                        className="block p-4 bg-muted/40 hover:bg-muted/60 rounded-xl transition-all border border-border/50 group"
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-sm font-black text-green-500 group-hover:scale-110 transition-transform origin-left">₪{payment.amount.toFixed(2)}</span>
                                            <span className="text-[10px] font-medium text-muted-foreground uppercase">{format(new Date(payment.paymentDate), language === "he" ? "dd/MM/yyyy" : "MMM dd")}</span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase truncate tracking-tight">
                                            {eventNames || payment.notes || t("payment.general_payment")}
                                        </p>
                                    </Link>
                                )
                            })}
                            {(player.payments || []).length === 0 && (
                                <p className="text-xs text-muted-foreground italic text-center py-6">{t("payment.none")}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
