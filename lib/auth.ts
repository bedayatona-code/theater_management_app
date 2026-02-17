import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET || "development-secret-key-change-in-production",
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

        // Search by email first, then username
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: identifier },
              { username: identifier }
            ]
          },
          include: { player: true }
        })

        if (!user) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          password,
          user.password
        )

        if (!isPasswordValid) {
          return null
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
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.playerId = user.playerId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string
        session.user.playerId = token.playerId as string | null
      }
      return session
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
})

export async function getServerSession() {
  return await auth()
}

