"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"

import { useLanguage } from "@/contexts/LanguageContext"

export default function ReportPage() {
  const { t, language } = useLanguage()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [reports, setReports] = useState<any[]>([])
  const [fetching, setFetching] = useState(true)
  const [formData, setFormData] = useState({
    type: "error",
    title: "",
    description: "",
  })

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      const res = await fetch("/api/error-reports")
      if (res.ok) {
        const data = await res.json()
        setReports(data)
      }
    } catch (error) {
      console.error("Failed to fetch reports", error)
    } finally {
      setFetching(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch("/api/error-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        alert(t("reports.success_alert"))
        setFormData({ type: "error", title: "", description: "" })
        fetchReports() // Refresh history
      } else {
        alert(t("reports.error_alert"))
      }
    } catch (error) {
      alert(t("reports.error_alert"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-10" dir={language === "he" ? "rtl" : "ltr"}>
      <div>
        <Link href="/player" className="text-blue-600 hover:underline mb-4 block">
          ← {t("player.back_to_dashboard")}
        </Link>
        <h1 className="text-3xl font-bold">{t("reports.title")}</h1>
        <p className="text-muted-foreground mt-2">{t("reports.subtitle")}</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
        <h2 className="text-xl font-bold mb-4">{t("reports.new")}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t("reports.type")} *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="error">{t("reports.type.error")}</option>
                <option value="suggestion">{t("reports.type.suggestion")}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t("reports.title_label")} *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                placeholder={t("reports.title_placeholder")}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t("reports.description")} *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              rows={4}
              placeholder={t("reports.description_placeholder")}
              required
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading ? t("reports.submitting") : t("reports.submit")}
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">{t("reports.past")}</h2>
        {fetching ? (
          <div className="p-4 text-center text-gray-500 italic">{t("reports.fetching")}</div>
        ) : reports.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200 text-gray-500">
            {t("reports.no_history")}
          </div>
        ) : (
          <div className="grid gap-4">
            {reports.map((report) => (
              <div key={report.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${report.type === "error" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                      }`}>
                      {report.type === "error" ? t("reports.type.error") : t("reports.type.suggestion")}
                    </span>
                    <h3 className="font-bold">{report.title}</h3>
                  </div>
                  <p className="text-xs text-gray-500">
                    {format(new Date(report.createdAt), language === "he" ? "dd/MM/yyyy" : "MMMM dd, yyyy")}
                  </p>
                  <p className="text-sm text-gray-600 line-clamp-1 italic mt-2">
                    "{report.description}"
                  </p>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase shadow-sm ${report.status === "pending" ? "bg-orange-100 text-orange-700 border border-orange-200" :
                    report.status === "reviewed" ? "bg-purple-100 text-purple-700 border border-purple-200" :
                      "bg-green-100 text-green-700 border border-green-200"
                    }`}>
                    {t(`reports.status.${report.status}` as any)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

