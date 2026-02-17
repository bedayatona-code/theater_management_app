import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedDemoData() {
    console.log('Seeding demo data...')

    try {
        // Create demo players
        const player1 = await prisma.player.create({
            data: {
                fullName: 'דני כהן',
                phone: '050-1234567',
                email: 'danny@example.com',
                address: 'רחוב הרצל 15, תל אביב',
                taxId: '123456789',
            },
        })

        const player2 = await prisma.player.create({
            data: {
                fullName: 'שרה לוי',
                phone: '052-9876543',
                email: 'sarah@example.com',
                address: 'שדרות רוטשילד 45, תל אביב',
                taxId: '987654321',
            },
        })

        const player3 = await prisma.player.create({
            data: {
                fullName: 'יוסי מזרחי',
                phone: '054-5551234',
                email: 'yossi@example.com',
                address: 'רחוב דיזנגוף 100, תל אביב',
                taxId: '555444333',
            },
        })

        // Create demo events
        const event1 = await prisma.event.create({
            data: {
                name: 'הצגה - מלך הארי',
                date: new Date('2026-03-15'),
                venue: 'תיאטרון הבימה',
                description: 'הצגה מוזיקלית מרהיבה',
                totalBudget: 50000,
                commissioner: 'תיאטרון הבימה בע"מ',
                commissionerContact: 'אבי שטרן',
                commissionerPhone: '03-1234567',
                commissionerTaxId: '512345678',
                commissionerAddress: 'רחוב התיאטרון 1, תל אביב',
            },
        })

        const event2 = await prisma.event.create({
            data: {
                name: 'קונצרט - לילה של מוזיקה',
                date: new Date('2026-04-20'),
                venue: 'היכל התרבות',
                description: 'קונצרט קלאסי מרגש',
                totalBudget: 30000,
                commissioner: 'עיריית תל אביב',
                commissionerContact: 'רונית אברהם',
                commissionerPhone: '03-7654321',
            },
        })

        const event3 = await prisma.event.create({
            data: {
                name: 'פסטיבל קיץ 2026',
                date: new Date('2026-07-10'),
                venue: 'פארק הירקון',
                description: 'פסטיבל מוזיקה וקולנוע',
                totalBudget: 100000,
                commissioner: 'פסטיבלים בע"מ',
                commissionerContact: 'מיכל רוזן',
                commissionerPhone: '03-9998877',
                commissionerTaxId: '678901234',
                commissionerAddress: 'רחוב הפסטיבל 5, תל אביב',
            },
        })

        // Create EventPlayers
        const ep1 = await prisma.eventPlayer.create({
            data: {
                eventId: event1.id,
                playerId: player1.id,
                role: 'שחקן ראשי',
                fee: 5000,
                paymentStatus: 'PARTIALLY_PAID',
                paymentDueDate: new Date('2026-03-01'),
            },
        })

        const ep2 = await prisma.eventPlayer.create({
            data: {
                eventId: event1.id,
                playerId: player2.id,
                role: 'מוזיקאית',
                fee: 3000,
                paymentStatus: 'UNPAID',
                paymentDueDate: new Date('2026-03-01'),
            },
        })

        const ep3 = await prisma.eventPlayer.create({
            data: {
                eventId: event2.id,
                playerId: player1.id,
                role: 'נגן',
                fee: 4000,
                paymentStatus: 'FULLY_PAID',
                paymentDueDate: new Date('2026-04-10'),
            },
        })

        const ep4 = await prisma.eventPlayer.create({
            data: {
                eventId: event2.id,
                playerId: player3.id,
                role: 'זמר',
                fee: 3500,
                paymentStatus: 'UNPAID',
                paymentDueDate: new Date('2026-04-10'),
            },
        })

        const ep5 = await prisma.eventPlayer.create({
            data: {
                eventId: event3.id,
                playerId: player2.id,
                role: 'מנהלת אמנותית',
                fee: 8000,
                paymentStatus: 'PARTIALLY_PAID',
                paymentDueDate: new Date('2026-07-01'),
            },
        })

        // Create Payments with PaymentEvents
        const payment1 = await prisma.payment.create({
            data: {
                playerId: player1.id,
                amount: 2000,
                paymentDate: new Date('2026-02-01'),
                paymentMethod: 'TRANSFER',
                transactionReference: 'TR-2026-001',
                bankAccount: '12-345-678901',
                notes: 'תשלום ראשון',
            },
        })

        await prisma.paymentEvent.create({
            data: {
                paymentId: payment1.id,
                eventPlayerId: ep1.id,
                amount: 2000,
            },
        })

        const payment2 = await prisma.payment.create({
            data: {
                playerId: player1.id,
                amount: 4000,
                paymentDate: new Date('2026-02-15'),
                paymentMethod: 'CHECK',
                checkNumber: 'CHK-456789',
                bankAccount: '12-345-678901',
                notes: 'תשלום שני - צ\'ק',
            },
        })

        await prisma.paymentEvent.create({
            data: {
                paymentId: payment2.id,
                eventPlayerId: ep3.id,
                amount: 4000,
            },
        })

        const payment3 = await prisma.payment.create({
            data: {
                playerId: player2.id,
                amount: 3000,
                paymentDate: new Date('2026-02-20'),
                paymentMethod: 'TRANSFER',
                transactionReference: 'TR-2026-002',
                bankAccount: '11-222-333444',
            },
        })

        await prisma.paymentEvent.create({
            data: {
                paymentId: payment3.id,
                eventPlayerId: ep5.id,
                amount: 3000,
            },
        })

        console.log('✓ Demo data created successfully!')
        console.log('Created:')
        console.log(`  - 3 Players`)
        console.log(`  - 3 Events`)
        console.log(`  - 5 EventPlayers`)
        console.log(`  - 3 Payments with PaymentEvents`)

    } catch (error) {
        console.error('Seeding failed:', error)
        throw error
    } finally {
        await prisma.$disconnect()
    }
}

seedDemoData()
    .then(() => {
        console.log('✓ Seeding complete!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('✗ Seeding failed:', error)
        process.exit(1)
    })
