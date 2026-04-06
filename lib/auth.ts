import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"
import { authConfig } from "./auth.config"

// Custom error class to distinguish DB errors from credential errors
class DatabaseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "DatabaseError"
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email or Name", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const identifier = typeof credentials.email === "string" ? credentials.email : ""
        const password = typeof credentials.password === "string" ? credentials.password : ""

        if (!identifier || !password) {
          return null
        }

        // Attempt DB lookup with timeout and retry
        let user: any = null
        let dbError: string | null = null

        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            // Race the DB query against a timeout
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error("DB_TIMEOUT")), 8000)
            )

            user = await Promise.race([
              prisma.user.findFirst({
                where: {
                  OR: [
                    { email: identifier },
                    { username: identifier }
                  ]
                },
                include: { player: true }
              }),
              timeoutPromise
            ]) as any

            // If we get here, the query succeeded
            dbError = null
            break
          } catch (err: any) {
            const msg = err?.message || String(err)
            console.error(`[AUTH] DB attempt ${attempt} failed:`, msg)

            if (msg.includes("DB_TIMEOUT")) {
              dbError = "Database connection timed out"
            } else if (msg.includes("Tenant") || msg.includes("tenant")) {
              dbError = "Database service unavailable (tenant not found)"
            } else if (msg.includes("connect") || msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND")) {
              dbError = "Cannot connect to database"
            } else {
              dbError = "Database error: " + msg.substring(0, 100)
            }

            // Wait 1 second before retry
            if (attempt < 2) {
              await new Promise(resolve => setTimeout(resolve, 1000))
            }
          }
        }

        // If we had a DB error, throw it so NextAuth returns it as an error message
        // (not as "invalid credentials")
        if (dbError) {
          console.error(`[AUTH] All DB attempts failed: ${dbError}`)
          throw new Error(dbError)
        }

        // User not found in DB — this IS a credential error
        if (!user) {
          return null
        }

        // Compare password
        try {
          const isPasswordValid = await bcrypt.compare(password, user.password)
          if (!isPasswordValid) {
            return null
          }
        } catch (err: any) {
          console.error("[AUTH] bcrypt error:", err)
          throw new Error("Password verification failed")
        }

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          playerId: user.playerId,
        }
      }
    })
  ],
})

export async function getServerSession() {
  return await auth()
}
