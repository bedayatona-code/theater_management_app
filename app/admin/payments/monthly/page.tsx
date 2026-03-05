import { prisma } from "@/lib/prisma"
import { LanguageProviderWrapper } from "@/components/LanguageProviderWrapper"
import { MonthlyPaymentsClient } from "@/components/MonthlyPaymentsClient"

export const dynamic = "force-dynamic"

export default async function MonthlyPaymentsPage() {
    const payments = await prisma.payment.findMany({
        include: {
            player: true,
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
    })

    return (
        <LanguageProviderWrapper>
            <MonthlyPaymentsClient payments={payments} />
        </LanguageProviderWrapper>
    )
}
