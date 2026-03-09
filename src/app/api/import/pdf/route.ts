import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parsePDF } from '@/lib/pdfImport';
import { randomUUID } from 'crypto';
import { backupPDFToDrive } from '@/lib/driveBackup';

// Staff initials → user ID
const STAFF_MAP: Record<string, string> = {
  XC:  '4b80e8f2-93fa-4d8a-aac8-e4950ee81afa', // Xan
  HL:  '50977fa7-da4a-471c-833e-685b3662e73d', // Hazel
  SL:  'bb878995-7ba8-4f68-bb04-8357dc9e01ac', // Dr Sara
  JH:  '1d4fed53-82ee-4fa2-8036-ac807263977a', // Joyce
  SJT: '711b00d1-2870-4920-bd3a-b036ecaeb1a7', // Sean
  NL:  '994103e5-100e-4e7c-a3de-a722c49ae6e5', // Noelle
};

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

  // Extract text from PDF using pdf-parse
  let pdfText = '';
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse/lib/pdf-parse.js');
    const data = await pdfParse(buffer);
    pdfText = data.text;
  } catch (e) {
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

  // Generate next visit number — use MAX (not COUNT) to handle gaps from deleted records
  const visitMaxRow = await prisma.$queryRawUnsafe<{ max_num: string | null }[]>(
    `SELECT MAX(CAST(SUBSTRING(visit_number FROM 'VR-\\d{4}-(\\d+)') AS BIGINT)) as max_num FROM visit_records WHERE visit_number ~ '^VR-\\d{4}-\\d+'`
  );
  let visitCounter = (parseInt(visitMaxRow[0]?.max_num || '0') || 0) + 1;

  // Generate next invoice number — extract only the last 6-digit sequence from RV-YYYY-NNNNNN
  const invCountRow = await prisma.$queryRawUnsafe<{ max_num: string | null }[]>(
    `SELECT MAX(CAST(SUBSTRING(invoice_number FROM 'RV-\\d{4}-(\\d+)') AS BIGINT)) as max_num FROM invoices WHERE invoice_number ~ '^RV-\\d{4}-\\d+'`
  );
  let invCounter = (parseInt(invCountRow[0]?.max_num || '0') || 0) + 1;

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

    const staffId = STAFF_MAP[visit.staffInitials] || null;
    if (!staffId) warnings.push(`Bill# ${visit.billNumber}: unknown staff [${visit.staffInitials}]`);

    const visitId = randomUUID();
    const visitNumber = `VR-${visit.date.slice(0, 4)}-${String(visitCounter++).padStart(6, '0')}`;

    await prisma.$transaction(async (tx) => {
      // Create visit record — ON CONFLICT handles rare duplicate visit_number races
      await tx.$queryRawUnsafe(
        `INSERT INTO visit_records (id, client_id, patient_id, staff_id, visit_date, visit_number, weight_kg, temperature_c, history, clinical_examination, treatment, internal_notes, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())
         ON CONFLICT (visit_number) DO NOTHING`,
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

      // Create invoice
      const invoiceId = randomUUID();
      const year = visit.date.slice(0, 4);
      const invoiceNumber = `RV-${year}-${String(invCounter++).padStart(6, '0')}`;
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
    });

    imported++;
  }

  return NextResponse.json({
    success: true,
    patientName: parsed.patientName,
    ownerName: parsed.ownerName,
    ownerPhone: parsed.ownerPhone,
    clientFound: !!clientId,
    patientFound: !!patientId,
    totalVisits: parsed.visits.length,
    imported,
    skipped,
    warnings,
  });
  } catch (e: any) {
    console.error('PDF import error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Import failed unexpectedly' }, { status: 500 });
  }
}
