import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';

import { prisma } from './prisma';

const SCOPES = ['https://www.googleapis.com/auth/drive'];
const CREDENTIALS_PATH = path.join(process.cwd(), 'google-oauth-credentials.json');
const TOKEN_PATH = path.join(process.cwd(), 'google-token.json');

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
    // Priority: 1. GOOGLE_REDIRECT_URI env var, 2. First redirect_uri from JSON, 3. Localhost fallback
    const redirectUri = process.env.GOOGLE_REDIRECT_URI ||
        (redirect_uris && redirect_uris[0]) ||
        'http://localhost:3002/api/admin/auth/google/callback';

    const oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirectUri
    );

    // Load tokens from database (Production) or file (Local dev)
    try {
        let tokens: any = null;

        // 1. Try Database
        const tokenRecord = await prisma.googleToken.findUnique({
            where: { id: 'session' }
        });
        if (tokenRecord) {
            tokens = JSON.parse(tokenRecord.tokens);
            console.log('Google Auth: Tokens loaded from database');
        }

        // 2. Fallback to local file
        if (!tokens) {
            console.log(`Google Auth: Checking local file at ${TOKEN_PATH}`);
            if (fs.existsSync(TOKEN_PATH)) {
                const content = fs.readFileSync(TOKEN_PATH, 'utf8');
                tokens = JSON.parse(content);
                console.log('Google Auth: Tokens loaded from local file');
            } else {
                console.log('Google Auth: Local token file not found');
            }
        }

        if (tokens) {
            oAuth2Client.setCredentials(tokens);
            console.log('Google Auth: Credentials set successfully');
        } else {
            console.log('Google Auth: No tokens found in DB or File');
        }
    } catch (err) {
        console.error('Google Auth: Critical error loading tokens:', err);
    }

    return oAuth2Client;
}

/**
 * Save tokens to database (persistent for Vercel/Production)
 */
export async function saveTokens(tokens: any) {
    if (!tokens) {
        console.error('Google Auth: Attempted to save empty tokens');
        return;
    }
    console.log('Google Auth: Saving tokens. Has refresh_token:', !!tokens.refresh_token);

    try {
        // 1. Save to database for production persistence
        await prisma.googleToken.upsert({
            where: { id: 'session' },
            update: { tokens: JSON.stringify(tokens), updatedAt: new Date() },
            create: { id: 'session', tokens: JSON.stringify(tokens) }
        });
        console.log('Google Auth: Tokens saved to database successfully');
    } catch (err) {
        console.error('Google Auth: Failed to save tokens to database:', err);
    }

    // 2. Save to local file for dev convenience
    try {
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
        console.log('Google Auth: Tokens saved to local file successfully');
    } catch (err) {
        console.warn('Google Auth: Could not save tokens to local file:', err);
    }
}

/**
 * Clear tokens when they become invalid
 */
export async function clearTokens() {
    console.log('Clearing invalid Google tokens...');
    try {
        await prisma.googleToken.deleteMany({
            where: { id: 'session' }
        });
        if (fs.existsSync(TOKEN_PATH)) {
            fs.unlinkSync(TOKEN_PATH);
        }
    } catch (err) {
        console.error('Failed to clear tokens:', err);
    }
}

const SERVICE_ACCOUNT_PATH = path.join(process.cwd(), 'google-service-account.json');

/**
 * Get Google Drive Service with explicit info about which auth is used
 */
async function getDriveService() {
    // Priority 1: OAuth2 Client (Manual user authentication)
    try {
        const oAuth2Client = await getOAuth2Client();
        if (oAuth2Client.credentials && (oAuth2Client.credentials.access_token || oAuth2Client.credentials.refresh_token)) {
            console.log('Using OAuth2 for Google Drive access');
            return {
                drive: google.drive({ version: 'v3', auth: oAuth2Client }),
                authType: 'oauth' as const
            };
        }
    } catch (err) {
        // Not authenticated yet or credentials missing
    }

    // Priority 2: Service Account (Fallback for automated tasks)
    if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
        try {
            const auth = new google.auth.GoogleAuth({
                keyFile: SERVICE_ACCOUNT_PATH,
                scopes: SCOPES,
            });
            console.log('Using Service Account for Google Drive access');
            return {
                drive: google.drive({ version: 'v3', auth }),
                authType: 'service_account' as const
            };
        } catch (err) {
            console.error('Failed to initialize Google Service Account auth:', err);
        }
    }

    throw new Error('No Google authentication available. Please connect via Dashboard or provide a Service Account.');
}

