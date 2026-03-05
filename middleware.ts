import NextAuth from "next-auth"
import { authConfig } from "./lib/auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
    const { nextUrl } = req
    const isLoggedIn = !!req.auth
    const userRole = (req.auth?.user as any)?.role

    console.log(`MIDDLEWARE DEBUG: path=${nextUrl.pathname}, isLoggedIn=${isLoggedIn}, role=${userRole}`);

    // Allow access to login page and API routes
    if (nextUrl.pathname.startsWith("/login") || nextUrl.pathname.startsWith("/api/auth")) {
        return NextResponse.next()
    }

    // Protect /admin routes - require ADMIN role
    if (nextUrl.pathname.startsWith("/admin")) {
        if (!isLoggedIn) {
            return NextResponse.redirect(new URL("/login", nextUrl))
        }
        if (userRole !== "ADMIN") {
            return NextResponse.redirect(new URL("/player", nextUrl))
        }
    }

    // Protect /player routes - require PLAYER role
    if (nextUrl.pathname.startsWith("/player")) {
        if (!isLoggedIn) {
            return NextResponse.redirect(new URL("/login", nextUrl))
        }
        if (userRole !== "PLAYER" && userRole !== "ADMIN") {
            return NextResponse.redirect(new URL("/admin", nextUrl))
        }
    }

    return NextResponse.next()
})

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
