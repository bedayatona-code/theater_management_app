import type { NextAuthConfig } from "next-auth"

export const authConfig = {
    trustHost: true,
    secret: process.env.AUTH_SECRET || "development-secret-key-change-in-production",
    providers: [], // We add Credentials in auth.ts
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = (user as any).role
                token.playerId = (user as any).playerId
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).role = token.role as string
                (session.user as any).playerId = token.playerId as string | null
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
} satisfies NextAuthConfig;
