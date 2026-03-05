import { prisma } from './prisma';

/**
 * Exports all database content to a JSON object
 */
export async function exportDbToJson() {
    const data = {
        players: await prisma.player.findMany(),
        users: await prisma.user.findMany(),
        events: await prisma.event.findMany(),
        eventPlayers: await prisma.eventPlayer.findMany(),
        payments: await (prisma.payment as any).findMany(),
        paymentEvents: await prisma.paymentEvent.findMany(),
        budgets: await prisma.budget.findMany(),
        yearlyBudgets: await prisma.yearlyBudget.findMany(),
        creditCards: await prisma.creditCard.findMany(),
        errorReports: await prisma.errorReport.findMany(),
        exportedAt: new Date().toISOString(),
        version: "1.0"
    };
    return data;
}

/**
 * Helper to convert date strings back to Date objects
 */
function reviveDates(obj: any, dateFields: string[]): any {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
        return obj.map(item => reviveDates(item, dateFields));
    }

    const newObj = { ...obj };
    for (const field of dateFields) {
        if (newObj[field] && typeof newObj[field] === 'string') {
            const date = new Date(newObj[field]);
            if (!isNaN(date.getTime())) {
                newObj[field] = date;
            }
        }
    }
    return newObj;
}

/**
 * Imports database content from a JSON object
 * WARNING: This will clear the existing database tables!
 */
export async function importDbFromJson(data: any) {
    // Transactional import to ensure consistency
    return await prisma.$transaction(async (tx) => {
        // Clear existing data in reverse order of dependencies
        // We do NOT clear googleToken as it is a system connection, not business data
        await tx.errorReport.deleteMany();
        await tx.paymentEvent.deleteMany();
        await tx.payment.deleteMany();
        await tx.eventPlayer.deleteMany();
        await tx.yearlyBudget.deleteMany();
        await tx.budget.deleteMany();
        await tx.creditCard.deleteMany();
        await tx.event.deleteMany();
        await tx.user.deleteMany();
        await tx.player.deleteMany();

        // Standard date fields for most models
        const stdDates = ['createdAt', 'updatedAt'];

        // Restore data in order of dependencies with date revival
        if (data.players?.length) {
            const revived = reviveDates(data.players, stdDates);
            await tx.player.createMany({ data: revived });
        }
        if (data.users?.length) {
            const revived = reviveDates(data.users, stdDates);
            await tx.user.createMany({ data: revived });
        }
        if (data.events?.length) {
            const revived = reviveDates(data.events, [...stdDates, 'date']);
            await tx.event.createMany({ data: revived });
        }
        if (data.creditCards?.length) {
            const revived = reviveDates(data.creditCards, ['createdAt']);
            await tx.creditCard.createMany({ data: revived });
        }
        if (data.budgets?.length) {
            const revived = reviveDates(data.budgets, stdDates);
            await tx.budget.createMany({ data: revived });
        }
        if (data.yearlyBudgets?.length) {
            const revived = reviveDates(data.yearlyBudgets, stdDates);
            await tx.yearlyBudget.createMany({ data: revived });
        }
        if (data.eventPlayers?.length) {
            const revived = reviveDates(data.eventPlayers, [...stdDates, 'paymentDueDate']);
            await tx.eventPlayer.createMany({ data: revived });
        }
        if (data.payments?.length) {
            const revived = reviveDates(data.payments, [...stdDates, 'paymentDate']);
            await tx.payment.createMany({ data: revived });
        }
        if (data.paymentEvents?.length) {
            const revived = reviveDates(data.paymentEvents, ['createdAt']);
            await tx.paymentEvent.createMany({ data: revived });
        }
        if (data.errorReports?.length) {
            const revived = reviveDates(data.errorReports, stdDates);
            await tx.errorReport.createMany({ data: revived });
        }

        return true;
    });
}
