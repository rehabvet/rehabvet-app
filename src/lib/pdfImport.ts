/**
 * Parser for RehabVet old PMS PDF exports.
 * Format: one PDF per patient, multiple visit records (Bill#).
 */

export interface ParsedLineItem {
  staffInitials: string;
  qty: number;
  name: string;
  price: number;
}

export interface ParsedVisit {
  billNumber: string;        // e.g. "1/40695"
  date: string;              // YYYY-MM-DD
  staffInitials: string;     // e.g. "HL"
  weight?: number;
  temperature?: number;
  history?: string;
  clinicalExamination?: string;
  diagnosis?: string;         // extracted from "Diagnosis:" label within clinical examination
  treatment?: string;
  comments?: string;
  lineItems: ParsedLineItem[];
}

export interface ParsedPDF {
  patientName: string;       // e.g. "Shiro"
  patientOldId: string;      // e.g. "1/5227"
  patientSpecies: string;    // e.g. "Dog"
  patientBreed: string;      // e.g. "Maltese"
  patientGender: string;     // e.g. "Male"
  patientDOB: string | null; // approximate DOB from age e.g. "2021-08-01"
  patientDesexed: boolean | null; // from "Desexed: Y/N"
  ownerName: string;
  ownerOldId: string;
  ownerPhone: string;        // normalized 8-digit SG mobile
  ownerPostcode: string;     // 6-digit Singapore postcode
  visits: ParsedVisit[];
}

function normalizePhone(raw: string): string {
  // Extract all digit groups, find 8-digit SG mobile (starts with 8 or 9)
  const digits = raw.replace(/[^\d]/g, '');
  // Strip +65 or 65 prefix if present
  let d = digits;
  if (d.startsWith('65') && d.length === 10) d = d.slice(2);
  if (d.length === 8 && (d.startsWith('8') || d.startsWith('9'))) return d;
  // Try to find 8-digit substring
  const match = digits.match(/(?:65)?([89]\d{7})/);
  return match ? match[1] : '';
}

