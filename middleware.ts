import NextAuth from "next-auth"
import { authConfig } from "./lib/auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
    // Just a simple log to see if we're even getting here without crashing
    console.log("MIDDLEWARE HIT:", req.nextUrl.pathname);

    const isLoggedIn = !!req.auth;
    const userRole = (req.auth?.user as any)?.role;

    // Protect /admin
    if (req.nextUrl.pathname.startsWith("/admin")) {
        if (!isLoggedIn) {
            return NextResponse.redirect(new URL("/login", req.nextUrl));
        }
        if (userRole !== "ADMIN") {
            return NextResponse.redirect(new URL("/player", req.nextUrl));
        }
    }

    // Protect /player
    if (req.nextUrl.pathname.startsWith("/player")) {
        if (!isLoggedIn) {
            return NextResponse.redirect(new URL("/login", req.nextUrl));
        }
        // Player and Admin can see player pages?
        if (userRole !== "PLAYER" && userRole !== "ADMIN") {
            return NextResponse.redirect(new URL("/admin", req.nextUrl));
        }
    }

    return NextResponse.next()
})

export const config = {
    matcher: ["/admin/:path*", "/player/:path*"],
}
