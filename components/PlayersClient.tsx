"use client"

import { useState } from "react"
import Link from "next/link"
import { DeleteButton } from "@/components/DeleteButton"
import { useLanguage } from "@/contexts/LanguageContext"
import JSZip from "jszip"

interface PlayersClientProps {
    players: any[]
}

export function PlayersClient({ players }: PlayersClientProps) {
    const { t, language } = useLanguage()
    const [isExporting, setIsExporting] = useState(false)

    const handleExportAllUnpaid = async () => {
        setIsExporting(true)
        try {
            const playersWithUnpaid = players.filter(p => {
                return p.eventPlayers.some((ep: any) => {
                    const paid = (ep.paymentEvents || []).reduce((sum: number, pay: any) => sum + pay.amount, 0)
                    return paid < ep.fee
                })
            })

            if (playersWithUnpaid.length === 0) {
                alert(language === "he" ? "לא נמצאו שחקנים עם אירועים שלא שולמו." : "No players found with unpaid events.")
                return
            }

            const defaultZipName = `Unpaid_Statements_${new Date().toISOString().split('T')[0]}`
            const zipFilename = prompt(
                language === "he" ? "הכנס שם עבור קובץ ה-ZIP:" : "Enter a name for the ZIP archive:",
                defaultZipName
            )
            if (!zipFilename) return

            const zip = new JSZip()

            for (const player of playersWithUnpaid) {
                const unpaidEvents = player.eventPlayers.filter((ep: any) => {
                    const paid = (ep.paymentEvents || []).reduce((sum: number, pay: any) => sum + pay.amount, 0)
                    return paid < ep.fee
                })

                // Get the PDF as a blob
                const { generatePlayerStatementBlob } = await import("@/lib/pdfGenerator")
                const pdfBlob = generatePlayerStatementBlob(player, unpaidEvents)

                const filename = `Statement_${player.fullName.replace(/\s+/g, '_')}.pdf`
                zip.file(filename, pdfBlob)
            }

            const content = await zip.generateAsync({ type: "blob" })
            const link = document.createElement("a")
            link.href = URL.createObjectURL(content)
            link.download = `${zipFilename}.zip`
            link.click()

        } catch (error) {
            console.error("Bulk export failed", error)
            alert(language === "he" ? "הייצוא נכשל. בדוק את הקונסול לפרטים." : "Export failed. Check console for details.")
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <div className="space-y-4" dir={language === "he" ? "rtl" : "ltr"}>
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-primary">{t("nav.players")}</h1>
                <div className={`flex items-center ${language === "he" ? "space-x-reverse space-x-3" : "space-x-3"}`}>
                    <button
                        onClick={handleExportAllUnpaid}
                        disabled={isExporting}
                        className="bg-secondary hover:bg-muted text-foreground border border-border px-4 py-2 rounded transition-colors disabled:opacity-50 font-medium shadow-sm"
                    >
                        {isExporting ? t("action.exporting") : t("action.export_all_unpaid")}
                    </button>
                    <Link
                        href="/admin/players/new"
                        className="bg-primary hover:bg-primary/90 text-black font-bold px-4 py-2 rounded transition-colors shadow-sm"
                    >
                        {t("action.addPlayer")}
                    </Link>
                </div>
            </div>

            <div className="bg-secondary rounded-lg shadow-sm border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className={`px-6 py-3 font-bold text-muted-foreground text-xs uppercase tracking-wider ${language === "he" ? "text-right" : "text-left"}`}>
                                    {t("table.name")}
                                </th>
                                <th className={`px-6 py-3 font-bold text-muted-foreground text-xs uppercase tracking-wider ${language === "he" ? "text-right" : "text-left"}`}>
                                    {t("table.email")}
                                </th>
                                <th className={`px-6 py-3 font-bold text-muted-foreground text-xs uppercase tracking-wider ${language === "he" ? "text-right" : "text-left"}`}>
                                    {t("table.phone")}
                                </th>
                                <th className={`px-6 py-3 font-bold text-muted-foreground text-xs uppercase tracking-wider ${language === "he" ? "text-right" : "text-left"}`}>
                                    {t("table.events")}
                                </th>
                                <th className={`px-6 py-3 font-bold text-muted-foreground text-xs uppercase tracking-wider ${language === "he" ? "text-right" : "text-left"}`}>
                                    {t("table.actions")}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-foreground">
                            {players.map((player: any) => (
                                <tr key={player.id} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Link href={`/admin/players/${player.id}`} className="text-sm font-bold text-primary hover:text-primary/80 transition-all">
                                            {player.fullName}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {player.email}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {player.phone || "-"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {player.eventPlayers.length} {t("table.events").toLowerCase()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className={`flex items-center ${language === "he" ? "space-x-reverse space-x-4" : "space-x-4"}`}>
                                            <Link
                                                href={`/admin/players/${player.id}`}
                                                className="text-primary hover:text-primary/80 font-bold transition-colors"
                                            >
                                                {t("common.view_details")}
                                            </Link>
                                            <DeleteButton id={player.id} type="players" />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
