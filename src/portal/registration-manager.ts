// Official Registration Number Rules & Student List Management
// ENS Djelfa — ملحقة المدرسة العليا للأساتذة - الجلفة
import { StudentRecord, PaginatedResult } from './types';

/**
 * Institutional & National Algerian Registration Number Standards:
 * 1. National Algerian Baccalaureate/Matricule standard:
 *    [YY (2 digits admission/bac year)][39 (Wilaya of Djelfa)][XXXXXX (6 digits sequential)]
 *    Example: 2439014285, 2339008912
 * 2. Institutional ENS Djelfa Annex format:
 *    ENS-DJF-[YYYY]-[XXXX (4 digits sequential)]
 *    Example: ENS-DJF-2024-0042, ENS-DJF-2025-0193
 */
export const MATRICULE_FORMATS = {
  NATIONAL_ALGERIAN: /^([12][0-9])39\d{6}$/,
  INSTITUTIONAL_ENS: /^ENS-DJF-(20[2-9][0-9])-(\d{4})$/,
  GENERAL_VALID: /^[A-Z0-9-]{6,18}$/i,
};

/**
 * Validates whether a registration number adheres to official numbering rules
 */
export function validateRegistrationNumber(matricule: string): {
  isValid: boolean;
  type: 'national' | 'institutional' | 'custom' | 'invalid';
  normalized: string;
  errorMessage?: string;
} {
  if (!matricule || typeof matricule !== 'string') {
    return { isValid: false, type: 'invalid', normalized: '', errorMessage: 'رقم التسجيل فارغ' };
  }
  const clean = matricule.trim().toUpperCase().replace(/\s+/g, '');
  if (clean.length < 6 || clean.length > 20) {
    return { isValid: false, type: 'invalid', normalized: clean, errorMessage: 'طول رقم التسجيل يجب أن يكون بين 6 و 20 رمزاً' };
  }

  if (MATRICULE_FORMATS.NATIONAL_ALGERIAN.test(clean)) {
    return { isValid: true, type: 'national', normalized: clean };
  }

  if (MATRICULE_FORMATS.INSTITUTIONAL_ENS.test(clean)) {
    return { isValid: true, type: 'institutional', normalized: clean };
  }

  if (MATRICULE_FORMATS.GENERAL_VALID.test(clean)) {
    return { isValid: true, type: 'custom', normalized: clean };
  }

  return { isValid: false, type: 'invalid', normalized: clean, errorMessage: 'صيغة رقم التسجيل غير مقبولة' };
}

/**
 * Assign an official sequential institutional registration number
 */
export function generateInstitutionalMatricule(year: number, sequenceNumber: number): string {
  const seqPadded = sequenceNumber.toString().padStart(4, '0');
  return `ENS-DJF-${year}-${seqPadded}`;
}

/**
 * Detect Duplicate Registration Numbers in an existing database / candidate batch
 */
export function findDuplicateMatricules(
  candidates: { registration_number: string; id?: string }[],
  existingRecords: StudentRecord[]
): {
  duplicatesInBatch: string[];
  conflictsWithExisting: { candidateMatricule: string; existingStudent: StudentRecord }[];
} {
  const seen = new Set<string>();
  const duplicatesInBatch: string[] = [];

  for (const c of candidates) {
    const norm = (c.registration_number || '').trim().toUpperCase();
    if (!norm) continue;
    if (seen.has(norm)) {
      if (!duplicatesInBatch.includes(norm)) duplicatesInBatch.push(norm);
    } else {
      seen.add(norm);
    }
  }

  const existingMap = new Map<string, StudentRecord>();
  for (const s of existingRecords) {
    existingMap.set(s.registration_number.trim().toUpperCase(), s);
  }

  const conflictsWithExisting: { candidateMatricule: string; existingStudent: StudentRecord }[] = [];
  for (const c of candidates) {
    const norm = (c.registration_number || '').trim().toUpperCase();
    const existing = existingMap.get(norm);
    // If it conflicts with another student's record (different ID)
    if (existing && existing.id !== c.id) {
      conflictsWithExisting.push({ candidateMatricule: norm, existingStudent: existing });
    }
  }

  return { duplicatesInBatch, conflictsWithExisting };
}

/**
 * CSV / Tab-Delimited Student List Parser
 * Parses headers in Arabic, French, or English:
 * - الاسم الكامل / Nom / Full Name
 * - رقم التسجيل / Matricule / ID
 * - التخصص / Spécialité / Specialty
 * - السنة / Année / Year
 * - الفوج / Groupe / Group
 * - البريد / Email
 * - الهاتف / Téléphone / Phone
 */
export interface CsvParseResult {
  records: Array<{
    registration_number: string;
    full_name: string;
    email: string;
    phone?: string;
    specialty_code: string;
    academic_year: number;
    group_number: number;
  }>;
  skippedRows: { rowNumber: number; rawText: string; reason: string }[];
  totalParsed: number;
}

