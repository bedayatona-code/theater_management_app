"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { translations, Language, TranslationKey } from "@/lib/translations"

interface LanguageContextType {
    language: Language
    setLanguage: (lang: Language) => void
    t: (key: TranslationKey) => string
    dir: "ltr" | "rtl"
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguage] = useState<Language>("en")

    useEffect(() => {
        const saved = localStorage.getItem("language") as Language
        if (saved) setLanguage(saved)
    }, [])

    const handleSetLanguage = (lang: Language) => {
        setLanguage(lang)
        localStorage.setItem("language", lang)
        document.documentElement.dir = lang === "en" ? "ltr" : "rtl"
        document.documentElement.lang = lang
    }

    const t = (key: TranslationKey) => {
        const langTranslations = translations[language] as Record<string, string>
        return langTranslations[key] || key
    }

    const dir = language === "en" ? "ltr" : "rtl"

    return (
        <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t, dir }}>
            <div dir={dir} className="min-h-screen">
                {children}
            </div>
        </LanguageContext.Provider>
    )
}

export const useLanguage = () => {
    const context = useContext(LanguageContext)
    if (!context) throw new Error("useLanguage must be used within a LanguageProvider")
    return context
}
