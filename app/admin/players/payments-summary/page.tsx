import { prisma } from "@/lib/prisma"
import { PlayersPaymentsSummaryClient } from "@/components/PlayersPaymentsSummaryClient"

export const dynamic = "force-dynamic"

export default async function PlayersPaymentsSummaryPage() {
    const players = await prisma.player.findMany({
        include: {
            eventPlayers: {
                select: {
                    fee: true
                }
            },
            payments: {
                select: {
                    amount: true
                }
            }
        },
        orderBy: {
            fullName: 'asc'
        }
    })

    const transformedPlayers = players.map(player => {
        const totalFees = player.eventPlayers.reduce((sum, ep) => sum + ep.fee, 0)
        const totalPaid = player.payments.reduce((sum, p) => sum + p.amount, 0)
        return {
            id: player.id,
            fullName: player.fullName,
            email: player.email,
            totalFees,
            totalPaid,
            outstanding: Math.max(0, totalFees - totalPaid)
        }
    })

    return <PlayersPaymentsSummaryClient players={transformedPlayers} />
}
