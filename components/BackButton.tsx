"use client"

import { useRouter } from "next/navigation"

export function BackButton() {
    const router = useRouter()

    return (
        <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors duration-200"
            aria-label="Go back"
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
                <path d="m15 18-6-6 6-6" />
            </svg>
            Back
        </button>
    )
}
