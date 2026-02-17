"use client"

import { useLanguage } from "@/contexts/LanguageContext"

export function ExportButtons() {
    const { t } = useLanguage()

    const handleExport = (type: string) => {
        window.location.href = `/api/admin/export?type=${type}`
    }

    return (
        <div className="flex flex-wrap gap-2">
            <button
                onClick={() => handleExport("players")}
                className="px-4 py-2 text-sm font-medium rounded-md border border-primary text-primary hover:bg-primary hover:text-black transition-colors"
            >
                {t("export.players")}
            </button>
            <button
                onClick={() => handleExport("events")}
                className="px-4 py-2 text-sm font-medium rounded-md border border-primary text-primary hover:bg-primary hover:text-black transition-colors"
            >
                {t("export.events")}
            </button>
            <button
                onClick={() => handleExport("payments")}
                className="px-4 py-2 text-sm font-medium rounded-md border border-primary text-primary hover:bg-primary hover:text-black transition-colors"
            >
                {t("export.payments")}
            </button>
        </div>
    )
}
