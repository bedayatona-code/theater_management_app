"use client"

import Link from "next/link"
import { format } from "date-fns"
import { useState } from "react"
import { DeleteButton } from "@/components/DeleteButton"
import { useLanguage } from "@/contexts/LanguageContext"

interface EventsClientProps {
    events: any[]
}

export function EventsClient({ events }: EventsClientProps) {
    const { t, language } = useLanguage()
    const [selectedMonth, setSelectedMonth] = useState<string>("")
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())

    // Generate list of years from events
    const years = Array.from(new Set(events.map(e => new Date(e.date).getFullYear()))).sort((a, b) => b - a)

    // Filter events by selected month and year
    const filteredEvents = events.filter(event => {
        const eventDate = new Date(event.date)
        const matchesYear = !selectedYear || eventDate.getFullYear().toString() === selectedYear
        const matchesMonth = !selectedMonth || (eventDate.getMonth() + 1).toString() === selectedMonth
        return matchesYear && matchesMonth
    })

    return (
        <div className="space-y-4" dir={language === "he" ? "rtl" : "ltr"}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold text-primary">{t("nav.events")}</h1>
                <div className={`flex flex-wrap items-center gap-4 ${language === "he" ? "flex-row-reverse" : ""}`}>
                    {/* Month and Year Filters */}
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="px-4 py-2 bg-secondary border border-border rounded-lg text-foreground font-medium text-sm focus:ring-2 focus:ring-primary outline-none"
                    >
                        <option value="">{language === "he" ? "כל השנים" : "All Years"}</option>
                        {years.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="px-4 py-2 bg-secondary border border-border rounded-lg text-foreground font-medium text-sm focus:ring-2 focus:ring-primary outline-none"
                    >
                        <option value="">{language === "he" ? "כל החודשים" : "All Months"}</option>
                        <option value="1">{language === "he" ? "ינואר" : "January"}</option>
                        <option value="2">{language === "he" ? "פברואר" : "February"}</option>
                        <option value="3">{language === "he" ? "מרץ" : "March"}</option>
                        <option value="4">{language === "he" ? "אפריל" : "April"}</option>
                        <option value="5">{language === "he" ? "מאי" : "May"}</option>
                        <option value="6">{language === "he" ? "יוני" : "June"}</option>
                        <option value="7">{language === "he" ? "יולי" : "July"}</option>
                        <option value="8">{language === "he" ? "אוגוסט" : "August"}</option>
                        <option value="9">{language === "he" ? "ספטמבר" : "September"}</option>
                        <option value="10">{language === "he" ? "אוקטובר" : "October"}</option>
                        <option value="11">{language === "he" ? "נובמבר" : "November"}</option>
                        <option value="12">{language === "he" ? "דצמבר" : "December"}</option>
                    </select>
                    <Link
                        href="/admin/events/new"
                        className="bg-primary hover:bg-primary/90 text-black font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
                    >
                        {t("action.createEvent")}
                    </Link>
                </div>
            </div>

            <div className="bg-secondary rounded-lg shadow-sm border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className={`px-6 py-3 font-bold text-muted-foreground text-xs uppercase tracking-wider ${language === "he" ? "text-right" : "text-left"}`}>
                                    {t("table.name")}
                                </th>
                                <th className={`px-6 py-3 font-bold text-muted-foreground text-xs uppercase tracking-wider ${language === "he" ? "text-right" : "text-left"}`}>
                                    {t("table.date")}
                                </th>
                                <th className={`px-6 py-3 font-bold text-muted-foreground text-xs uppercase tracking-wider ${language === "he" ? "text-right" : "text-left"}`}>
                                    {t("table.venue")}
                                </th>
                                <th className={`px-6 py-3 font-bold text-muted-foreground text-xs uppercase tracking-wider ${language === "he" ? "text-right" : "text-left"}`}>
                                    {t("table.players")}
                                </th>
                                <th className={`px-6 py-3 font-bold text-muted-foreground text-xs uppercase tracking-wider ${language === "he" ? "text-right" : "text-left"}`}>
                                    {t("table.actions")}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-foreground">
                            {filteredEvents.map((event: any) => (
                                <tr key={event.id} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Link href={`/admin/events/${event.id}`} className="text-sm font-bold text-primary hover:text-primary/80 transition-all">
                                            {event.name}
                                        </Link>
                                        {event.commissioner && (
                                            <div className="text-xs text-muted-foreground mt-0.5">{t("common.client")}: {event.commissioner}</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {format(new Date(event.date), language === "he" ? "dd/MM/yyyy" : "MMM dd, yyyy")}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {event.venue || "-"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {event.eventPlayers.length} {t("table.players").toLowerCase()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className={`flex items-center ${language === "he" ? "space-x-reverse space-x-4" : "space-x-4"}`}>
                                            <Link
                                                href={`/admin/events/${event.id}`}
                                                className="text-primary hover:text-primary/80 font-bold transition-colors"
                                            >
                                                {t("common.view_details")}
                                            </Link>
                                            <DeleteButton id={event.id} type="events" />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
