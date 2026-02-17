import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from "date-fns"
import { HEBREW_FONT_BASE64 } from './hebrewFontData'
import { BANNER_IMAGE_BASE64 } from './bannerData'
// @ts-ignore
import bidiFactory from 'bidi-js'

const bidi = bidiFactory()

/**
 * Adds the organization banner to the top of the PDF.
 * Returns the Y position after the banner for content placement.
 */
function addBanner(doc: jsPDF): number {
    try {
        if (BANNER_IMAGE_BASE64) {
            const pageWidth = doc.internal.pageSize.getWidth()
            // Banner: full width, ~25mm tall
            doc.addImage(
                `data:image/jpeg;base64,${BANNER_IMAGE_BASE64}`,
                'JPEG',
                0, 0,
                pageWidth, 25
            )
            return 30 // Content starts 30mm from top
        }
    } catch (e) {
        console.error('Error adding banner:', e)
    }
    return 10 // Fallback: no banner
}

/**
 * Loads the Hebrew font and adds it to the jsPDF document.
 * @param doc jsPDF instance
 */


/**
 * Loads the Hebrew font and adds it to the jsPDF document.
 * @param doc jsPDF instance
 */
function setupHebrewFont(doc: jsPDF) {
    try {
        console.log("Setting up Hebrew font...");
        if (!HEBREW_FONT_BASE64) {
            console.error("HEBREW_FONT_BASE64 is empty or undefined!");
            return;
        }
        console.log(`HEBREW_FONT_BASE64 length: ${HEBREW_FONT_BASE64.length}`);

        const fontName = 'Assistant';
        const fontFileName = 'Assistant-Regular.ttf';

        // Check if file exists in VFS
        if (!doc.existsFileInVFS(fontFileName)) {
            console.log(`Adding ${fontFileName} to VFS...`);
            doc.addFileToVFS(fontFileName, HEBREW_FONT_BASE64);
        } else {
            console.log(`${fontFileName} already in VFS.`);
        }

        // Add font
        console.log(`Adding font ${fontName}...`);
        doc.addFont(fontFileName, fontName, 'normal');

        // Set font
        console.log(`Setting font to ${fontName}...`);
        doc.setFont(fontName);
        console.log("Font setup complete.");

        // REMOVED: doc.setLanguage('he') - Potentially causes double-reversal or issues
    } catch (e) {
        console.error("Error loading Hebrew font:", e);
    }
}

function normalizeHebrew(text: string): string {
    if (!text) return ""
    try {
        const hasHebrew = /[\u0590-\u05FF]/.test(text.toString())
        // If it has Hebrew, use RTL, otherwise LTR (prevents reversing numbers in English strings)
        const direction = hasHebrew ? 'rtl' : 'ltr'
        const levels = bidi.getEmbeddingLevels(text.toString(), direction)
        return bidi.getReorderedString(text.toString(), levels)
    } catch (e) {
        console.error("Error normalizing Hebrew:", e)
        return text
    }
}

