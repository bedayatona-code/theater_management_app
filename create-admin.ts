import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    const args = process.argv.slice(2);

    if (args.length < 3) {
        console.error("Usage: npx tsx create-admin.ts <email> <username> <password>");
        console.error("Example: npx tsx create-admin.ts admin@example.com myadmin secret123");
        process.exit(1);
    }

    const [email, username, password] = args;

    console.log(`Creating admin user: ${username} (${email})...`);

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const user = await prisma.user.create({
            data: {
                email: email,
                username: username,
                password: hashedPassword,
                role: "ADMIN",
            },
        });

        console.log("✅ Success! Admin user created.");
        console.log(`You can now log in with the email: ${user.email} or username: ${user.username}`);
    } catch (error: any) {
        console.error("❌ Failed to create admin user.");
        if (error.code === 'P2002') {
            console.error("Error: That email or username already exists in the database.");
        } else {
            console.error(error.message || error);
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();
