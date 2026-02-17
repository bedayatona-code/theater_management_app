"use client"

import { format } from "date-fns"
import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"

interface PlayerPortalClientProps {
    player: any
}

export function PlayerPortalClient({ player }: PlayerPortalClientProps) {
    const { t, language } = useLanguage()

    const totalFees = player.eventPlayers.reduce((sum: number, ep: any) => sum + ep.fee, 0)
    const totalPaid = player.payments.reduce((sum: number, p: any) => sum + p.amount, 0)

    return (
        <div className="space-y-6" dir={language === "he" ? "rtl" : "ltr"}>
            <h1 className="text-3xl font-bold text-foreground">
                {t("player.welcome")} {player.fullName}
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-secondary border border-border p-6 rounded-lg shadow-sm">
                    <h2 className="text-muted-foreground text-sm font-medium">{t("player.total_events")}</h2>
                    <p className="text-3xl font-bold mt-2 text-foreground">{player.eventPlayers.length}</p>
                </div>

                <div className="bg-secondary border border-border p-6 rounded-lg shadow-sm">
                    <h2 className="text-muted-foreground text-sm font-medium">{t("player.total_fees_currency")}</h2>
                    <p className="text-3xl font-bold mt-2 text-foreground">₪{totalFees.toFixed(2)}</p>
                </div>

                <div className="bg-secondary border border-border p-6 rounded-lg shadow-sm">
                    <h2 className="text-muted-foreground text-sm font-medium">{t("player.outstanding_currency")}</h2>
                    <p className="text-3xl font-bold mt-2 text-red-600">
                        ₪{(totalFees - totalPaid).toFixed(2)}
                    </p>
                </div>
            </div>

            <div className="bg-secondary border border-border p-6 rounded-lg shadow-sm">
                <h2 className="text-xl font-bold mb-4 text-foreground">{t("player.events_fees")}</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted">
                            <tr>
                                <th className={`px-6 py-3 text-xs font-medium text-muted-foreground uppercase ${language === "he" ? "text-right" : "text-left"}`}>
                                    {t("table.event")}
                                </th>
                                <th className={`px-6 py-3 text-xs font-medium text-muted-foreground uppercase ${language === "he" ? "text-right" : "text-left"}`}>
                                    {t("table.date")}
                                </th>
                                <th className={`px-6 py-3 text-xs font-medium text-muted-foreground uppercase ${language === "he" ? "text-right" : "text-left"}`}>
                                    {t("player.role")}
                                </th>
                                <th className={`px-6 py-3 text-xs font-medium text-muted-foreground uppercase ${language === "he" ? "text-right" : "text-left"}`}>
                                    {t("player.fee_currency")}
                                </th>
                                <th className={`px-6 py-3 text-xs font-medium text-muted-foreground uppercase ${language === "he" ? "text-right" : "text-left"}`}>
                                    {t("player.paid_currency")}
                                </th>
                                <th className={`px-6 py-3 text-xs font-medium text-muted-foreground uppercase ${language === "he" ? "text-right" : "text-left"}`}>
                                    {t("player.status")}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-secondary divide-y divide-border">
                            {player.eventPlayers.map((ep: any) => {
                                const paid = (ep.paymentEvents || []).reduce((sum: number, pe: any) => sum + pe.amount, 0)
                                return (
                                    <tr key={ep.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                                            {ep.event.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                            {format(new Date(ep.event.date), language === "he" ? "dd/MM/yyyy" : "MMM dd, yyyy")}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                            {ep.role || "-"}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                            ₪{ep.fee.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                            ₪{paid.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`px-2 py-1 text-xs rounded ${ep.paymentStatus === "FULLY_PAID"
                                                    ? "bg-green-100 text-green-800"
                                                    : ep.paymentStatus === "PARTIALLY_PAID"
                                                        ? "bg-orange-100 text-orange-800"
                                                        : "bg-red-100 text-red-800"
                                                    }`}
                                            >
                                                {t(`player.status.${ep.paymentStatus.toLowerCase()}` as any)}
                                            </span>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-secondary border border-border p-6 rounded-lg shadow-sm">
                <h2 className="text-xl font-bold mb-4 text-foreground">{t("payment.history")}</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted">
                            <tr>
                                <th className={`px-6 py-3 text-xs font-medium text-muted-foreground uppercase ${language === "he" ? "text-right" : "text-left"}`}>
                                    {t("table.date")}
                                </th>
                                <th className={`px-6 py-3 text-xs font-medium text-muted-foreground uppercase ${language === "he" ? "text-right" : "text-left"}`}>
                                    {t("table.event")}
                                </th>
                                <th className={`px-6 py-3 text-xs font-medium text-muted-foreground uppercase ${language === "he" ? "text-right" : "text-left"}`}>
                                    {t("player.amount_currency")}
                                </th>
                                <th className={`px-6 py-3 text-xs font-medium text-muted-foreground uppercase ${language === "he" ? "text-right" : "text-left"}`}>
                                    {t("payment.bank")}
                                </th>
                                <th className={`px-6 py-3 text-xs font-medium text-muted-foreground uppercase ${language === "he" ? "text-right" : "text-left"}`}>
                                    {t("payment.receipt")}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-secondary divide-y divide-border">
                            {player.payments.map((payment: any) => (
                                <tr key={payment.id} className="hover:bg-muted/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                        {format(new Date(payment.paymentDate), language === "he" ? "dd/MM/yyyy" : "MMM dd, yyyy")}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                        {payment.paymentEvents && payment.paymentEvents.length > 0
                                            ? payment.paymentEvents.map((pe: any) => pe.eventPlayer?.event?.name).filter(Boolean).join(", ")
                                            : "-"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                                        ₪{payment.amount.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                        {payment.bankAccount || "-"} {payment.bankNumber ? `(${payment.bankNumber})` : ""}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {payment.receiptLink ? (
                                            <a
                                                href={payment.receiptLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary hover:underline font-bold"
                                            >
                                                {t("payment.view_receipt")}
                                            </a>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-secondary border border-border p-6 rounded-lg shadow-sm">
                <h2 className="text-xl font-bold mb-4 text-foreground">{t("reports.title")} / {t("reports.type.suggestion")}</h2>
                <Link
                    href="/player/report"
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 inline-block transition-colors font-bold shadow-sm"
                >
                    {t("reports.submit")}
                </Link>
            </div>
        </div>
    )
}
