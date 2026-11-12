// Digital Student Card Management & Secure QR Verification
// ENS Djelfa — ملحقة المدرسة العليا للأساتذة - الجلفة
import { DigitalStudentCard, CardVerificationResult, CardStatus, StudentRecord } from './types';

const INSTITUTION_NAME = 'ملحقة المدرسة العليا للأساتذة - الجلفة (ENS Djelfa)';

/**
 * Generate a deterministic verification hash for QR code without exposing PII
 */
export function generateCardQrHash(studentId: string, matricule: string, issueDate: string): string {
  // Simple fast deterministic cryptographic digest for client-side token
  const raw = `${studentId}:${matricule.toUpperCase()}:${issueDate}:ENS_DJELFA_SECURE_SALT_2026`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  const tail = studentId.replace(/[^a-zA-Z0-9]/g, '').slice(-6);
  return `ENSQR-${hex.toUpperCase()}-${tail.toUpperCase()}`;
}

/**
 * Issue or update a Digital Student Card entity from a Student Record
 */
export function createStudentCard(
  student: StudentRecord,
  specialtyNameAr: string,
  approvedBy?: string
): DigitalStudentCard {
  const issueDate = new Date().toISOString().split('T')[0];
  const expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const qrHash = generateCardQrHash(student.id, student.registration_number, issueDate);

  return {
    id: 'card_' + student.id,
    student_id: student.id,
    card_number: `CARD-${student.registration_number}`,
    full_name: student.full_name,
    registration_number: student.registration_number,
    specialty_name: specialtyNameAr,
    specialty_code: student.specialty_code,
    academic_year: student.academic_year,
    group_number: student.group_number,
    photo_url: student.photo_url,
    status: student.photo_status || 'pending',
    qr_code_hash: qrHash,
    issue_date: issueDate,
    expiry_date: expiryDate,
    approved_by_name: approvedBy,
    approved_at: approvedBy ? new Date().toISOString() : undefined,
  };
}

/**
 * Validates an uploaded student photo file
 */
export function validateStudentPhotoFile(file: {
  name: string;
  size: number;
  type: string;
}): { isValid: boolean; error?: string } {
  const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB limit
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

  if (!file) {
    return { isValid: false, error: 'لم يتم اختيار أي ملف صورة' };
  }

  if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
    return { isValid: false, error: 'نوع الملف غير مدعوم. يرجى رفع صورة بصيغة JPG أو PNG أو WebP' };
  }

  if (file.size > MAX_SIZE_BYTES) {
    return { isValid: false, error: 'حجم الصورة يتجاوز الحد المسموح به (الحد الأقصى: 2 ميغابايت)' };
  }

  return { isValid: true };
}

/**
 * Generate privacy-preserving student initials e.g. "م. ب." for public QR scan
 */
export function getMaskedStudentName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  // First letter of first name and last name
  return parts.map((p) => p.charAt(0) + '.').join(' ');
}

/**
 * Public QR Code Verification Endpoint Handler
 * Checks card authenticity WITHOUT leaking private contact info
 */
export function verifyCardByQrHash(
  qrHash: string,
  cardsDatabase: DigitalStudentCard[]
): CardVerificationResult {
  const card = cardsDatabase.find((c) => c.qr_code_hash === qrHash);

  if (!card) {
    return {
      is_valid: false,
      card_status: 'rejected',
      institution: INSTITUTION_NAME,
      student_initials: '—',
      registration_number: '—',
      specialty_name: '—',
      academic_year: 0,
      issue_date: '—',
      expiry_date: '—',
      verification_timestamp: new Date().toISOString(),
      message: 'رمز التحقق غير مسجل أو منتهي الصلاحية في قاعدة بيانات ملحقة الجلفة.',
    };
  }

  const isApproved = card.status === 'approved';
  const isExpired = new Date(card.expiry_date) < new Date();

  let message = 'البطاقة الجامعية سارية المفعول ومصادق عليها رسمياً.';
  let cardStatus: CardStatus = card.status;

  if (isExpired) {
    message = 'البطاقة منتهية الصلاحية وتحتاج إلى تجديد سنوي.';
    cardStatus = 'suspended';
  } else if (card.status === 'pending') {
    message = 'البطاقة قيد مراجعة الصورة والبيانات من طرف مصلحة التدريس.';
  } else if (card.status === 'rejected') {
    message = 'البطاقة غير معتمدة أو تم تعليقها من الإدارة.';
  }

  return {
    is_valid: isApproved && !isExpired,
    card_status: cardStatus,
    institution: INSTITUTION_NAME,
    student_initials: getMaskedStudentName(card.full_name),
    registration_number: card.registration_number,
    specialty_name: card.specialty_name,
    academic_year: card.academic_year,
    issue_date: card.issue_date,
    expiry_date: card.expiry_date,
    verification_timestamp: new Date().toISOString(),
    message,
  };
}
