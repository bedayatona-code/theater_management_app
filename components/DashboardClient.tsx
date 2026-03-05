"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { ExportButtons } from "@/components/ExportButtons"
import { ImportDialog } from "@/components/ImportDialog"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatNumber, formatCurrency } from "@/lib/formatters"

interface DashboardProps {
    stats: {
        totalEvents: number
        totalPlayers: number
        totalUnpaid: number
        totalPaid: number
        unpaidAmount: number
        paidAmount: number
        monthlyData: Array<{ label: string; income: number; expenses: number }>
        pieData: { paid: number; unpaid: number }
        pendingReportsCount: number
        budgetData: Array<{ category: string; budget: number; actual: number }>
        yearlyTotalBudget: number
    }
}

export function DashboardClient({ stats }: DashboardProps) {
    const { t, language } = useLanguage()
    const [backups, setBackups] = useState<any[]>([])
    const [showBackups, setShowBackups] = useState(false)
    const [loading, setLoading] = useState(false)
    const [overpaidList, setOverpaidList] = useState<any[]>([])
    const [importDialog, setImportDialog] = useState<{ isOpen: boolean, type: "players" | "events" }>({ isOpen: false, type: "players" })

    const maxVal = Math.max(...stats.monthlyData.map(d => Math.max(d.income, d.expenses))) || 1000

    const totalPie = stats.pieData.paid + stats.pieData.unpaid
    const paidAngle = totalPie > 0 ? (stats.pieData.paid / totalPie) * 360 : 0

    // Custom Pie Slice logic for SVG
    const getPieSlice = (startAngle: number, endAngle: number, color: string) => {
        const x1 = 50 + 40 * Math.cos((Math.PI * startAngle) / 180)
        const y1 = 50 + 40 * Math.sin((Math.PI * startAngle) / 180)
        const x2 = 50 + 40 * Math.cos((Math.PI * endAngle) / 180)
        const y2 = 50 + 40 * Math.sin((Math.PI * endAngle) / 180)
        const largeArc = endAngle - startAngle > 180 ? 1 : 0
        return (
            <path
                d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                fill={color}
            />
        )
    }

    const [driveBackups, setDriveBackups] = useState<any[]>([])
    const [fetchingDrive, setFetchingDrive] = useState(false)
    const [isDriveConnected, setIsDriveConnected] = useState(true)

    const fetchBackups = async () => {
        try {
            const res = await fetch("/api/admin/backup")
            const data = await res.json()
            setBackups(data)
        } catch (err) {
            console.error("Failed to fetch backups", err)
        }
    }

    const fetchDriveBackups = async () => {
        setFetchingDrive(true)
        try {
            const res = await fetch("/api/admin/backup/drive")
            const data = await res.json()
            if (res.ok) {
                setDriveBackups(data.files || [])
                // We only consider the drive "connected" (for UI purposes) if they are using their personal OAuth.
                // If it's the Service Account fallback, they must connect to their personal account to upload.
                setIsDriveConnected(data.authType === 'oauth')
            } else if (res.status === 401) {
                setIsDriveConnected(false)
            }
        } catch (err) {
            console.error("Failed to fetch drive backups", err)
        } finally {
            setFetchingDrive(false)
        }
    }

    const handlePullFromDrive = async (fileId: string, filename: string) => {
        setLoading(true)
        try {
            const res = await fetch("/api/admin/backup/drive", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileId, filename })
            })
            if (res.ok) {
                alert(language === "he" ? "הגיבוי הורד בהצלחה מהענן!" : "Backup downloaded from cloud successfully!")
                fetchBackups()
            } else {
                if (res.status === 401) {
                    setIsDriveConnected(false)
                }
                const data = await res.json()
                alert(`Pull failed: ${data.error}`)
            }
        } catch (err) {
            alert(t("alert.process_error"))
        } finally {
            setLoading(false)
        }
    }

    const fetchOverpaid = async () => {
        try {
            const res = await fetch("/api/admin/players/overpaid")
            if (res.ok) {
                const data = await res.json()
                setOverpaidList(data)
            }
        } catch (err) {
            console.error("Failed to fetch overpaid players", err)
        }
    }

    useEffect(() => {
        fetchOverpaid()
    }, [])

    const handleBackup = async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/admin/backup", { method: "POST" })
            const data = await res.json()
            if (res.ok) {
                const msg = language === "he"
                    ? `הגיבוי הושלם: ${data.filename}. הנתונים סונכרנו גם לענן.`
                    : `Backup complete: ${data.filename}. Data also synced to cloud.`
                alert(msg)
                fetchBackups()
                fetchDriveBackups()
            } else {
                const errorMsg = data.error || "Unknown error";
                alert(`Backup failed: ${errorMsg}`)

                if (res.status === 401 || errorMsg.includes("expired") || errorMsg.includes("invalid_grant")) {
                    setIsDriveConnected(false)
                }

                if (errorMsg.includes("Connect with Google") || errorMsg.includes("storage quota") || errorMsg.includes("expired") || errorMsg.includes("invalid_grant")) {
                    alert(language === "he"
                        ? "נראה שיש בעיית התחברות או נפח אחסון. אנא התחבר עם Google מחדש."
                        : "Google connection issue detected. Please re-connect with Google to use your 15GB quota.")
                }
            }
        } catch (err) {
            alert(t("alert.process_error"))
        } finally {
            setLoading(false)
        }
    }

    const handleRestore = async (filename: string) => {
        const confirmMsg = language === "he"
            ? `האם אתה בטוח שברצונך לשחזר מתוך ${filename}? הנתונים הנוכחיים יגובו אוטומטית לפני השחזור.`
            : `Are you sure you want to restore from ${filename}? Current data will be backed up automatically before restoration.`

        if (!confirm(confirmMsg)) {
            return
        }
        setLoading(true)
        try {
            const res = await fetch("/api/admin/backup/restore", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filename })
            })
            const data = await res.json()
            if (res.ok) {
                const successMsg = language === "he" ? "הנתונים שוחזרו בהצלחה! הדף יתרענן." : "Database restored successfully! Page will reload."
                alert(successMsg)
                window.location.reload()
            } else {
                alert(`Restore failed: ${data.error}`)
            }
        } catch (err) {
            alert(t("alert.process_error"))
        } finally {
            setLoading(false)
        }
    }

    const handleDismissOverpaid = async (playerId: string) => {
        try {
            const res = await fetch(`/api/admin/players/${playerId}/dismiss-overpayment`, {
                method: "POST"
            })
            if (res.ok) {
                setOverpaidList(prev => prev.filter(p => p.id !== playerId))
            }
        } catch (err) {
            console.error("Failed to dismiss overpayment notification", err)
        }
    }

    useEffect(() => {
        if (showBackups) {
            fetchBackups()
            fetchDriveBackups()
        }
    }, [showBackups])

    useEffect(() => {
        if (typeof window !== 'undefined' && window.location.hash === '#backups') {
            setShowBackups(true)
        }
    }, [])

    return (
        <div className="space-y-6" dir={language === "he" ? "rtl" : "ltr"}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold text-primary tracking-tight">{t("dashboard.title")}</h1>
                <div className={`flex flex-wrap items-center gap-3 ${language === "he" ? "flex-row-reverse" : ""}`}>
                    <button
                        id="btn-manage-backups"
                        onClick={() => setShowBackups(!showBackups)}
                        className="bg-secondary hover:bg-muted text-foreground border border-border px-4 py-2 rounded-lg transition-all font-medium active:scale-95"
                    >
                        {showBackups ? t("dashboard.hide_backups") : t("dashboard.manage_backups")}
                    </button>
                    <button
                        onClick={handleBackup}
                        disabled={loading}
                        className="bg-primary hover:bg-primary/90 text-black px-4 py-2 rounded-lg transition-all disabled:opacity-50 font-bold shadow-sm active:scale-95"
                    >
                        {loading ? t("dashboard.processing") : t("dashboard.quick_backup")}
                    </button>
                    <button
                        onClick={handleBackup}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all disabled:opacity-50 font-bold shadow-sm active:scale-95 flex items-center gap-2"
                    >
                        <span className="text-lg">☁️</span>
                        {loading ? t("dashboard.syncing_cloud") : t("dashboard.cloud_backup")}
                    </button>
                    <ExportButtons />
                </div>
            </div>

            {overpaidList.length > 0 && (
                <div className="space-y-2">
                    {overpaidList.map(p => (
                        <div key={p.id} className="bg-orange-500/10 border border-orange-500/50 p-4 rounded-xl flex justify-between items-center animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className={`flex items-center ${language === "he" ? "space-x-reverse space-x-3" : "space-x-3"}`}>
                                <span className="text-orange-500 text-xl font-bold">⚠️</span>
                                <div>
                                    <p className="text-sm font-medium text-foreground leading-relaxed">
                                        <span className="font-bold">{t("dashboard.overpayment_alert")}!</span> <Link href={`/admin/players/${p.id}`} className="font-bold underline text-orange-600 hover:text-orange-500">{p.fullName}</Link> {t("dashboard.has_been_paid")} <span className="font-bold text-orange-600">{formatCurrency(p.overpaidAmount)}</span> {t("dashboard.over_total_fees")}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDismissOverpaid(p.id)}
                                className="text-xs bg-orange-500/20 text-orange-600 hover:bg-orange-500 hover:text-white px-4 py-2 rounded-lg transition-all font-bold uppercase tracking-wider"
                            >
                                {t("common.dismiss")}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {showBackups && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Local Backups */}
                    <div className="bg-secondary border border-border p-6 rounded-xl shadow-md animate-in fade-in slide-in-from-top-4 duration-300">
                        <h2 className="text-xl font-bold mb-5 text-primary tracking-tight">💻 {language === "he" ? "גיבויים מקומיים" : "Local Backups"}</h2>
                        <div className="max-h-64 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                            {backups.length === 0 ? (
                                <p className="text-muted-foreground text-sm italic py-4">{t("dashboard.no_backups")}</p>
                            ) : (
                                backups.map((b) => (
                                    <div key={b.filename} className="flex justify-between items-center bg-muted/40 p-4 rounded-lg border border-border/50 hover:bg-muted/60 transition-colors">
                                        <div>
                                            <div className="text-sm font-bold text-foreground">{b.filename}</div>
                                            <div className="text-xs text-muted-foreground mt-1 font-medium">
                                                {new Date(b.createdAt).toLocaleString()} • {(b.size / 1024 / 1024).toFixed(2)} MB
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRestore(b.filename)}
                                            disabled={loading}
                                            className="text-xs bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 px-4 py-2 rounded-lg transition-all font-bold uppercase tracking-widest active:scale-95"
                                        >
                                            {t("dashboard.restore")}
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Google Drive Backups */}
                    <div className="bg-secondary border border-border p-6 rounded-xl shadow-md animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-xl font-bold text-primary tracking-tight">☁️ {language === "he" ? "גיבויים בענן (Google Drive)" : "Cloud Backups (Google Drive)"}</h2>
                            <div className="flex items-center gap-2">
                                {!isDriveConnected && (
                                    <Link
                                        href="/api/admin/auth/google"
                                        className="text-[10px] bg-primary text-black px-2 py-1 rounded font-bold uppercase hover:opacity-80 transition-opacity"
                                    >
                                        {language === "he" ? "חבר חשבון" : "Connect"}
                                    </Link>
                                )}
                                <button onClick={fetchDriveBackups} disabled={fetchingDrive} className="text-xs font-bold text-primary hover:underline uppercase">
                                    {fetchingDrive ? "..." : "🔄"}
                                </button>
                            </div>
                        </div>
                        <div className="max-h-64 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                            {fetchingDrive ? (
                                <p className="text-muted-foreground text-sm italic py-4">{t("common.loading")}</p>
                            ) : !isDriveConnected ? (
                                <div className="py-8 text-center space-y-4">
                                    <p className="text-muted-foreground text-sm italic">{language === "he" ? "חשבון Google אינו מחובר." : "Google account not connected."}</p>
                                    <Link
                                        href="/api/admin/auth/google"
                                        className="inline-block bg-primary text-black px-6 py-2 rounded-lg font-bold uppercase tracking-widest active:scale-95 transition-all"
                                    >
                                        {language === "he" ? "התחבר עם Google" : "Connect with Google"}
                                    </Link>
                                </div>
                            ) : driveBackups.length === 0 ? (
                                <p className="text-muted-foreground text-sm italic py-4">{language === "he" ? "לא נמצאו גיבויים בענן." : "No cloud backups found."}</p>
                            ) : (
                                driveBackups.map((b) => {
                                    const isLocal = backups.some(local => local.filename === b.name)
                                    return (
                                        <div key={b.id} className="flex justify-between items-center bg-muted/40 p-4 rounded-lg border border-border/50 hover:bg-muted/60 transition-colors">
                                            <div>
                                                <div className="text-sm font-bold text-foreground">{b.name}</div>
                                                <div className="text-xs text-muted-foreground mt-1 font-medium">
                                                    {new Date(b.createdTime).toLocaleString()} • {(b.size / 1024 / 1024).toFixed(2)} MB
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isLocal && (
                                                    <span className="text-[10px] bg-green-500/10 text-green-500 px-2 py-1 rounded font-bold uppercase hidden sm:inline-block">
                                                        {language === "he" ? "מסונכרן" : "Synced"}
                                                    </span>
                                                )}
                                                {isLocal ? (
                                                    <button
                                                        onClick={() => handleRestore(b.name)}
                                                        disabled={loading}
                                                        className="text-xs bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 px-3 py-1.5 rounded-lg transition-all font-bold uppercase tracking-widest active:scale-95"
                                                    >
                                                        {t("dashboard.restore")}
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handlePullFromDrive(b.id, b.name)}
                                                        disabled={loading}
                                                        className="text-xs bg-primary/10 text-primary hover:bg-primary hover:text-black border border-primary/20 px-3 py-1.5 rounded-lg transition-all font-bold uppercase tracking-widest active:scale-95"
                                                    >
                                                        {language === "he" ? "הורד" : "Pull"}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-secondary border border-border p-6 rounded-xl shadow-sm hover:shadow-md transition-all group">
                    <h2 className="text-muted-foreground text-xs font-bold uppercase tracking-widest">{t("dashboard.totalEvents")}</h2>
                    <p className="text-3xl font-bold mt-2 text-foreground group-hover:text-primary transition-colors">{formatNumber(stats.totalEvents)}</p>
                    <Link href="/admin/events" className="text-primary hover:text-primary/80 text-xs font-bold mt-4 block uppercase tracking-tighter">
                        {t("dashboard.viewAll")}
                    </Link>
                </div>

                <div className="bg-secondary border border-border p-6 rounded-xl shadow-sm hover:shadow-md transition-all group">
                    <h2 className="text-muted-foreground text-xs font-bold uppercase tracking-widest">{t("dashboard.totalPlayers")}</h2>
                    <p className="text-3xl font-bold mt-2 text-foreground group-hover:text-primary transition-colors">{formatNumber(stats.totalPlayers)}</p>
                    <Link href="/admin/players" className="text-primary hover:text-primary/80 text-xs font-bold mt-4 block uppercase tracking-tighter">
                        {t("dashboard.viewAll")}
                    </Link>
                </div>

                <Link href="/admin/unpaid-items" className="bg-secondary border border-border p-6 rounded-xl shadow-sm hover:bg-muted/50 hover:shadow-md transition-all cursor-pointer group">
                    <h2 className="text-muted-foreground text-xs font-bold uppercase tracking-widest">{t("dashboard.unpaid")}</h2>
                    <p className="text-3xl font-bold mt-2 text-red-500">
                        {formatCurrency(stats.unpaidAmount)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 font-medium italic opacity-70">{formatNumber(stats.totalUnpaid)} {t("dashboard.items")}</p>
                    <span className="text-primary hover:text-primary/80 text-xs font-bold mt-4 block uppercase tracking-tighter">{t("dashboard.viewAll")} →</span>
                </Link>

                <Link href="/admin/paid-items" className="bg-secondary border border-border p-6 rounded-xl shadow-sm hover:bg-muted/50 hover:shadow-md transition-all cursor-pointer group">
                    <h2 className="text-muted-foreground text-xs font-bold uppercase tracking-widest">{t("dashboard.paid")}</h2>
                    <p className="text-3xl font-bold mt-2 text-green-500">
                        {formatCurrency(stats.paidAmount)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 font-medium italic opacity-70">{formatNumber(stats.totalPaid)} {t("dashboard.items")}</p>
                    <span className="text-primary hover:text-primary/80 text-xs font-bold mt-4 block uppercase tracking-tighter">{t("dashboard.viewAll")} →</span>
                </Link>

                <Link href="/admin/reports" className="bg-secondary border border-border p-6 rounded-xl shadow-sm hover:bg-muted/50 hover:shadow-md transition-all cursor-pointer group">
                    <h2 className="text-muted-foreground text-xs font-bold uppercase tracking-widest">{t("dashboard.system_reports")}</h2>
                    <p className="text-3xl font-bold mt-2 text-primary">
                        {stats.pendingReportsCount}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 font-medium italic opacity-70">{t("dashboard.pending_items")}</p>
                    <span className="text-primary hover:text-primary/80 text-xs font-bold mt-4 block uppercase tracking-tighter">{t("dashboard.manage_all")} →</span>
                </Link>
            </div>

            {/* Graphs Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Bar Chart */}
                <div className="lg:col-span-2 bg-secondary border border-border p-6 rounded-xl shadow-sm">
                    <h2 className="text-xl font-bold mb-8 text-primary tracking-tight">{t("dashboard.chart_income_expenses")}</h2>
                    <div className="h-64 flex items-end justify-between px-2 pt-6 border-b border-border/30 mb-2">
                        {stats.monthlyData.map((d, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center group relative h-full">
                                <div className={`flex items-end h-full w-full justify-center gap-1.5`}>
                                    <div
                                        style={{ height: `${(d.income / maxVal) * 100}%` }}
                                        className="w-4 bg-green-500 hover:bg-green-400 rounded-t-md transition-all shadow-sm"
                                        title={`${t("dashboard.income")}: ₪${d.income}`}
                                    />
                                    <div
                                        style={{ height: `${(d.expenses / maxVal) * 100}%` }}
                                        className="w-4 bg-red-500 hover:bg-red-400 rounded-t-md transition-all shadow-sm"
                                        title={`${t("dashboard.expenses")}: ₪${d.expenses}`}
                                    />
                                </div>
                                <span className="text-[10px] text-muted-foreground mt-3 font-bold uppercase tracking-tighter rotate-45 lg:rotate-0">{d.label}</span>
                                <div className={`absolute -top-12 bg-black/90 text-white text-[10px] p-2 rounded-lg hidden group-hover:block z-20 whitespace-nowrap shadow-xl border border-white/10 ${language === "he" ? "text-right" : "text-left"}`}>
                                    <div className="flex items-center gap-1.5 mb-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /> {t("dashboard.income")}: {formatCurrency(d.income)}</div>
                                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-red-500" /> {t("dashboard.expenses")}: {formatCurrency(d.expenses)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className={`mt-10 flex justify-center gap-10 text-[10px] font-bold uppercase tracking-widest ${language === "he" ? "flex-row-reverse" : ""}`}>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-sm shadow-sm" /> {t("dashboard.income")}</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-sm shadow-sm" /> {t("dashboard.expenses")}</div>
                    </div>
                </div>

                {/* Pie Chart */}
                <div className="bg-secondary border border-border p-6 rounded-xl shadow-sm flex flex-col items-center group">
                    <h2 className="text-xl font-bold mb-8 text-primary self-start tracking-tight">{t("dashboard.chart_payment_status")}</h2>
                    <div className="relative w-52 h-52 group-hover:scale-105 transition-transform duration-500">
                        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 filter drop-shadow-lg">
                            {totalPie > 0 ? (
                                <>
                                    {getPieSlice(0, paidAngle, "#10b981")}
                                    {getPieSlice(paidAngle, 360, "#ef4444")}
                                </>
                            ) : (
                                <circle cx="50" cy="50" r="40" fill="#374151" />
                            )}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-2xl font-black text-foreground drop-shadow-sm">{totalPie > 0 ? Math.round((stats.pieData.paid / totalPie) * 100) : 0}%</span>
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">{t("dashboard.paid")}</span>
                        </div>
                    </div>
                    <div className="mt-10 grid grid-cols-2 gap-8 w-full text-xs text-center border-t border-border/30 pt-6">
                        <div className={`flex flex-col items-center ${language === "he" ? "border-l" : "border-r"} border-border/50`}>
                            <span className="text-green-500 font-black text-sm">{formatCurrency(stats.pieData.paid)}</span>
                            <span className="text-muted-foreground font-bold uppercase tracking-tighter mt-1">{t("dashboard.paid")}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-red-500 font-black text-sm">{formatCurrency(stats.pieData.unpaid)}</span>
                            <span className="text-muted-foreground font-bold uppercase tracking-tighter mt-1">{t("dashboard.unpaid_label")}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Budget vs Actual Graph */}
            <div className="bg-secondary border border-border p-6 rounded-xl shadow-sm">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-xl font-bold text-primary tracking-tight">{t("payment.budget_vs_actual")} ({new Date().getFullYear()})</h2>
                        {stats.yearlyTotalBudget > 0 && (
                            <p className="text-xs font-bold text-muted-foreground mt-1 uppercase tracking-tight">
                                {language === "he" ? "תקציב שנתי כולל" : "Total Yearly Budget"}: {formatCurrency(stats.yearlyTotalBudget)}
                            </p>
                        )}
                    </div>
                    <Link href="/admin/payments/budgets" className="text-xs font-bold text-primary hover:underline uppercase tracking-widest">
                        {t("payment.manage_budgets")} →
                    </Link>
                </div>

                {stats.budgetData.length === 0 ? (
                    <div className="h-48 flex items-center justify-center text-muted-foreground italic text-sm">
                        {t("payment.none")}
                    </div>
                ) : (
                    <div className="space-y-6">
                        {stats.budgetData.map((b, i) => {
                            const max = Math.max(b.budget, b.actual, 1)
                            const budgetWidth = (b.budget / max) * 100
                            const actualWidth = (b.actual / max) * 100
                            const isOver = b.actual > b.budget && b.budget > 0

                            const catMap: Record<string, string> = {
                                "מנהל אומנותי": t("cat.artistic_director"),
                                "אמנים ושחקנים": t("cat.artists_players"),
                                "אחזקת אולם פעילות": t("cat.maintenance"),
                                "דלק ואחזקת רכב": t("cat.fuel_car"),
                                "ציוד עזר ותפאורה": t("cat.equipment"),
                                "צרכי סדנאות": t("cat.workshops"),
                                "משרדיות": t("cat.office"),
                                "הנהלת חשבונות": t("cat.accounting"),
                                "פרסום וקידום מכירות": t("cat.marketing"),
                                "כיבודים": t("cat.refreshments")
                            }
                            const displayCategory = catMap[b.category] || b.category

                            return (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <span className="text-xs font-black uppercase tracking-tight">{displayCategory}</span>
                                        <div className="text-[10px] font-bold">
                                            <span className="text-blue-500">{formatCurrency(b.actual)}</span>
                                            <span className="text-muted-foreground mx-1">/</span>
                                            <span className="text-foreground">{formatCurrency(b.budget)}</span>
                                            {isOver && (
                                                <span className="text-red-500 ml-2 font-black animate-pulse">!</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="h-4 w-full bg-muted rounded-full overflow-hidden relative border border-border/50">
                                        {/* Budget Bar (Background/Outline - kept simple) */}

                                        {/* If over budget: Show blue up to budget, then red for excess */}
                                        {isOver ? (
                                            <>
                                                {/* Allowed Budget Part (Blue) */}
                                                <div
                                                    style={{ width: `${budgetWidth}%` }}
                                                    className="h-full bg-primary absolute top-0 left-0 transition-all duration-1000 shadow-sm z-10"
                                                />
                                                {/* Excess Part (Red) */}
                                                <div
                                                    style={{ width: `${actualWidth}%` }}
                                                    className="h-full bg-red-500 absolute top-0 left-0 transition-all duration-1000 shadow-sm"
                                                />
                                            </>
                                        ) : (
                                            /* Normal Case (Blue) */
                                            <div
                                                style={{ width: `${actualWidth}%` }}
                                                className="h-full bg-primary transition-all duration-1000 shadow-sm"
                                            />
                                        )}

                                        {/* Budget Marker Line if under budget to show target */}
                                        {!isOver && b.budget > 0 && (
                                            <div
                                                style={{ left: `${budgetWidth}%` }}
                                                className="absolute top-0 bottom-0 w-0.5 bg-black/20 z-20"
                                            />
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Export and Import Section */}
            <div className="bg-secondary border border-border p-6 rounded-xl shadow-sm">
                <h2 className="text-xl font-bold mb-4 text-primary tracking-tight">{t("dashboard.data_management")}</h2>
                <div className="space-y-4">
                    <div>
                        <h3 className="text-sm font-bold text-muted-foreground mb-2">{t("dashboard.export_data")}</h3>
                        <ExportButtons />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-muted-foreground mb-2">{t("dashboard.import_data")}</h3>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setImportDialog({ isOpen: true, type: "players" })}
                                className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-black hover:opacity-80 transition-opacity"
                            >
                                {t("import.players_title")}
                            </button>
                            <button
                                onClick={() => setImportDialog({ isOpen: true, type: "events" })}
                                className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-black hover:opacity-80 transition-opacity"
                            >
                                {t("import.events_title")}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-secondary border border-border p-6 rounded-xl shadow-sm">
                <h2 className="text-xl font-bold mb-6 text-primary tracking-tight">{t("dashboard.quickActions")}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Link
                        href="/admin/events/new"
                        className="flex items-center justify-center gap-2 bg-primary hover:shadow-lg hover:shadow-primary/20 text-black font-bold py-4 px-6 rounded-xl transition-all active:scale-95 text-sm uppercase tracking-wider"
                    >
                        <span className="text-xl">+</span> {t("action.createEvent")}
                    </Link>
                    <Link
                        href="/admin/players/new"
                        className="flex items-center justify-center gap-2 bg-primary hover:shadow-lg hover:shadow-primary/20 text-black font-bold py-4 px-6 rounded-xl transition-all active:scale-95 text-sm uppercase tracking-wider"
                    >
                        <span className="text-xl">+</span> {t("action.addPlayer")}
                    </Link>
                    <Link
                        href="/admin/payments"
                        className="flex items-center justify-center gap-2 bg-muted/50 border border-border hover:bg-muted text-foreground font-bold py-4 px-6 rounded-xl transition-all active:scale-95 text-sm uppercase tracking-wider"
                    >
                        {t("action.recordPayment")}
                    </Link>
                    <Link
                        href="/admin/players/payments-summary"
                        className="flex items-center justify-center gap-2 bg-secondary border border-border hover:bg-muted text-foreground font-bold py-4 px-6 rounded-xl transition-all active:scale-95 text-sm uppercase tracking-wider"
                    >
                        💰 {t("nav.payments_summary")}
                    </Link>
                    <Link
                        href="/admin/payments/monthly"
                        className="flex items-center justify-center gap-2 bg-secondary border border-border hover:bg-muted text-foreground font-bold py-4 px-6 rounded-xl transition-all active:scale-95 text-sm uppercase tracking-wider"
                    >
                        📅 {t("payment.monthly_report")}
                    </Link>
                    <Link
                        href="/admin/payments/budgets"
                        className="flex items-center justify-center gap-2 bg-secondary border border-border hover:bg-muted text-foreground font-bold py-4 px-6 rounded-xl transition-all active:scale-95 text-sm uppercase tracking-wider"
                    >
                        📊 {t("nav.budgets")}
                    </Link>
                    <Link
                        href="/admin/reports"
                        className="flex items-center justify-center gap-2 bg-muted/50 border border-border hover:bg-muted text-foreground font-bold py-4 px-6 rounded-xl transition-all active:scale-95 text-sm uppercase tracking-wider"
                    >
                        {t("dashboard.manage_reports")}
                    </Link>
                </div>
            </div>

            <ImportDialog
                isOpen={importDialog.isOpen}
                onClose={() => setImportDialog({ ...importDialog, isOpen: false })}
                type={importDialog.type}
            />
        </div>
    )
}
