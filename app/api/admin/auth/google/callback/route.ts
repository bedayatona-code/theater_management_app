import { NextResponse } from 'next/server';
import { getOAuth2Client, saveTokens } from '@/lib/googleDrive';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const code = searchParams.get('code');

        if (!code) {
            return NextResponse.json({ error: 'No code provided' }, { status: 400 });
        }

        const oAuth2Client = await getOAuth2Client();
        const { tokens } = await oAuth2Client.getToken(code);

        // This will save the tokens to google-token.json
        saveTokens(tokens);

        // Redirect back to dashboard
        return NextResponse.redirect(new URL('/admin', req.url));
    } catch (error: any) {
        console.error('Google Auth Callback Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
