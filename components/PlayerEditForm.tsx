"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"

interface PlayerEditFormProps {
    player: any
}

export function PlayerEditForm({ player }: PlayerEditFormProps) {
    const { t, language } = useLanguage()
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [loading, setLoading] = useState(false)
    const [preview, setPreview] = useState(player.imageUrl || "")
    const [formData, setFormData] = useState({
        fullName: player.fullName,
        email: player.email,
        phone: player.phone || "",
        address: player.address || "",
        taxId: player.taxId || "",
        password: "" // Keep empty if not changing
    })

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await fetch(`/api/admin/players/${player.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    imageUrl: preview
                })
            })

            if (res.ok) {
                router.push(`/admin/players/${player.id}`)
                router.refresh()
            } else {
                const error = await res.json()
                alert(`${t("alert.process_error")}: ${error.message || "Failed to update player"}`)
            }
        } catch (err) {
            console.error(err)
            alert(t("alert.process_error"))
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 bg-secondary p-8 rounded-xl border border-border shadow-sm" dir={language === "he" ? "rtl" : "ltr"}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-2 tracking-wider">{t("table.name")} *</label>
                        <input
                            type="text"
                            required
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-2 tracking-wider">{t("table.email")} *</label>
                        <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1 tracking-wider">
                            {t("player.password")} <span className="text-[10px] text-muted-foreground lowercase">({t("player.password_edit_note")})</span>
                        </label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                        />
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center space-y-4 pt-4 md:pt-0">
                    <div className="w-36 h-36 rounded-full bg-muted border-4 border-primary/20 overflow-hidden flex items-center justify-center relative group shadow-inner cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}>
                        {preview ? (
                            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-muted-foreground text-5xl">👤</span>
                        )}
                        <div className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-xs font-bold uppercase tracking-widest backdrop-blur-[2px]">
                            {t("action.change_photo")}
                        </div>
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageChange}
                        accept="image/*"
                        className="hidden"
                    />
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">{t("player.upload_instruction")}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-border/50">
                <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-2 tracking-wider">{t("table.phone")}</label>
                    <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-2 tracking-wider">{t("table.address")}</label>
                    <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-2 tracking-wider">{t("table.taxId")}</label>
                    <input
                        type="text"
                        value={formData.taxId}
                        onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                        className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                    />
                </div>
            </div>

            <div className={`flex gap-4 pt-8 border-t border-border ${language === "he" ? "flex-row-reverse" : "justify-end"}`}>
                <Link
                    href={`/admin/players/${player.id}`}
                    className="px-8 py-2 text-muted-foreground hover:text-foreground font-bold transition-all border border-transparent hover:border-border rounded-md"
                >
                    {t("action.cancel")}
                </Link>
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-primary hover:bg-primary/90 text-black font-bold px-10 py-2 rounded-md transition-all shadow-sm shadow-primary/20 disabled:opacity-50 text-lg"
                >
                    {loading ? t("action.saving") : t("action.save_changes")}
                </button>
            </div>
        </form>
    )
}
