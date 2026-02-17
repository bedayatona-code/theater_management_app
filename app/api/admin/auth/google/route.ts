import { NextResponse } from 'next/server';
import { getOAuth2Client } from '@/lib/googleDrive';

export async function GET() {
    try {
        const oAuth2Client = await getOAuth2Client();

        // Generate the url that will be used for the consent dialog.
        const authorizeUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline', // Important for refresh token
            scope: ['https://www.googleapis.com/auth/drive'],
            prompt: 'consent' // Force show consent to ensure we get a refresh token
        });

        return NextResponse.redirect(authorizeUrl);
    } catch (error: any) {
        console.error('Google Auth Init Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
