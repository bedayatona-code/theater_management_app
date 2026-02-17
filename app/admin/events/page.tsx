import { prisma } from "@/lib/prisma"
import { EventsClient } from "@/components/EventsClient"

export default async function EventsPage() {
  const events = await prisma.event.findMany({
    include: {
      eventPlayers: {
        include: {
          player: true,
        },
      },
    },
    orderBy: {
      date: "desc",
    },
  })

  return <EventsClient events={events} />
}

