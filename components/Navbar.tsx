"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { LanguageSwitcher } from "./LanguageSwitcher"
import { useLanguage } from "@/contexts/LanguageContext"

export function Navbar() {
  const { t } = useLanguage()
  const { data: session } = useSession()

  return (
    <nav className="bg-secondary border-b border-border shadow-sm">
      <div className="container mx-auto flex justify-between items-center p-4">
        <div className="flex items-center gap-6">
          <Link href={session?.user ? (session.user.role === "ADMIN" ? "/admin" : "/player") : "/login"} className="text-xl font-bold text-primary tracking-wider hover:text-primary/80 transition-colors duration-300">
            THEATER <span className="text-foreground">MANAGEMENT</span>
          </Link>

          {/* Admin Navigation Items */}
          {session?.user?.role === "ADMIN" && (
            <div className="hidden md:flex gap-4 ml-6">
              <Link href="/admin/events" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                {t("nav.events")}
              </Link>
              <Link href="/admin/players" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                {t("nav.players")}
              </Link>
              <Link href="/admin/payments" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                {t("nav.payments")}
              </Link>
              <Link href="/admin/payments/budgets" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                {t("nav.budgets")}
              </Link>
              <Link href="/admin/reports" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                {t("nav.reports")}
              </Link>
              <Link href="/admin#backups" className="text-sm font-medium text-foreground hover:text-primary transition-colors" onClick={() => { if (typeof window !== 'undefined' && window.location.pathname === '/admin') { document.getElementById('btn-manage-backups')?.click() } }}>
                {t("nav.backups")}
              </Link>
            </div>
          )}
        </div>

        <div className="flex gap-4 items-center">
          <LanguageSwitcher />
          {session?.user ? (
            <>
              <span className="text-xs text-muted-foreground hidden md:inline">
                {session.user.email}
              </span>
              {session.user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="text-sm font-medium px-4 py-2 rounded-md border border-primary/30 text-primary hover:bg-primary hover:text-black transition-all duration-300"
                >
                  {t("nav.admin")}
                </Link>
              )}
              {session.user.role === "PLAYER" && (
                <Link
                  href="/player"
                  className="text-sm font-medium px-4 py-2 rounded-md border border-primary/30 text-primary hover:bg-primary hover:text-black transition-all duration-300"
                >
                  {t("nav.player")}
                </Link>
              )}
              {session.user.role === "PLAYER" && (
                <Link
                  href="/player/report"
                  className="text-sm font-medium px-4 py-2 rounded-md border border-primary/30 text-primary hover:bg-primary hover:text-black transition-all duration-300"
                >
                  {t("nav.reportBug")}
                </Link>
              )}
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-sm font-medium px-4 py-2 rounded-md bg-red-500/20 text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white transition-all duration-300"
              >
                {t("nav.logout")}
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium px-4 py-2 rounded-md bg-primary text-black hover:bg-primary/90 transition-all duration-300"
            >
              {t("nav.login")}
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}

