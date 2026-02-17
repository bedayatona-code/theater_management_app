"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface DeleteButtonProps {
    id: string
    type: "events" | "players"
}

export function DeleteButton({ id, type }: DeleteButtonProps) {
    const router = useRouter()
    const [step, setStep] = useState<"idle" | "confirm1" | "confirm2" | "deleting">("idle")

    const handleDelete = async () => {
        setStep("deleting")
        try {
            const res = await fetch(`/api/admin/${type}/${id}`, {
                method: "DELETE",
            })

            if (!res.ok) {
                throw new Error("Failed to delete")
            }

            router.refresh()
            setStep("idle")
        } catch (error) {
            console.error(error)
            alert("Failed to delete item")
            setStep("idle")
        }
    }

    if (step === "idle") {
        return (
            <button
                onClick={() => setStep("confirm1")}
                className="text-red-500 hover:text-red-400 font-medium"
            >
                Delete
            </button>
        )
    }

    if (step === "confirm1") {
        return (
            <div className="flex gap-2 items-center">
                <span className="text-sm text-yellow-500">Are you sure?</span>
                <button
                    onClick={() => setStep("confirm2")}
                    className="text-red-500 font-bold hover:underline"
                >
                    Yes
                </button>
                <button
                    onClick={() => setStep("idle")}
                    className="text-gray-400 hover:text-white"
                >
                    Cancel
                </button>
            </div>
        )
    }

    if (step === "confirm2") {
        return (
            <div className="flex gap-2 items-center">
                <span className="text-sm text-red-500 font-bold">Really delete? Cannot undo!</span>
                <button
                    onClick={handleDelete}
                    className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                >
                    CONFIRM
                </button>
                <button
                    onClick={() => setStep("idle")}
                    className="text-gray-400 hover:text-white"
                >
                    Cancel
                </button>
            </div>
        )
    }

    return <span className="text-gray-500">Deleting...</span>
}
