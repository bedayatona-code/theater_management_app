import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

const firstNames = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen"]
const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"]
const eventPrefixes = ["Summer", "Winter", "Spring", "Autumn", "Charity", "Gala", "Benefit", "Annual", "Regional", "National"]
const eventTypes = ["Concert", "Play", "Musical", "Opera", "Ballet", "Symposium", "Festival", "Showcase"]
const cities = ["New York", "London", "Paris", "Berlin", "Tokyo", "Sydney", "Toronto", "Chicago", "Los Angeles", "Madrid"]

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

async function main() {
  console.log("Cleaning up database...")
  await prisma.errorReport.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.eventPlayer.deleteMany()
  await prisma.event.deleteMany()
  await prisma.player.deleteMany()
  await prisma.user.deleteMany()

  console.log("Database cleaned. Seeding...")

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 10)
  await prisma.user.create({
    data: {
      email: "admin@theater.com",
      password: adminPassword,
      role: "ADMIN",
    },
  })
  console.log("Admin user created: admin@theater.com / admin123")

  // Create Players
  const players = []
  for (let i = 0; i < 15; i++) {
    const firstName = getRandomElement(firstNames)
    const lastName = getRandomElement(lastNames)
    const fullName = `${firstName} ${lastName}`
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${getRandomInt(1, 999)}@example.com`
    const password = await bcrypt.hash("password123", 10)

    const player = await prisma.player.create({
      data: {
        fullName,
        email,
        phone: `+1 (555) ${getRandomInt(100, 999)}-${getRandomInt(1000, 9999)}`,
        address: `${getRandomInt(1, 999)} ${getRandomElement(["Main", "Oak", "Pine", "Maple", "Cedar"])} St, ${getRandomElement(cities)}`,
        taxId: `TAX-${getRandomInt(10000, 99999)}`,
        user: {
          create: {
            email,
            password,
            role: "PLAYER",
          },
        },
      },
    })
    players.push(player)
    console.log(`Created player: ${fullName}`)
  }

  // Create Events
  const events = []
  for (let i = 0; i < 8; i++) {
    const name = `${getRandomElement(eventPrefixes)} ${getRandomElement(eventTypes)} ${2024 + getRandomInt(0, 1)}`
    const date = new Date()
    date.setDate(date.getDate() + getRandomInt(-30, 90)) // Random date +/- 3 months

    const event = await prisma.event.create({
      data: {
        name,
        date,
        venue: `${getRandomElement(["Grand", "Royal", "City", "National"])} Theater`,
        description: "A wonderful performance showcasing local talent.",
        totalBudget: getRandomInt(5000, 20000),
        commissioner: `${getRandomElement(cities)} Arts Council`,
        commissionerContact: `contact@${getRandomElement(cities).toLowerCase().replace(" ", "")}arts.org`,
      },
    })
    events.push(event)
    console.log(`Created event: ${name}`)
  }

  // Assign Players to Events
  for (const event of events) {
    const numPlayers = getRandomInt(3, 8)
    const shuffledPlayers = [...players].sort(() => 0.5 - Math.random())
    const selectedPlayers = shuffledPlayers.slice(0, numPlayers)

    for (const player of selectedPlayers) {
      const fee = getRandomInt(200, 1000)
      await prisma.eventPlayer.create({
        data: {
          eventId: event.id,
          playerId: player.id,
          fee: fee,
          role: getRandomElement(["Lead", "Supporting", "Extra", "Musician", "Director"]),
          // Default to UNPAID - payment status will update when payments are recorded
          paymentStatus: "UNPAID",
        }
      })
    }
  }

  console.log("Seeding complete!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

