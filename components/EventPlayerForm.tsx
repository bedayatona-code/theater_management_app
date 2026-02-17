"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/contexts/LanguageContext"

interface EventPlayerFormProps {
  eventId: string
}

export default function EventPlayerForm({ eventId }: EventPlayerFormProps) {
  const { t, language } = useLanguage()
  const [players, setPlayers] = useState<any[]>([])
  const [selectedPlayerId, setSelectedPlayerId] = useState("")
  const [fee, setFee] = useState("")
  const [role, setRole] = useState("")
  const [paymentDueDate, setPaymentDueDate] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch("/api/players")
      .then((res) => res.json())
      .then((data) => setPlayers(data))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch("/api/event-players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          playerId: selectedPlayerId,
          fee,
          role,
          paymentDueDate,
          notes,
        }),
      })

      if (res.ok) {
        window.location.reload()
      } else {
        alert(language === "he" ? "שגיאה בהוספת שחקן לאירוע" : "Error adding player to event")
      }
    } catch (error) {
      alert(language === "he" ? "שגיאה בהוספת שחקן לאירוע" : "Error adding player to event")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 p-6 bg-secondary border border-border rounded-lg shadow-sm" dir={language === "he" ? "rtl" : "ltr"}>
      <h3 className="text-xl font-bold mb-6 text-primary border-b border-border pb-2">{t("event.add_player_to_event")}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">{t("table.player")}</label>
          <select
            value={selectedPlayerId}
            onChange={(e) => setSelectedPlayerId(e.target.value)}
            className="w-full px-4 py-2 bg-muted/30 border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            required
          >
            <option value="" className="bg-secondary">{t("event.select_player")}</option>
            {players.map((player) => (
              <option key={player.id} value={player.id} className="bg-secondary">
                {player.fullName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">{t("player.fee")} (₪)</label>
          <input
            type="number"
            step="0.01"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            className="w-full px-4 py-2 bg-muted/30 border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">{t("player.role")}</label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-4 py-2 bg-muted/30 border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">{t("event.due_date")}</label>
          <input
            type="date"
            value={paymentDueDate}
            onChange={(e) => setPaymentDueDate(e.target.value)}
            className="w-full px-4 py-2 bg-muted/30 border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">{t("payment.notes")}</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-2 bg-muted/30 border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            rows={3}
          />
        </div>
      </div>
      <div className={`mt-6 flex ${language === "he" ? "justify-start" : "justify-end"}`}>
        <button
          type="submit"
          disabled={loading}
          className="bg-primary hover:bg-primary/90 text-black px-8 py-2 rounded-md transition-all font-bold shadow-sm disabled:opacity-50"
        >
          {loading ? t("event.adding") : t("action.addPlayer")}
        </button>
      </div>
    </form>
  )
}
