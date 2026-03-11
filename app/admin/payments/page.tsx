"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { useLanguage } from "@/contexts/LanguageContext"

function PaymentsContent() {
  const { t, language } = useLanguage()
  const searchParams = useSearchParams()
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPayment, setEditingPayment] = useState<any>(null)

  // Smart Selection State
  const [players, setPlayers] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [selectedPlayerId, setSelectedPlayerId] = useState("")
  const [selectedEventId, setSelectedEventId] = useState("")
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [savedCards, setSavedCards] = useState<any[]>([])

  const [formData, setFormData] = useState({
    playerId: "",
    amount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    type: "INCOME",
    category: "",
    paymentMethod: "TRANSFER",
    transactionReference: "",
    checkNumber: "",
    bankAccount: "",
    bankNumber: "",
    receiptLink: "",
    notes: "",
    eventId: "",
    creditCardNumber: "",
    creditCardHolder: "",
    forMonth: "",
    receiptNumber: "",
    invoiceNumber: "",
    checkCashedDate: "",
    supplierName: "",
    supplierAddress: "",
  })

  const incomeCategories = [
    "מופעים",
    "השתתפות חברים",
    "סדנאות",
    "תרומות"
  ]

  // Filter state
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterType, setFilterType] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [filterSupplier, setFilterSupplier] = useState("all")
  const [suppliers, setSuppliers] = useState<any[]>([])

  useEffect(() => {
    fetchPayments()
    fetchPlayers()
    fetchEvents()
    fetchSavedCards()
    fetchSuppliers()
  }, [])

  const fetchSuppliers = async () => {
    try {
      const res = await fetch("/api/suppliers")
      const data = await res.json()
      setSuppliers(data)
    } catch (error) {
      console.error("Failed to fetch suppliers:", error)
    }
  }

  const fetchSavedCards = async () => {
    try {
      const res = await fetch("/api/credit-cards")
      const data = await res.json()
      setSavedCards(data)
    } catch (error) {
      console.error("Failed to fetch saved cards:", error)
    }
  }

  const fetchEvents = async () => {
    const res = await fetch("/api/events")
    const data = await res.json()
    setEvents(data)
  }

  // Handle autofill from query parameters
  useEffect(() => {
    const mode = searchParams.get('mode')
    const playerId = searchParams.get('playerId')
    const eventPlayerId = searchParams.get('eventPlayerId')

    if (players.length > 0 && playerId) {
      if (mode === 'pay_all') {
        const player = players.find(p => p.id === playerId)
        if (player) {
          // Find all unpaid events for this player
          const unpaidEvents = player.eventPlayers.filter((ep: any) => {
            const paid = (ep.paymentEvents || []).reduce((sum: number, pe: any) => sum + pe.amount, 0)
            return ep.fee > paid
          })

          if (unpaidEvents.length > 0) {
            const totalOutstanding = unpaidEvents.reduce((sum: number, ep: any) => {
              const paid = (ep.paymentEvents || []).reduce((pSum: number, pe: any) => pSum + pe.amount, 0)
              return sum + (ep.fee - paid)
            }, 0)

            setSelectedPlayerId(playerId)
            setSelectedEventIds(unpaidEvents.map((ep: any) => ep.id))

            setFormData(prev => ({
              ...prev,
              playerId,
              type: "EXPENSE",
              category: "אמנים ושחקנים",
              amount: totalOutstanding.toFixed(2)
            }))
            setShowForm(true)
          }
        }
      } else if (searchParams.get('autoOpen') === 'true' && eventPlayerId) {
        // Single event payment
        const player = players.find(p => p.id === playerId)
        const eventPlayer = player?.eventPlayers.find((ep: any) => ep.id === eventPlayerId)

        if (eventPlayer) {
          const paid = (eventPlayer.paymentEvents || []).reduce((sum: number, pe: any) => sum + pe.amount, 0)
          const outstanding = Math.max(0, eventPlayer.fee - paid)

          setSelectedPlayerId(playerId)
          setSelectedEventIds([eventPlayerId])
          setFormData(prev => ({
            ...prev,
            playerId,
            type: "EXPENSE",
            category: "אמנים ושחקנים",
            amount: outstanding.toFixed(2)
          }))
          setShowForm(true)
        }
      }
    }
  }, [players, searchParams])

  const fetchPayments = async () => {
    const eventPlayerId = searchParams.get('eventPlayerId')
    let url = "/api/payments"
    if (eventPlayerId) {
      url += `?eventPlayerId=${eventPlayerId}`
    }
    const res = await fetch(url)
    const data = await res.json()
    setPayments(data)
    setLoading(false)
  }

  const fetchPlayers = async () => {
    const res = await fetch("/api/players")
    const data = await res.json()
    setPlayers(data)
  }

  // Derived state: events for the selected player (calculate status dynamically)
  const selectedPlayer = players.find(p => p.id === selectedPlayerId)
  const playerEvents = selectedPlayer?.eventPlayers
    ?.map((ep: any) => {
      // Calculate actual paid amount using paymentEvents
      const paid = (ep.paymentEvents || []).reduce((sum: number, pe: any) => sum + pe.amount, 0)
      // Calculate actual status
      let actualStatus = "UNPAID"
      if (paid >= ep.fee) {
        actualStatus = "FULLY_PAID"
      } else if (paid > 0) {
        actualStatus = "PARTIALLY_PAID"
      }
      return {
        id: ep.id,
        eventName: ep.event.name,
        event: ep.event,
        fee: ep.fee,
        paid: paid,
        paymentStatus: actualStatus
      }
    })
    .filter((ep: any) => ep.paymentStatus !== "FULLY_PAID") || []

  // Derived state: events needing commissioner payment
  const eventsForClient = useMemo(() => {
    return events.map(event => {
      // Calculate total paid by commissioner for this event
      const paidByCommissioner = payments
        .filter(p => p.eventId === event.id && p.type === "INCOME")
        .reduce((sum, p) => sum + p.amount, 0)

      const remaining = (event.totalBudget || 0) - paidByCommissioner
      let status = "UNPAID"
      if (paidByCommissioner >= (event.totalBudget || 0)) status = "FULLY_PAID"
      else if (paidByCommissioner > 0) status = "PARTIALLY_PAID"

      return {
        ...event,
        paidByCommissioner,
        remainingCommissioner: remaining > 0 ? remaining : 0,
        commissionerStatus: status
      }
    }).filter(e => e.commissionerStatus !== "FULLY_PAID")
  }, [events, payments])

  // Derived state: players needing payment for selectedEventId
  const playersForEvent = useMemo(() => {
    if (!selectedEventId) return []
    const results: any[] = []
    players.forEach(player => {
      const ep = player.eventPlayers?.find((ep: any) => ep.eventId === selectedEventId)
      if (ep) {
        const paid = (ep.paymentEvents || []).reduce((sum: number, pe: any) => sum + pe.amount, 0)
        if (paid < ep.fee) {
          results.push({
            ...ep,
            fullName: player.fullName,
            paid,
            remaining: ep.fee - paid
          })
        }
      }
    })
    return results
  }, [selectedEventId, players])

  // Calculate automatic amount based on selected events
  const calculateAmount = () => {
    if (selectedEventIds.length === 0) return "0"
    const total = selectedEventIds.reduce((sum, id) => {
      const event = playerEvents.find((e: any) => e.id === id)
      return sum + (event?.fee || 0) - (event?.paid || 0)
    }, 0)
    return total.toFixed(2)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return

    setUploading(true)
    const file = e.target.files[0]
    const data = new FormData()
    data.append("file", file)

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: data
      })
      const json = await res.json()

      if (json.success) {
        setFormData(prev => ({ ...prev, receiptLink: json.url }))
      } else {
        alert(t("alert.upload_failed"))
      }
    } catch (error) {
      console.error(error)
      alert(t("alert.upload_error"))
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.type === "INCOME" && ["מופעים", "סדנאות"].includes(formData.category) && !selectedEventId) {
      alert(language === "he" ? "אנא בחר אירוע להכנסה זו." : "Please select an event for this income.")
      return
    }

    if (formData.type === "EXPENSE" && formData.category === "אמנים ושחקנים" && (!selectedPlayerId || selectedEventIds.length === 0)) {
      alert(language === "he" ? "אנא בחר שחקן ואירוע להוצאה זו." : "Please select a player and an event for this expense.")
      return
    }

    if (formData.type === "EXPENSE" && !formData.category) {
      alert(language === "he" ? "אנא בחר קטגוריה להוצאה." : "Please select a category for the expense.")
      return
    }

    try {
      const endpoint = "/api/payments"
      const method = editingPayment ? "PUT" : "POST"
      // Determine payload logic based on category
      const isArtistExpense = formData.type === "EXPENSE" && formData.category === "אמנים ושחקנים";
      const isDirectEventIncome = formData.type === "INCOME" && ["מופעים", "סדנאות"].includes(formData.category);

      const payload = {
        ...formData,
        id: editingPayment?.id,
        eventPlayerIds: isArtistExpense ? selectedEventIds : [],
        eventId: isDirectEventIncome || (formData.type === "EXPENSE" && !isArtistExpense) ? (selectedEventId || formData.eventId) : null,
      }

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        // If it was a credit card payment, save the card
        if (formData.paymentMethod === "CREDIT_CARD" && formData.creditCardNumber) {
          await fetch("/api/credit-cards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              number: formData.creditCardNumber,
              holderName: formData.creditCardHolder
            }),
          })
          fetchSavedCards()
        }

        resetForm()
        fetchPayments()
        fetchSuppliers()
        if (formData.type === "INCOME") fetchPlayers()
      } else {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.error || (editingPayment ? t("alert.update_error") : t("alert.record_error"));
        alert(errorMessage);
      }
    } catch (error) {
      alert(t("alert.process_error"))
    }
  }

  const handleEdit = (payment: any) => {
    setEditingPayment(payment)
    setFormData({
      playerId: payment.playerId || "",
      amount: payment.amount.toString(),
      paymentDate: new Date(payment.paymentDate).toISOString().split("T")[0],
      type: payment.type || "INCOME",
      category: payment.category || "",
      paymentMethod: payment.paymentMethod || "TRANSFER",
      transactionReference: payment.transactionReference || "",
      checkNumber: payment.checkNumber || "",
      bankAccount: payment.bankAccount || "",
      bankNumber: payment.bankNumber || "",
      receiptLink: payment.receiptLink || "",
      notes: payment.notes || "",
      eventId: payment.eventId || "",
      creditCardNumber: payment.creditCardNumber || "",
      creditCardHolder: payment.creditCardHolder || "",
      forMonth: payment.forMonth ? new Date(payment.forMonth).toISOString().slice(0, 7) : "",
      receiptNumber: payment.receiptNumber || "",
      invoiceNumber: payment.invoiceNumber || "",
      checkCashedDate: payment.checkCashedDate ? new Date(payment.checkCashedDate).toISOString().split("T")[0] : "",
      supplierName: payment.supplierName || "",
      supplierAddress: payment.supplierAddress || "",
    })
    setSelectedPlayerId(payment.playerId || "")
    const eventIds = payment.paymentEvents?.map((pe: any) => pe.eventPlayerId) || []
    setSelectedEventIds(eventIds)
    setShowForm(true)
  }

  const handleDelete = async (paymentId: string) => {
    if (!confirm(t("alert.confirm_delete_payment"))) return

    try {
      const res = await fetch(`/api/payments?id=${paymentId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        fetchPayments()
        fetchPlayers()
      } else {
        alert(t("alert.delete_error"))
      }
    } catch (error) {
      alert(t("alert.delete_error"))
    }
  }

  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all')
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(now.getFullYear())

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const pDate = new Date(p.paymentDate)
      const monthMatch = selectedMonth === 'all' || pDate.getMonth() === selectedMonth
      const yearMatch = selectedYear === 'all' || pDate.getFullYear() === selectedYear
      const categoryMatch = filterCategory === 'all' || p.category === filterCategory
      const typeMatch = filterType === 'all' || p.type === filterType
      const supplierMatch = filterSupplier === 'all' || p.supplierName === filterSupplier

      let dateRangeMatch = true
      if (startDate) dateRangeMatch = dateRangeMatch && pDate >= new Date(startDate)
      if (endDate) dateRangeMatch = dateRangeMatch && pDate <= new Date(endDate)

      return monthMatch && yearMatch && categoryMatch && typeMatch && dateRangeMatch && supplierMatch
    })
  }, [payments, selectedMonth, selectedYear, filterCategory, filterType, startDate, endDate, filterSupplier])

  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(2000, i, 1)
    return {
      value: i,
      label: date.toLocaleString(language === "he" ? "he-IL" : "en-US", { month: "long" })
    }
  })

  const years = useMemo(() => {
    const uniqueYears = Array.from(new Set(payments.map(p => new Date(p.paymentDate).getFullYear())))
    if (!uniqueYears.includes(now.getFullYear())) uniqueYears.push(now.getFullYear())
    return uniqueYears.sort((a, b) => b - a)
  }, [payments])

  const resetForm = () => {
    setShowForm(false)
    setEditingPayment(null)
    setFormData({
      playerId: "",
      amount: "",
      paymentDate: new Date().toISOString().split("T")[0],
      type: "INCOME",
      category: "",
      paymentMethod: "TRANSFER",
      transactionReference: "",
      checkNumber: "",
      bankAccount: "",
      bankNumber: "",
      receiptLink: "",
      notes: "",
      eventId: "",
      creditCardNumber: "",
      creditCardHolder: "",
      forMonth: "",
      receiptNumber: "",
      invoiceNumber: "",
      checkCashedDate: "",
      supplierName: "",
      supplierAddress: "",
    })
    setSelectedPlayerId("")
    setSelectedEventId("")
    setSelectedEventIds([])
  }

  const toggleEventSelection = (eventId: string) => {
    setSelectedEventIds(prev => {
      if (prev.includes(eventId)) {
        return prev.filter(id => id !== eventId)
      } else {
        return [...prev, eventId]
      }
    })
  }

  useEffect(() => {
    if (!editingPayment && selectedEventIds.length > 0) {
      setFormData(prev => ({ ...prev, amount: calculateAmount() }))
    }
  }, [selectedEventIds])

  return (
    <div className="space-y-6" dir={language === "he" ? "rtl" : "ltr"}>
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-primary tracking-tight">{t("payment.title")}</h1>
        <div className={`flex flex-wrap items-center gap-4 ${language === "he" ? "flex-row-reverse" : ""}`}>
          <Link
            href="/admin/payments/monthly"
            className="bg-secondary hover:bg-muted text-foreground border border-border px-4 py-2 rounded-lg transition-all font-medium text-sm active:scale-95"
          >
            📅 {t("payment.monthly_report")}
          </Link>
          <button
            onClick={() => {
              if (showForm) {
                resetForm()
              } else {
                setShowForm(true)
              }
            }}
            className="bg-primary hover:bg-primary/90 text-black font-bold px-6 py-2 rounded-lg transition-all shadow-sm active:scale-95"
          >
            {showForm ? t("common.cancel") : t("payment.record")}
          </button>
          <Link
            href="/admin/payments/budgets"
            className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg transition-all font-bold text-sm shadow-sm active:scale-95"
          >
            📊 {t("payment.manage_budgets")}
          </Link>
        </div>
      </div>

      <div className="bg-secondary p-5 rounded-2xl border border-border space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="flex flex-col">
            <label className="text-[10px] font-black text-muted-foreground uppercase mb-1 opacity-60">{t("payment.select_month")}</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="bg-muted border border-border rounded-lg px-3 py-2 text-sm font-bold outline-none"
            >
              <option value="all">{t("payment.all_months")}</option>
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-black text-muted-foreground uppercase mb-1 opacity-60">{t("payment.select_year")}</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="bg-muted border border-border rounded-lg px-3 py-2 text-sm font-bold outline-none"
            >
              <option value="all">{t("payment.all_years")}</option>
              {years.map((y: number) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-black text-muted-foreground uppercase mb-1 opacity-60">{t("payment.type")}</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-muted border border-border rounded-lg px-3 py-2 text-sm font-bold outline-none"
            >
              <option value="all">{language === "he" ? "הכל" : "All"}</option>
              <option value="INCOME">{t("payment.type_income")}</option>
              <option value="EXPENSE">{t("payment.type_expense")}</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-black text-muted-foreground uppercase mb-1 opacity-60">{t("payment.category")}</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-muted border border-border rounded-lg px-3 py-2 text-sm font-bold outline-none"
            >
              <option value="all">{t("payment.all_categories")}</option>
              <option value="מנהל אומנותי">{t("cat.artistic_director")}</option>
              <option value="אמנים ושחקנים">{t("cat.artists_players")}</option>
              <option value="אחזקת אולם פעילות">{t("cat.maintenance")}</option>
              <option value="דלק ואחזקת רכב">{t("cat.fuel_car")}</option>
              <option value="ציוד עזר ותפאורה">{t("cat.equipment")}</option>
              <option value="צרכי סדנאות">{t("cat.workshops")}</option>
              <option value="משרדיות">{t("cat.office")}</option>
              <option value="הנהלת חשבונות">{t("cat.accounting")}</option>
              <option value="פרסום וקידום מכירות">{t("cat.marketing")}</option>
              <option value="כיבודים">{t("cat.refreshments")}</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-black text-muted-foreground uppercase mb-1 opacity-60">{language === "he" ? "שם ספק" : "Supplier"}</label>
            <select
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
              className="bg-muted border border-border rounded-lg px-3 py-2 text-sm font-bold outline-none"
            >
              <option value="all">{language === "he" ? "כל הספקים" : "All Suppliers"}</option>
              {Array.from(new Set(payments.filter(p => p.supplierName).map(p => p.supplierName))).sort().map((name: string) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col lg:col-span-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase mb-1 opacity-60">{t("payment.filter_date_range")}</label>
            <div className="flex gap-2">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-muted border border-border rounded-lg px-2 py-2 text-xs w-full outline-none" />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-muted border border-border rounded-lg px-2 py-2 text-xs w-full outline-none" />
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center bg-primary/5 px-4 py-3 rounded-xl border border-primary/20">
          <div className="text-sm font-black text-primary">{filteredPayments.length} {t("dashboard.items")}</div>
          <div className="flex gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[8px] font-black opacity-40">{t("payment.type_income")}</span>
              <span className="text-sm font-black text-green-500">₪{filteredPayments.filter(p => (p.type || 'INCOME') === 'INCOME').reduce((s, p) => s + p.amount, 0).toFixed(2)}</span>
            </div>
            <div className="flex flex-col items-end border-l border-border pl-6">
              <span className="text-[8px] font-black opacity-40">{t("payment.type_expense")}</span>
              <span className="text-sm font-black text-red-500">₪{filteredPayments.filter(p => p.type === 'EXPENSE').reduce((s, p) => s + p.amount, 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="bg-secondary p-8 rounded-xl shadow-md border border-border animate-in fade-in slide-in-from-top-4 duration-300">
          <h2 className="text-xl font-bold mb-8 text-primary border-b border-border pb-3 uppercase">
            {editingPayment ? t("payment.edit") : t("payment.record_new")}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-border">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">{t("payment.type")} *</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setFormData(p => ({ ...p, type: "INCOME" }))} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase border-2 transition-all ${formData.type === "INCOME" ? "bg-green-500/10 border-green-500 text-green-500" : "bg-muted border-transparent opacity-50"}`}>{t("payment.type_income")}</button>
                  <button type="button" onClick={() => setFormData(p => ({ ...p, type: "EXPENSE" }))} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase border-2 transition-all ${formData.type === "EXPENSE" ? "bg-red-500/10 border-red-500 text-red-500" : "bg-muted border-transparent opacity-50"}`}>{t("payment.type_expense")}</button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">{t("payment.category")} {formData.type === "EXPENSE" ? "*" : ""}</label>
                <select value={formData.category} onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))} className="w-full px-4 py-3 bg-muted border border-border rounded-lg outline-none font-medium" required={formData.type === "EXPENSE"}>
                  <option value="">{language === "he" ? "-- בחר קטגוריה --" : "-- Select Category --"}</option>
                  {formData.type === "INCOME" ? (
                    incomeCategories.map(cat => (
                      <option key={cat} value={cat}>{t(`cat.${cat === "מופעים" ? "shows" : cat === "השתתפות חברים" ? "member_participation" : cat === "סדנאות" ? "workshops_income" : "donations"}` as any) || cat}</option>
                    ))
                  ) : (
                    <>
                      <option value="מנהל אומנותי">{t("cat.artistic_director")}</option>
                      <option value="אמנים ושחקנים">{t("cat.artists_players")}</option>
                      <option value="אחזקת אולם פעילות">{t("cat.maintenance")}</option>
                      <option value="דלק ואחזקת רכב">{t("cat.fuel_car")}</option>
                      <option value="ציוד עזר ותפאורה">{t("cat.equipment")}</option>
                      <option value="צרכי סדנאות">{t("cat.workshops")}</option>
                      <option value="משרדיות">{t("cat.office")}</option>
                      <option value="הנהלת חשבונות">{t("cat.accounting")}</option>
                      <option value="פרסום וקידום מכירות">{t("cat.marketing")}</option>
                      <option value="כיבודים">{t("cat.refreshments")}</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Conditional fields for INCOME */}
            {formData.type === "INCOME" && ["מופעים", "סדנאות"].includes(formData.category) && (
              <div className="animate-in slide-in-from-top-2">
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">
                  {language === "he" ? "בחר אירוע" : "Select Event"} *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {eventsForClient.map((event: any) => {
                    const isSelected = selectedEventId === event.id
                    return (
                      <div
                        key={event.id}
                        onClick={() => {
                          setSelectedEventId(event.id);
                          setFormData(prev => ({ ...prev, amount: event.remainingCommissioner.toString() }));
                        }}
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex justify-between items-center ${isSelected ? "border-primary bg-primary/10" : "border-border bg-muted hover:border-primary/30"}`}
                      >
                        <div>
                          <p className="font-black text-sm">{event.name}</p>
                          <p className="text-[10px] opacity-60 font-bold">{format(new Date(event.date), "dd/MM/yyyy")}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-primary text-sm">₪{event.remainingCommissioner.toFixed(2)}</p>
                          <p className="text-[10px] font-black uppercase text-primary">{isSelected ? "✓" : t("payment.select")}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Conditional fields for EXPENSE */}
            {formData.type === "EXPENSE" && (
              <div className="space-y-6">
                {/* Case: Artists & Players (Required Player + Event) */}
                {formData.category === "אמנים ושחקנים" && (
                  <div className="space-y-6 animate-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 bg-primary/5 rounded-2xl border border-primary/10">
                      <div>
                        <label className="block text-[10px] font-black text-primary uppercase mb-2 tracking-widest">
                          {language === "he" ? "1. בחר אירוע" : "1. Select Event"}
                        </label>
                        <select
                          value={selectedEventId}
                          onChange={(e) => {
                            const eventId = e.target.value;
                            setSelectedEventId(eventId);
                            // If player already selected, check if they are in this event and update amount
                            if (selectedPlayerId) {
                              const pInE = players.find(p => p.id === selectedPlayerId)?.eventPlayers?.find((ep: any) => ep.eventId === eventId);
                              if (!pInE) {
                                setSelectedPlayerId("");
                                setFormData(prev => ({ ...prev, playerId: "", amount: "" }));
                                setSelectedEventIds([]);
                              } else {
                                const paid = (pInE.paymentEvents || []).reduce((sum: number, pe: any) => sum + pe.amount, 0);
                                const remaining = pInE.fee - paid;
                                setSelectedEventIds([pInE.id]);
                                setFormData(prev => ({ ...prev, amount: remaining > 0 ? remaining.toString() : "0" }));
                              }
                            }
                          }}
                          className="w-full px-4 py-3 bg-secondary border border-border rounded-xl outline-none font-bold"
                        >
                          <option value="">{language === "he" ? "-- בחר אירוע --" : "-- Select Event --"}</option>
                          {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-primary uppercase mb-2 tracking-widest">
                          {language === "he" ? "2. בחר שחקן" : "2. Select Player"}
                        </label>
                        <select
                          value={selectedPlayerId}
                          onChange={(e) => {
                            const playerId = e.target.value;
                            setSelectedPlayerId(playerId);
                            setFormData(p => ({ ...p, playerId: playerId }));
                            // If event already selected, check if player has a record there and update amount
                            if (selectedEventId) {
                              const pInE = players.find(p => p.id === playerId)?.eventPlayers?.find((ep: any) => ep.eventId === selectedEventId);
                              if (!pInE) {
                                setSelectedEventId("");
                                setSelectedEventIds([]);
                                setFormData(prev => ({ ...prev, amount: "" }));
                              } else {
                                const paid = (pInE.paymentEvents || []).reduce((sum: number, pe: any) => sum + pe.amount, 0);
                                const remaining = pInE.fee - paid;
                                setSelectedEventIds([pInE.id]);
                                setFormData(prev => ({ ...prev, amount: remaining > 0 ? remaining.toString() : "0" }));
                              }
                            } else {
                              setSelectedEventIds([]);
                            }
                          }}
                          className="w-full px-4 py-3 bg-secondary border border-border rounded-xl outline-none font-bold"
                        >
                          <option value="">{language === "he" ? "-- בחר שחקן --" : "-- Select Player --"}</option>
                          {players.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Result selection based on narrowing */}
                    {!selectedPlayerId && selectedEventId && playersForEvent.length > 0 && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        <label className="block text-xs font-black text-muted-foreground uppercase tracking-wider">
                          {language === "he" ? "שחקנים הממתינים לתשלום באירוע זה:" : "Players awaiting payment for this event:"}
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {playersForEvent.map((ep: any) => (
                            <div
                              key={ep.id}
                              onClick={() => {
                                setSelectedPlayerId(ep.playerId);
                                setFormData(prev => ({ ...prev, playerId: ep.playerId, amount: ep.remaining.toString() }));
                                setSelectedEventIds([ep.id]);
                              }}
                              className="p-4 rounded-xl border border-border bg-muted hover:border-primary/50 transition-all cursor-pointer flex justify-between items-center group"
                            >
                              <div>
                                <p className="font-black text-sm group-hover:text-primary transition-colors">{ep.fullName}</p>
                                <p className="text-[10px] font-bold opacity-40">₪{ep.fee} {language === "he" ? "סה\"כ" : "Total"}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-black text-primary text-sm">₪{ep.remaining.toFixed(2)}</p>
                                <p className="text-[10px] font-black uppercase text-primary opacity-0 group-hover:opacity-100 transition-opacity">{t("payment.select")}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedPlayerId && playerEvents.length > 0 && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="flex justify-between items-end">
                          <label className="block text-xs font-black text-muted-foreground uppercase tracking-wider">
                            {language === "he" ? "אירועים הממתינים לתשלום לשחקן זה:" : "Events awaiting payment for this player:"}
                          </label>
                          <div className="text-[10px] font-black uppercase text-primary">
                            {selectedEventIds.length} {language === "he" ? "נבחרו" : "Selected"}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {playerEvents.map((ep: any) => {
                            const isSelected = selectedEventIds.includes(ep.id)
                            return (
                              <div
                                key={ep.id}
                                onClick={() => toggleEventSelection(ep.id)}
                                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex justify-between items-center group ${isSelected ? "border-primary bg-primary/10" : "border-border bg-muted hover:border-primary/50"}`}
                              >
                                <div>
                                  <p className="font-black text-sm group-hover:text-primary transition-colors">{ep.eventName}</p>
                                  <p className="text-[10px] font-bold opacity-40">{format(new Date(ep.event.date), "dd/MM/yyyy")}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-black text-primary text-sm">₪{(ep.fee - ep.paid).toFixed(2)}</p>
                                  <p className={`text-[10px] font-black uppercase text-primary transition-opacity ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                                    {isSelected ? "✓" : t("payment.select")}
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Case: Optional Event Categories */}
                {[
                  "מנהל אומנותי",
                  "אחזקת אולם פעילות",
                  "דלק ואחזקת רכב",
                  "ציוד עזר ותפאורה",
                  "צרכי סדנאות",
                  "פרסום וקידום מכירות",
                  "כיבודים"
                ].includes(formData.category) && (
                    <div className="animate-in slide-in-from-top-2">
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-3">
                        {language === "he" ? "קשר לאירוע (אופציונלי)" : "Link to Event (Optional)"}
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {events.map((event: any) => {
                          const isSelected = selectedEventId === event.id
                          return (
                            <div
                              key={event.id}
                              onClick={() => setSelectedEventId(isSelected ? "" : event.id)}
                              className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex justify-between items-center ${isSelected ? "border-primary bg-primary/10" : "border-border bg-muted hover:border-primary/30"}`}
                            >
                              <div>
                                <p className="font-black text-sm">{event.name}</p>
                                <p className="text-[10px] opacity-60 font-bold">{format(new Date(event.date), "dd/MM/yyyy")}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-black uppercase text-primary">{isSelected ? "✓" : t("payment.select")}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
              </div>
            )}

            {/* Expense-specific fields: Supplier, Month, Receipt/Invoice */}
            {formData.type === "EXPENSE" && formData.category && formData.category !== "אמנים ושחקנים" && (
              <div className="space-y-6 animate-in slide-in-from-top-2 p-6 bg-red-500/5 rounded-2xl border border-red-500/10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* שם ספק - Supplier Name */}
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">
                      {language === "he" ? "שם ספק" : "Supplier Name"}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        list="supplier-list"
                        value={formData.supplierName}
                        onChange={(e) => {
                          const name = e.target.value
                          setFormData(prev => ({ ...prev, supplierName: name }))
                          // Auto-fill address if supplier exists
                          const existing = suppliers.find(s => s.name === name)
                          if (existing && existing.address) {
                            setFormData(prev => ({ ...prev, supplierName: name, supplierAddress: existing.address }))
                          }
                        }}
                        className="w-full px-4 py-3 bg-muted border border-border rounded-lg outline-none font-bold"
                        placeholder={language === "he" ? "הקלד שם ספק..." : "Type supplier name..."}
                      />
                      <datalist id="supplier-list">
                        {suppliers.map(s => (
                          <option key={s.id} value={s.name} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  {/* כתובת - Address */}
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">
                      {language === "he" ? "כתובת" : "Address"}
                    </label>
                    <input
                      type="text"
                      value={formData.supplierAddress}
                      onChange={(e) => setFormData(prev => ({ ...prev, supplierAddress: e.target.value }))}
                      className="w-full px-4 py-3 bg-muted border border-border rounded-lg outline-none font-bold"
                      placeholder={language === "he" ? "כתובת הספק" : "Supplier address"}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* עבור חודש - For Month */}
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">
                      {language === "he" ? "עבור חודש" : "For Month"}
                    </label>
                    <input
                      type="month"
                      value={formData.forMonth}
                      onChange={(e) => setFormData(prev => ({ ...prev, forMonth: e.target.value }))}
                      className="w-full px-4 py-3 bg-muted border border-border rounded-lg outline-none font-bold"
                    />
                  </div>

                  {/* מס' קבלה - Receipt Number */}
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">
                      {language === "he" ? "מס' קבלה" : "Receipt No."}
                    </label>
                    <input
                      type="text"
                      value={formData.receiptNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, receiptNumber: e.target.value }))}
                      className="w-full px-4 py-3 bg-muted border border-border rounded-lg outline-none font-bold"
                      placeholder={language === "he" ? "מספר קבלה" : "Receipt number"}
                    />
                  </div>

                  {/* מס' חשבונית - Invoice Number */}
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">
                      {language === "he" ? "מס' חשבונית" : "Invoice No."}
                    </label>
                    <input
                      type="text"
                      value={formData.invoiceNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                      className="w-full px-4 py-3 bg-muted border border-border rounded-lg outline-none font-bold"
                      placeholder={language === "he" ? "מספר חשבונית" : "Invoice number"}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">{t("payment.amount")} *</label>
                <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold opacity-30">₪</span><input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="w-full pl-8 pr-4 py-3 bg-muted border border-border rounded-lg outline-none font-bold text-lg" required /></div>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">{t("payment.date")} *</label>
                <input type="date" value={formData.paymentDate} onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })} className="w-full px-4 py-3 bg-muted border border-border rounded-lg outline-none" required />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">{language === "he" ? "שולם באמצעות" : t("payment.source")} *</label>
              <select value={formData.paymentMethod} onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })} className="w-full px-4 py-3 bg-muted border border-border rounded-lg outline-none font-medium text-foreground" required>
                <option value="PETTY_CASH">{language === "he" ? "קופה קטנה" : "Petty Cash"}</option>
                <option value="CREDIT_CARD">{language === "he" ? "כרטיס אשראי" : "Credit Card"}</option>
                <option value="CHECK">{language === "he" ? "צ'ק" : "Check"}</option>
                <option value="TRANSFER">{language === "he" ? "העברה בנקאית" : "Bank Transfer"}</option>
              </select>
            </div>

            {formData.paymentMethod === "CHECK" && (
              <div className="animate-in slide-in-from-top-2 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">
                      {language === "he" ? "מס' צ'ק" : "Check Number"} *
                    </label>
                    <input
                      type="text"
                      value={formData.checkNumber}
                      onChange={(e) => setFormData({ ...formData, checkNumber: e.target.value })}
                      className="w-full px-4 py-3 bg-muted border border-border rounded-lg outline-none font-bold"
                      placeholder="0000000"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">
                      {language === "he" ? "נפרע בתאריך" : "Cashed on Date"}
                    </label>
                    <input
                      type="date"
                      value={formData.checkCashedDate}
                      onChange={(e) => setFormData({ ...formData, checkCashedDate: e.target.value })}
                      className="w-full px-4 py-3 bg-muted border border-border rounded-lg outline-none font-bold"
                    />
                  </div>
                </div>
              </div>
            )}

            {formData.paymentMethod === "TRANSFER" && (
              <div className="animate-in slide-in-from-top-2">
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">
                  {language === "he" ? "מס' אסמכתא" : "Reference Number"} *
                </label>
                <input
                  type="text"
                  value={formData.transactionReference}
                  onChange={(e) => setFormData({ ...formData, transactionReference: e.target.value })}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-lg outline-none font-bold"
                  placeholder="Reference #"
                  required
                />
              </div>
            )}

            {formData.paymentMethod === "CREDIT_CARD" && (
              <div className="animate-in slide-in-from-top-2 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">
                      {language === "he" ? "מס' כרטיס אשראי" : "Credit Card Number"} *
                    </label>
                    <input
                      type="text"
                      value={formData.creditCardNumber}
                      onChange={(e) => setFormData({ ...formData, creditCardNumber: e.target.value })}
                      className="w-full px-4 py-3 bg-muted border border-border rounded-lg outline-none font-bold"
                      placeholder="**** **** **** 1234"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">
                      {language === "he" ? "בעל כרטיס אשראי" : "Credit Card Holder"} *
                    </label>
                    <input
                      type="text"
                      value={formData.creditCardHolder}
                      onChange={(e) => setFormData({ ...formData, creditCardHolder: e.target.value })}
                      className="w-full px-4 py-3 bg-muted border border-border rounded-lg outline-none font-bold"
                      placeholder={language === "he" ? "שם בעל הכרטיס" : "Holder Name"}
                      required
                    />
                  </div>
                </div>

                {savedCards.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 opacity-60">
                      {language === "he" ? "בחר מכרטיסים שמורים" : "Choose from saved cards"}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {savedCards.map((card) => (
                        <button
                          key={card.id}
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            creditCardNumber: card.number,
                            creditCardHolder: card.name || ""
                          })}
                          className={`px-4 py-2 rounded-lg border text-xs font-bold transition-all ${formData.creditCardNumber === card.number ? "bg-primary border-primary text-black" : "bg-muted border-border text-muted-foreground hover:border-primary/50"}`}
                        >
                          💳 **** {card.lastFour} {card.name ? `(${card.name})` : ""}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><label className="block text-xs font-bold text-muted-foreground uppercase mb-2">{t("payment.bank")}</label><input type="text" value={formData.bankAccount} onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })} className="w-full px-4 py-3 bg-muted border border-border rounded-lg outline-none" /></div>
              <div><label className="block text-xs font-bold text-muted-foreground uppercase mb-2">{t("payment.bankNumber")}</label><input type="text" value={formData.bankNumber} onChange={(e) => setFormData({ ...formData, bankNumber: e.target.value })} className="w-full px-4 py-3 bg-muted border border-border rounded-lg outline-none" /></div>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">{t("payment.receipt")}</label>
              <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-lg border border-border">
                <input type="file" onChange={handleFileUpload} className="flex-1 text-sm outline-none" accept="image/*,.pdf" />
                {uploading && <span className="text-sm text-primary animate-pulse">{t("reports.submitting")}</span>}
                {formData.receiptLink && !uploading && <span className="text-green-500 text-sm font-bold">✓ {t("payment.attached")}</span>}
              </div>
            </div>

            <div className="pt-6 border-t border-border flex justify-end">
              <button type="submit" disabled={uploading} className="bg-primary text-black font-black px-12 py-3 rounded-xl transition-all shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 disabled:opacity-50 uppercase tracking-widest">{editingPayment ? t("payment.update") : t("payment.record")}</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-secondary rounded-xl shadow-md border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border/50">
            <thead className="bg-muted/50">
              <tr>
                <th className={`px-6 py-4 font-bold text-muted-foreground text-[10px] uppercase tracking-widest ${language === "he" ? "text-right" : "text-left"}`}>{t("table.date")}</th>
                <th className={`px-6 py-4 font-bold text-muted-foreground text-[10px] uppercase tracking-widest ${language === "he" ? "text-right" : "text-left"}`}>{t("payment.type")}</th>
                <th className={`px-6 py-4 font-bold text-muted-foreground text-[10px] uppercase tracking-widest ${language === "he" ? "text-right" : "text-left"}`}>{t("payment.category")}</th>
                <th className={`px-6 py-4 font-bold text-muted-foreground text-[10px] uppercase tracking-widest ${language === "he" ? "text-right" : "text-left"}`}>{t("table.player")}</th>
                <th className={`px-6 py-4 font-bold text-muted-foreground text-[10px] uppercase tracking-widest ${language === "he" ? "text-right" : "text-left"}`}>{t("payment.amount")}</th>
                <th className={`px-6 py-4 font-bold text-muted-foreground text-[10px] uppercase tracking-widest ${language === "he" ? "text-right" : "text-left"}`}>{language === "he" ? "ספק" : "Supplier"}</th>
                <th className={`px-6 py-4 font-bold text-muted-foreground text-[10px] uppercase tracking-widest ${language === "he" ? "text-right" : "text-left"}`}>{t("payment.receipt")}</th>
                <th className={`px-6 py-4 font-bold text-muted-foreground text-[10px] uppercase tracking-widest ${language === "he" ? "text-right" : "text-left"}`}>{t("table.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center animate-pulse text-muted-foreground font-bold uppercase tracking-widest">{t("common.fetching")}</td></tr>
              ) : filteredPayments.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-muted-foreground italic">{t("payment.none")}</td></tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-5 text-sm">{format(new Date(p.paymentDate), language === "he" ? "dd/MM/yyyy" : "MMM dd, yyyy")}</td>
                    <td className="px-6 py-5 text-xs font-black"><span className={p.type === "EXPENSE" ? "text-red-500" : "text-green-500"}>{p.type === "EXPENSE" ? t("payment.type_expense") : t("payment.type_income")}</span></td>
                    <td className="px-6 py-5 text-xs font-bold opacity-60">{p.category || "-"}</td>
                    <td className="px-6 py-5 text-sm">
                      {p.player ? (
                        <Link href={`/admin/players/${p.player.id}`} className="text-primary hover:underline font-bold">{p.player.fullName}</Link>
                      ) : p.event ? (
                        <Link href={`/admin/events/${p.event.id}`} className="text-primary hover:underline font-bold">
                          {language === "he" ? "אירוע: " : "Event: "}{p.event.name}
                        </Link>
                      ) : (
                        <span className="opacity-40 italic">{t("payment.general_payment")}</span>
                      )}
                    </td>
                    <td className={`px-6 py-5 text-sm font-black ${p.type === "EXPENSE" ? "text-red-500" : "text-green-500"}`}>{p.type === "EXPENSE" ? "-" : "+"}₪{p.amount.toFixed(2)}</td>
                    <td className="px-6 py-5 text-xs font-medium opacity-70">{p.supplierName || "-"}</td>
                    <td className="px-6 py-5 text-sm">{p.receiptLink && <a href={p.receiptLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-bold text-xs">{t("payment.receipt")}</a>}</td>
                    <td className="px-6 py-5 text-sm">
                      <div className="flex gap-4">
                        <button onClick={() => handleEdit(p)} className="text-primary hover:opacity-80 font-bold uppercase text-[10px] tracking-widest">{t("action.edit")}</button>
                        <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:opacity-80 font-bold uppercase text-[10px] tracking-widest">{t("common.delete")}</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <PaymentsContent />
    </Suspense>
  )
}