function createPlayerStatement(player: any, unpaidEvents: any[]) {
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        putOnlyUsedFonts: true
    })

    setupHebrewFont(doc)

    const totalOutstanding = unpaidEvents.reduce((sum, ep) => {
        const paid = (ep.paymentEvents || []).reduce((pSum: number, pe: any) => pSum + pe.amount, 0)
        return sum + (ep.fee - paid)
    }, 0)

    // Banner
    const bannerEnd = addBanner(doc)

    // Header
    doc.setFontSize(22)
    doc.setTextColor(40, 44, 52)
    doc.text(normalizeHebrew('Financial Statement / הצהרת תשלומים'), 14, bannerEnd + 2)

    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Generated on: ${new Date().toLocaleDateString()} `, 14, bannerEnd + 10)

    // Player Info
    doc.setFontSize(12)
    doc.setTextColor(0)
    doc.text('Player Details:', 14, bannerEnd + 22)
    doc.setFontSize(10)
    doc.text(`Name: ${player.fullName} `, 14, bannerEnd + 29)
    doc.text(`Email: ${player.email} `, 14, bannerEnd + 35)
    if (player.phone) doc.text(`Phone: ${player.phone} `, 14, bannerEnd + 41)

    // Summary Box
    doc.setFillColor(240, 240, 240)
    doc.rect(140, bannerEnd + 17, 56, 30, 'F')
    doc.setFontSize(10)
    doc.text('Outstanding Balance:', 145, bannerEnd + 27)
    doc.setFontSize(16)
    doc.setTextColor(180, 0, 0)
    doc.text(`ILS ${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })} `, 145, bannerEnd + 39)

    // Table
    const tableData = unpaidEvents.map(ep => {
        const paid = (ep.paymentEvents || []).reduce((pSum: number, pe: any) => pSum + pe.amount, 0)
        // Get details from the latest payment event if exists
        const lastPayment = ep.paymentEvents?.[ep.paymentEvents.length - 1]?.payment
        const method = lastPayment?.paymentMethod || "-"
        const notes = lastPayment?.notes || lastPayment?.transactionReference || "-"

        return [
            format(new Date(ep.event.date), 'dd/MM/yyyy'),
            normalizeHebrew(ep.event.name),
            `ILS ${ep.fee.toFixed(2)} `,
            `ILS ${paid.toFixed(2)} `,
            `ILS ${(ep.fee - paid).toFixed(2)} `,
            normalizeHebrew(method),
            normalizeHebrew(notes)
        ]
    })

    autoTable(doc, {
        startY: bannerEnd + 55,
        head: [['Date', 'Event', 'Fee', 'Paid', 'Balance', 'Method', 'Notes'].map(h => normalizeHebrew(h))],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [40, 44, 52], fontSize: 10, font: 'Assistant', fontStyle: 'normal' },
        bodyStyles: { fontSize: 9, font: 'Assistant', halign: 'right' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { top: bannerEnd + 55 },
        styles: { font: 'Assistant' } // Ensure font is applied globally to table
    })

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150)
        doc.text(
            `Theater App - Professional Financial Report | Page ${i} of ${pageCount} `,
            14,
            doc.internal.pageSize.height - 10
        )
    }
    return doc
}

export function generatePlayerStatement(player: any, unpaidEvents: any[]) {
    const doc = createPlayerStatement(player, unpaidEvents)
    doc.save(`Statement_${player.fullName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
}

export function generatePlayerStatementBlob(player: any, unpaidEvents: any[]) {
    const doc = createPlayerStatement(player, unpaidEvents)
    return doc.output('blob')
}

