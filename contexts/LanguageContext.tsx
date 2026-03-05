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
    // Always initialize to "en" to match the server-rendered HTML and avoid hydration mismatch.
    const [language, setLanguageState] = useState<Language>("en")
    const [isReady, setIsReady] = useState(false)

    // On mount: read saved language from localStorage, apply it, then reveal content.
    // This runs once and sets everything in a single batch to prevent flashing.
    useEffect(() => {
        const saved = window.localStorage.getItem("language") as Language | null
        const lang: Language = saved === "he" ? "he" : "en"
        setLanguageState(lang)
        document.documentElement.dir = lang === "en" ? "ltr" : "rtl"
        document.documentElement.lang = lang
        setIsReady(true)
    }, [])

    // Keep document attributes in sync when language changes after initial load
    // (e.g. user clicks the language switcher)
    useEffect(() => {
        if (!isReady) return
        document.documentElement.dir = language === "en" ? "ltr" : "rtl"
        document.documentElement.lang = language
    }, [language, isReady])

    const handleSetLanguage = (lang: Language) => {
        setLanguageState(lang)
        window.localStorage.setItem("language", lang)
    }

    const t = (key: TranslationKey) => {
        const langTranslations = translations[language] as Record<string, string>
        return langTranslations[key] || key
    }

    const dir: "ltr" | "rtl" = language === "en" ? "ltr" : "rtl"

    return (
        <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t, dir }}>
            <div
                dir={dir}
                className="min-h-screen"
                style={{ visibility: isReady ? "visible" : "hidden" }}
            >
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
