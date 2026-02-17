"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import EventPlayerForm from "@/components/EventPlayerForm"
import { useLanguage } from "@/contexts/LanguageContext"

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { t, language } = useLanguage()
  const router = useRouter()
  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editFee, setEditFee] = useState("")
  const [editRole, setEditRole] = useState("")
  const [editNotes, setEditNotes] = useState("")
  const [saving, setSaving] = useState(false)

  const fetchEvent = async () => {
    const { id } = await params
    const res = await fetch(`/api/events/${id}`)
    const data = await res.json()
    setEvent(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchEvent()
  }, [params])

  const handleStatusClick = (eventPlayerId: string, playerId: string, playerName: string, actualStatus: string) => {
    // Only allow clicking for unpaid or partially paid events
    if (actualStatus === "FULLY PAID") return

    // Navigate to payments page with query parameters to autofill
    const queryParams = new URLSearchParams({
      playerId,
      playerName,
      eventPlayerId,
      autoOpen: 'true'
    })
    router.push(`/admin/payments?${queryParams.toString()}`)
  }

  const startEditing = (ep: any) => {
    setEditingId(ep.id)
    setEditFee(ep.fee.toString())
    setEditRole(ep.role || "")
    setEditNotes(ep.notes || "")
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditFee("")
    setEditRole("")
    setEditNotes("")
  }

  const saveEditing = async (epId: string) => {
    setSaving(true)
    try {
      const res = await fetch("/api/event-players", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: epId,
          fee: editFee,
          role: editRole,
          notes: editNotes,
        }),
      })
      if (res.ok) {
        setEditingId(null)
        await fetchEvent()
      } else {
        alert(language === "he" ? "שגיאה בעדכון" : "Error updating player")
      }
    } catch {
      alert(language === "he" ? "שגיאה בעדכון" : "Error updating player")
    } finally {
      setSaving(false)
    }
  }

  const deleteEventPlayer = async (epId: string, playerName: string) => {
    if (!confirm(language === "he" ? `האם למחוק את ${playerName} מהאירוע?` : `Remove ${playerName} from this event?`)) return
    try {
      const res = await fetch(`/api/event-players?id=${epId}`, { method: "DELETE" })
      if (res.ok) {
        await fetchEvent()
      } else {
        alert(language === "he" ? "שגיאה במחיקה" : "Error removing player")
      }
    } catch {
      alert(language === "he" ? "שגיאה במחיקה" : "Error removing player")
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 text-foreground gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="font-bold uppercase tracking-widest text-xs animate-pulse">{t("common.loading")}</p>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="flex flex-col justify-center items-center h-64 text-foreground gap-4">
        <span className="text-4xl">⚠️</span>
        <p className="font-bold uppercase tracking-widest text-xs">{t("common.event_not_found")}</p>
        <Link href="/admin/events" className="text-primary hover:underline font-bold text-xs uppercase tracking-widest">{t("nav.events")}</Link>
      </div>
    )
  }

  const totalFees = event.eventPlayers.reduce((sum: number, ep: any) => sum + ep.fee, 0)
  const totalPaid = event.eventPlayers.reduce(
    (sum: number, ep: any) => sum + (ep.paymentEvents || []).reduce((pSum: number, p: any) => pSum + p.amount, 0),
    0
  )
  const outstanding = Math.max(0, totalFees - totalPaid)

  return (
    <div className="space-y-8 animate-in fade-in duration-500" dir={language === "he" ? "rtl" : "ltr"}>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <Link href="/admin/events" className={`inline-flex items-center gap-2 text-primary hover:text-primary/80 mb-4 font-bold uppercase text-[10px] tracking-widest transition-all ${language === "he" ? "flex-row-reverse" : ""}`}>
            {language === "he" ? "← חזרה לאירועים" : "← Back to Events"}
          </Link>
          <h1 className="text-4xl font-black text-foreground tracking-tight">{event.name}</h1>
          <p className="text-muted-foreground font-medium mt-1 uppercase tracking-tighter opacity-70">
            {format(new Date(event.date), language === "he" ? "dd/MM/yyyy" : "MMMM dd, yyyy")}
          </p>
        </div>
        <div className={`flex flex-wrap gap-3 ${language === "he" ? "flex-row-reverse" : ""}`}>
          <Link
            href={`/admin/events/${event.id}/edit`}
            className="bg-primary hover:bg-primary/90 text-black px-8 py-3 rounded-xl transition-all font-black shadow-lg shadow-primary/20 active:scale-95 text-xs uppercase tracking-widest"
          >
            {t("event.edit_event")}
          </Link>
          <button
            onClick={async () => {
              if (confirm(t("alert.confirm_delete_event"))) {
                const res = await fetch(`/api/events/${event.id}`, { method: "DELETE" })
                if (res.ok) router.push("/admin/events")
              }
            }}
            className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 px-8 py-3 rounded-xl transition-all font-black text-xs uppercase tracking-widest"
          >
            {t("common.delete")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Event Details Card */}
        <div className="lg:col-span-2 bg-secondary border border-border p-8 rounded-2xl shadow-md group">
          <h2 className="text-xl font-black mb-6 text-primary border-b border-border/50 pb-3 uppercase tracking-tighter">{t("event.details")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
            <div className="group">
              <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-60">{t("event.venue")}</label>
              <p className="font-bold text-foreground text-sm tracking-wider">{event.venue || t("common.not_specified")}</p>
            </div>
            <div className="group">
              <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-60">{t("event.commissioner")}</label>
              <p className="font-bold text-foreground text-sm tracking-wider">{event.commissioner || t("common.not_specified")}</p>
            </div>
            {event.commissionerContact && (
              <div className="group">
                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-60">{t("event.commissioner_contact")}</label>
                <p className="font-bold text-foreground text-sm tracking-wider">{event.commissionerContact}</p>
              </div>
            )}
            {event.commissionerPhone && (
              <div className="group">
                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-60">{t("event.commissioner_phone")}</label>
                <p className="font-bold text-foreground text-sm tracking-wider">{event.commissionerPhone}</p>
              </div>
            )}
            {event.commissionerTaxId && (
              <div className="group">
                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-60">{t("event.commissioner_taxId")}</label>
                <p className="font-bold text-foreground text-sm tracking-wider">{event.commissionerTaxId}</p>
              </div>
            )}
            {event.totalBudget && (
              <div className="group">
                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-60">{t("event.budget")}</label>
                <p className="font-black text-primary text-lg">₪{event.totalBudget.toFixed(2)}</p>
              </div>
            )}
            {event.description && (
              <div className="sm:col-span-2 group">
                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-60">{t("table.description")}</label>
                <p className="mt-1 text-foreground text-sm leading-relaxed font-medium italic opacity-80">{event.description}</p>
              </div>
            )}
            {event.invoiceNumber && (
              <div className="group">
                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-60">{t("event.invoice_number")}</label>
                <p className="font-bold text-foreground text-sm tracking-wider">{event.invoiceNumber}</p>
              </div>
            )}
            {event.receiptNumber && (
              <div className="group">
                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-60">{t("event.receipt_number")}</label>
                <p className="font-bold text-foreground text-sm tracking-wider">{event.receiptNumber}</p>
              </div>
            )}
            {event.audienceCount && (
              <div className="group">
                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-60">{t("event.audience_count")}</label>
                <p className="font-bold text-foreground text-sm tracking-wider">{event.audienceCount}</p>
              </div>
            )}
          </div>
        </div>

        {/* Financial Summary Card */}
        <div className="bg-secondary border border-border p-8 rounded-2xl shadow-md">
          <h2 className="text-xl font-black mb-6 text-primary border-b border-border/50 pb-3 uppercase tracking-tighter">{t("player.financial_summary")}</h2>
          <div className="space-y-4">
            <div className="bg-muted/30 p-5 rounded-xl border border-border/50 group hover:border-primary/20 transition-all">
              <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-60">{t("player.total_fees")}</label>
              <p className="text-2xl font-black text-foreground group-hover:text-primary transition-colors">₪{totalFees.toFixed(2)}</p>
            </div>
            <div className="bg-green-500/5 p-5 rounded-xl border border-green-500/10 group hover:border-green-500/20 transition-all">
              <label className="block text-[10px] font-black text-green-500 uppercase tracking-widest mb-1 opacity-60">{t("dashboard.paid")}</label>
              <p className="text-2xl font-black text-green-500 group-hover:scale-105 transition-transform origin-left">₪{totalPaid.toFixed(2)}</p>
            </div>
            <div className={`p-5 rounded-xl border group transition-all ${outstanding > 0 ? "bg-red-500/5 border-red-500/10 hover:border-red-500/20" : "bg-green-500/5 border-green-500/10 hover:border-green-500/20"}`}>
              <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 opacity-60 ${outstanding > 0 ? "text-red-500" : "text-green-500"}`}>{t("player.outstanding")}</label>
              <p className={`text-2xl font-black ${outstanding > 0 ? "text-red-500" : "text-green-500"} group-hover:scale-105 transition-transform origin-left`}>₪{outstanding.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Players Section */}
      <div className="bg-secondary border border-border p-8 rounded-2xl shadow-md space-y-8 animate-in slide-in-from-bottom-6 duration-500 delay-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/50 pb-4">
          <h2 className="text-2xl font-black text-foreground tracking-tight uppercase tracking-tighter">{t("player.events_fees")}</h2>
          <p className="text-xs text-muted-foreground font-bold tracking-widest uppercase">
            {event.eventPlayers.length} {t("nav.players")}
          </p>
        </div>

        <EventPlayerForm eventId={event.id} />

        <div className="overflow-x-auto rounded-xl border border-border/30">
          <table className="w-full divide-y divide-border/20 font-medium">
            <thead className="bg-muted/50">
              <tr>
                <th className={`px-6 py-4 font-black text-muted-foreground text-[10px] uppercase tracking-widest ${language === "he" ? "text-right" : "text-left"}`}>
                  {t("table.player")}
                </th>
                <th className={`px-6 py-4 font-black text-muted-foreground text-[10px] uppercase tracking-widest ${language === "he" ? "text-right" : "text-left"}`}>
                  {t("player.role")}
                </th>
                <th className={`px-6 py-4 font-black text-muted-foreground text-[10px] uppercase tracking-widest ${language === "he" ? "text-right" : "text-left"}`}>
                  {t("player.fee")}
                </th>
                <th className={`px-6 py-4 font-black text-muted-foreground text-[10px] uppercase tracking-widest ${language === "he" ? "text-right" : "text-left"}`}>
                  {t("player.status")}
                </th>
                <th className={`px-6 py-4 font-black text-muted-foreground text-[10px] uppercase tracking-widest ${language === "he" ? "text-right" : "text-left"}`}>
                  {language === "he" ? "פעולות" : "Actions"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10 text-foreground">
              {event.eventPlayers.map((ep: any) => {
                const paid = (ep.paymentEvents || []).reduce((sum: number, p: any) => sum + p.amount, 0)
                let actualStatus = "UNPAID"
                if (paid >= ep.fee) actualStatus = "FULLY PAID"
                else if (paid > 0) actualStatus = "PARTIALLY PAID"
                const isEditing = editingId === ep.id

                return (
                  <tr key={ep.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className={`flex items-center ${language === "he" ? "space-x-reverse space-x-4" : "space-x-4"}`}>
                        <div className="w-10 h-10 rounded-full bg-muted border-2 border-primary/20 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                          {ep.player.imageUrl ? (
                            <img src={ep.player.imageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm text-primary/40 font-black uppercase">
                              {ep.player.fullName.charAt(0)}
                            </span>
                          )}
                        </div>
                        <Link
                          href={`/admin/players/${ep.player.id}`}
                          className="text-sm font-black text-foreground hover:text-primary transition-all underline decoration-primary/20 underline-offset-4 decoration-2"
                        >
                          {ep.player.fullName}
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm italic opacity-70">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          className="w-full px-2 py-1 bg-muted/30 border border-border rounded text-foreground text-sm"
                          placeholder={language === "he" ? "תפקיד" : "Role"}
                        />
                      ) : (
                        ep.role || "-"
                      )}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-black">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editFee}
                          onChange={(e) => setEditFee(e.target.value)}
                          className="w-24 px-2 py-1 bg-muted/30 border border-border rounded text-foreground text-sm font-black"
                        />
                      ) : (
                        `₪${ep.fee.toFixed(2)}`
                      )}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span
                        onClick={() => handleStatusClick(ep.id, ep.player.id, ep.player.fullName, actualStatus)}
                        className={`inline-flex items-center px-4 py-1.5 text-[10px] font-black uppercase rounded-full shadow-inner border border-current transition-all ${actualStatus === "FULLY PAID"
                          ? "bg-green-500/10 text-green-500"
                          : actualStatus === "PARTIALLY PAID"
                            ? "bg-orange-500/10 text-orange-500 cursor-pointer hover:bg-orange-500 hover:text-white"
                            : "bg-red-500/10 text-red-500 cursor-pointer hover:bg-red-500 hover:text-white"
                          }`}
                        title={actualStatus !== "FULLY PAID" ? t("payment.click_to_record") : ""}
                      >
                        {t(`player.status.${actualStatus.toLowerCase().replace(' ', '_')}` as any)}
                        <span className="opacity-50 mx-1.5 font-bold">₪{paid.toFixed(0)}/₪{ep.fee.toFixed(0)}</span>
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className={`flex items-center gap-2 ${language === "he" ? "flex-row-reverse" : ""}`}>
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => saveEditing(ep.id)}
                              disabled={saving}
                              className="text-[10px] bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white px-3 py-1.5 rounded-lg transition-all font-black uppercase tracking-wider disabled:opacity-50"
                            >
                              {saving ? "..." : (language === "he" ? "שמור" : "Save")}
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="text-[10px] bg-muted text-muted-foreground hover:bg-muted/80 px-3 py-1.5 rounded-lg transition-all font-black uppercase tracking-wider"
                            >
                              {language === "he" ? "ביטול" : "Cancel"}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEditing(ep)}
                              className="text-[10px] bg-primary/10 text-primary hover:bg-primary hover:text-black px-3 py-1.5 rounded-lg transition-all font-black uppercase tracking-wider"
                            >
                              {language === "he" ? "עריכה" : "Edit"}
                            </button>
                            <button
                              onClick={() => deleteEventPlayer(ep.id, ep.player.fullName)}
                              className="text-[10px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded-lg transition-all font-black uppercase tracking-wider"
                            >
                              {language === "he" ? "הסר" : "Remove"}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {event.eventPlayers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic bg-muted/10">
                    {t("event.no_players_yet")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
