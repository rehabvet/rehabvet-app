import { google } from 'googleapis';
import { Readable } from 'stream';

const DRIVE_FOLDER_ID = '0AGjxzh574uvlUk9PVA';

function getAuth() {
  const clientId     = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, 'urn:ietf:wg:oauth:2.0:oob');
  oauth2.setCredentials({ refresh_token: refreshToken });
  return oauth2;
}

/**
 * Upload a PDF buffer to the RehabVet backup Drive folder.
 * Silently logs and returns null if credentials are not configured.
 */
export async function backupPDFToDrive(
  buffer: Buffer,
  filename: string
): Promise<string | null> {
  const auth = getAuth();
  if (!auth) {
    console.warn('[driveBackup] GOOGLE_SERVICE_ACCOUNT_JSON not set — skipping Drive backup');
    return null;
  }

  try {
    const drive = google.drive({ version: 'v3', auth });

    // Check for existing file with same name to avoid duplicates
    const existing = await drive.files.list({
      q: `name='${filename}' and '${DRIVE_FOLDER_ID}' in parents and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (existing.data.files && existing.data.files.length > 0) {
      // File already backed up — return existing file ID
      return existing.data.files[0].id ?? null;
    }

    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const res = await drive.files.create({
      requestBody: {
        name: filename,
        parents: [DRIVE_FOLDER_ID],
        mimeType: 'application/pdf',
      },
      media: {
        mimeType: 'application/pdf',
        body: stream,
      },
      fields: 'id',
    });

    const fileId = res.data.id ?? null;
    console.log(`[driveBackup] Backed up ${filename} → Drive file ${fileId}`);
    return fileId;
  } catch (err) {
    console.error('[driveBackup] Upload failed:', err);
    return null;
  }
}
