import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { PlayerEditForm } from "@/components/PlayerEditForm"

export default async function EditPlayerPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const player = await prisma.player.findUnique({
        where: { id },
        include: {
            user: true
        }
    })

    if (!player) {
        notFound()
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <h1 className="text-3xl font-bold mb-8 text-primary">Edit Player: {player.fullName}</h1>
            <PlayerEditForm player={player} />
        </div>
    )
}
