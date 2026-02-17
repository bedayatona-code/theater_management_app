"use client"

import { useState, useEffect, useMemo } from "react"
import { useLanguage } from "@/contexts/LanguageContext"
import Link from "next/link"
import { formatCurrency } from "@/lib/formatters"

export default function BudgetsPage() {
    const { t, language } = useLanguage()
    const [year, setYear] = useState(new Date().getFullYear())
    const [budgets, setBudgets] = useState<any[]>([])
    const [yearlyTotal, setYearlyTotal] = useState<number>(0)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [hoveredSlice, setHoveredSlice] = useState<any>(null)

    // SOURCE OF TRUTH CATEGORIES (Must match translations keys and DB content)
    const categories = useMemo(() => [
        "מנהל אומנותי",
        "אמנים ושחקנים",
        "אחזקת אולם פעילות",
        "דלק ואחזקת רכב",
        "ציוד עזר ותפאורה",
        "צרכי סדנאות",
        "משרדיות",
        "הנהלת חשבונות",
        "פרסום וקידום מכירות",
        "כיבודים"
    ], [])

    const catColors: Record<string, string> = {
        "מנהל אומנותי": "#3b82f6",
        "אמנים ושחקנים": "#8b5cf6",
        "אחזקת אולם פעילות": "#10b981",
        "דלק ואחזקת רכב": "#f59e0b",
        "ציוד עזר ותפאורה": "#ec4899",
        "צרכי סדנאות": "#06b6d4",
        "משרדיות": "#64748b",
        "הנהלת חשבונות": "#f43f5e",
        "פרסום וקידום מכירות": "#84cc16",
        "כיבודים": "#a855f7"
    }

    useEffect(() => {
        fetchBudgets()
    }, [year])

    const fetchBudgets = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/admin/budgets?year=${year}`)
            const data = await res.json()

            // Normalize synonyms and deduplicate
            const rawBudgets = data.budgets || []
            const normalized: Record<string, any> = {}

            rawBudgets.forEach((b: any) => {
                let cat = b.category
                if (cat === "מנהלת אומנותית") cat = "מנהל אומנותי"

                if (normalized[cat]) {
                    normalized[cat].amount += b.amount
                } else {
                    normalized[cat] = { ...b, category: cat }
                }
            })

            setBudgets(Object.values(normalized))
            setYearlyTotal(data.yearlyTotal || 0)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleSaveBudget = async (category: string, amount: string) => {
        setSaving(true)
        try {
            const res = await fetch("/api/admin/budgets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ year, category, amount: parseFloat(amount) || 0 })
            })
            if (res.ok) {
                fetchBudgets()
            }
        } catch (error) {
            console.error(error)
        } finally {
            setSaving(false)
        }
    }

    const handleSaveYearlyTotal = async (amount: string) => {
        setSaving(true)
        try {
            const res = await fetch("/api/admin/budgets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ year, type: "yearlyTotal", amount: parseFloat(amount) || 0 })
            })
            if (res.ok) {
                fetchBudgets()
            }
        } catch (error) {
            console.error(error)
        } finally {
            setSaving(false)
        }
    }

    const getAmountForCategory = (cat: string) => {
        const b = budgets.find(b => b.category === cat)
        return b ? b.amount : 0
    }

    // FIX: Only count recognize categories for the total
    const allocatedTotal = useMemo(() => {
        return budgets
            .filter(b => categories.includes(b.category))
            .reduce((sum, b) => sum + (b.amount || 0), 0)
    }, [budgets, categories])

    const remainingBudget = yearlyTotal - allocatedTotal
    const allocatedPercentage = yearlyTotal > 0 ? (allocatedTotal / yearlyTotal) * 100 : 0

    // Pie Chart Logic (SVG based for robustness)
    const getPieData = () => {
        const totalToUse = Math.max(yearlyTotal, allocatedTotal, 1)
        let currentAngle = 0

        const recognizedBudgets = budgets
            .filter(b => categories.includes(b.category) && (b.amount || 0) > 0)
            .sort((a, b) => b.amount - a.amount)

        const slices = recognizedBudgets.map(b => {
            const sliceAngle = (b.amount / totalToUse) * 360
            const start = currentAngle
            currentAngle += sliceAngle

            // SVG Arc calculation
            const x1 = 50 + 40 * Math.cos((Math.PI * (start - 90)) / 180)
            const y1 = 50 + 40 * Math.sin((Math.PI * (start - 90)) / 180)
            const x2 = 50 + 40 * Math.cos((Math.PI * (currentAngle - 90)) / 180)
            const y2 = 50 + 40 * Math.sin((Math.PI * (currentAngle - 90)) / 180)
            const largeArc = sliceAngle > 180 ? 1 : 0

            return {
                category: b.category,
                path: `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`,
                color: catColors[b.category] || "#ccc",
                percent: Math.round((b.amount / totalToUse) * 100)
            }
        })

        return slices
    }

    const pieSlices = useMemo(getPieData, [budgets, yearlyTotal, allocatedTotal, categories])

    return (
        <div className="space-y-6 max-w-5xl mx-auto" dir={language === "he" ? "rtl" : "ltr"}>
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-primary tracking-tight">{t("payment.manage_budgets")}</h1>
                    <p className="text-muted-foreground mt-1">{t("payment.set_budget")}</p>
                </div>
                <Link href="/admin/payments" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">
                    {t("common.back")} ←
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-secondary p-6 rounded-2xl border border-border mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div className="flex flex-col gap-2">
                                <label className="font-black text-[10px] uppercase opacity-60">{t("payment.select_year")}</label>
                                <select
                                    value={year}
                                    onChange={(e) => setYear(parseInt(e.target.value))}
                                    className="bg-muted border border-border rounded-lg px-4 py-3 font-bold outline-none focus:border-primary transition-all text-sm"
                                >
                                    {[2024, 2025, 2026, 2027].map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="font-black text-[10px] uppercase opacity-60 text-primary">{language === "he" ? "תקציב שנתי כולל" : "Total Yearly Budget"}</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold opacity-30">₪</span>
                                    <input
                                        type="number"
                                        key={`total-${year}-${yearlyTotal}`}
                                        defaultValue={yearlyTotal || ""}
                                        onBlur={(e) => handleSaveYearlyTotal(e.target.value)}
                                        className="w-full bg-muted border border-border rounded-lg pl-8 pr-4 py-3 font-black text-xl outline-none focus:border-primary transition-all"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-xs font-black uppercase opacity-40 mb-4">{language === "he" ? "חלוקה לפי קטגוריות" : "Breakdown by Category"}</h3>
                            {categories.map((cat) => {
                                const currentAmount = getAmountForCategory(cat)
                                return (
                                    <div key={cat} className="flex items-center justify-between p-3 bg-muted/20 rounded-xl border border-border/50 hover:border-primary/30 transition-all">
                                        <span className="text-xs font-bold uppercase tracking-tight">
                                            {t(`cat.${getTranslationKey(cat)}` as any) || cat}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold opacity-30">₪</span>
                                                <input
                                                    type="number"
                                                    key={`${cat}-${year}-${currentAmount}`}
                                                    defaultValue={currentAmount || ""}
                                                    onBlur={(e) => handleSaveBudget(cat, e.target.value)}
                                                    className="bg-muted border border-border rounded-lg pl-7 pr-3 py-2 w-28 text-sm font-bold outline-none focus:border-primary transition-all text-right"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-secondary p-8 rounded-2xl border border-border flex flex-col items-center text-center mt-4 sticky top-8">
                        <h3 className="text-xs font-black uppercase opacity-60 mb-6">{language === "he" ? "ניצול תקציב" : "Budget Allocation"}</h3>

                        <div className="relative w-56 h-56 mb-8 group">
                            <svg viewBox="0 0 100 100" className={`w-full h-full ${language === "he" ? "scale-x-[-1]" : ""}`}>
                                {/* Background Circle */}
                                <circle cx="50" cy="50" r="40" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-muted/10" />

                                {/* Pie Slices */}
                                {pieSlices.map((slice, i) => (
                                    <path
                                        key={i}
                                        d={slice.path}
                                        fill={slice.color}
                                        className="transition-all duration-500 hover:opacity-80 cursor-pointer"
                                        onMouseEnter={() => setHoveredSlice(slice)}
                                        onMouseLeave={() => setHoveredSlice(null)}
                                    />
                                ))}

                                {/* Inner Circle (Donut effect) */}
                                <circle cx="50" cy="50" r="32" fill="var(--secondary)" />
                            </svg>

                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                {hoveredSlice ? (
                                    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-200">
                                        <span className="text-xl font-black text-primary truncate max-w-[120px]">
                                            {t(`cat.${getTranslationKey(hoveredSlice.category)}` as any) || hoveredSlice.category}
                                        </span>
                                        <span className="text-2xl font-black">{hoveredSlice.percent}%</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <span className={`text-4xl font-black ${allocatedPercentage > 100 ? "text-red-500" : "text-foreground"}`}>
                                            {Math.round(allocatedPercentage)}%
                                        </span>
                                        <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{language === "he" ? "הוקצה" : "Allocated"}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="w-full flex flex-wrap justify-center gap-x-4 gap-y-2 mb-8 border-t border-border/50 pt-4">
                            {categories.map((cat) => {
                                const amount = getAmountForCategory(cat)
                                if (amount <= 0) return null
                                return (
                                    <div key={cat} className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-tight opacity-70">
                                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: catColors[cat] }} />
                                        <span className="truncate max-w-[80px]">{t(`cat.${getTranslationKey(cat)}` as any) || cat}</span>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="w-full space-y-4">
                            <div className="flex justify-between items-center bg-muted/30 p-4 rounded-xl border border-border">
                                <div className="text-right">
                                    <p className="text-[10px] font-black opacity-40 uppercase">{language === "he" ? "נוצל" : "Allocated"}</p>
                                    <p className="text-base font-black text-primary">{formatCurrency(allocatedTotal)}</p>
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] font-black opacity-40 uppercase">{language === "he" ? "נותר" : "Remaining"}</p>
                                    <p className={`text-base font-black ${remainingBudget < 0 ? "text-red-500" : "text-foreground"}`}>{formatCurrency(remainingBudget)}</p>
                                </div>
                            </div>

                            {remainingBudget < 0 && (
                                <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg flex items-center gap-3 animate-pulse">
                                    <span className="text-red-500 text-xl">⚠️</span>
                                    <p className="text-[10px] font-bold text-red-500 uppercase leading-tight text-right">
                                        {language === "he"
                                            ? "חרגת מהתקציב השנתי! עליך להקטין סכומים בקטגוריות או להגדיל את התקציב הכולל."
                                            : "Budget exceeded! Reduce category amounts or increase the yearly total."}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function getTranslationKey(cat: string): string {
    const mapping: Record<string, string> = {
        "מנהל אומנותי": "artistic_director",
        "אמנים ושחקנים": "artists_players",
        "אחזקת אולם פעילות": "maintenance",
        "דלק ואחזקת רכב": "fuel_car",
        "ציוד עזר ותפאורה": "equipment",
        "צרכי סדנאות": "workshops",
        "משרדיות": "office",
        "הנהלת חשבונות": "accounting",
        "פרסום וקידום מכירות": "marketing",
        "כיבודים": "refreshments"
    }
    return mapping[cat] || cat
}
