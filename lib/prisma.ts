import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Ensure we have a reasonable connection limit
const url = process.env.DATABASE_URL?.includes('connection_limit=1')
  ? process.env.DATABASE_URL.replace('connection_limit=1', 'connection_limit=10')
  : process.env.DATABASE_URL

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: url
    }
  },
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
