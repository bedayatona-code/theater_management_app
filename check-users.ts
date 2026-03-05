import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                username: true,
                role: true,
                createdAt: true
            }
        });

        console.log(`Found ${users.length} users in the database:`);
        console.table(users);
    } catch (error) {
        console.error("Failed to fetch users:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
