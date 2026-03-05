import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"
import { authConfig } from "./auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email or Name", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log("AUTHORIZE CALLED ON VERCEL");
        if (!credentials?.email || !credentials?.password) {
          console.log("FAILED: Missing credentials object");
          return null
        }

        const identifier = typeof credentials.email === "string" ? credentials.email : ""
        const password = typeof credentials.password === "string" ? credentials.password : ""

        if (!identifier || !password) {
          console.log("FAILED: Empty identifier or password");
          return null
        }

        try {
          console.log(`Checking DB for identifier: ${identifier}`);
          // Search by email first, then username
          const user = await prisma.user.findFirst({
            where: {
              OR: [
                { email: identifier },
                { username: identifier }
              ]
            },
            include: { player: true }
          })

          if (!user) {
            console.log("FAILED: User not found in DB");
            return null
          }
          console.log(`Found user ID: ${user.id}, matching password...`);

          const isPasswordValid = await bcrypt.compare(
            password,
            user.password
          )

          if (!isPasswordValid) {
            console.log("FAILED: Password mismatch");
            return null
          }
          console.log("SUCCESS: Password matched!");

          return {
            id: user.id,
            email: user.email,
            role: user.role,
            playerId: user.playerId,
          }
        } catch (err: any) {
          console.error("CRITICAL DB/AUTH ERROR:", err);
          return null;
        }
      }
    })
  ],
})

export async function getServerSession() {
  return await auth()
}