export function generateAllPlayersPaymentSummary(players: any[]) {
    const doc = new jsPDF()
    setupHebrewFont(doc)

    // Banner
    const bannerEnd = addBanner(doc)

    // Header
    doc.setFontSize(22)
    doc.setTextColor(40, 44, 52)
    doc.text('Players Payment Summary', 14, bannerEnd + 2)

    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Generated on: ${new Date().toLocaleDateString()} `, 14, bannerEnd + 10)

    // Table
    const tableData = players.map(p => {
        const lastPaymentDate = p.payments?.[0]?.paymentDate
            ? format(new Date(p.payments[0].paymentDate), 'dd/MM/yyyy')
            : "-"

        return [
            normalizeHebrew(p.fullName),
            p.email,
            `ILS ${p.totalFees.toLocaleString(undefined, { minimumFractionDigits: 2 })} `,
            `ILS ${p.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })} `,
            `ILS ${p.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })} `,
            lastPaymentDate
        ]
    })

    autoTable(doc, {
        startY: bannerEnd + 15,
        head: [['Name', 'Email', 'Total Fees', 'Paid', 'Outstanding', 'Last Pay'].map(h => normalizeHebrew(h))],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [40, 44, 52], fontSize: 10, font: 'Assistant', fontStyle: 'normal' },
        bodyStyles: { fontSize: 9, font: 'Assistant', halign: 'right' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { top: bannerEnd + 15 },
        styles: { font: 'Assistant' }
    })

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150)
        doc.text(
            `Theater App - All Players Financial Summary | Page ${i} of ${pageCount} `,
            14,
            doc.internal.pageSize.height - 10
        )
    }

    doc.save(`Players_Payment_Summary_${new Date().toISOString().split('T')[0]}.pdf`)
}

export function generateBudgetUtilizationReport(budgetData: any[], year: number) {
    const doc = new jsPDF()
    setupHebrewFont(doc)

    // Banner
    const bannerEnd = addBanner(doc)

    // Header
    doc.setFontSize(22)
    doc.setTextColor(40, 44, 52)
    doc.text(normalizeHebrew(`Budget Utilization Report - ${year} `), 195, bannerEnd + 2, { align: 'right' })
    doc.text(normalizeHebrew(`דוח ניצול תקציב - ${year} `), 195, bannerEnd + 10, { align: 'right' })

    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Generated on: ${new Date().toLocaleDateString()} `, 14, bannerEnd + 10)

    // Table Data
    const tableData = budgetData.map(b => {
        const budget = b.amount || 0
        const actual = b.actual || 0
        const utilization = budget > 0 ? (actual / budget) * 100 : 0
        const remaining = budget - actual

        return [
            normalizeHebrew(b.category), // Category Name
            `ILS ${budget.toLocaleString()} `, // Budget
            `ILS ${actual.toLocaleString()} `, // Actual
            `ILS ${remaining.toLocaleString()} `, // Remaining
            `${utilization.toFixed(1)}% ` // Utilization
        ]
    })

    // Calculate Totals
    const totalBudget = budgetData.reduce((sum, b) => sum + (b.amount || 0), 0)
    const totalActual = budgetData.reduce((sum, b) => sum + b.actual, 0)
    const totalRemaining = totalBudget - totalActual
    const totalUtilization = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0

    // Add Total Row
    tableData.push([
        normalizeHebrew("סה\"כ / Total"),
        `ILS ${totalBudget.toLocaleString()} `,
        `ILS ${totalActual.toLocaleString()} `,
        `ILS ${totalRemaining.toLocaleString()} `,
        `${totalUtilization.toFixed(1)}% `
    ])

    // Hebrew Headers Mapping:
    // Budget -> תקציב
    // Actual -> ביצוע
    // Balance -> יתרה (Assuming Remaining is Balance)
    // % Utilization -> % ניצול
    const headers = ['קטגוריה', 'תקציב', 'ביצוע', 'יתרה', '% ניצול']

    autoTable(doc, {
        startY: bannerEnd + 15,
        head: [headers.map(h => normalizeHebrew(h)).reverse()],
        body: tableData.map(row => [...row].reverse()),
        theme: 'grid',
        headStyles: { fillColor: [40, 44, 52], fontSize: 10, font: 'Assistant', fontStyle: 'normal', halign: 'right' },
        bodyStyles: { fontSize: 9, font: 'Assistant', halign: 'right' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { top: bannerEnd + 15 },
        styles: { font: 'Assistant', halign: 'right' }
    })

    doc.save(`Budget_Report_${year}_${new Date().toISOString().split('T')[0]}.pdf`)
}

