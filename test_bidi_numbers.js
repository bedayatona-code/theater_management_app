
// @ts-ignore
const bidiFactory = require('bidi-js');
const bidi = bidiFactory();

function normalizeHebrew(text) {
    if (!text) return ""
    try {
        // CURRENT IMPLEMENTATION (Forces RTL)
        const levels = bidi.getEmbeddingLevels(text, 'rtl')
        return bidi.getReorderedString(text, levels)
    } catch (e) {
        return text
    }
}

function normalizeHebrewSmart(text) {
    if (!text) return ""
    try {
        // SMART IMPLEMENTATION (Detects Hebrew)
        const hasHebrew = /[\u0590-\u05FF]/.test(text.toString());
        const direction = hasHebrew ? 'rtl' : 'ltr';
        console.log(`[Smart] Text: "${text}" -> Dir: ${direction}`);
        const levels = bidi.getEmbeddingLevels(text.toString(), direction)
        return bidi.getReorderedString(text.toString(), levels)
    } catch (e) {
        return text
    }
}

const year = 2026;
const titleEng = `Budget Utilization Report - ${year}`;
const titleHeb = `דוח ניצול תקציב - ${year}`;

console.log("--- Current Implementation (Forced RTL) ---");
console.log(`Eng: "${titleEng}" -> "${normalizeHebrew(titleEng)}"`);
console.log(`Heb: "${titleHeb}" -> "${normalizeHebrew(titleHeb)}"`);

console.log("\n--- Smart Implementation (Auto Detect) ---");
console.log(`Eng: "${titleEng}" -> "${normalizeHebrewSmart(titleEng)}"`);
console.log(`Heb: "${titleHeb}" -> "${normalizeHebrewSmart(titleHeb)}"`);

const justNum = "2026";
console.log(`\nNum Only (RTL Base): "${justNum}" -> "${normalizeHebrew(justNum)}"`);
