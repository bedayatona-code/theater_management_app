import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { LanguageProviderWrapper } from "@/components/LanguageProviderWrapper"
import { PaymentDetailClient } from "@/components/PaymentDetailClient"

export default async function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    const payment = await prisma.payment.findUnique({
        where: { id },
        include: {
            player: true,
            paymentEvents: {
                include: {
                    eventPlayer: {
                        include: {
                            event: true,
                        }
                    }
                }
            }
        },
    })

    if (!payment) {
        notFound()
    }

    return (
        <LanguageProviderWrapper>
            <PaymentDetailClient payment={payment} />
        </LanguageProviderWrapper>
    )
}
