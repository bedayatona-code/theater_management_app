"use strict";
"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { generateBudgetUtilizationReport, generatePaymentsReport, generateAccountantReport } from "@/lib/pdfGenerator";
import { formatCurrency } from "@/lib/formatters";

interface ReportsClientProps {
    initialReports?: any[]
}

export function ReportsClient({ initialReports }: ReportsClientProps = {}) {
    const { t, language } = useLanguage();
    const [activeTab, setActiveTab] = useState<"budget" | "payments" | "accountant">("budget");
    const [loading, setLoading] = useState(false);
    const [accountantLoading, setAccountantLoading] = useState(false);

    // Budget State
    const [budgetYear, setBudgetYear] = useState(new Date().getFullYear());
    const [budgetData, setBudgetData] = useState<any[]>([]);

    // Payments State
    const [payments, setPayments] = useState<any[]>([]);
    const [paymentFilters, setPaymentFilters] = useState({
        startDate: "",
        endDate: "",
        category: "all"
    });

    // Accountant Report State
    const [accountMonth, setAccountMonth] = useState(new Date().getMonth());
    const [accountYear, setAccountYear] = useState(new Date().getFullYear());

    const categories = [
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
    ];

    useEffect(() => {
        if (activeTab === "budget") {
            fetchBudgetData();
        } else {
            fetchPaymentsData();
        }
    }, [activeTab, budgetYear, paymentFilters]);

    const fetchBudgetData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/budgets?year=${budgetYear}`);
            const data = await res.json();
            setBudgetData(data.budgets || []);
        } catch (error) {
            console.error("Failed to fetch budget data", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPaymentsData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (paymentFilters.category !== "all") params.append("category", paymentFilters.category);
            // Note: API might not support date filtering yet, we might need to filter client side or update API
            // Checking previous knowledge: API supports query params but maybe not dates? 
            // Let's filter client side if API returns all, or append dates if API supports.
            // Assuming we fetch all for now and filter client side for better UX if dataset is small
            const res = await fetch("/api/payments");
            let data = await res.json();

            // Client-side filtering
            if (paymentFilters.category !== "all") {
                data = data.filter((p: any) => p.category === paymentFilters.category);
            }
            if (paymentFilters.startDate) {
                data = data.filter((p: any) => new Date(p.paymentDate) >= new Date(paymentFilters.startDate));
            }
            if (paymentFilters.endDate) {
                data = data.filter((p: any) => new Date(p.paymentDate) <= new Date(paymentFilters.endDate));
            }

            // Sort by date descending
            data.sort((a: any, b: any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

            setPayments(data);
        } catch (error) {
            console.error("Failed to fetch payments", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6" dir={language === "he" ? "rtl" : "ltr"}>
            <div className="flex flex-col md:flex-row justify-between items-center bg-secondary/30 p-6 md:p-8 rounded-2xl border border-border shadow-sm mb-8 mx-auto w-full">
                <h1 className="text-3xl font-bold text-primary tracking-tight mb-4 md:mb-0 text-center md:text-start w-full md:w-auto">
                    {language === "he" ? "דוחות ונתונים" : "Reports & Data"}
                </h1>

                <div className="flex bg-muted p-1 rounded-lg w-full md:w-auto overflow-x-auto justify-start md:justify-end">
                    <button
                        onClick={() => setActiveTab("budget")}
                        className={`px-3 md:px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === "budget" ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        {language === "he" ? "ניצול תקציב" : "Budget Utilization"}
                    </button>
                    <button
                        onClick={() => setActiveTab("payments")}
                        className={`px-3 md:px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === "payments" ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        {language === "he" ? "יומן תשלומים" : "Payments Log"}
                    </button>
                    <button
                        onClick={() => setActiveTab("accountant")}
                        className={`px-3 md:px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === "accountant" ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        {language === "he" ? "דוח לרואה חשבון" : "Accountant Report"}
                    </button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-border shadow-sm min-h-[500px]">
                {/* Budget Report View */}
                {activeTab === "budget" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                        <div className="flex justify-between items-center bg-secondary/50 p-4 rounded-xl">
                            <div className="flex items-center gap-4">
                                <label className="text-sm font-bold">{language === "he" ? "שנת תקציב:" : "Budget Year:"}</label>
                                <select
                                    value={budgetYear}
                                    onChange={(e) => setBudgetYear(parseInt(e.target.value))}
                                    className="bg-white border border-border px-3 py-1 rounded-md font-bold"
                                >
                                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                            <button
                                onClick={() => generateBudgetUtilizationReport(budgetData, budgetYear)}
                                className="bg-primary hover:bg-primary/90 text-black px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
                            >
                                <span>📄</span> {language === "he" ? "הפק דוח PDF" : "Generate PDF"}
                            </button>
                        </div>

                        {loading ? (
                            <div className="text-center py-20 text-muted-foreground">{language === "he" ? "טוען נתונים..." : "Loading data..."}</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 border-b border-border">
                                        <tr>
                                            <th className="px-4 py-3 text-right">{language === "he" ? "קטגוריה" : "Category"}</th>
                                            <th className="px-4 py-3 text-right">{language === "he" ? "תקציב" : "Budget"}</th>
                                            <th className="px-4 py-3 text-right">{language === "he" ? "ביצוע בפועל" : "Actual"}</th>
                                            <th className="px-4 py-3 text-right">{language === "he" ? "יתרה" : "Remaining"}</th>
                                            <th className="px-4 py-3 text-right">{language === "he" ? "ניצול %" : "Utilization %"}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/30">
                                        {budgetData.map((b, i) => {
                                            const actual = b.actual || 0; // Calculated in API now
                                            const budget = b.amount || 0;
                                            const utilization = budget > 0 ? (actual / budget) * 100 : 0;
                                            const remaining = budget - actual;
                                            const isOver = actual > budget;

                                            return (
                                                <tr key={i} className="hover:bg-muted/30">
                                                    <td className="px-4 py-3 font-medium">{b.category}</td>
                                                    <td className="px-4 py-3">{formatCurrency(budget)}</td>
                                                    <td className="px-4 py-3 text-blue-600">{formatCurrency(actual)}</td>
                                                    <td className={`px-4 py-3 font-bold ${remaining < 0 ? "text-red-500" : "text-green-600"}`}>
                                                        {formatCurrency(remaining)}
                                                    </td>
                                                    <td className="px-4 py-3 w-1/3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="relative flex-1 h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                                                                <div
                                                                    style={{ width: `${Math.min(utilization, 100)}%` }}
                                                                    className={`h-full ${utilization > 100 ? "bg-red-600" : "bg-blue-600"}`}
                                                                />
                                                            </div>
                                                            <span className="text-xs font-bold w-12">{utilization.toFixed(0)}%</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        <tr className="bg-muted/20 font-black border-t-2 border-border">
                                            <td className="px-4 py-3">{language === "he" ? "סה\"כ כללי" : "Grand Total"}</td>
                                            <td className="px-4 py-3">{formatCurrency(budgetData.reduce((s, b) => s + (b.amount || 0), 0))}</td>
                                            <td className="px-4 py-3 text-blue-600">{formatCurrency(budgetData.reduce((s, b) => s + (b.actual || 0), 0))}</td>
                                            <td className="px-4 py-3">{formatCurrency(budgetData.reduce((s, b) => s + ((b.amount || 0) - (b.actual || 0)), 0))}</td>
                                            <td className="px-4 py-3 text-xs opacity-50">-</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Payments Report View */}
                {activeTab === "payments" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                        <div className="flex flex-wrap gap-4 items-end bg-secondary/50 p-4 rounded-xl">
                            <div className="space-y-1">
                                <label className="text-xs font-bold">{language === "he" ? "מתאריך" : "From Date"}</label>
                                <input
                                    type="date"
                                    value={paymentFilters.startDate}
                                    onChange={(e) => setPaymentFilters({ ...paymentFilters, startDate: e.target.value })}
                                    className="block px-3 py-2 bg-white border border-border rounded-md text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold">{language === "he" ? "עד תאריך" : "To Date"}</label>
                                <input
                                    type="date"
                                    value={paymentFilters.endDate}
                                    onChange={(e) => setPaymentFilters({ ...paymentFilters, endDate: e.target.value })}
                                    className="block px-3 py-2 bg-white border border-border rounded-md text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold">{language === "he" ? "קטגוריה" : "Category"}</label>
                                <select
                                    value={paymentFilters.category}
                                    onChange={(e) => setPaymentFilters({ ...paymentFilters, category: e.target.value })}
                                    className="block px-3 py-2 bg-white border border-border rounded-md text-sm min-w-[150px]"
                                >
                                    <option value="all">{language === "he" ? "הכל" : "All"}</option>
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="flex-1 text-left">
                                <button
                                    onClick={() => generatePaymentsReport(payments, paymentFilters)}
                                    className="bg-primary hover:bg-primary/90 text-black px-4 py-2 rounded-lg font-bold text-sm inline-flex items-center gap-2"
                                >
                                    <span>📄</span> {language === "he" ? "הפק דוח PDF" : "Generate PDF"}
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="text-center py-20 text-muted-foreground">{language === "he" ? "טוען נתוני תשלומים..." : "Loading payments..."}</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 border-b border-border">
                                        <tr>
                                            <th className="px-4 py-3 text-right">{language === "he" ? "תאריך" : "Date"}</th>
                                            <th className="px-4 py-3 text-right">{language === "he" ? "קטגוריה" : "Category"}</th>
                                            <th className="px-4 py-3 text-right">{language === "he" ? "תיאור / עבור" : "Description / For"}</th>
                                            <th className="px-4 py-3 text-right">{language === "he" ? "סכום" : "Amount"}</th>
                                            <th className="px-4 py-3 text-right">{language === "he" ? "אמצעי תשלום" : "Method"}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/30">
                                        {payments.length === 0 ? (
                                            <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">{language === "he" ? "אין נתונים להצגה" : "No data found"}</td></tr>
                                        ) : (
                                            payments.map((p) => (
                                                <tr key={p.id} className="hover:bg-muted/30">
                                                    <td className="px-4 py-3">{format(new Date(p.paymentDate), "dd/MM/yyyy")}</td>
                                                    <td className="px-4 py-3">{p.category}</td>
                                                    <td className="px-4 py-3 text-muted-foreground">
                                                        {p.player ? p.player.fullName : (p.notes || "-")}
                                                    </td>
                                                    <td className="px-4 py-3 font-bold">{formatCurrency(p.amount)}</td>
                                                    <td className="px-4 py-3 text-xs opacity-60">{p.paymentMethod}</td>
                                                </tr>
                                            ))
                                        )}
                                        {payments.length > 0 && (
                                            <tr className="bg-primary/5 font-black border-t-2 border-primary/20">
                                                <td colSpan={3} className="px-4 py-3 text-left">{language === "he" ? "סה\"כ לתקופה זו" : "Total for Period"}</td>
                                                <td className="px-4 py-3 text-primary">{formatCurrency(payments.reduce((s, p) => s + p.amount, 0))}</td>
                                                <td></td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Accountant Report View */}
                {activeTab === "accountant" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                        <div className="flex flex-wrap gap-4 items-end bg-secondary/50 p-4 rounded-xl">
                            <div className="space-y-1">
                                <label className="text-xs font-bold">{language === "he" ? "חודש" : "Month"}</label>
                                <select
                                    value={accountMonth}
                                    onChange={(e) => setAccountMonth(parseInt(e.target.value))}
                                    className="block px-3 py-2 bg-white border border-border rounded-md text-sm min-w-[130px]"
                                >
                                    {Array.from({ length: 12 }, (_, i) => {
                                        const label = new Date(2000, i, 1).toLocaleString(language === "he" ? "he-IL" : "en-US", { month: "long" });
                                        return <option key={i} value={i}>{label}</option>;
                                    })}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold">{language === "he" ? "שנה" : "Year"}</label>
                                <select
                                    value={accountYear}
                                    onChange={(e) => setAccountYear(parseInt(e.target.value))}
                                    className="block px-3 py-2 bg-white border border-border rounded-md text-sm"
                                >
                                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                            <div className="flex-1 text-left">
                                <button
                                    disabled={accountantLoading}
                                    onClick={async () => {
                                        setAccountantLoading(true);
                                        try {
                                            const res = await fetch(`/api/admin/accountant-report?month=${accountMonth}&year=${accountYear}`);
                                            const data = await res.json();
                                            const monthLabel = new Date(accountYear, accountMonth, 1).toLocaleString(
                                                language === "he" ? "he-IL" : "en-US",
                                                { month: "long", year: "numeric" }
                                            );
                                            generateAccountantReport({
                                                month: accountMonth,
                                                year: accountYear,
                                                incomePayments: data.incomePayments || [],
                                                expensePayments: data.expensePayments || [],
                                                budgetData: data.budgetData || [],
                                                outstandingReceivables: data.outstandingReceivables || [],
                                                monthLabel,
                                            });
                                        } catch (err) {
                                            console.error("Accountant report error:", err);
                                            alert(language === "he" ? "שגיאה ביצירת הדוח" : "Error generating report");
                                        } finally {
                                            setAccountantLoading(false);
                                        }
                                    }}
                                    className="bg-primary hover:bg-primary/90 text-black px-4 py-2 rounded-lg font-bold text-sm inline-flex items-center gap-2 disabled:opacity-50"
                                >
                                    <span>📊</span> {accountantLoading ? (language === "he" ? "מייצר..." : "Generating...") : (language === "he" ? "הפק דוח לרואה חשבון" : "Generate Accountant Report")}
                                </button>
                            </div>
                        </div>

                        <div className="bg-muted/30 p-6 rounded-xl border border-border">
                            <h3 className="font-bold text-lg mb-3">{language === "he" ? "על הדוח" : "About This Report"}</h3>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li>📋 {language === "he" ? "סיכום הכנסות לחודש הנבחר" : "Monthly income summary"}</li>
                                <li>📋 {language === "he" ? "פירוט הוצאות לפי קטגוריה" : "Expense breakdown by category"}</li>
                                <li>📋 {language === "he" ? "סיכום רווח והפסד חודשי" : "Monthly P&L summary"}</li>
                                <li>📋 {language === "he" ? "תקציב מול ביצוע (שנתי מצטבר)" : "Budget vs Actual (YTD)"}</li>
                                <li>📋 {language === "he" ? "יתרות חוב לגביה" : "Outstanding receivables"}</li>
                                <li>📋 {language === "he" ? "פילוח לפי אמצעי תשלום" : "Payment method breakdown"}</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
