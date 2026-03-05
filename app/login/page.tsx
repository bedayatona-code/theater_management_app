"use client"

import { useState, useEffect } from "react"
import { signIn, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/contexts/LanguageContext"

export default function LoginPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const { data: session } = useSession()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    if (session?.user) {
      router.push(session.user.role === "ADMIN" ? "/admin" : "/player")
    }
  }, [session, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      console.log("Login result:", result)

      if (!result) {
        setError("No response from server. Check your connection.")
        return
      }

      if (result.error) {
        setError("Invalid email or password")
      } else if (result.ok) {
        // Wait for session to update
        setTimeout(() => {
          fetch("/api/auth/session")
            .then((res) => res.json())
            .then((data) => {
              const role = data?.user?.role
              router.push(role === "ADMIN" ? "/admin" : "/player")
              router.refresh()
            })
            .catch(() => {
              router.push("/admin")
              router.refresh()
            })
        }, 100)
      }
    } catch (err) {
      console.error("Login catch error:", err)
      setError("An error occurred during login")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="bg-secondary p-8 rounded-lg shadow-lg border border-border w-full max-w-md">
        <h1 className="text-3xl font-bold text-primary mb-6 text-center">
          {t("app.title")}
        </h1>
        <h2 className="text-xl font-semibold text-foreground mb-6 text-center">
          {t("nav.login")}
        </h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-muted-foreground">
              Email or Username
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground focus:ring-primary focus:border-primary"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-muted-foreground">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-muted border border-border rounded-md text-foreground focus:ring-primary focus:border-primary"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-3 rounded transition-colors"
          >
            {loading ? "Logging in..." : t("nav.login")}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Default Admin: admin@theater.com / admin123</p>
        </div>
      </div>
    </div>
  )
}

