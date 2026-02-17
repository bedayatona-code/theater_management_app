import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { LanguageProviderWrapper } from "@/components/LanguageProviderWrapper"
import { PlayerPortalClient } from "@/components/PlayerPortalClient"

export default async function PlayerPortal() {
  const session = await getServerSession()

  // Redirect if not logged in or not a player
  if (!session?.user || session.user.role !== "PLAYER") {
    redirect("/login")
  }

  // Get player data from session
  const player = await prisma.player.findUnique({
    where: { id: session.user.playerId! },
    include: {
      eventPlayers: {
        include: {
          event: true,
          paymentEvents: {
            include: {
              payment: true
            }
          },
        },
        orderBy: {
          event: {
            date: "desc",
          },
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
    return (
      <LanguageProviderWrapper>
        <div className="p-6 text-foreground">Player data not found</div>
      </LanguageProviderWrapper>
    )
  }

  return (
    <LanguageProviderWrapper>
      <PlayerPortalClient player={player} />
    </LanguageProviderWrapper>
  )
}
