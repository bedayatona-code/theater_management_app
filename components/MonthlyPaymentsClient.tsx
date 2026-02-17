"use client"

import { useState, useMemo } from "react"
import { format } from "date-fns"
import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatCurrency } from "@/lib/formatters"

interface MonthlyPaymentsClientProps {
    payments: any[]
}

export function MonthlyPaymentsClient({ payments }: MonthlyPaymentsClientProps) {
    const { t, language } = useLanguage()
    const now = new Date()
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
    const [selectedYear, setSelectedYear] = useState(now.getFullYear())

    const months = Array.from({ length: 12 }, (_, i) => {
        const date = new Date(2000, i, 1)
        return {
            value: i,
            label: date.toLocaleString(language === "he" ? "he-IL" : "en-US", { month: "long" })
        }
    })

    const years = useMemo(() => {
        const uniqueYears = Array.from(new Set(payments.map(p => new Date(p.paymentDate).getFullYear())))
        if (!uniqueYears.includes(now.getFullYear())) uniqueYears.push(now.getFullYear())
        return uniqueYears.sort((a, b) => b - a)
    }, [payments])

    const filteredPayments = useMemo(() => {
        return payments.filter(payment => {
            const date = new Date(payment.paymentDate)
            return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear
        }).sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
    }, [payments, selectedMonth, selectedYear])

    const totalAmount = useMemo(() => {
        return filteredPayments.reduce((sum, p) => sum + p.amount, 0)
    }, [filteredPayments])

    return (
        <div className="space-y-6" dir={language === "he" ? "rtl" : "ltr"}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <Link href="/admin/payments" className="text-primary hover:text-primary/80 mb-2 block font-medium">
                        ← {t("nav.payments")}
                    </Link>
                    <h1 className="text-3xl font-bold text-primary tracking-tight">{t("payment.monthly_report")}</h1>
                </div>

                <div className="flex flex-wrap items-center gap-4 bg-secondary p-4 rounded-xl border border-border shadow-sm">
                    <div className="flex flex-col">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-60">
                            {t("payment.select_month")}
                        </label>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                            className="bg-muted border border-border rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-primary outline-none transition-all"
                        >
                            {months.map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-60">
                            {t("payment.select_year")}
                        </label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="bg-muted border border-border rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-primary outline-none transition-all"
                        >
                            {years.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-secondary p-6 rounded-2xl border border-border shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">
                        {t("payment.total_for_month")}
                    </p>
                    <p className="text-3xl font-black text-primary mt-1">
                        {formatCurrency(totalAmount)}
                    </p>
                </div>
                <div className="bg-primary/10 px-4 py-2 rounded-lg border border-primary/20">
                    <p className="text-xs font-bold text-primary">
                        {filteredPayments.length} {t("dashboard.items")}
                    </p>
                </div>
            </div>

            <div className="bg-secondary rounded-xl shadow-md border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border/50">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className={`px-6 py-4 font-bold text-muted-foreground text-[10px] uppercase tracking-widest ${language === "he" ? "text-right" : "text-left"}`}>
                                    {t("table.date")}
                                </th>
                                <th className={`px-6 py-4 font-bold text-muted-foreground text-[10px] uppercase tracking-widest ${language === "he" ? "text-right" : "text-left"}`}>
                                    {t("table.player")}
                                </th>
                                <th className={`px-6 py-4 font-bold text-muted-foreground text-[10px] uppercase tracking-widest ${language === "he" ? "text-right" : "text-left"}`}>
                                    {t("nav.events")}
                                </th>
                                <th className={`px-6 py-4 font-bold text-muted-foreground text-[10px] uppercase tracking-widest ${language === "he" ? "text-right" : "text-left"}`}>
                                    {t("payment.amount")}
                                </th>
                                <th className={`px-6 py-4 font-bold text-muted-foreground text-[10px] uppercase tracking-widest ${language === "he" ? "text-right" : "text-left"}`}>
                                    {language === "he" ? "אמצעי תשלום" : "Method"}
                                </th>
                                <th className={`px-6 py-4 font-bold text-muted-foreground text-[10px] uppercase tracking-widest ${language === "he" ? "text-right" : "text-left"}`}>
                                    {language === "he" ? "מס' צ'ק / אסמכתא" : "Check / Ref"}
                                </th>
                                <th className={`px-6 py-4 font-bold text-muted-foreground text-[10px] uppercase tracking-widest ${language === "he" ? "text-right" : "text-left"}`}>
                                    {t("payment.receipt")}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30 text-foreground">
                            {filteredPayments.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground italic">
                                        {t("payment.no_payments_month")}
                                    </td>
                                </tr>
                            ) : (
                                filteredPayments.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-muted/30 transition-colors group">
                                        <td className="px-6 py-5 whitespace-nowrap text-sm font-medium">
                                            {format(new Date(payment.paymentDate), language === "he" ? "dd/MM/yyyy" : "MMM dd, yyyy")}
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap text-sm">
                                            {payment.player ? (
                                                <Link
                                                    href={`/admin/players/${payment.player.id}`}
                                                    className="text-primary hover:text-primary/80 transition-all font-bold underline decoration-primary/30 underline-offset-4"
                                                >
                                                    {payment.player.fullName}
                                                </Link>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap text-sm text-muted-foreground font-medium">
                                            {payment.paymentEvents?.map((pe: any) => pe.eventPlayer?.event?.name).filter(Boolean).join(", ") || t("payment.general_payment")}
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap text-sm font-black text-green-500">
                                            {formatCurrency(payment.amount)}
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap text-sm text-muted-foreground">
                                            {payment.paymentMethod || "-"}
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap text-sm text-muted-foreground">
                                            {payment.checkNumber ? `${language === "he" ? "צ'ק" : "Check"}: ${payment.checkNumber}` : ""}
                                            {payment.checkNumber && payment.transactionReference ? " | " : ""}
                                            {payment.transactionReference || (!payment.checkNumber ? "-" : "")}
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap text-sm">
                                            <div className="flex items-center gap-3">
                                                <Link
                                                    href={`/admin/payments/${payment.id}`}
                                                    className="text-primary hover:text-primary/80 font-bold underline decoration-primary/30 underline-offset-4"
                                                >
                                                    {t("payment.view_details")}
                                                </Link>
                                                {payment.receiptLink && (
                                                    <a
                                                        href={payment.receiptLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all"
                                                    >
                                                        {t("payment.receipt")}
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
