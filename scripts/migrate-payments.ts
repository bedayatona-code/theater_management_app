import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migratePayments() {
    console.log('Starting payment data migration...')

    try {
        // Get all existing payments (if any exist with old structure)
        const oldPayments = await prisma.$queryRaw<any[]>`
      SELECT * FROM payments WHERE id NOT IN (
        SELECT DISTINCT paymentId FROM payment_events
      )
    `

        console.log(`Found ${oldPayments.length} payments to migrate`)

        for (const payment of oldPayments) {
            // Check if this payment has an eventPlayerId (old structure)
            if (payment.eventPlayerId) {
                console.log(`Migrating payment ${payment.id}...`)

                // Create a PaymentEvent for this payment
                await prisma.paymentEvent.create({
                    data: {
                        paymentId: payment.id,
                        eventPlayerId: payment.eventPlayerId,
                        amount: payment.amount,
                    },
                })

                console.log(`✓ Migrated payment ${payment.id}`)
            }
        }

        console.log('Migration completed successfully!')
        console.log('Summary:')
        console.log(`- Payments migrated: ${oldPayments.length}`)

    } catch (error) {
        console.error('Migration failed:', error)
        throw error
    } finally {
        await prisma.$disconnect()
    }
}

migratePayments()
    .then(() => {
        console.log('✓ All done!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('✗ Migration failed:', error)
        process.exit(1)
    })
