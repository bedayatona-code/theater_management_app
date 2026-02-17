import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';

import { prisma } from './prisma';

const SCOPES = ['https://www.googleapis.com/auth/drive'];
const CREDENTIALS_PATH = path.join(process.cwd(), 'google-oauth-credentials.json');

/**
 * Get OAuth2 Client
 */
export async function getOAuth2Client() {
    let credentials;

    // Support environment variable for production deployment
    if (process.env.GOOGLE_OAUTH_JSON) {
        credentials = JSON.parse(process.env.GOOGLE_OAUTH_JSON);
    } else if (fs.existsSync(CREDENTIALS_PATH)) {
        const content = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
        credentials = JSON.parse(content);
    } else {
        throw new Error('Google OAuth credentials not found. Set GOOGLE_OAUTH_JSON or provide google-oauth-credentials.json');
    }

    const { client_secret, client_id, redirect_uris } = credentials.web;

    // In production, the redirect URI must match the Vercel URL
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || redirect_uris[0];

    const oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirectUri
    );

    // Load tokens from database
    try {
        const tokenRecord = await prisma.googleToken.findUnique({
            where: { id: 'session' }
        });
        if (tokenRecord) {
            oAuth2Client.setCredentials(JSON.parse(tokenRecord.tokens));
        }
    } catch (err) {
        console.warn('Could not load Google tokens from database:', err);
    }

    return oAuth2Client;
}

/**
 * Save tokens to database (persistent for Vercel/Production)
 */
export async function saveTokens(tokens: any) {
    await prisma.googleToken.upsert({
        where: { id: 'session' },
        update: { tokens: JSON.stringify(tokens) },
        create: { id: 'session', tokens: JSON.stringify(tokens) }
    });
}

/**
 * Get Google Drive Service
 */
async function getDriveService() {
    const oAuth2Client = await getOAuth2Client();

    if (!oAuth2Client.credentials || !oAuth2Client.credentials.access_token) {
        throw new Error('Not authenticated with Google. Please connect via Dashboard.');
    }

    return google.drive({ version: 'v3', auth: oAuth2Client });
}

/**
 * Upload a file to Google Drive
 */
export async function uploadToDrive(filePath: string, fileName: string) {
    try {
        const driveService = await getDriveService();

        // Check if the folder "Theater_Backups" or "Backups" exists, prioritize shared ones
        const folderId = await getOrCreateBackupFolder(driveService);

        const fileMetadata = {
            name: fileName,
            parents: [folderId],
        };

        const media = {
            mimeType: 'application/octet-stream',
            body: fs.createReadStream(filePath),
        };

        const response = await driveService.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id',
        });

        console.log('File Id:', response.data.id);
        return response.data.id;
    } catch (error) {
        console.error('Google Drive Upload Error:', error);
        throw error;
    }
}

/**
 * Lists backups from Google Drive
 */
export async function listDriveBackups() {
    try {
        const driveService = await getDriveService();
        const folderId = await getOrCreateBackupFolder(driveService);

        const response = await driveService.files.list({
            q: `'${folderId}' in parents and trashed = false`,
            fields: 'files(id, name, createdTime, size)',
            orderBy: 'createdTime desc',
        });

        return response.data.files || [];
    } catch (error) {
        console.error('Google Drive List Error:', error);
        // If it's a 401, the token might be expired and refresh failed
        throw error;
    }
}

/**
 * Download a file from Google Drive
 */
export async function downloadFromDrive(fileId: string, destPath: string) {
    try {
        const driveService = await getDriveService();
        const dest = fs.createWriteStream(destPath);

        const response = await driveService.files.get(
            { fileId: fileId, alt: 'media' },
            { responseType: 'stream' }
        );

        return new Promise((resolve, reject) => {
            response.data
                .on('end', () => {
                    console.log('Download complete');
                    resolve(destPath);
                })
                .on('error', (err) => {
                    console.error('Download stream error:', err);
                    reject(err);
                })
                .pipe(dest);
        });
    } catch (error) {
        console.error('Google Drive Download Error:', error);
        throw error;
    }
}

/**
 * Delete a file from Google Drive
 */
export async function deleteFromDrive(fileId: string) {
    try {
        const driveService = await getDriveService();
        await driveService.files.delete({ fileId });
        return true;
    } catch (error) {
        console.error('Google Drive Delete Error:', error);
        throw error;
    }
}

/**
 * Helper to get or create the backup folder
 */
async function getOrCreateBackupFolder(driveService: any) {
    const possibleNames = ['Theater_Backups', 'Backups'];

    // Search for existing folders with these names
    const response = await driveService.files.list({
        q: `(${possibleNames.map(name => `name = '${name}'`).join(' or ')}) and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name, owners)',
    });

    const files = response.data.files || [];

    // For OAuth, we are the owner, so we don't need to worry about quota as much (it's our 15GB+)
    // But we still prefer existing folders
    if (files.length > 0) return files[0].id;

    // Create new if none found
    const fileMetadata = {
        name: 'Theater_Backups',
        mimeType: 'application/vnd.google-apps.folder',
    };

    const folder = await driveService.files.create({
        requestBody: fileMetadata,
        fields: 'id',
    });

    return folder.data.id;
}
