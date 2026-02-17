import { prisma } from "@/lib/prisma"
import { PlayersClient } from "@/components/PlayersClient"

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

