"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { DeleteButton } from "@/components/DeleteButton"
import { useLanguage } from "@/contexts/LanguageContext"
import { normalizePhoneForWhatsapp, formatCurrency } from "@/lib/formatters"
import JSZip from "jszip"

interface PlayersClientProps {
    players: any[]
}

interface WhatsappEntry {
    player: any
    unpaidEvents: any[]
    pdfBlob: Blob
    pdfUrl: string
    phoneNorm: string | null
    totalRemaining: number
}

const DEFAULT_WA_TEMPLATES: Record<string, string> = {
    en: "Hi {name},\n\nAttached is your unpaid events statement{range}.\nOutstanding balance: {amount}\n\nThank you.",
    he: "שלום {name},\n\nמצורפת הצהרת אירועים שלא שולמו{range}.\nיתרה לתשלום: {amount}\n\nתודה.",
}

const WA_TEMPLATE_STORAGE_KEY = (lang: string) => `theater_wa_template_${lang}`

export function PlayersClient({ players }: PlayersClientProps) {
    const { t, language } = useLanguage()
    const [isExporting, setIsExporting] = useState(false)
    const [isPreparingWa, setIsPreparingWa] = useState(false)
    const [fromDate, setFromDate] = useState("")
    const [toDate, setToDate] = useState("")
    const [waEntries, setWaEntries] = useState<WhatsappEntry[]>([])
    const [showWaDialog, setShowWaDialog] = useState(false)
    const [waTemplate, setWaTemplate] = useState<string>("")

    const isFiltering = fromDate !== "" || toDate !== ""

    // Load the message template from localStorage (or default) whenever the UI language changes.
    useEffect(() => {
        if (typeof window === "undefined") return
        const stored = localStorage.getItem(WA_TEMPLATE_STORAGE_KEY(language))
        setWaTemplate(stored ?? (DEFAULT_WA_TEMPLATES[language] || DEFAULT_WA_TEMPLATES.en))
    }, [language])

    // Clean up object URLs when the dialog closes / component unmounts
    useEffect(() => {
        return () => {
            waEntries.forEach(e => URL.revokeObjectURL(e.pdfUrl))
        }
    }, [waEntries])

    const handleTemplateChange = (val: string) => {
        setWaTemplate(val)
        if (typeof window !== "undefined") {
            localStorage.setItem(WA_TEMPLATE_STORAGE_KEY(language), val)
        }
    }

    const handleResetTemplate = () => {
        if (typeof window !== "undefined") {
            localStorage.removeItem(WA_TEMPLATE_STORAGE_KEY(language))
        }
        setWaTemplate(DEFAULT_WA_TEMPLATES[language] || DEFAULT_WA_TEMPLATES.en)
    }

    const filterUnpaidEvents = (eventPlayers: any[]) => {
        const from = fromDate ? new Date(fromDate) : null
        const to = toDate ? new Date(toDate + "T23:59:59") : null
        return eventPlayers.filter((ep: any) => {
            const paid = (ep.paymentEvents || []).reduce((sum: number, pay: any) => sum + pay.amount, 0)
            if (paid >= ep.fee) return false
            if (isFiltering) {
                const eventDate = new Date(ep.event.date)
                if (from && eventDate < from) return false
                if (to && eventDate > to) return false
            }
            return true
        })
    }

    const buildRangePart = (): string => {
        if (!isFiltering) return ""
        const f = fromDate ? new Date(fromDate).toLocaleDateString(language === "he" ? "he-IL" : "en-US") : "—"
        const tt = toDate ? new Date(toDate).toLocaleDateString(language === "he" ? "he-IL" : "en-US") : "—"
        return language === "he"
            ? ` (לתקופה ${f} - ${tt})`
            : ` (for ${f} - ${tt})`
    }

    const buildWaMessage = (entry: WhatsappEntry): string => {
        const name = entry.player.fullName
        const amount = formatCurrency(entry.totalRemaining)
        const rangePart = buildRangePart()
        const template = waTemplate || DEFAULT_WA_TEMPLATES[language] || DEFAULT_WA_TEMPLATES.en
        return template
            .replace(/\{name\}/g, name)
            .replace(/\{amount\}/g, amount)
            .replace(/\{range\}/g, rangePart)
    }

    const handleExportAllUnpaid = async () => {
        setIsExporting(true)
        try {
            const playersWithUnpaid = players
                .map(p => ({ player: p, unpaidEvents: filterUnpaidEvents(p.eventPlayers) }))
                .filter(x => x.unpaidEvents.length > 0)

            if (playersWithUnpaid.length === 0) {
                alert(language === "he" ? "לא נמצאו שחקנים עם אירועים שלא שולמו בטווח שנבחר." : "No players found with unpaid events in the selected range.")
                return
            }

            const defaultZipName = `Unpaid_Statements_${new Date().toISOString().split('T')[0]}`
            const zipFilename = prompt(
                language === "he" ? "הכנס שם עבור קובץ ה-ZIP:" : "Enter a name for the ZIP archive:",
                defaultZipName
            )
            if (!zipFilename) return

            const zip = new JSZip()
            const { generatePlayerStatementBlob } = await import("@/lib/pdfGenerator")
            const dateRange = isFiltering ? { from: fromDate || undefined, to: toDate || undefined } : undefined

            for (const { player, unpaidEvents } of playersWithUnpaid) {
                const pdfBlob = generatePlayerStatementBlob(player, unpaidEvents, { dateRange })
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

    const handlePrepareWhatsApp = async () => {
        setIsPreparingWa(true)
        try {
            const playersWithUnpaid = players
                .map(p => ({ player: p, unpaidEvents: filterUnpaidEvents(p.eventPlayers) }))
                .filter(x => x.unpaidEvents.length > 0)

            if (playersWithUnpaid.length === 0) {
                alert(language === "he" ? "לא נמצאו שחקנים עם אירועים שלא שולמו בטווח שנבחר." : "No players found with unpaid events in the selected range.")
                return
            }

            const { generatePlayerStatementBlob } = await import("@/lib/pdfGenerator")
            const dateRange = isFiltering ? { from: fromDate || undefined, to: toDate || undefined } : undefined

            // Revoke any URLs from a prior open of the dialog
            waEntries.forEach(e => URL.revokeObjectURL(e.pdfUrl))

            const entries: WhatsappEntry[] = playersWithUnpaid.map(({ player, unpaidEvents }) => {
                const pdfBlob = generatePlayerStatementBlob(player, unpaidEvents, { dateRange })
                const totalRemaining = unpaidEvents.reduce((sum: number, ep: any) => {
                    const paid = (ep.paymentEvents || []).reduce((s: number, pe: any) => s + pe.amount, 0)
                    return sum + (ep.fee - paid)
                }, 0)
                return {
                    player,
                    unpaidEvents,
                    pdfBlob,
                    pdfUrl: URL.createObjectURL(pdfBlob),
                    phoneNorm: normalizePhoneForWhatsapp(player.phone),
                    totalRemaining,
                }
            })

            // Sort: ones with valid phone first, then alphabetical
            entries.sort((a, b) => {
                if (!!a.phoneNorm !== !!b.phoneNorm) return a.phoneNorm ? -1 : 1
                return a.player.fullName.localeCompare(b.player.fullName)
            })

            setWaEntries(entries)
            setShowWaDialog(true)
        } catch (error) {
            console.error("WhatsApp prepare failed", error)
            alert(language === "he" ? "הכנת הוואטסאפ נכשלה. בדוק את הקונסול לפרטים." : "Preparing WhatsApp failed. Check console for details.")
        } finally {
            setIsPreparingWa(false)
        }
    }

    const handleDownloadPdf = (entry: WhatsappEntry) => {
        const link = document.createElement("a")
        link.href = entry.pdfUrl
        link.download = `Statement_${entry.player.fullName.replace(/\s+/g, '_')}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const handleSendOne = (entry: WhatsappEntry) => {
        // 1. Trigger the PDF download so the user can drag it into WhatsApp
        handleDownloadPdf(entry)

        // 2. Open WhatsApp click-to-chat with pre-filled text in a new tab
        if (entry.phoneNorm) {
            const msg = buildWaMessage(entry)
            const url = `https://wa.me/${entry.phoneNorm}?text=${encodeURIComponent(msg)}`
            window.open(url, '_blank', 'noopener,noreferrer')
        }
    }

    const handleCloseWaDialog = () => {
        waEntries.forEach(e => URL.revokeObjectURL(e.pdfUrl))
        setWaEntries([])
        setShowWaDialog(false)
    }

    return (
        <div className="space-y-4" dir={language === "he" ? "rtl" : "ltr"}>
            <div className={`flex flex-col md:flex-row md:justify-between md:items-center gap-4`}>
                <h1 className="text-3xl font-bold text-primary">{t("nav.players")}</h1>
                <div className={`flex flex-wrap items-center gap-2 ${language === "he" ? "flex-row-reverse" : ""}`}>
                    <div className={`flex items-center gap-1 ${language === "he" ? "flex-row-reverse" : ""}`}>
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest whitespace-nowrap">{t("filter.from_date")}</label>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="px-2 py-1.5 bg-secondary border border-border rounded-lg text-foreground text-xs focus:ring-2 focus:ring-primary outline-none"
                        />
                    </div>
                    <div className={`flex items-center gap-1 ${language === "he" ? "flex-row-reverse" : ""}`}>
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest whitespace-nowrap">{t("filter.to_date")}</label>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="px-2 py-1.5 bg-secondary border border-border rounded-lg text-foreground text-xs focus:ring-2 focus:ring-primary outline-none"
                        />
                    </div>
                    {isFiltering && (
                        <button
                            onClick={() => { setFromDate(""); setToDate("") }}
                            className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-muted-foreground border border-border rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            {t("filter.clear")}
                        </button>
                    )}
                    <button
                        onClick={handleExportAllUnpaid}
                        disabled={isExporting}
                        className="bg-secondary hover:bg-muted text-foreground border border-border px-4 py-2 rounded transition-colors disabled:opacity-50 font-medium shadow-sm"
                    >
                        {isExporting ? t("action.exporting") : t("action.export_all_unpaid")}
                    </button>
                    <button
                        onClick={handlePrepareWhatsApp}
                        disabled={isPreparingWa}
                        className="bg-green-500 hover:bg-green-600 text-white border border-green-600 px-4 py-2 rounded transition-colors disabled:opacity-50 font-bold shadow-sm"
                    >
                        {isPreparingWa ? t("whatsapp.preparing") : t("whatsapp.send_all")}
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

            {/* WhatsApp Send Dialog */}
            {showWaDialog && (
                <div
                    className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
                    onClick={handleCloseWaDialog}
                >
                    <div
                        className="bg-background border border-border rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                        dir={language === "he" ? "rtl" : "ltr"}
                    >
                        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
                            <h2 className="text-xl font-black text-foreground">{t("whatsapp.dialog_title")}</h2>
                            <button
                                onClick={handleCloseWaDialog}
                                className="text-muted-foreground hover:text-foreground text-2xl leading-none px-2"
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>
                        <div className="px-6 py-3 border-b border-border bg-muted/30 space-y-3">
                            <p className="text-sm text-muted-foreground">{t("whatsapp.instructions")}</p>
                            <details className="group">
                                <summary className="cursor-pointer text-xs font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1.5 select-none">
                                    <span className="transition-transform inline-block group-open:rotate-90">▶</span>
                                    {t("whatsapp.customize_message")}
                                </summary>
                                <div className="mt-3 space-y-2 bg-background p-3 rounded-lg border border-border">
                                    <div className={`flex flex-wrap items-center justify-between gap-2 ${language === "he" ? "flex-row-reverse" : ""}`}>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                            {t("whatsapp.template_placeholders")}:{" "}
                                            <code className="font-mono bg-muted/60 px-1.5 py-0.5 rounded normal-case">{"{name}"}</code>{" "}
                                            <code className="font-mono bg-muted/60 px-1.5 py-0.5 rounded normal-case">{"{amount}"}</code>{" "}
                                            <code className="font-mono bg-muted/60 px-1.5 py-0.5 rounded normal-case">{"{range}"}</code>
                                        </p>
                                        <button
                                            onClick={handleResetTemplate}
                                            className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest"
                                        >
                                            {t("whatsapp.reset_template")}
                                        </button>
                                    </div>
                                    <textarea
                                        value={waTemplate}
                                        onChange={(e) => handleTemplateChange(e.target.value)}
                                        rows={6}
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none font-mono"
                                        dir={language === "he" ? "rtl" : "ltr"}
                                    />
                                    <p className="text-[10px] text-muted-foreground italic">
                                        {t("whatsapp.template_saved")}
                                    </p>
                                    {waEntries.length > 0 && (
                                        <div className="mt-2 p-3 bg-muted/40 rounded-lg border border-border/50">
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                                                {t("whatsapp.preview")}:
                                            </p>
                                            <pre className="text-xs whitespace-pre-wrap font-sans text-foreground" dir={language === "he" ? "rtl" : "ltr"}>
                                                {buildWaMessage(waEntries[0])}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </details>
                        </div>
                        <div className="overflow-y-auto flex-1">
                            <table className="min-w-full divide-y divide-border">
                                <thead className="bg-muted/40 sticky top-0">
                                    <tr>
                                        <th className={`px-4 py-2.5 font-bold text-muted-foreground text-xs uppercase tracking-wider ${language === "he" ? "text-right" : "text-left"}`}>
                                            {t("table.name")}
                                        </th>
                                        <th className={`px-4 py-2.5 font-bold text-muted-foreground text-xs uppercase tracking-wider ${language === "he" ? "text-right" : "text-left"}`}>
                                            {t("table.phone")}
                                        </th>
                                        <th className={`px-4 py-2.5 font-bold text-muted-foreground text-xs uppercase tracking-wider ${language === "he" ? "text-right" : "text-left"}`}>
                                            {t("nav.events")}
                                        </th>
                                        <th className={`px-4 py-2.5 font-bold text-muted-foreground text-xs uppercase tracking-wider ${language === "he" ? "text-right" : "text-left"}`}>
                                            {t("whatsapp.total_outstanding")}
                                        </th>
                                        <th className={`px-4 py-2.5 font-bold text-muted-foreground text-xs uppercase tracking-wider ${language === "he" ? "text-right" : "text-left"}`}>
                                            {t("table.actions")}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border text-foreground">
                                    {waEntries.map((entry) => {
                                        const hasPhone = !!entry.player.phone
                                        const validPhone = !!entry.phoneNorm
                                        return (
                                            <tr key={entry.player.id} className="hover:bg-muted/20 transition-colors">
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-bold">
                                                    {entry.player.fullName}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-xs font-mono">
                                                    {validPhone ? (
                                                        <span className="text-foreground">+{entry.phoneNorm}</span>
                                                    ) : hasPhone ? (
                                                        <span className="text-orange-500" title={entry.player.phone}>
                                                            {entry.player.phone} ({t("whatsapp.invalid_phone")})
                                                        </span>
                                                    ) : (
                                                        <span className="text-red-500">{t("whatsapp.no_phone")}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                                                    {entry.unpaidEvents.length}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-red-500">
                                                    {formatCurrency(entry.totalRemaining)}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className={`flex items-center gap-2 ${language === "he" ? "flex-row-reverse" : ""}`}>
                                                        {validPhone ? (
                                                            <button
                                                                onClick={() => handleSendOne(entry)}
                                                                className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded transition-all uppercase shadow-sm inline-flex items-center gap-1.5"
                                                            >
                                                                <span>📱</span> {t("whatsapp.send")}
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleDownloadPdf(entry)}
                                                                className="px-3 py-1.5 bg-secondary hover:bg-muted text-foreground border border-border text-xs font-bold rounded transition-all uppercase shadow-sm"
                                                            >
                                                                {t("whatsapp.download_only")}
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-6 py-3 border-t border-border flex justify-end">
                            <button
                                onClick={handleCloseWaDialog}
                                className="px-4 py-2 bg-secondary hover:bg-muted text-foreground border border-border rounded-lg text-sm font-bold uppercase tracking-wider transition-all"
                            >
                                {t("whatsapp.close")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
