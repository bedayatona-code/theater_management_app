"use client"

import { useState } from "react"
import { useLanguage } from "@/contexts/LanguageContext"

interface ImportDialogProps {
    isOpen: boolean
    onClose: () => void
    type: "players" | "events"
}

export function ImportDialog({ isOpen, onClose, type }: ImportDialogProps) {
    const { t, language } = useLanguage()
    const [file, setFile] = useState<File | null>(null)
    const [importing, setImporting] = useState(false)
    const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null)

    if (!isOpen) return null

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
            setResult(null)
        }
    }

    const handleImport = async () => {
        if (!file) return

        setImporting(true)
        setResult(null)

        try {
            const text = await file.text()
            const response = await fetch(`/api/admin/import/${type}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ csvData: text }),
            })

            const data = await response.json()

            if (response.ok) {
                setResult(data)
                if (data.errors.length === 0) {
                    setTimeout(() => {
                        window.location.reload()
                    }, 2000)
                }
            } else {
                alert(data.error || t("alert.generic_error"))
            }
        } catch (error) {
            console.error("Import error:", error)
            alert(t("alert.generic_error"))
        } finally {
            setImporting(false)
        }
    }

    const isRTL = language === "he"
    const title = type === "players" ? t("import.players_title") : t("import.events_title")
    const description = type === "players" ? t("import.players_desc") : t("import.events_desc")

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-background border border-border rounded-lg shadow-lg max-w-md w-full p-6" dir={isRTL ? "rtl" : "ltr"}>
                <h2 className="text-xl font-bold mb-4">{title}</h2>
                <p className="text-sm text-muted-foreground mb-4">{description}</p>

                <div className="mb-4">
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="w-full"
                    />
                </div>

                {result && (
                    <div className="mb-4 p-3 border rounded">
                        <p className="font-medium text-green-600">
                            {t("import.success_count")}: {result.success}
                        </p>
                        {result.errors.length > 0 && (
                            <div className="mt-2">
                                <p className="font-medium text-red-600">{t("import.errors")}:</p>
                                <ul className="text-sm text-red-500 list-disc list-inside">
                                    {result.errors.map((error, i) => (
                                        <li key={i}>{error}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex gap-2 justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-border rounded hover:bg-muted transition-colors"
                        disabled={importing}
                    >
                        {t("common.cancel")}
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={!file || importing}
                        className="px-4 py-2 bg-primary text-black rounded hover:opacity-80 transition-opacity disabled:opacity-50"
                    >
                        {importing ? t("import.importing") : t("import.import")}
                    </button>
                </div>
            </div>
        </div>
    )
}
