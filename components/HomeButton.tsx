"use client"

import Link from "next/link"

export function HomeButton() {
    return (
        <Link
            href="/admin"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors duration-200"
            aria-label="Go to Dashboard"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Home
        </Link>
    )
}
