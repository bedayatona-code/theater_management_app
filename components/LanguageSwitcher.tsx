"use client"

import { useLanguage } from "@/contexts/LanguageContext"
import { Language } from "@/lib/translations"

export function LanguageSwitcher() {
    const { language, setLanguage } = useLanguage()

    return (
        <div className="flex gap-2">
            {(["en", "he"] as Language[]).map((lang) => (
                <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`px-2 py-1 text-xs font-bold rounded uppercase transition-colors ${language === lang
                        ? "bg-primary text-black"
                        : "bg-transparent text-primary border border-primary/30 hover:border-primary"
                        }`}
                >
                    {lang}
                </button>
            ))}
        </div>
    )
}
