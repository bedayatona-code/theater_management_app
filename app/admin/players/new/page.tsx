"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"

export default function NewPlayerPage() {
  const { t, language } = useLanguage()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState("")
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    taxId: "",
    password: "",
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
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          imageUrl: preview,
          password: formData.password || "password123", // Default password
        }),
      })

      if (res.ok) {
        const player = await res.json()
        router.push(`/admin/players/${player.id}`)
      } else {
        alert(t("alert.record_error"))
      }
    } catch (error) {
      alert(t("alert.record_error"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto" dir={language === "he" ? "rtl" : "ltr"}>
      <Link href="/admin/players" className="text-primary hover:text-primary/80 mb-6 block font-medium">
        {language === "he" ? "← חזרה לשחקנים" : "← Back to Players"}
      </Link>
      <h1 className="text-3xl font-bold mb-8 text-primary uppercase tracking-tight">{t("action.addPlayer")}</h1>

      <form onSubmit={handleSubmit} className="bg-secondary p-8 rounded-xl shadow-sm border border-border space-y-6">
        {/* Profile Picture Upload */}
        <div className="flex flex-col items-center space-y-3 mb-8 border-b border-border pb-8">
          <div
            className="w-28 h-28 rounded-full bg-muted border-4 border-primary/20 overflow-hidden flex items-center justify-center relative group cursor-pointer shadow-inner"
            onClick={() => fileInputRef.current?.click()}
          >
            {preview ? (
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <span className="text-muted-foreground text-4xl">👤</span>
            )}
            <div className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-xs font-bold uppercase tracking-widest backdrop-blur-[2px]">
              {t("action.upload")}
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            accept="image/*"
            className="hidden"
          />
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{t("player.profile_picture")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-2 tracking-wider">{t("table.name")} *</label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-2 tracking-wider">{t("table.email")} *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-2 tracking-wider">{t("table.phone")}</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-2 tracking-wider">{t("table.address")}</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-2 tracking-wider">{t("table.taxId")}</label>
            <input
              type="text"
              value={formData.taxId}
              onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
              className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-2 tracking-wider">
              {t("player.password")} <span className="text-[10px] text-muted-foreground lowercase">({t("player.default_password_note")})</span>
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
            />
          </div>
        </div>

        <div className={`flex gap-4 pt-6 ${language === "he" ? "flex-row-reverse" : ""}`}>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-primary hover:bg-primary/90 text-black font-bold py-3 rounded-lg transition-all shadow-sm shadow-primary/20 disabled:opacity-50 text-lg"
          >
            {loading ? t("action.creating") : t("action.create_player")}
          </button>
          <Link
            href="/admin/players"
            className="px-8 py-3 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-lg transition-all border border-border text-lg"
          >
            {t("action.cancel")}
          </Link>
        </div>
      </form>
    </div>
  )
}
