// Unit Tests for ENS Djelfa Portal Core Architecture
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateRegistrationNumber,
  generateInstitutionalMatricule,
  findDuplicateMatricules,
  parseStudentListCsv,
  paginateRecords,
} from './registration-manager';
import {
  generateCardQrHash,
  verifyCardByQrHash,
  validateStudentPhotoFile,
  getMaskedStudentName,
  createStudentCard,
} from './card-manager';
import {
  canAccessStudentRecord,
  canRecordAttendanceForGroup,
  canPerformAdminAction,
  createAuditLogEntry,
} from './authorization';
import { UserProfile, StudentRecord, TeacherRecord, DigitalStudentCard } from './types';

// Mock localStorage for Node environment if missing
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, val: string) => { store.set(key, String(val)); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    key: (i: number) => Array.from(store.keys())[i] || null,
    length: store.size,
  } as any;
}

test('1. Official Registration Number Validation adheres to Algerian and Institutional rules', () => {
  // Valid Algerian National Standard: 24 (year) + 39 (Djelfa) + 6 digits
  const v1 = validateRegistrationNumber('2439014285');
  assert.equal(v1.isValid, true);
  assert.equal(v1.type, 'national');

  // Valid Institutional Standard: ENS-DJF-YYYY-XXXX
  const v2 = validateRegistrationNumber('ENS-DJF-2024-0042');
  assert.equal(v2.isValid, true);
  assert.equal(v2.type, 'institutional');

  // Invalid formats (too short, empty)
  const v3 = validateRegistrationNumber('123');
  assert.equal(v3.isValid, false);

  const v4 = validateRegistrationNumber('');
  assert.equal(v4.isValid, false);

  // Generated institutional number matches pattern
  const generated = generateInstitutionalMatricule(2026, 45);
  assert.equal(generated, 'ENS-DJF-2026-0045');
  assert.equal(validateRegistrationNumber(generated).isValid, true);
});

test('2. Duplicate Registration Number Detection prevents collisions', () => {
  const existingRecords: StudentRecord[] = [
    {
      id: 'std-1',
      registration_number: '2439014285',
      full_name: 'أحمد قاسمي',
      email: 'ahmed@ens.dz',
      specialty_code: 'snv_cem',
      academic_year: 1,
      group_number: 1,
      photo_status: 'approved',
      is_registered: true,
      created_at: '2024-09-01',
    },
  ];

  const candidateBatch = [
    { registration_number: '2439014285', id: 'new-cand-1' }, // Collision with existing
    { registration_number: '2439099999', id: 'new-cand-2' }, // Unique
    { registration_number: '2439099999', id: 'new-cand-3' }, // Duplicate in batch
  ];

  const { duplicatesInBatch, conflictsWithExisting } = findDuplicateMatricules(candidateBatch, existingRecords);

  assert.equal(duplicatesInBatch.length, 1);
  assert.equal(duplicatesInBatch[0], '2439099999');
  assert.equal(conflictsWithExisting.length, 1);
  assert.equal(conflictsWithExisting[0].candidateMatricule, '2439014285');
  assert.equal(conflictsWithExisting[0].existingStudent.full_name, 'أحمد قاسمي');
});

test('3. CSV Student List Parser supports Arabic headers and conflict detection', () => {
  const csvData = `رقم التسجيل,الاسم واللقب,التخصص,السنة,الفوج,البريد الإلكتروني
2439011111,بلقاسم بن سالم,إعلام آلي,1,1,belkacem@ens-djelfa.dz
2439022222,فاطمة الزهراء,علوم طبيعية,2,2,fatima@ens-djelfa.dz
INVALID_NUM,,,,,
`;

  const parsed = parseStudentListCsv(csvData);
  assert.equal(parsed.totalParsed, 2);
  assert.equal(parsed.records.length, 2);
  assert.equal(parsed.records[0].registration_number, '2439011111');
  assert.equal(parsed.records[0].specialty_code, 'info');
  assert.equal(parsed.records[1].registration_number, '2439022222');
  assert.equal(parsed.records[1].specialty_code, 'snv');
  assert.equal(parsed.skippedRows.length, 1); // Invalid row skipped safely
});

test('4. Digital Student Card QR Verification is privacy-preserving and valid', () => {
  const student: StudentRecord = {
    id: 'std-xyz',
    registration_number: '2439088888',
    full_name: 'محمد الصالح بوعزة',
    email: 'private_email@test.dz',
    phone: '0661999999',
    specialty_code: 'hg_cem',
    academic_year: 1,
    group_number: 1,
    photo_status: 'approved',
    is_registered: true,
    created_at: '2024-09-01',
  };

  const card = createStudentCard(student, 'التاريخ والجغرافيا', 'مدير الملحقة');
  assert.equal(card.status, 'approved');
  assert.ok(card.qr_code_hash.startsWith('ENSQR-'));

  // Test Verification
  const verifyRes = verifyCardByQrHash(card.qr_code_hash, [card]);
  assert.equal(verifyRes.is_valid, true);
  assert.equal(verifyRes.card_status, 'approved');
  assert.equal(verifyRes.registration_number, '2439088888');

  // Verify privacy masking: masked initials, no leaked phone or personal email in verification result
  assert.ok(!JSON.stringify(verifyRes).includes('0661999999'), 'Phone must not leak in public QR scan');
  assert.ok(!JSON.stringify(verifyRes).includes('private_email@test.dz'), 'Private email must not leak in QR scan');
  assert.equal(verifyRes.student_initials, getMaskedStudentName('محمد الصالح بوعزة'));

  // Invalid Hash check
  const badVerify = verifyCardByQrHash('NON_EXISTENT_QR_CODE', [card]);
  assert.equal(badVerify.is_valid, false);
});