/**
 * Upload a file to Google Drive
 */
export async function uploadToDrive(filePath: string, fileName: string) {
    let currentAuthType: 'oauth' | 'service_account' | null = null;
    try {
        const { drive: driveService, authType } = await getDriveService();
        currentAuthType = authType;

        // If we are using a Service Account, we warn about quota limits
        if (authType === 'service_account') {
            console.warn('Warning: Uploading via Service Account. This usually fails due to 0-byte quota.');
        }

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
    } catch (error: any) {
        const errorMsg = error.message || (error.response?.data?.error?.message) || '';
        console.error('Google Drive Upload Error Details:', errorMsg);

        // Handle definite invalid credentials/revoked tokens
        if (errorMsg.includes('invalid_grant')) {
            console.warn('Detected revoked token (invalid_grant). Clearing session...');
            await clearTokens();
            throw new Error('Your Google connection was revoked. Please "Connect with Google" on the dashboard again.');
        }

        // Enhance quota error message
        if (errorMsg.includes('storage quota') || errorMsg.includes('quota')) {
            if (currentAuthType === 'service_account') {
                throw new Error('Cloud storage full (Service Account). Please "Connect with Google" to use your personal 15GB quota.');
            } else {
                throw new Error('Your Google Drive is full. Please free up some space.');
            }
        }

        throw error;
    }
}

/**
 * Lists backups from Google Drive
 */
export async function listDriveBackups() {
    try {
        const { drive: driveService, authType } = await getDriveService();
        const folderId = await getOrCreateBackupFolder(driveService);

        const response = await driveService.files.list({
            q: `'${folderId}' in parents and trashed = false`,
            fields: 'files(id, name, createdTime, size)',
            orderBy: 'createdTime desc',
        });

        console.log(`Drive List result for folder ${folderId}:`, response.data.files?.length || 0, "files");
        return {
            files: response.data.files || [],
            authType: authType
        };
    } catch (error: any) {
        console.error('Google Drive List Error:', error);
        const errorMsg = error.message || (error.response?.data?.error?.message) || '';

        // Only clear on definite revocation
        if (errorMsg.includes('invalid_grant')) {
            console.warn('Detected revoked token during listing. Clearing session...');
            await clearTokens();
            throw new Error('Your Google connection was revoked. Please connect again.');
        }

        throw error;
    }
}

/**
 * Download a file from Google Drive
 */
export async function downloadFromDrive(fileId: string, destPath: string) {
    try {
        const { drive: driveService } = await getDriveService();
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
        const { drive: driveService } = await getDriveService();
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
    const primaryName = 'Backups';
    const secondaryName = 'Theater_Backups';
    const knownFolderId = '1RsnG5wtdZS9gcE5tc5cXIRbPe7Z-F_fO';

    // 1. Try to verify the user-provided folder ID directly
    try {
        const checkKnown = await driveService.files.get({
            fileId: knownFolderId,
            fields: 'id, name, trashed'
        });
        if (checkKnown.data && !checkKnown.data.trashed) {
            console.log(`Using user-specified folder ID: ${knownFolderId} (${checkKnown.data.name})`);
            return knownFolderId;
        }
    } catch (err) {
        // Folder ID might not be visible to the current auth (OAuth vs Service Account)
        console.log(`Could not access known folder ${knownFolderId}, searching by name...`);
    }

    // 2. Search for any folder named 'Backups' (User's preferred name)
    const response = await driveService.files.list({
        q: `name = '${primaryName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
    });

    if (response.data.files && response.data.files.length > 0) {
        console.log(`Using existing '${primaryName}' folder: ${response.data.files[0].id}`);
        return response.data.files[0].id;
    }

    // 3. Search for 'Theater_Backups' (Legacy/System name)
    const secondaryResponse = await driveService.files.list({
        q: `name = '${secondaryName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
    });

    if (secondaryResponse.data.files && secondaryResponse.data.files.length > 0) {
        console.log(`Using existing '${secondaryName}' folder: ${secondaryResponse.data.files[0].id}`);
        return secondaryResponse.data.files[0].id;
    }

    console.log(`No backup folder found, creating '${primaryName}'...`);

    // 4. Create new if none found
    const fileMetadata = {
        name: primaryName,
        mimeType: 'application/vnd.google-apps.folder',
    };

    const folder = await driveService.files.create({
        requestBody: fileMetadata,
        fields: 'id',
    });

    return folder.data.id;
}