export function generatePaymentsReport(payments: any[], filters: { category?: string, startDate?: string, endDate?: string }) {
    const doc = new jsPDF()
    setupHebrewFont(doc)

    // Banner
    const bannerEnd = addBanner(doc)

    // Header
    doc.setFontSize(22)
    doc.setTextColor(40, 44, 52)
    doc.text(normalizeHebrew('Payments Report / דוח תשלומים'), 195, bannerEnd + 2, { align: 'right' })

    doc.setFontSize(10)
    doc.setTextColor(100)
    let filterText = `Generated on: ${new Date().toLocaleDateString()} `
    if (filters.category && filters.category !== 'all') filterText += ` | Category: ${normalizeHebrew(filters.category)} `
    if (filters.startDate) filterText += ` | From: ${filters.startDate} `
    if (filters.endDate) filterText += ` | To: ${filters.endDate} `
    doc.text(filterText, 14, bannerEnd + 10)

    // Table Data - expanded with check number, transaction ref, bank details
    const tableData = payments.map(p => {
        return [
            format(new Date(p.paymentDate), 'dd/MM/yyyy'),
            normalizeHebrew(p.category || "-"),
            normalizeHebrew(p.player?.fullName || p.notes || "-"),
            `ILS ${p.amount.toLocaleString()} `,
            normalizeHebrew(p.paymentMethod || "-"),
            normalizeHebrew(p.checkNumber || "-"),
            normalizeHebrew(p.transactionReference || "-"),
            normalizeHebrew(p.bankAccount ? `${p.bankNumber || ''}/${p.bankAccount}` : "-")
        ]
    })

    // Calculate Total
    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0)
    tableData.push([
        "", "", normalizeHebrew("סה\"כ / Total"), `ILS ${totalAmount.toLocaleString()} `, "", "", "", ""
    ])

    autoTable(doc, {
        startY: bannerEnd + 15,
        head: [['תאריך', 'קטגוריה', 'תיאור / שם', 'סכום', 'אמצעי תשלום', 'מס צ\'ק', 'אסמכתא', 'חשבון בנק'].map(h => normalizeHebrew(h)).reverse()],
        body: tableData.map(row => [...row].reverse()),
        theme: 'grid',
        headStyles: { fillColor: [40, 44, 52], fontSize: 8, font: 'Assistant', fontStyle: 'normal', halign: 'right' },
        bodyStyles: { fontSize: 7, font: 'Assistant', halign: 'right' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { top: bannerEnd + 15, left: 5, right: 5 },
        styles: { font: 'Assistant', halign: 'right', cellPadding: 2 }
    })

    doc.save(`Payments_Report_${new Date().toISOString().split('T')[0]}.pdf`)
}

/**
 * Generates a comprehensive monthly accountant report for an Israeli NGO (עמותה).
 * Includes: income summary, expense breakdown by category, budget vs actual,
 * outstanding receivables, and payment method analysis.
 */
