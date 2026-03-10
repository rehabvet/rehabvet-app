import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parsePDF } from '@/lib/pdfImport';
import { randomUUID } from 'crypto';
import { backupPDFToDrive } from '@/lib/driveBackup';

// Allow up to 60s for large PDF imports and increase body size limit
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Staff initials → user ID
const STAFF_MAP: Record<string, string> = {
  XC:  '4b80e8f2-93fa-4d8a-aac8-e4950ee81afa', // Xan
  HL:  '50977fa7-da4a-471c-833e-685b3662e73d', // Hazel
  SL:  'bb878995-7ba8-4f68-bb04-8357dc9e01ac', // Dr Sara
  JH:  '1d4fed53-82ee-4fa2-8036-ac807263977a', // Joyce
  SJT: '711b00d1-2870-4920-bd3a-b036ecaeb1a7', // Sean
  NL:  '994103e5-100e-4e7c-a3de-a722c49ae6e5', // Noelle
  AS:  '0864ab3c-6676-4e68-8650-560b8e8c0408', // Angeline Soon (former staff)
  YEN: '1e0832ed-d6fe-4bfd-ab18-e35cbea66a98', // Chee Yen (former staff)
  SA:  'bb878995-7ba8-4f68-bb04-8357dc9e01ac', // Dr Sara (alias)
  OWN: '413c8865-4399-452a-9df8-07e308297e45', // Owner-entered notes
  HT:  'd9dc535f-d341-4bed-ba3c-efdc6335d432', // HT (former staff)
  NPC: 'cd5ca7b0-46ec-457d-818c-07fda2965788', // NPC (former staff)
  TR:  '52abd984-6e22-4cd2-b003-2c05acb040d7', // TR (former staff)
  MK:  'c5e89a29-86d8-4ba7-9196-e6daa4ead327', // MK (former staff)
  SW:  '7c3ec9cb-6bde-4130-8ef3-7b3137a1f54b', // SW (former staff)
  PK:  'c6feeb9e-50f4-429f-8337-c5fe751542b6', // PK (former staff)
};

