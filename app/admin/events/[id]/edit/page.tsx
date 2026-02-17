"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
    const { t, language } = useLanguage()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState({
        name: "",
        date: "",
        venue: "",
        description: "",
        totalBudget: "",
        commissioner: "",
        commissionerContact: "",
        commissionerPhone: "",
        commissionerTaxId: "",
        commissionerAddress: "",
        invoiceNumber: "",
        receiptNumber: "",
        audienceCount: "",
    })

    const [eventId, setEventId] = useState<string | null>(null)

    useEffect(() => {
        const fetchEvent = async () => {
            const { id } = await params
            setEventId(id)
            const res = await fetch(`/api/events/${id}`)
            if (res.ok) {
                const data = await res.json()
                setFormData({
                    name: data.name || "",
                    date: data.date ? new Date(data.date).toISOString().split('T')[0] : "",
                    venue: data.venue || "",
                    description: data.description || "",
                    totalBudget: data.totalBudget ? data.totalBudget.toString() : "",
                    commissioner: data.commissioner || "",
                    commissionerContact: data.commissionerContact || "",
                    commissionerPhone: data.commissionerPhone || "",
                    commissionerTaxId: data.commissionerTaxId || "",
                    commissionerAddress: data.commissionerAddress || "",
                    invoiceNumber: data.invoiceNumber || "",
                    receiptNumber: data.receiptNumber || "",
                    audienceCount: data.audienceCount ? data.audienceCount.toString() : "",
                })
            }
            setLoading(false)
        }
        fetchEvent()
    }, [params])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            const { id } = await params
            const res = await fetch(`/api/events/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            })

            if (res.ok) {
                router.push(`/admin/events/${id}`)
            } else {
                alert(t("alert.record_error"))
            }
        } catch (error) {
            alert(t("alert.record_error"))
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto" dir={language === "he" ? "rtl" : "ltr"}>
            <Link href={`/admin/events/${eventId}`} className="text-primary hover:text-primary/80 mb-6 block font-medium">
                {language === "he" ? "← חזרה לפרטי אירוע" : "← Back to Event Details"}
            </Link>
            <h1 className="text-3xl font-bold mb-8 text-primary uppercase tracking-tight">{t("event.edit_event")}</h1>

            <form onSubmit={handleSubmit} className="bg-secondary p-8 rounded-xl shadow-sm border border-border space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-2 tracking-wider">{t("table.name")} *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-2 tracking-wider">{t("table.date")} *</label>
                        <input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-2 tracking-wider">{t("event.venue")}</label>
                        <input
                            type="text"
                            value={formData.venue}
                            onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                            className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-2 tracking-wider">{t("event.commissioner")}</label>
                        <input
                            type="text"
                            value={formData.commissioner}
                            onChange={(e) => setFormData({ ...formData, commissioner: e.target.value })}
                            className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-2 tracking-wider">{t("event.commissioner_contact")}</label>
                        <input
                            type="text"
                            value={formData.commissionerContact}
                            onChange={(e) => setFormData({ ...formData, commissionerContact: e.target.value })}
                            className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-2 tracking-wider">{t("event.commissioner_phone")}</label>
                        <input
                            type="text"
                            value={formData.commissionerPhone}
                            onChange={(e) => setFormData({ ...formData, commissionerPhone: e.target.value })}
                            className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-2 tracking-wider">{t("event.commissioner_taxId")}</label>
                        <input
                            type="text"
                            value={formData.commissionerTaxId}
                            onChange={(e) => setFormData({ ...formData, commissionerTaxId: e.target.value })}
                            className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-2 tracking-wider">{t("event.commissioner_address")}</label>
                        <textarea
                            value={formData.commissionerAddress}
                            onChange={(e) => setFormData({ ...formData, commissionerAddress: e.target.value })}
                            className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                            rows={2}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-2 tracking-wider">{t("event.budget")}</label>
                        <div className="relative">
                            <span className={`absolute inset-y-0 ${language === "he" ? "left-4" : "right-4"} flex items-center text-muted-foreground font-bold`}>₪</span>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.totalBudget}
                                onChange={(e) => setFormData({ ...formData, totalBudget: e.target.value })}
                                className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                            />
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-2 tracking-wider">{t("event.description")}</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                            rows={4}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-2 tracking-wider">{t("event.invoice_number")}</label>
                        <input
                            type="text"
                            value={formData.invoiceNumber}
                            onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                            className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-2 tracking-wider">{t("event.receipt_number")}</label>
                        <input
                            type="text"
                            value={formData.receiptNumber}
                            onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
                            className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-2 tracking-wider">{t("event.audience_count")}</label>
                        <input
                            type="number"
                            value={formData.audienceCount}
                            onChange={(e) => setFormData({ ...formData, audienceCount: e.target.value })}
                            className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                        />
                    </div>
                </div>

                <div className={`flex gap-4 pt-6 ${language === "he" ? "flex-row-reverse" : ""}`}>
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex-1 bg-primary hover:bg-primary/90 text-black font-bold py-3 rounded-lg transition-all shadow-sm shadow-primary/20 disabled:opacity-50 text-lg"
                    >
                        {saving ? t("action.saving") : t("action.save_changes")}
                    </button>
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-8 py-3 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-lg transition-all border border-border text-lg"
                    >
                        {t("action.cancel")}
                    </button>
                </div>
            </form>
        </div>
    )
}
