import { prisma } from "@/lib/prisma"
import { PlayersClient } from "@/components/PlayersClient"

export const dynamic = "force-dynamic"

export default async function PlayersPage() {
  const players = await prisma.player.findMany({
    include: {
      eventPlayers: {
        include: {
          event: true,
          paymentEvents: true,
        },
      },
    },
    orderBy: {
      fullName: "asc",
    },
  })

  return <PlayersClient players={players} />
}

