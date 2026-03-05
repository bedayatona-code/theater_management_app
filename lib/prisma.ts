import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const url = process.env.DATABASE_URL?.replace('connection_limit=1', 'connection_limit=10')
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: url
    }
  }
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

