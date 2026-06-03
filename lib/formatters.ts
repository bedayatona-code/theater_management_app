// Number formatting utility
export function formatNumber(num: number): string {
    return num.toLocaleString('en-US')
}

export function formatCurrency(amount: number): string {
    return `₪${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Normalize a phone number for use in WhatsApp click-to-chat links (wa.me).
 * Returns digits-only with country code, or null if the number can't be confidently normalized.
 * Israeli local format (e.g. "050-1234567") is converted to international ("972501234567").
 */
export function normalizePhoneForWhatsapp(phone: string | null | undefined): string | null {
    if (!phone) return null
    const digits = phone.replace(/\D/g, '')
    if (!digits) return null

    // Israeli local: starts with 0, 10 digits total (e.g. 0501234567) -> 972 + rest
    if (digits.startsWith('0') && digits.length === 10) {
        return '972' + digits.slice(1)
    }
    // Already has a country code (typical 10-15 digits)
    if (digits.length >= 10 && digits.length <= 15 && !digits.startsWith('0')) {
        return digits
    }
    return null
}
