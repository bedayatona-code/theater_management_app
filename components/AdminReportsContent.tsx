"use client"

import { useLanguage } from "@/contexts/LanguageContext"
import { ReportsClient } from "@/components/ReportsClient"
import Link from "next/link"

export function AdminReportsContent({ initialReports }: { initialReports: any[] }) {
    const { t, language } = useLanguage()

    return (
        <div className="space-y-6" dir={language === "he" ? "rtl" : "ltr"}>
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-primary">{t("reports.admin_title")}</h1>
                <Link
                    href="/admin/players/payments-summary"
                    className="bg-primary hover:bg-primary/90 text-black px-4 py-2 rounded-lg transition-all font-bold shadow-sm active:scale-95 text-xs uppercase tracking-widest"
                >
                    💰 {t("nav.payments_summary")}
                </Link>
            </div>
            <ReportsClient initialReports={initialReports} />
        </div>
    )
}