export function generateAccountantReport(data: {
    month: number,
    year: number,
    incomePayments: any[],
    expensePayments: any[],
    budgetData: any[],
    outstandingReceivables: any[],
    monthLabel: string,
}) {
    const doc = new jsPDF()
    setupHebrewFont(doc)
    const bannerEnd = addBanner(doc)
    const pageWidth = doc.internal.pageSize.getWidth()

    // ===== Title =====
    doc.setFontSize(20)
    doc.setTextColor(40, 44, 52)
    doc.text(normalizeHebrew(`דוח חודשי לרואה חשבון - ${data.monthLabel}`), pageWidth - 14, bannerEnd + 4, { align: 'right' })
    doc.setFontSize(9)
    doc.setTextColor(100)
    doc.text(normalizeHebrew(`Monthly Accountant Report`), pageWidth - 14, bannerEnd + 10, { align: 'right' })
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, bannerEnd + 10)

    let currentY = bannerEnd + 18

    // ===== 1. Income Summary =====
    doc.setFontSize(14)
    doc.setTextColor(16, 185, 129) // green
    doc.text(normalizeHebrew('1. סיכום הכנסות'), pageWidth - 14, currentY, { align: 'right' })
    currentY += 3

    const totalIncome = data.incomePayments.reduce((s, p) => s + p.amount, 0)

    if (data.incomePayments.length > 0) {
        const incomeRows = data.incomePayments.map(p => [
            format(new Date(p.paymentDate), 'dd/MM/yyyy'),
            normalizeHebrew(p.player?.fullName || p.notes || '-'),
            `ILS ${p.amount.toLocaleString()}`,
            normalizeHebrew(p.paymentMethod || '-'),
            normalizeHebrew(p.transactionReference || p.checkNumber || '-'),
        ])
        incomeRows.push(['', normalizeHebrew('סה"כ הכנסות'), `ILS ${totalIncome.toLocaleString()}`, '', ''])

        autoTable(doc, {
            startY: currentY,
            head: [['תאריך', 'תיאור', 'סכום', 'אמצעי תשלום', 'אסמכתא'].map(h => normalizeHebrew(h)).reverse()],
            body: incomeRows.map(r => [...r].reverse()),
            theme: 'grid',
            headStyles: { fillColor: [16, 185, 129], fontSize: 8, font: 'Assistant', fontStyle: 'normal', halign: 'right' },
            bodyStyles: { fontSize: 7, font: 'Assistant', halign: 'right' },
            alternateRowStyles: { fillColor: [240, 253, 244] },
            margin: { left: 5, right: 5 },
            styles: { font: 'Assistant', halign: 'right', cellPadding: 2 },
        })
        currentY = (doc as any).lastAutoTable.finalY + 8
    } else {
        currentY += 5
        doc.setFontSize(9)
        doc.setTextColor(150)
        doc.text(normalizeHebrew('אין הכנסות בחודש זה'), pageWidth - 14, currentY, { align: 'right' })
        currentY += 8
    }

    // ===== 2. Expense Summary by Category =====
    if (currentY > 240) { doc.addPage(); addBanner(doc); currentY = 35 }
    doc.setFontSize(14)
    doc.setTextColor(239, 68, 68) // red
    doc.text(normalizeHebrew('2. סיכום הוצאות לפי קטגוריה'), pageWidth - 14, currentY, { align: 'right' })
    currentY += 3

    const totalExpenses = data.expensePayments.reduce((s, p) => s + p.amount, 0)

    if (data.expensePayments.length > 0) {
        // Group by category
        const catMap: Record<string, { total: number, count: number }> = {}
        data.expensePayments.forEach(p => {
            const cat = p.category || 'אחר'
            if (!catMap[cat]) catMap[cat] = { total: 0, count: 0 }
            catMap[cat].total += p.amount
            catMap[cat].count++
        })

        const expCatRows = Object.entries(catMap).map(([cat, v]) => [
            normalizeHebrew(cat),
            v.count.toString(),
            `ILS ${v.total.toLocaleString()}`,
        ])
        expCatRows.push([normalizeHebrew('סה"כ הוצאות'), data.expensePayments.length.toString(), `ILS ${totalExpenses.toLocaleString()}`])

        autoTable(doc, {
            startY: currentY,
            head: [['קטגוריה', 'מס\' פעולות', 'סכום'].map(h => normalizeHebrew(h)).reverse()],
            body: expCatRows.map(r => [...r].reverse()),
            theme: 'grid',
            headStyles: { fillColor: [239, 68, 68], fontSize: 8, font: 'Assistant', fontStyle: 'normal', halign: 'right' },
            bodyStyles: { fontSize: 7, font: 'Assistant', halign: 'right' },
            alternateRowStyles: { fillColor: [254, 242, 242] },
            margin: { left: 5, right: 5 },
            styles: { font: 'Assistant', halign: 'right', cellPadding: 2 },
        })
        currentY = (doc as any).lastAutoTable.finalY + 5

        // Detailed expense listing
        const expDetailRows = data.expensePayments.map(p => [
            format(new Date(p.paymentDate), 'dd/MM/yyyy'),
            normalizeHebrew(p.category || '-'),
            normalizeHebrew(p.notes || p.player?.fullName || '-'),
            `ILS ${p.amount.toLocaleString()}`,
            normalizeHebrew(p.paymentMethod || '-'),
            normalizeHebrew(p.checkNumber || '-'),
            normalizeHebrew(p.transactionReference || '-'),
        ])

        autoTable(doc, {
            startY: currentY,
            head: [['תאריך', 'קטגוריה', 'תיאור', 'סכום', 'אמצעי', 'צ\'ק', 'אסמכתא'].map(h => normalizeHebrew(h)).reverse()],
            body: expDetailRows.map(r => [...r].reverse()),
            theme: 'grid',
            headStyles: { fillColor: [239, 68, 68], fontSize: 7, font: 'Assistant', fontStyle: 'normal', halign: 'right' },
            bodyStyles: { fontSize: 6, font: 'Assistant', halign: 'right' },
            alternateRowStyles: { fillColor: [254, 242, 242] },
            margin: { left: 5, right: 5 },
            styles: { font: 'Assistant', halign: 'right', cellPadding: 1.5 },
        })
        currentY = (doc as any).lastAutoTable.finalY + 8
    } else {
        currentY += 5
        doc.setFontSize(9)
        doc.setTextColor(150)
        doc.text(normalizeHebrew('אין הוצאות בחודש זה'), pageWidth - 14, currentY, { align: 'right' })
        currentY += 8
    }

    // ===== 3. Monthly P&L Summary =====
    if (currentY > 240) { doc.addPage(); addBanner(doc); currentY = 35 }
    doc.setFontSize(14)
    doc.setTextColor(40, 44, 52)
    doc.text(normalizeHebrew('3. סיכום רווח והפסד חודשי'), pageWidth - 14, currentY, { align: 'right' })
    currentY += 3

    const netResult = totalIncome - totalExpenses
    const plRows = [
        [normalizeHebrew('סה"כ הכנסות'), `ILS ${totalIncome.toLocaleString()}`],
        [normalizeHebrew('סה"כ הוצאות'), `ILS ${totalExpenses.toLocaleString()}`],
        [normalizeHebrew(netResult >= 0 ? 'עודף (רווח)' : 'גירעון (הפסד)'), `ILS ${netResult.toLocaleString()}`],
    ]

    autoTable(doc, {
        startY: currentY,
        head: [['פרט', 'סכום'].map(h => normalizeHebrew(h)).reverse()],
        body: plRows.map(r => [...r].reverse()),
        theme: 'grid',
        headStyles: { fillColor: [40, 44, 52], fontSize: 9, font: 'Assistant', fontStyle: 'normal', halign: 'right' },
        bodyStyles: { fontSize: 8, font: 'Assistant', halign: 'right' },
        styles: { font: 'Assistant', halign: 'right', cellPadding: 3 },
        margin: { left: 40, right: 40 },
    })
    currentY = (doc as any).lastAutoTable.finalY + 8

    // ===== 4. Budget vs Actual (if data available) =====
    if (data.budgetData.length > 0) {
        if (currentY > 220) { doc.addPage(); addBanner(doc); currentY = 35 }
        doc.setFontSize(14)
        doc.setTextColor(59, 130, 246) // blue
        doc.text(normalizeHebrew('4. תקציב מול ביצוע (שנתי מצטבר)'), pageWidth - 14, currentY, { align: 'right' })
        currentY += 3

        const budgetRows = data.budgetData.map(b => {
            const util = b.budget > 0 ? ((b.actual / b.budget) * 100).toFixed(1) + '%' : '-'
            return [
                normalizeHebrew(b.category),
                `ILS ${(b.budget || 0).toLocaleString()}`,
                `ILS ${(b.actual || 0).toLocaleString()}`,
                `ILS ${((b.budget || 0) - (b.actual || 0)).toLocaleString()}`,
                util,
            ]
        })

        autoTable(doc, {
            startY: currentY,
            head: [['קטגוריה', 'תקציב', 'ביצוע', 'יתרה', '% ניצול'].map(h => normalizeHebrew(h)).reverse()],
            body: budgetRows.map(r => [...r].reverse()),
            theme: 'grid',
            headStyles: { fillColor: [59, 130, 246], fontSize: 8, font: 'Assistant', fontStyle: 'normal', halign: 'right' },
            bodyStyles: { fontSize: 7, font: 'Assistant', halign: 'right' },
            alternateRowStyles: { fillColor: [239, 246, 255] },
            margin: { left: 5, right: 5 },
            styles: { font: 'Assistant', halign: 'right', cellPadding: 2 },
        })
        currentY = (doc as any).lastAutoTable.finalY + 8
    }

    // ===== 5. Outstanding Receivables =====
    if (data.outstandingReceivables.length > 0) {
        if (currentY > 220) { doc.addPage(); addBanner(doc); currentY = 35 }
        doc.setFontSize(14)
        doc.setTextColor(245, 158, 11) // amber
        doc.text(normalizeHebrew('5. יתרות חוב לגביה'), pageWidth - 14, currentY, { align: 'right' })
        currentY += 3

        const recRows = data.outstandingReceivables.map(r => [
            normalizeHebrew(r.playerName),
            `ILS ${r.totalFees.toLocaleString()}`,
            `ILS ${r.totalPaid.toLocaleString()}`,
            `ILS ${r.outstanding.toLocaleString()}`,
        ])
        const totalOutstanding = data.outstandingReceivables.reduce((s: number, r: any) => s + r.outstanding, 0)
        recRows.push([normalizeHebrew('סה"כ'), '', '', `ILS ${totalOutstanding.toLocaleString()}`])

        autoTable(doc, {
            startY: currentY,
            head: [['שם', 'סה"כ חיובים', 'שולם', 'יתרת חוב'].map(h => normalizeHebrew(h)).reverse()],
            body: recRows.map(r => [...r].reverse()),
            theme: 'grid',
            headStyles: { fillColor: [245, 158, 11], fontSize: 8, font: 'Assistant', fontStyle: 'normal', halign: 'right' },
            bodyStyles: { fontSize: 7, font: 'Assistant', halign: 'right' },
            alternateRowStyles: { fillColor: [255, 251, 235] },
            margin: { left: 5, right: 5 },
            styles: { font: 'Assistant', halign: 'right', cellPadding: 2 },
        })
        currentY = (doc as any).lastAutoTable.finalY + 8
    }

    // ===== 6. Payment Method Breakdown =====
    if (currentY > 240) { doc.addPage(); addBanner(doc); currentY = 35 }
    doc.setFontSize(14)
    doc.setTextColor(139, 92, 246) // purple
    doc.text(normalizeHebrew('6. פילוח לפי אמצעי תשלום'), pageWidth - 14, currentY, { align: 'right' })
    currentY += 3

    const allPayments = [...data.incomePayments, ...data.expensePayments]
    const methodMap: Record<string, { income: number, expense: number, count: number }> = {}
    allPayments.forEach(p => {
        const method = p.paymentMethod || 'אחר'
        if (!methodMap[method]) methodMap[method] = { income: 0, expense: 0, count: 0 }
        if (p.type === 'INCOME') methodMap[method].income += p.amount
        else methodMap[method].expense += p.amount
        methodMap[method].count++
    })

    if (Object.keys(methodMap).length > 0) {
        const methodRows = Object.entries(methodMap).map(([method, v]) => [
            normalizeHebrew(method),
            v.count.toString(),
            `ILS ${v.income.toLocaleString()}`,
            `ILS ${v.expense.toLocaleString()}`,
        ])

        autoTable(doc, {
            startY: currentY,
            head: [['אמצעי תשלום', 'מס\' פעולות', 'הכנסות', 'הוצאות'].map(h => normalizeHebrew(h)).reverse()],
            body: methodRows.map(r => [...r].reverse()),
            theme: 'grid',
            headStyles: { fillColor: [139, 92, 246], fontSize: 8, font: 'Assistant', fontStyle: 'normal', halign: 'right' },
            bodyStyles: { fontSize: 7, font: 'Assistant', halign: 'right' },
            alternateRowStyles: { fillColor: [245, 243, 255] },
            margin: { left: 20, right: 20 },
            styles: { font: 'Assistant', halign: 'right', cellPadding: 2 },
        })
    }

    // Footer on all pages
    const pageCount = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(7)
        doc.setTextColor(150)
        doc.text(
            `${normalizeHebrew('דוח חודשי לרואה חשבון')} | ${data.monthLabel} | Page ${i}/${pageCount}`,
            14,
            doc.internal.pageSize.height - 8
        )
    }

    doc.save(`Accountant_Report_${data.year}_${(data.month + 1).toString().padStart(2, '0')}.pdf`)
}

export function generateTestPdfBlob() {
    const doc = new jsPDF();
    setupHebrewFont(doc);

    doc.setFontSize(20);
    doc.text(normalizeHebrew("שלום עולם / Hello World"), 100, 20, { align: 'center' });
    doc.text("Total", 20, 40);
    doc.text(normalizeHebrew("סה\"כ / Total"), 20, 60);

    return doc.output('blob');
}
