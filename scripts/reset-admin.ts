import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const email = "admin@theater.com"
  const password = "admin123"
  const hashedPassword = await bcrypt.hash(password, 10)

  console.log(`Resetting admin user: ${email}...`)

  await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      role: "ADMIN",
    },
    create: {
      email,
      password: hashedPassword,
      role: "ADMIN",
    },
  })

  console.log("Admin user reset successfully!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