export function parseStudentListCsv(csvContent: string): CsvParseResult {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return { records: [], skippedRows: [], totalParsed: 0 };
  }

  // Detect separator: comma, semicolon, or tab
  const headerLine = lines[0];
  let separator = ',';
  if (headerLine.includes('\t')) separator = '\t';
  else if (headerLine.includes(';')) separator = ';';

  const rawHeaders = headerLine.split(separator).map((h) => h.trim().toLowerCase());

  // Map header indexes
  let nameIdx = -1;
  let matriculeIdx = -1;
  let specialtyIdx = -1;
  let yearIdx = -1;
  let groupIdx = -1;
  let emailIdx = -1;
  let phoneIdx = -1;

  rawHeaders.forEach((h, idx) => {
    if (h.includes('اسم') || h.includes('nom') || h.includes('name')) nameIdx = idx;
    else if (h.includes('تسجيل') || h.includes('matricule') || h.includes('reg') || h.includes('id')) matriculeIdx = idx;
    else if (h.includes('تخصص') || h.includes('spécialité') || h.includes('specialty')) specialtyIdx = idx;
    else if (h.includes('سنة') || h.includes('année') || h.includes('year') || h.includes('مستوى')) yearIdx = idx;
    else if (h.includes('فوج') || h.includes('group')) groupIdx = idx;
    else if (h.includes('بريد') || h.includes('email') || h.includes('courriel')) emailIdx = idx;
    else if (h.includes('هاتف') || h.includes('phone') || h.includes('tel')) phoneIdx = idx;
  });

  // Fallback default index mapping if no standard headers match
  if (matriculeIdx === -1 && nameIdx === -1) {
    matriculeIdx = 0;
    nameIdx = 1;
    specialtyIdx = 2;
    yearIdx = 3;
    groupIdx = 4;
    emailIdx = 5;
  }

  const records: CsvParseResult['records'] = [];
  const skippedRows: CsvParseResult['skippedRows'] = [];

  for (let i = 1; i < lines.length; i++) {
    const rowNumber = i + 1;
    const cols = lines[i].split(separator).map((c) => c.trim().replace(/^["']|["']$/g, ''));

    const matricule = matriculeIdx >= 0 ? cols[matriculeIdx] : '';
    const fullName = nameIdx >= 0 ? cols[nameIdx] : '';

    if (!matricule || !fullName) {
      skippedRows.push({ rowNumber, rawText: lines[i], reason: 'غياب رقم التسجيل أو الاسم الكامل' });
      continue;
    }

    const val = validateRegistrationNumber(matricule);
    if (!val.isValid) {
      skippedRows.push({ rowNumber, rawText: lines[i], reason: `رقم التسجيل غير صالح: ${val.errorMessage}` });
      continue;
    }

    const rawSpec = (specialtyIdx >= 0 ? cols[specialtyIdx] : '').toLowerCase();
    let specCode = 'snv';
    if (rawSpec.includes('إعلام') || rawSpec.includes('info') || rawSpec.includes('cs')) specCode = 'info';
    else if (rawSpec.includes('عرب') || rawSpec.includes('ar')) specCode = 'ar';
    else if (rawSpec.includes('فرنس') || rawSpec.includes('fr')) specCode = 'fr';
    else if (rawSpec.includes('إنجل') || rawSpec.includes('en')) specCode = 'en';
    else if (rawSpec.includes('تاريخ') || rawSpec.includes('hg') || rawSpec.includes('جغراف')) specCode = 'hg';
    else if (rawSpec.includes('رياض') || rawSpec.includes('eps') || rawSpec.includes('بدني')) specCode = 'eps';

    const rawYear = yearIdx >= 0 ? parseInt(cols[yearIdx], 10) : 1;
    const academicYear = isNaN(rawYear) || rawYear < 1 || rawYear > 5 ? 1 : rawYear;

    const rawGroup = groupIdx >= 0 ? parseInt(cols[groupIdx], 10) : 1;
    const groupNumber = isNaN(rawGroup) || rawGroup < 1 ? 1 : rawGroup;

    const email = emailIdx >= 0 && cols[emailIdx] ? cols[emailIdx] : `std.${val.normalized.toLowerCase()}@ens-djelfa.dz`;
    const phone = phoneIdx >= 0 ? cols[phoneIdx] : undefined;

    records.push({
      registration_number: val.normalized,
      full_name: fullName,
      email,
      phone,
      specialty_code: specCode,
      academic_year: academicYear,
      group_number: groupNumber,
    });
  }

  return { records, skippedRows, totalParsed: records.length };
}

/**
 * Scalable In-Memory & Paginated Query Helper
 * Efficiently filters and pages through datasets of 3,000+ students and 400+ teachers.
 */
export function paginateRecords<T>(
  items: T[],
  page: number = 1,
  pageSize: number = 20,
  filterFn?: (item: T) => boolean,
  sortFn?: (a: T, b: T) => number
): PaginatedResult<T> {
  const filtered = filterFn ? items.filter(filterFn) : items;
  if (sortFn) {
    filtered.sort(sortFn);
  }

  const safePageSize = Math.max(1, Math.min(pageSize, 100)); // Limit page size to prevent memory bloat
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const safePage = Math.max(1, Math.min(page, totalPages));

  const start = (safePage - 1) * safePageSize;
  const end = start + safePageSize;
  const data = filtered.slice(start, end);

  return {
    data,
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
  };
}
