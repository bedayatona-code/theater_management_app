// Number formatting utility
export function formatNumber(num: number): string {
    return num.toLocaleString('en-US')
}

export function formatCurrency(amount: number): string {
    return `₪${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
