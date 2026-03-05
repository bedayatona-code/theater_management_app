import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

async function debug() {
    const prisma = new PrismaClient()
    const TOKEN_PATH = path.join(process.cwd(), 'google-token.json')

    console.log('--- Google Auth Diagnostic ---')
    console.log('Project Root:', process.cwd())
    console.log('Token Path:', TOKEN_PATH)

    try {
        const tokens = await prisma.googleToken.findMany()
        console.log(`Database Records Found: ${tokens.length}`)
        tokens.forEach(t => {
            console.log(` - ID: "${t.id}", Last Updated: ${t.updatedAt}`)
            try {
                const p = JSON.parse(t.tokens)
                console.log(`   Has Access Token: ${!!p.access_token}`)
                console.log(`   Has Refresh Token: ${!!p.refresh_token}`)
                console.log(`   Expiry: ${new Date(p.expiry_date).toLocaleString()}`)
            } catch (e) {
                console.log(`   Invalid JSON in tokens field`)
            }
        })
    } catch (err) {
        console.error('Failed to query database:', err)
    }

    if (fs.existsSync(TOKEN_PATH)) {
        console.log('Local File: Found google-token.json')
        try {
            const content = fs.readFileSync(TOKEN_PATH, 'utf8')
            const p = JSON.parse(content)
            console.log(`   Has Access Token: ${!!p.access_token}`)
            console.log(`   Has Refresh Token: ${!!p.refresh_token}`)
        } catch (e) {
            console.log(`   Invalid JSON in local file`)
        }
    } else {
        console.log('Local File: google-token.json NOT found')
    }

    await prisma.$disconnect()
}

debug()
