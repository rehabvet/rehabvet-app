import { google } from 'googleapis';
import { Readable } from 'stream';

const DRIVE_FOLDER_ID = '0AGjxzh574uvlUk9PVA';

function getAuth() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!keyJson) return null;
  try {
    const key = JSON.parse(
      Buffer.from(keyJson, 'base64').toString('utf-8')
    );
    return new google.auth.GoogleAuth({
      credentials: key,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });
  } catch {
    return null;
  }
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
