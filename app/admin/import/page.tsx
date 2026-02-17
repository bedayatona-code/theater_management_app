"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"

export default function ImportPage() {
  const { t, language } = useLanguage()
  const router = useRouter()
  const [type, setType] = useState<"players" | "events" | "payments">("players")
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError(t("alert.select_file"))
      return
    }

    setLoading(true)
    setError("")
    setResult(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", type)

      const res = await fetch("/api/import/csv", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (res.ok) {
        setResult(data)
        setTimeout(() => {
          if (type === "players") router.push("/admin/players")
          else if (type === "events") router.push("/admin/events")
          else router.push("/admin/payments")
        }, 3000)
      } else {
        setError(data.error || t("alert.process_error"))
      }
    } catch (err: any) {
      setError(err.message || t("alert.process_error"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto" dir={language === "he" ? "rtl" : "ltr"}>
      <Link href="/admin" className="text-primary hover:text-primary/80 mb-6 block font-medium">
        ← {t("player.back_to_dashboard")}
      </Link>
      <h1 className="text-3xl font-bold mb-8 text-primary uppercase tracking-tight">{t("action.import")}</h1>

      <div className="bg-secondary p-8 rounded-lg shadow-sm border border-border">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">{t("import.type")}</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "players" | "events" | "payments")}
              className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary outline-none transition-all"
            >
              <option value="players">{t("nav.players")}</option>
              <option value="events">{t("nav.events")} ({t("nav.players")})</option>
              <option value="payments">{t("nav.payments")}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">{t("import.file")}</label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-primary file:text-black hover:file:bg-primary/80 transition-all cursor-pointer"
              required
            />
          </div>

          <div className="bg-muted/30 p-5 rounded-lg border border-border text-sm">
            <p className="font-bold text-primary mb-3 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
              {t("import.format")}:
            </p>
            {type === "players" ? (
              <div className="space-y-2 text-muted-foreground">
                <p><strong>{t("import.required_cols")}:</strong> <code>fullName, email</code></p>
                <p><strong>{t("import.optional_cols")}:</strong> <code>phone, address, taxId</code></p>
                <p className="text-xs bg-muted p-2 rounded border border-border/50 text-foreground break-all">
                  {t("import.example")}: fullName,email,phone,address,taxId
                </p>
              </div>
            ) : type === "events" ? (
              <div className="space-y-2 text-muted-foreground">
                <p><strong>{t("import.required_cols")}:</strong> <code>name, date, playerEmail, fee</code></p>
                <p><strong>{t("import.optional_cols")}:</strong> <code>venue, role, description, commissioner</code></p>
                <p className="text-xs italic bg-blue-500/5 text-blue-500/80 p-2 rounded">
                  {language === "he" ? "שורות מרובות עם אותו שם/תאריך יוסיפו שחקנים מרובים לאירוע אחד." : "Multiple rows with same name/date will add multiple players to one event."}
                </p>
                <p className="text-xs bg-muted p-2 rounded border border-border/50 text-foreground break-all">
                  {t("import.example")}: name,date,playerEmail,fee,role,venue
                </p>
              </div>
            ) : (
              <div className="space-y-2 text-muted-foreground">
                <p><strong>{t("import.required_cols")}:</strong> <code>playerEmail, eventName, amount, date</code></p>
                <p><strong>{t("import.optional_cols")}:</strong> <code>bankAccount, bankNumber, notes</code></p>
                <p className="text-xs italic bg-yellow-500/5 text-yellow-500/80 p-2 rounded">
                  {language === "he" ? "הערה: האירוע והשחקן חייבים להיות קיימים במערכת." : "Note: The event and player must already exist in the system."}
                </p>
                <p className="text-xs bg-muted p-2 rounded border border-border/50 text-foreground break-all">
                  {t("import.example")}: playerEmail,eventName,amount,date,bankAccount
                </p>
              </div>
            )}
          </div>

          {error && <p className="text-red-500 text-sm font-bold bg-red-500/10 p-3 rounded border border-red-500/20">{error}</p>}
          {result && (
            <div className="bg-green-500/10 p-4 rounded border border-green-500/20">
              <p className="text-green-500 font-bold flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check"><path d="M20 6 9 17l-5-5" /></svg>
                {t("alert.import_success")}
              </p>
              <p className="text-xs text-green-500/70 mt-1">
                {result.count || result.countEvents || 0} {t("alert.import_redirect")}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-black font-bold py-3 rounded-md transition-all shadow-sm shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
          >
            {loading ? t("action.importing") : t("action.import")}
          </button>
        </form>
      </div>
    </div>
  )
}