function parseDate(raw: string): string {
  // Handles "27/2/2026" → "2026-02-27"
  const m = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return '';
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

function extractSection(text: string, label: string, nextLabels: string[]): string {
  const start = text.indexOf(label + ':');
  if (start === -1) return '';
  const content = text.slice(start + label.length + 1);
  let end = content.length;
  for (const next of nextLabels) {
    const idx = content.indexOf(next + ':');
    if (idx !== -1 && idx < end) end = idx;
  }
  return content.slice(0, end).trim();
}

export function parsePDF(text: string): ParsedPDF | null {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // --- Extract patient header ---
  // "For Shiro (1/5227)" OR "For Shiro" (no ID in some PDFs)
  const forLine = lines.find(l => /^For\s+\S/.test(l));
  if (!forLine) return null;
  // Try with ID first, then without
  const forMatchWithId = forLine.match(/^For (.+?)\s*\(([^)]+)\)/);
  const forMatchNoId   = forLine.match(/^For (.+)/);
  const forMatch = forMatchWithId || forMatchNoId;
  if (!forMatch) return null;
  const patientName = forMatch[1].trim();
  const patientOldId = forMatchWithId ? forMatchWithId[2].trim() : '';

  // Parse species/gender/breed from the next line e.g. "Dog, Male, Maltese,"
  const forLineIdx = lines.indexOf(forLine);
  const detailLine = lines[forLineIdx + 1] || '';
  const detailParts = detailLine.split(',').map(p => p.trim()).filter(Boolean);
  const patientSpecies = detailParts[0] || 'Dog';
  const patientGender  = (detailParts[1] || '').toLowerCase().trim();
  const patientBreed   = detailParts[2] || '';
  // Extract age — may be on the detail line or the next line e.g. "Age: 4 yr 6 mth , Desexed: Y"
  const ageSearchStr = [detailLine, lines[forLineIdx + 2] || ''].join(' ');
  const ageMatch = ageSearchStr.match(/Age:\s*(\d+)\s*yr(?:\s*(\d+)\s*mth)?/i);
  let patientDOB: string | null = null;
  if (ageMatch) {
    const years = parseInt(ageMatch[1]) || 0;
    const months = parseInt(ageMatch[2] || '0') || 0;
    const approxDOB = new Date();
    approxDOB.setFullYear(approxDOB.getFullYear() - years);
    approxDOB.setMonth(approxDOB.getMonth() - months);
    patientDOB = approxDOB.toISOString().split('T')[0];
  }

  // Parse desexed status from "Desexed: Y" or "Desexed: N"
  const desexedMatch = ageSearchStr.match(/Desexed:\s*([YN])/i);
  const patientDesexed: boolean | null = desexedMatch
    ? desexedMatch[1].toUpperCase() === 'Y'
    : null;

  // --- Extract owner ---
  // "Owner Ho Khim Rong (1/3776)" OR "Owner Yeo Ai Ling" (no ID in some PDFs)
  const ownerLine = lines.find(l => /^Owner\s+\S/.test(l));
  if (!ownerLine) return null;
  // Try with ID first, then without
  const ownerMatchWithId = ownerLine.match(/^Owner (.+?)\s*\(([^)]+)\)/);
  const ownerMatchNoId   = ownerLine.match(/^Owner (.+)/);
  const ownerMatch = ownerMatchWithId || ownerMatchNoId;
  if (!ownerMatch) return null;
  const ownerName = ownerMatch[1].trim();
  const ownerOldId = ownerMatchWithId ? ownerMatchWithId[2].trim() : '';

  // Phone and postcode — search a wider window after owner line, also scan the full header
  const ownerIdx = lines.indexOf(ownerLine);
  let ownerPhone = '';
  let ownerPostcode = '';
  // Search up to 12 lines after owner for phone/postcode
  for (let i = ownerIdx + 1; i < Math.min(ownerIdx + 12, lines.length); i++) {
    const candidate = lines[i];
    if (candidate.startsWith('Bill#')) break;
    // Extract phone
    if (!ownerPhone) {
      const phone = normalizePhone(candidate);
      if (phone) ownerPhone = phone;
    }
    // Extract Singapore postcode (6 digits)
    if (!ownerPostcode) {
      const pcMatch = candidate.match(/(?:Singapore\s+)?(\d{6})(?:\s|$)/i);
      if (pcMatch) ownerPostcode = pcMatch[1];
    }
  }
  // Last resort: scan entire header block for phone
  if (!ownerPhone) {
    const headerBlock = lines.slice(0, Math.min(ownerIdx + 20, lines.length)).join(' ');
    const phoneMatch = headerBlock.match(/(?:^|\s|\+65[\s-]?)([89]\d{7})(?:\s|$)/);
    if (phoneMatch) ownerPhone = phoneMatch[1];
  }

  // --- Split into visit blocks by "Bill#:" ---
  const fullText = text;
  const billPattern = /Bill#:\s*([\d\/]+)\s+Date:\s*([\d\/]+)/g;
  const billMatches: Array<{ billNum: string; date: string; index: number }> = [];
  let bm;
  while ((bm = billPattern.exec(fullText)) !== null) {
    billMatches.push({ billNum: bm[1].trim(), date: bm[2].trim(), index: bm.index });
  }

  const visits: ParsedVisit[] = [];

  for (let i = 0; i < billMatches.length; i++) {
    const { billNum, date, index } = billMatches[i];
    const nextIndex = i + 1 < billMatches.length ? billMatches[i + 1].index : fullText.length;
    const block = fullText.slice(index, nextIndex);

    // Staff initials from "[XC]" pattern after the date
    const staffMatch = block.match(/\[([A-Z]+)\]/);
    const staffInitials = staffMatch ? staffMatch[1] : '';

    // Weight
    const weightMatch = block.match(/Weight:\s*([\d.]+)/);
    const weight = weightMatch ? parseFloat(weightMatch[1]) : undefined;

    // Temperature
    const tempMatch = block.match(/[Tt]emperature:\s*([\d.]+)/);
    const temperature = tempMatch ? parseFloat(tempMatch[1]) : undefined;

    // Text sections
    const SECTIONS = ['History', 'Clinical Examination', 'Treatment', 'Comments'];
    const history = extractSection(block, 'History', ['Clinical Examination', 'Treatment', 'Comments', 'Staff']);
    const rawClinical = extractSection(block, 'Clinical Examination', ['Treatment', 'Comments', 'Staff']);
    // Strip pricing table that may bleed into treatment when the PDF has "StaffQtyNamePrice"
    // column header (no colon) instead of the "Staff:" section marker we look for
    let rawTreatment = extractSection(block, 'Treatment', ['Comments', 'Staff']);
    const pricingIdx = rawTreatment.indexOf('\nStaffQtyNamePrice');
    if (pricingIdx !== -1) rawTreatment = rawTreatment.substring(0, pricingIdx).trim();
    if (rawTreatment.startsWith('StaffQtyNamePrice')) rawTreatment = '';
    const treatment = rawTreatment || undefined;
    const comments = extractSection(block, 'Comments', ['Staff', 'Bill#']);

    // Split clinical examination on "Diagnosis:" label — anything after it is the diagnosis
    let clinicalExamination: string | undefined;
    let diagnosis: string | undefined;
    if (rawClinical) {
      const diagMatch = rawClinical.match(/^([\s\S]*?)\bDiagnosis\s*:\s*([\s\S]*)$/im);
      if (diagMatch) {
        clinicalExamination = diagMatch[1].trim() || undefined;
        diagnosis = diagMatch[2].trim() || undefined;
      } else {
        clinicalExamination = rawClinical;
      }
    }

    // Line items: lines matching "{INITIALS}{qty}{name}${price}" (no spaces between fields)
    // e.g. "XC0.5Rehab 5 (<15kg) Visit$0.00" or "SL63Gabapentin 50mg$40.68"
    const lineItems: ParsedLineItem[] = [];
    const liPattern = /^([A-Z]+)\s*([\d.]+)\s*(.+?)\s*\$([\d,]+(?:\.\d+)?)$/gm;
    let lm;
    while ((lm = liPattern.exec(block)) !== null) {
      // Skip direction headers and the column header line
      if (lm[3].startsWith('*') || lm[3].trim() === 'Name') continue;
      lineItems.push({
        staffInitials: lm[1],
        qty: parseFloat(lm[2]),
        name: lm[3].trim(),
        price: parseFloat(lm[4].replace(/,/g, '')), // strip comma thousands separators
      });
    }

    visits.push({
      billNumber: billNum,
      date: parseDate(date),
      staffInitials,
      weight,
      temperature,
      history: history || undefined,
      clinicalExamination: clinicalExamination || undefined,
      diagnosis: diagnosis || undefined,
      treatment: treatment,
      comments: comments || undefined,
      lineItems,
    });
  }

  return { patientName, patientOldId, patientSpecies, patientBreed, patientGender, patientDOB, patientDesexed, ownerName, ownerOldId, ownerPhone, ownerPostcode, visits };
}