test('5. Photo file validation enforces safe types and maximum size', () => {
  const validFile = { name: 'photo.jpg', size: 1024 * 1024, type: 'image/jpeg' }; // 1MB
  assert.equal(validateStudentPhotoFile(validFile).isValid, true);

  const oversizedFile = { name: 'large.png', size: 5 * 1024 * 1024, type: 'image/png' }; // 5MB
  const oversizeRes = validateStudentPhotoFile(oversizedFile);
  assert.equal(oversizeRes.isValid, false);
  assert.ok(oversizeRes.error?.includes('يتجاوز'));

  const invalidTypeFile = { name: 'script.js', size: 500, type: 'text/javascript' };
  assert.equal(validateStudentPhotoFile(invalidTypeFile).isValid, false);
});

test('6. Role-Based Authorization prevents cross-student record access (IDOR)', () => {
  const studentA: UserProfile = { id: 'std-a', email: 'a@ens.dz', full_name: 'طالب أ', role: 'student', is_active: true, created_at: '' };
  const studentBId = 'std-b';

  // Student A trying to access Student B's record -> DENIED
  assert.equal(canAccessStudentRecord(studentA, studentBId), false);

  // Student A accessing their own record -> ALLOWED
  assert.equal(canAccessStudentRecord(studentA, 'std-a'), true);

  // Admin accessing Student B's record -> ALLOWED
  const admin: UserProfile = { id: 'adm-1', email: 'admin@ens.dz', full_name: 'مسؤول', role: 'admin', is_active: true, created_at: '' };
  assert.equal(canAccessStudentRecord(admin, studentBId), true);

  // Super Admin accessing Student B's record -> ALLOWED
  const superAdmin: UserProfile = { id: 'sup-1', email: 'super@ens.dz', full_name: 'مسؤول رئيسي', role: 'super_admin', is_active: true, created_at: '' };
  assert.equal(canAccessStudentRecord(superAdmin, studentBId), true);
});

test('7. Teacher Attendance authorization is strictly restricted to assigned groups', () => {
  const teacherProfile: UserProfile = { id: 'tch-1', email: 'teacher@ens.dz', full_name: 'أستاذ', role: 'teacher', is_active: true, created_at: '' };
  const teacherRecord: TeacherRecord = {
    id: 'tch-1',
    employee_number: 'EMP-01',
    full_name: 'أستاذ',
    email: 'teacher@ens.dz',
    specialty_code: 'snv_cem',
    department: 'علوم طبيعية',
    academic_rank: 'أستاذ محاضر',
    assigned_groups: [
      { group_id: 101, specialty_code: 'snv_cem', academic_year: 1, group_number: 1, subject_name: 'بيولوجيا' },
    ],
  };

  // Teacher marking attendance for assigned group 101 -> ALLOWED
  assert.equal(canRecordAttendanceForGroup(teacherProfile, 101, teacherRecord), true);

  // Teacher marking attendance for UNASSIGNED group 102 -> DENIED
  assert.equal(canRecordAttendanceForGroup(teacherProfile, 102, teacherRecord), false);
});

test('8. Scalability & High-Performance Pagination handles 3,000+ student records in milliseconds', () => {
  // Generate 3,500 synthetic student items
  const largeCohort: StudentRecord[] = [];
  for (let i = 1; i <= 3500; i++) {
    largeCohort.push({
      id: `std-${i}`,
      registration_number: `24390${(100000 + i).toString()}`,
      full_name: `طالب رقم ${i}`,
      email: `student.${i}@ens-djelfa.dz`,
      specialty_code: i % 2 === 0 ? 'snv_cem' : 'info_cem',
      academic_year: (i % 4) + 1,
      group_number: (i % 5) + 1,
      photo_status: 'approved',
      is_registered: true,
      created_at: '2024-09-01',
    });
  }

  const startTime = Date.now();
  // Filter for 'info_cem' specialty and academic year 2, paginate page 3 with 50 items
  const result = paginateRecords(
    largeCohort,
    3,
    50,
    (s) => s.specialty_code === 'info_cem' && s.academic_year === 2
  );
  const elapsedMs = Date.now() - startTime;

  assert.ok(elapsedMs < 100, `Pagination over 3500 records took ${elapsedMs}ms, must be <100ms`);
  assert.equal(result.pageSize, 50);
  assert.equal(result.page, 3);
  assert.ok(result.total > 0);
  assert.ok(result.data.length <= 50);
  assert.ok(result.data.every((s) => s.specialty_code === 'info_cem' && s.academic_year === 2));
});

test('9. Audit Log entry generation captures structured security context', () => {
  const actor: UserProfile = { id: 'adm-09', email: 'adm@ens.dz', full_name: 'مسؤول البطاقات', role: 'admin', is_active: true, created_at: '' };
  const entry = createAuditLogEntry(actor, 'APPROVE_STUDENT_CARD', 'student_cards', 'card_123', {
    matricule: '2439014285',
    approved_by: 'adm-09',
  });

  assert.equal(entry.actor_id, 'adm-09');
  assert.equal(entry.actor_role, 'admin');
  assert.equal(entry.action, 'APPROVE_STUDENT_CARD');
  assert.equal(entry.target_table, 'student_cards');
  assert.equal(entry.target_id, 'card_123');
  assert.equal(entry.details.matricule, '2439014285');
  assert.ok(entry.created_at.length > 10);
});