// Auto-create unknown staff initials as inactive users (cached per import request)
const _autoStaffCache: Record<string, string> = {};
async function resolveStaffId(initials: string): Promise<string | null> {
  if (!initials) return null;
  if (STAFF_MAP[initials]) return STAFF_MAP[initials];
  if (_autoStaffCache[initials]) return _autoStaffCache[initials];
  // Check if already exists in DB
  const existing = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM users WHERE name = $1 LIMIT 1`, initials
  );
  if (existing.length > 0) { _autoStaffCache[initials] = existing[0].id; return existing[0].id; }
  // Create as inactive staff
  const newId = randomUUID();
  await prisma.$queryRawUnsafe(
    `INSERT INTO users (id, email, password_hash, name, role, active, created_at, updated_at) VALUES ($1, $2, 'inactive', $3, 'therapist', false, NOW(), NOW())`,
    newId, `${initials.toLowerCase()}.former@rehabvet.com`, initials
  );
  _autoStaffCache[initials] = newId;
  return newId;
}

function normalizePhone(p: string) {
  const d = p.replace(/\D/g, '');
  if (d.startsWith('65') && d.length === 10) return d.slice(2);
  if (d.length === 8) return d;
  return d;
}

export async function POST(req: NextRequest) {
  try {
  const token = req.cookies.get('token')?.value;
  const user = token ? verifyToken(token) : null;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'administrator', 'office_manager'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Parse multipart form
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Back up PDF to Google Drive (fire and forget — never blocks import)
  backupPDFToDrive(buffer, file.name).catch(() => {});

  // Extract text from PDF — three-tier approach for maximum compatibility
  let pdfText = '';
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse/lib/pdf-parse.js');

    // Tier 1: standard parse
    let parsed1 = false;
    try {
      const data = await pdfParse(buffer);
      pdfText = data.text;
      parsed1 = true;
    } catch { /* fall through */ }

    // Tier 2: lenient options (for bad XRef / corrupted structure)
    if (!parsed1) {
      try {
        const data = await pdfParse(buffer, { max: 0, version: 'v1.10.100' });
        pdfText = data.text;
        parsed1 = true;
      } catch { /* fall through */ }
    }

    // Tier 3: raw byte text extraction — scrapes readable ASCII strings from the PDF binary
    // Works on heavily corrupted files; extracts enough text for the PMS format parser
    if (!parsed1 || !pdfText.trim()) {
      const raw = buffer.toString('latin1');
      // Extract parenthesised PDF text objects: (some text)
      const chunks: string[] = [];
      const parenRe = /\(([^)]{2,200})\)/g;
      let m;
      while ((m = parenRe.exec(raw)) !== null) {
        const s = m[1].replace(/\\n/g, '\n').replace(/\\r/g, '\n').replace(/\\t/g, ' ').replace(/\\(.)/g, '$1');
        if (/[A-Za-z]{2}/.test(s)) chunks.push(s);  // only keep strings with actual words
      }
      pdfText = chunks.join('\n');
      if (!pdfText.trim()) {
        return NextResponse.json({ error: 'PDF parse error: file appears to be empty or severely corrupted (0.8 KB). Try re-exporting from the PMS.' }, { status: 400 });
      }
    }
  } catch (e: any) {
    return NextResponse.json({ error: `PDF parse error: ${(e as Error).message}` }, { status: 400 });
  }

  const parsed = parsePDF(pdfText);
  if (!parsed) return NextResponse.json({ error: 'Could not parse PDF structure' }, { status: 400 });

  // --- Match or auto-create client ---
  const normPhone = normalizePhone(parsed.ownerPhone);
  let clientId: string | null = null;
  let patientId: string | null = null;
  const warnings: string[] = [];

  // 1. Match by client number (last 4 digits from EzyVet format like "1/2918")
  if (parsed.ownerOldId) {
    // Extract last 4 digits from the client number
    const digits = parsed.ownerOldId.replace(/\D/g, '');
    const last4 = digits.slice(-4);
    if (last4.length === 4) {
      const byNumber = await prisma.$queryRawUnsafe<{ id: string; client_number: string }[]>(
        `SELECT id, client_number FROM clients WHERE RIGHT(CAST(client_number AS TEXT), 4) = $1 LIMIT 1`,
        last4
      );
      if (byNumber.length > 0) {
        clientId = byNumber[0].id;
      }
    }
  }

  // 2. Fallback: match by phone number
  if (!clientId && normPhone) {
    const clients = await prisma.$queryRawUnsafe<{ id: string; phone: string }[]>(
      `SELECT id, phone FROM clients WHERE regexp_replace(phone, '[^0-9]', '', 'g') LIKE $1 LIMIT 1`,
      `%${normPhone}`
    );
    if (clients.length > 0) clientId = clients[0].id;
  }

  if (!clientId) {
    // Auto-create client from PDF data
    const newClientId = randomUUID();
    const nameParts = parsed.ownerName.trim().split(' ');
    const firstName = nameParts[0] || 'Unknown';
    const lastName = nameParts.slice(1).join(' ') || '';
    const fullName = parsed.ownerName.trim() || 'Unknown';
    const numRow = await prisma.$queryRawUnsafe<{ max_num: number | null }[]>(
      `SELECT COALESCE(MAX(client_number::integer), 0) as max_num FROM clients`
    );
    const nextNum = (Number(numRow[0]?.max_num) || 0) + 1;
    // Look up full address from postcode via OneMap
    let clientAddress: string | null = null;
    if (parsed.ownerPostcode) {
      try {
        const omRes = await fetch(`https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${parsed.ownerPostcode}&returnGeom=N&getAddrDetails=Y`);
        const omData = await omRes.json();
        if (omData.results?.length > 0) {
          const r = omData.results[0];
          const parts = [r.BLK_NO, r.ROAD_NAME, r.BUILDING].filter(Boolean);
          clientAddress = `${parts.join(', ')}, Singapore ${parsed.ownerPostcode}`;
        }
      } catch { /* ignore OneMap errors */ }
    }
    await prisma.$queryRawUnsafe(
      `INSERT INTO clients (id, client_number, name, first_name, last_name, phone, address, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
      newClientId, nextNum, fullName, firstName, lastName, parsed.ownerPhone || null, clientAddress
    );
    clientId = newClientId;
    warnings.push(`New client created: ${fullName} (${parsed.ownerPhone || 'no phone'})${clientAddress ? ' @ ' + clientAddress : ''}`);
  }

  // --- Match or auto-create patient ---
  const pname = parsed.patientName.toLowerCase().trim();

  // 1. Exact case-insensitive match
  const exact = await prisma.$queryRawUnsafe<{ id: string; name: string }[]>(
    `SELECT id, name FROM patients WHERE client_id = $1 AND LOWER(TRIM(name)) = $2 LIMIT 1`,
    clientId, pname
  );
  if (exact.length > 0) patientId = exact[0].id;

  // 2. Partial match
  if (!patientId) {
    const partial = await prisma.$queryRawUnsafe<{ id: string; name: string }[]>(
      `SELECT id, name FROM patients WHERE client_id = $1 AND LOWER(name) LIKE $2 LIMIT 1`,
      clientId, `%${pname}%`
    );
    if (partial.length > 0) patientId = partial[0].id;
  }

  // 3. Auto-create patient (removed single-patient fallback — a client can have multiple pets)
  if (!patientId) {
    const newPatientId = randomUUID();
    await prisma.$queryRawUnsafe(
      `INSERT INTO patients (id, client_id, name, species, breed, gender, date_of_birth, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
      newPatientId, clientId,
      parsed.patientName || 'Unknown',
      parsed.patientSpecies || 'Dog',
      parsed.patientBreed || null,
      parsed.patientGender || null,
      parsed.patientDOB || null
    );
    patientId = newPatientId;
    warnings.push(`New patient created: ${parsed.patientName || 'Unknown'} (${parsed.patientBreed || parsed.patientSpecies || 'Dog'})`);
  }

  // --- Import visits ---
  let imported = 0;
  let skipped = 0;

  // Numbers are generated atomically via DB sequences (vr_number_seq, inv_number_seq)
  // No app-side counters — eliminates race conditions between concurrent imports

  for (const visit of parsed.visits) {
    // Skip if bill already imported (only check when bill_number is non-empty)
    if (visit.billNumber) {
      const existing = await prisma.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM invoices WHERE bill_number = $1 LIMIT 1`,
        visit.billNumber
      );
      if (existing.length > 0) { skipped++; continue; }
    }

    if (!visit.date) { warnings.push(`Bill# ${visit.billNumber}: invalid date`); continue; }

    const staffId = await resolveStaffId(visit.staffInitials);

    const visitId = randomUUID();
    // Generate visit number atomically from DB sequence — no race conditions
    const vnRow = await prisma.$queryRawUnsafe<{ vn: string }[]>(
      `SELECT 'VR-' || LPAD(NEXTVAL('vr_number_seq')::TEXT, 8, '0') AS vn`
    );
    const visitNumber = vnRow[0].vn;

    try {
    await prisma.$transaction(async (tx) => {
      // Create visit record
      await tx.$queryRawUnsafe(
        `INSERT INTO visit_records (id, client_id, patient_id, staff_id, visit_date, visit_number, weight_kg, temperature_c, history, clinical_examination, treatment, internal_notes, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())`,
        visitId,
        clientId,
        patientId,
        staffId,
        visit.date,
        visitNumber,
        visit.weight ?? null,
        visit.temperature ?? null,
        visit.history || null,
        visit.clinicalExamination || null,
        visit.treatment ? JSON.stringify([visit.treatment]) : null,
        visit.comments || null,
      );

      // Verify visit was created before inserting invoice
      const visitCheck = await tx.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM visit_records WHERE id = $1`, visitId
      );
      if (visitCheck.length === 0) {
        warnings.push(`Bill# ${visit.billNumber}: visit record insert failed, skipping invoice`);
        return;
      }

      // Create invoice
      const invoiceId = randomUUID();
      const year = visit.date.slice(0, 4);
      const inRow = await tx.$queryRawUnsafe<{ inv: string }[]>(
        `SELECT 'RV-' || LPAD(NEXTVAL('inv_number_seq')::TEXT, 8, '0') AS inv`
      );
      const invoiceNumber = inRow[0].inv;
      const subtotal = visit.lineItems.reduce((s: number, li: any) => s + li.price * li.qty, 0);

      await tx.$queryRawUnsafe(
        `INSERT INTO invoices (id, client_id, patient_id, visit_id, invoice_number, bill_number, date, due_date, status, subtotal, tax, total, notes, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$7,$8,$9,$10,$11,$12,NOW(),NOW())`,
        invoiceId,
        clientId,
        patientId,
        visitId,
        invoiceNumber,
        visit.billNumber,
        visit.date,
        'paid',
        subtotal,
        0,
        subtotal,
        `Imported from old PMS (Bill# ${visit.billNumber})`
      );

      // Create line items
      for (const li of visit.lineItems) {
        await tx.$queryRawUnsafe(
          `INSERT INTO invoice_line_items (id, invoice_id, description, quantity, unit_price, amount, total, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$6,NOW())`,
          randomUUID(),
          invoiceId,
          li.name,
          li.qty,
          li.price,
          li.price * li.qty,
        );
      }

      // Save diagnosis to patient_diagnoses (shared persistent log)
      if (visit.diagnosis && visit.diagnosis.trim()) {
        await tx.$queryRawUnsafe(
          `INSERT INTO patient_diagnoses (id, patient_id, text, diagnosed_by, date, created_at, updated_at)
           VALUES ($1::uuid, $2::uuid, $3, $4, $5::date, NOW(), NOW())
           ON CONFLICT DO NOTHING`,
          randomUUID(),
          patientId,
          visit.diagnosis.trim(),
          staffId || null,
          visit.date,
        );
      }
    });

    imported++;
    } catch (visitErr: any) {
      warnings.push(`Bill# ${visit.billNumber}: ${visitErr.message?.slice(0, 120) || 'unknown error'}`);
    }
  }

  return NextResponse.json({
    success: true,
    patientName:  parsed.patientName  || '(unknown)',
    ownerName:    parsed.ownerName    || '(unknown)',
    ownerPhone:   parsed.ownerPhone   || '',
    clientFound:  !!clientId,
    patientFound: !!patientId,
    clientId,
    patientId,
    totalVisits:  parsed.visits.length,
    imported,
    skipped,
    warnings,
  });
  } catch (e: any) {
    console.error('PDF import error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Import failed unexpectedly' }, { status: 500 });
  }
}
