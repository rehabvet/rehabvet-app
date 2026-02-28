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
  ownerName: string;
  ownerOldId: string;
  ownerPhone: string;        // normalized 8-digit SG mobile
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
  const forLine = lines.find(l => l.startsWith('For ') && l.includes('('));
  if (!forLine) return null;
  const forMatch = forLine.match(/^For (.+?)\s*\(([^)]+)\)/);
  if (!forMatch) return null;
  const patientName = forMatch[1].trim();
  const patientOldId = forMatch[2].trim();

  // --- Extract owner ---
  // "Owner Ho Khim Rong (1/3776)"
  const ownerLine = lines.find(l => l.startsWith('Owner ') && l.includes('('));
  if (!ownerLine) return null;
  const ownerMatch = ownerLine.match(/^Owner (.+?)\s*\(([^)]+)\)/);
  if (!ownerMatch) return null;
  const ownerName = ownerMatch[1].trim();
  const ownerOldId = ownerMatch[2].trim();

  // Phone is on the line after the owner line (or same area)
  const ownerIdx = lines.indexOf(ownerLine);
  // Look in next few lines for phone digits
  let ownerPhone = '';
  for (let i = ownerIdx + 1; i < Math.min(ownerIdx + 5, lines.length); i++) {
    const candidate = lines[i];
    // Skip lines that are clearly not phone lines
    if (candidate.startsWith('Sales') || candidate.startsWith('Client') || candidate.startsWith('Bill')) break;
    const phone = normalizePhone(candidate);
    if (phone) { ownerPhone = phone; break; }
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

    // Line items: lines matching "{INITIALS} {qty} {name} ${price}"
    const lineItems: ParsedLineItem[] = [];
    const liPattern = /^([A-Z]+)\s+(\d+(?:\.\d+)?)\s+(.+?)\s+\$(\d+(?:\.\d+)?)$/gm;
    let lm;
    while ((lm = liPattern.exec(block)) !== null) {
      // Skip if it looks like a direction header
      if (lm[3].startsWith('*')) continue;
      lineItems.push({
        staffInitials: lm[1],
        qty: parseFloat(lm[2]),
        name: lm[3].trim(),
        price: parseFloat(lm[4]),
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

  return { patientName, patientOldId, ownerName, ownerOldId, ownerPhone, visits };
}
