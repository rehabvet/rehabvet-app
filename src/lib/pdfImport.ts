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
  // "For Shiro (1/5227)"
  // followed by "Dog, Male, Maltese,"
  const forLine = lines.find(l => l.startsWith('For ') && l.includes('('));
  if (!forLine) return null;
  const forMatch = forLine.match(/^For (.+?)\s*\(([^)]+)\)/);
  if (!forMatch) return null;
  const patientName = forMatch[1].trim();
  const patientOldId = forMatch[2].trim();

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

  // --- Extract owner ---
  // "Owner Ho Khim Rong (1/3776)"
  const ownerLine = lines.find(l => l.startsWith('Owner ') && l.includes('('));
  if (!ownerLine) return null;
  const ownerMatch = ownerLine.match(/^Owner (.+?)\s*\(([^)]+)\)/);
  if (!ownerMatch) return null;
  const ownerName = ownerMatch[1].trim();
  const ownerOldId = ownerMatch[2].trim();

  // Phone and postcode are in lines after the owner line
  const ownerIdx = lines.indexOf(ownerLine);
  let ownerPhone = '';
  let ownerPostcode = '';
  for (let i = ownerIdx + 1; i < Math.min(ownerIdx + 8, lines.length); i++) {
    const candidate = lines[i];
    if (candidate.startsWith('Sales') || candidate.startsWith('Client') || candidate.startsWith('Bill')) break;
    // Extract phone
    if (!ownerPhone) {
      const phone = normalizePhone(candidate);
      if (phone) ownerPhone = phone;
    }
    // Extract Singapore postcode (6 digits, optionally after "Singapore ")
    if (!ownerPostcode) {
      const pcMatch = candidate.match(/(?:Singapore\s+)?(\d{6})(?:\s|$)/i);
      if (pcMatch) ownerPostcode = pcMatch[1];
    }
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
    const clinicalExamination = extractSection(block, 'Clinical Examination', ['Treatment', 'Comments', 'Staff']);
    const treatment = extractSection(block, 'Treatment', ['Comments', 'Staff']);
    const comments = extractSection(block, 'Comments', ['Staff', 'Bill#']);

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
      treatment: treatment || undefined,
      comments: comments || undefined,
      lineItems,
    });
  }

  return { patientName, patientOldId, patientSpecies, patientBreed, patientGender, patientDOB, ownerName, ownerOldId, ownerPhone, ownerPostcode, visits };
}
