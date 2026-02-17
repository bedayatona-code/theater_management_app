"use client"

import { useLanguage } from "@/contexts/LanguageContext"
import Link from "next/link"
import { format } from "date-fns"

export function PaymentDetailClient({ payment }: { payment: any }) {
    const { t, language } = useLanguage()

    return (
        <div className="space-y-8 animate-in fade-in duration-500" dir={language === "he" ? "rtl" : "ltr"}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <Link href="/admin/payments" className={`inline-flex items-center gap-2 text-primary hover:text-primary/80 mb-4 font-bold uppercase text-[10px] tracking-widest transition-all ${language === "he" ? "flex-row-reverse" : ""}`}>
                        {language === "he" ? "← חזרה לתשלומים" : "← Back to Payments"}
                    </Link>
                    <h1 className="text-4xl font-black text-foreground tracking-tight">{t("payment.details_title")}</h1>
                    <p className="text-muted-foreground font-mono text-xs mt-1 uppercase tracking-tighter opacity-70">{t("payment.id")}: {payment.id}</p>
                </div>
                <div className="flex items-center gap-3">
                    {payment.receiptLink && (
                        <a
                            href={payment.receiptLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-primary hover:bg-primary/90 text-black px-8 py-3 rounded-xl transition-all font-black shadow-lg shadow-primary/20 active:scale-95 text-xs uppercase tracking-widest"
                        >
                            {t("payment.receipt")}
                        </a>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Payment Main Info */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-secondary p-8 rounded-2xl shadow-md border border-border group hover:border-primary/20 transition-colors">
                        <h2 className="text-xl font-black mb-8 text-primary border-b border-border/50 pb-3 uppercase tracking-tighter">{t("payment.transaction_summary")}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                            <div className="border-b border-border/30 pb-4 group">
                                <span className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-60 group-hover:opacity-100 transition-opacity">{t("payment.amount_paid")}</span>
                                <span className="text-3xl font-black text-green-500">₪{payment.amount.toFixed(2)}</span>
                            </div>
                            <div className="border-b border-border/30 pb-4 group">
                                <span className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-60 group-hover:opacity-100 transition-opacity">{t("table.date")}</span>
                                <span className="text-xl font-bold text-foreground">{format(new Date(payment.paymentDate), language === "he" ? "dd/MM/yyyy" : "MMMM dd, yyyy")}</span>
                            </div>
                            <div className="border-b border-border/30 pb-4 group">
                                <span className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-60 group-hover:opacity-100 transition-opacity">{t("payment.bank")}</span>
                                <span className="text-lg font-bold text-foreground">{payment.bankAccount || t("common.not_specified")}</span>
                            </div>
                            <div className="border-b border-border/30 pb-4 group">
                                <span className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-60 group-hover:opacity-100 transition-opacity">{t("payment.bank_branch")}</span>
                                <span className="text-lg font-bold text-foreground">{payment.bankNumber || t("common.not_specified")}</span>
                            </div>
                        </div>
                    </div>

                    {/* Linked Events */}
                    <div className="bg-secondary p-8 rounded-2xl shadow-md border border-border">
                        <h2 className="text-xl font-black mb-8 text-primary border-b border-border/50 pb-3 uppercase tracking-tighter">{t("payment.linked_event")}</h2>
                        {payment.paymentEvents && payment.paymentEvents.length > 0 ? (
                            <div className="overflow-x-auto rounded-xl border border-border/30">
                                <table className="min-w-full divide-y divide-border/30">
                                    <thead className="bg-muted/50">
                                        <tr>
                                            <th className={`px-6 py-4 font-black text-muted-foreground text-[10px] uppercase tracking-widest ${language === "he" ? "text-right" : "text-left"}`}>{t("table.name")}</th>
                                            <th className={`px-6 py-4 font-black text-muted-foreground text-[10px] uppercase tracking-widest ${language === "he" ? "text-right" : "text-left"}`}>{t("table.date")}</th>
                                            <th className={`px-6 py-4 font-black text-muted-foreground text-[10px] uppercase tracking-widest ${language === "he" ? "text-right" : "text-left"}`}>{t("player.total_fees")}</th>
                                            <th className={`px-6 py-4 font-black text-muted-foreground text-[10px] uppercase tracking-widest ${language === "he" ? "text-right" : "text-left"}`}>{t("payment.amount")}</th>
                                            <th className={`px-6 py-4 font-black text-muted-foreground text-[10px] uppercase tracking-widest ${language === "he" ? "text-right" : "text-left"}`}>{t("player.role")}</th>
                                            <th className={`px-6 py-4 font-black text-muted-foreground text-[10px] uppercase tracking-widest ${language === "he" ? "text-right" : "text-left"}`}>{t("table.actions")}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/20 text-foreground text-sm font-medium">
                                        {payment.paymentEvents.map((pe: any) => (
                                            <tr key={pe.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-6 py-5 whitespace-nowrap font-black">{pe.eventPlayer.event.name}</td>
                                                <td className="px-6 py-5 whitespace-nowrap text-muted-foreground opacity-70">
                                                    {format(new Date(pe.eventPlayer.event.date), language === "he" ? "dd/MM/yyyy" : "MMM dd, yyyy")}
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap font-black">₪{pe.eventPlayer.fee.toFixed(2)}</td>
                                                <td className="px-6 py-5 whitespace-nowrap font-black text-green-500">₪{pe.amount.toFixed(2)}</td>
                                                <td className="px-6 py-5 whitespace-nowrap italic opacity-60">{pe.eventPlayer.role || "-"}</td>
                                                <td className="px-6 py-5 whitespace-nowrap">
                                                    <Link
                                                        href={`/admin/events/${pe.eventPlayer.eventId}`}
                                                        className="text-primary hover:text-primary/80 font-black underline decoration-primary/20 underline-offset-4 decoration-2 uppercase text-[10px] tracking-widest transition-all"
                                                    >
                                                        {t("common.view_details")}
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-12 text-center text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border/50">
                                <p className="font-bold uppercase tracking-widest text-xs">{t("alert.no_linked_event")}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Payer & Notes */}
                <div className="space-y-8">
                    {/* Payer Info */}
                    <div className="bg-secondary p-8 rounded-2xl shadow-md border border-border">
                        <h2 className="text-xl font-black mb-8 text-primary border-b border-border/50 pb-3 uppercase tracking-tighter">{t("payment.payer_profile")}</h2>
                        <div className={`flex items-center mb-8 ${language === "he" ? "space-x-reverse space-x-5" : "space-x-5"}`}>
                            <div className="w-20 h-20 rounded-full bg-muted border-4 border-primary/20 overflow-hidden flex items-center justify-center shadow-xl">
                                {payment.player.imageUrl ? (
                                    <img src={payment.player.imageUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-3xl font-black text-primary/30 uppercase">{payment.player.fullName.charAt(0)}</span>
                                )}
                            </div>
                            <div>
                                <p className="text-xl font-black text-foreground tracking-tight">{payment.player.fullName}</p>
                                <p className="text-xs text-muted-foreground font-bold mt-1 opacity-70">{payment.player.email}</p>
                            </div>
                        </div>
                        <Link
                            href={`/admin/players/${payment.player.id}`}
                            className="flex items-center justify-center gap-2 text-black bg-primary hover:bg-primary/90 px-6 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95"
                        >
                            {t("payment.go_to_profile")}
                        </Link>
                    </div>

                    {/* Notes */}
                    <div className="bg-secondary p-8 rounded-2xl shadow-md border border-border">
                        <h2 className="text-xl font-black mb-6 text-primary border-b border-border/50 pb-3 uppercase tracking-tighter">{t("payment.notes")}</h2>
                        <div className="p-6 bg-muted/40 rounded-xl border border-border/50 min-h-[150px] text-foreground text-sm font-medium leading-relaxed italic opacity-80">
                            {payment.notes || t("alert.no_payment_notes")}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
