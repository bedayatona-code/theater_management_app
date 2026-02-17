import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
    const token = await getToken({ req: request, secret: process.env.AUTH_SECRET || "development-secret-key-change-in-production" })
    const { pathname } = request.nextUrl

    // Allow access to login page and API routes
    if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
        return NextResponse.next()
    }

    // Protect /admin routes - require ADMIN role
    if (pathname.startsWith("/admin")) {
        if (!token) {
            return NextResponse.redirect(new URL("/login", request.url))
        }
        if (token.role !== "ADMIN") {
            return NextResponse.redirect(new URL("/player", request.url))
        }
    }

    // Protect /player routes - require PLAYER role
    if (pathname.startsWith("/player")) {
        if (!token) {
            return NextResponse.redirect(new URL("/login", request.url))
        }
        if (token.role !== "PLAYER") {
            return NextResponse.redirect(new URL("/admin", request.url))
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: ["/admin/:path*", "/player/:path*"],
}
