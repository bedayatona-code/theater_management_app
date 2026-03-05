import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { PlayerDetailClient } from "@/components/PlayerDetailClient"

export const dynamic = "force-dynamic"

export default async function PlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      eventPlayers: {
        include: {
          event: true,
          paymentEvents: true,
        },
      },
      payments: {
        include: {
          paymentEvents: {
            include: {
              eventPlayer: {
                include: {
                  event: true,
                },
              },
            },
          },
        },
        orderBy: {
          paymentDate: "desc",
        },
      },
    },
  })

  if (!player) {
    notFound()
  }

  return <PlayerDetailClient player={player} />
}

