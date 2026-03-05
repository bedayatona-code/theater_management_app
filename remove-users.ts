import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const emailsToRemove = [
        "admin@theater.com",
        "dsa@sad.com",
        "your-email@address.com"
    ];

    try {
        console.log("Removing test users...");

        const result = await prisma.user.deleteMany({
            where: {
                email: {
                    in: emailsToRemove
                }
            }
        });

        console.log(`✅ Successfully removed ${result.count} users.`);

        // Print remaining users to confirm
        const remainingUsers = await prisma.user.findMany({
            select: {
                email: true,
                username: true,
                role: true
            }
        });

        console.log("\nRemaining users in database:");
        console.table(remainingUsers);

    } catch (error) {
        console.error("Failed to remove users:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
