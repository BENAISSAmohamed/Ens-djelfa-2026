// Portal State Management & Data Repository
// ENS Djelfa — ملحقة المدرسة العليا للأساتذة - الجلفة
import { supabase } from '../supabase';
import {
  StudentRecord,
  TeacherRecord,
  DigitalStudentCard,
  StudentRegistrationApplication,
  AuditLogItem,
  AdministrativePermissions,
  UserProfile,
  PaginatedResult,
  CardStatus,
  AttendanceStatus,
} from './types';
import { paginateRecords, validateRegistrationNumber, findDuplicateMatricules } from './registration-manager';
import { createStudentCard, generateCardQrHash } from './card-manager';
import { createAuditLogEntry, canPerformAdminAction } from './authorization';

const STORAGE_KEYS = {
  STUDENTS: 'ens_portal_students',
  TEACHERS: 'ens_portal_teachers',
  CARDS: 'ens_portal_cards',
  APPLICATIONS: 'ens_portal_reg_applications',
  AUDIT_LOGS: 'ens_portal_audit_logs',
  PERMISSIONS: 'ens_portal_admin_permissions',
  ATTENDANCE: 'ens_portal_attendance_sessions',
};

// 1. OFFICIAL SPECIALTIES
export const OFFICIAL_SPECIALTIES = [
  { code: 'snv_cem', name_ar: 'علوم الطبيعة والحياة — أستاذ التعليم المتوسط (PEM)', name_fr: 'Sciences Naturelles (CEM)', degree_type: 'PEM', duration_years: 4 },
  { code: 'snv_lyc', name_ar: 'علوم الطبيعة والحياة — أستاذ التعليم الثانوي (PES)', name_fr: 'Sciences Naturelles (Lycée)', degree_type: 'PES', duration_years: 5 },
  { code: 'info_cem', name_ar: 'الإعلام الآلي — أستاذ التعليم المتوسط (PEM)', name_fr: 'Informatique (CEM)', degree_type: 'PEM', duration_years: 4 },
  { code: 'info_lyc', name_ar: 'الإعلام الآلي — أستاذ التعليم الثانوي (PES)', name_fr: 'Informatique (Lycée)', degree_type: 'PES', duration_years: 5 },
  { code: 'ar_cem', name_ar: 'اللغة العربية وآدابها — أستاذ التعليم المتوسط (PEM)', name_fr: 'Langue Arabe (CEM)', degree_type: 'PEM', duration_years: 4 },
  { code: 'ar_lyc', name_ar: 'اللغة العربية وآدابها — أستاذ التعليم الثانوي (PES)', name_fr: 'Langue Arabe (Lycée)', degree_type: 'PES', duration_years: 5 },
  { code: 'fr_cem', name_ar: 'اللغة الفرنسية — أستاذ التعليم المتوسط (PEM)', name_fr: 'Langue Française (CEM)', degree_type: 'PEM', duration_years: 4 },
  { code: 'en_cem', name_ar: 'اللغة الإنجليزية — أستاذ التعليم المتوسط (PEM)', name_fr: 'Langue Anglaise (CEM)', degree_type: 'PEM', duration_years: 4 },
  { code: 'hg_cem', name_ar: 'التاريخ والجغرافيا — أستاذ التعليم المتوسط (PEM)', name_fr: 'Histoire-Géographie (CEM)', degree_type: 'PEM', duration_years: 4 },
  { code: 'eps_cem', name_ar: 'التربية البدنية والرياضية — أستاذ التعليم المتوسط (PEM)', name_fr: 'Éducation Physique (CEM)', degree_type: 'PEM', duration_years: 4 },
];

// Helper to look up specialty name
export function getSpecialtyName(code: string): string {
  const s = OFFICIAL_SPECIALTIES.find((item) => item.code === code);
  return s ? s.name_ar : code;
}

// 2. INITIAL SEED STUDENTS
const INITIAL_STUDENTS: StudentRecord[] = [
  {
    id: 'std-2439014285',
    registration_number: '2439014285',
    full_name: 'أحمد بن يحيى قاسمي',
    email: 'ahmed.kassimi@ens-djelfa.dz',
    phone: '0661234567',
    specialty_code: 'snv_cem',
    academic_year: 1,
    group_number: 1,
    group_id: 101,
    date_of_birth: '2005-04-12',
    wilaya_of_residence: 'الجلفة',
    photo_status: 'approved',
    is_registered: true,
    created_at: '2024-09-15',
  },
  {
    id: 'std-2439018491',
    registration_number: '2439018491',
    full_name: 'فاطمة الزهراء شريط',
    email: 'fatima.cheriet@ens-djelfa.dz',
    phone: '0662345678',
    specialty_code: 'info_cem',
    academic_year: 1,
    group_number: 1,
    group_id: 102,
    date_of_birth: '2005-08-20',
    wilaya_of_residence: 'عين وسارة — الجلفة',
    photo_status: 'approved',
    is_registered: true,
    created_at: '2024-09-16',
  },
  {
    id: 'std-2339009182',
    registration_number: '2339009182',
    full_name: 'ياسين حركات',
    email: 'yassine.harekat@ens-djelfa.dz',
    phone: '0663456789',
    specialty_code: 'ar_lyc',
    academic_year: 2,
    group_number: 1,
    group_id: 103,
    date_of_birth: '2004-11-03',
    wilaya_of_residence: 'مسعد — الجلفة',
    photo_status: 'pending',
    is_registered: true,
    created_at: '2023-09-18',
  },
  {
    id: 'std-2439021104',
    registration_number: '2439021104',
    full_name: 'مريم بولنوار',
    email: 'meriem.boulenouar@ens-djelfa.dz',
    phone: '0664567890',
    specialty_code: 'en_cem',
    academic_year: 1,
    group_number: 2,
    group_id: 104,
    date_of_birth: '2005-02-14',
    wilaya_of_residence: 'حاسي بحبح — الجلفة',
    photo_status: 'approved',
    is_registered: true,
    created_at: '2024-09-17',
  },
  {
    id: 'std-2439035512',
    registration_number: '2439035512',
    full_name: 'محمد الصالح دحماني',
    email: 'm.dahmani@ens-djelfa.dz',
    phone: '0665678901',
    specialty_code: 'hg_cem',
    academic_year: 1,
    group_number: 1,
    group_id: 105,
    date_of_birth: '2005-09-09',
    wilaya_of_residence: 'الجلفة',
    photo_status: 'pending',
    is_registered: true,
    created_at: '2024-09-18',
  },
];

// Generate synthetic records for scalability tests (approx. 50 realistic cohort members)
for (let i = 6; i <= 60; i++) {
  const spec = OFFICIAL_SPECIALTIES[i % OFFICIAL_SPECIALTIES.length];
  const matricule = `24390${(10000 + i).toString()}`;
  INITIAL_STUDENTS.push({
    id: `std-${matricule}`,
    registration_number: matricule,
    full_name: `طالب ملحقة ${i} — ${spec.name_fr.split(' ')[0]}`,
    email: `student.${matricule}@ens-djelfa.dz`,
    specialty_code: spec.code,
    academic_year: (i % 3) + 1,
    group_number: (i % 3) + 1,
    group_id: 100 + (i % 8) + 1,
    wilaya_of_residence: 'ولاية الجلفة',
    photo_status: i % 4 === 0 ? 'pending' : 'approved',
    is_registered: true,
    created_at: '2024-09-20',
  });
}

// 3. INITIAL TEACHERS
const INITIAL_TEACHERS: TeacherRecord[] = [
  {
    id: 'tch-01',
    employee_number: 'ENS-TCH-2022-001',
    full_name: 'أ.د. مسعودي عبد القادر',
    email: 'a.massaoudi@ens-djelfa.dz',
    phone: '0661112233',
    specialty_code: 'snv_cem',
    department: 'قسم علوم الطبيعة والحياة',
    academic_rank: 'أستاذ محاضر أ',
    assigned_groups: [
      { group_id: 101, specialty_code: 'snv_cem', academic_year: 1, group_number: 1, subject_name: 'بيولوجيا الخلية والمجهرية' },
    ],
  },
  {
    id: 'tch-02',
    employee_number: 'ENS-TCH-2023-014',
    full_name: 'د. طاهري بلقاسم',
    email: 'b.tahri@ens-djelfa.dz',
    phone: '0662223344',
    specialty_code: 'info_cem',
    department: 'قسم الإعلام الآلي',
    academic_rank: 'أستاذ مساعد أ',
    assigned_groups: [
      { group_id: 102, specialty_code: 'info_cem', academic_year: 1, group_number: 1, subject_name: 'الخوارزميات وهياكل البيانات' },
    ],
  },
  {
    id: 'tch-03',
    employee_number: 'ENS-TCH-2021-008',
    full_name: 'د. بن ناصر خديجة',
    email: 'k.bennasser@ens-djelfa.dz',
    phone: '0663334455',
    specialty_code: 'ar_lyc',
    department: 'قسم اللغة العربية',
    academic_rank: 'أستاذ محاضر ب',
    assigned_groups: [
      { group_id: 103, specialty_code: 'ar_lyc', academic_year: 2, group_number: 1, subject_name: 'ديداكتيك النحو العربي' },
    ],
  },
];

// 4. STORAGE HELPERS
function getFromStorage<T>(key: string, defaultVal: T): T {
  if (typeof window === 'undefined') return defaultVal;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setToStorage<T>(key: string, val: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.warn(`Storage write failed for ${key}:`, e);
  }
}

// 5. PUBLIC ACCESS API
export function getAllStudents(
  page: number = 1,
  pageSize: number = 20,
  filterSpecialty?: string,
  filterYear?: number,
  searchQuery?: string
): PaginatedResult<StudentRecord> {
  const students = getFromStorage<StudentRecord[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);

  const filterFn = (s: StudentRecord) => {
    if (filterSpecialty && filterSpecialty !== 'all' && s.specialty_code !== filterSpecialty) {
      return false;
    }
    if (filterYear && filterYear > 0 && s.academic_year !== filterYear) {
      return false;
    }
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchName = s.full_name.toLowerCase().includes(q);
      const matchReg = s.registration_number.toLowerCase().includes(q);
      const matchEmail = s.email.toLowerCase().includes(q);
      return matchName || matchReg || matchEmail;
    }
    return true;
  };

  return paginateRecords(students, page, pageSize, filterFn);
}

export const getStudentsPaginated = getAllStudents;

export function getStudentById(id: string): StudentRecord | null {
  const students = getFromStorage<StudentRecord[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
  return students.find((s) => s.id === id) || null;
}

export function getStudentByMatricule(matricule: string): StudentRecord | null {
  const clean = matricule.trim().toUpperCase();
  const students = getFromStorage<StudentRecord[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
  return students.find((s) => s.registration_number.toUpperCase() === clean) || null;
}

export function saveStudentRecord(
  student: StudentRecord,
  actor: UserProfile | null
): { success: boolean; error?: string } {
  const students = getFromStorage<StudentRecord[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
  const cleanMatricule = student.registration_number.trim().toUpperCase();

  const val = validateRegistrationNumber(cleanMatricule);
  if (!val.isValid) {
    return { success: false, error: val.errorMessage || 'رقم التسجيل غير صالح' };
  }

  // Check duplicate matricule with other student
  const conflict = students.find((s) => s.registration_number.toUpperCase() === cleanMatricule && s.id !== student.id);
  if (conflict) {
    return { success: false, error: `رقم التسجيل ${cleanMatricule} مخصص مسبقاً للطالب: ${conflict.full_name}` };
  }

  const existingIdx = students.findIndex((s) => s.id === student.id);
  if (existingIdx >= 0) {
    students[existingIdx] = { ...student, registration_number: cleanMatricule };
    logAuditEvent(actor, 'UPDATE_STUDENT', 'students', student.id, { student_name: student.full_name, matricule: cleanMatricule });
  } else {
    students.unshift({ ...student, registration_number: cleanMatricule });
    logAuditEvent(actor, 'CREATE_STUDENT', 'students', student.id, { student_name: student.full_name, matricule: cleanMatricule });
  }

  setToStorage(STORAGE_KEYS.STUDENTS, students);
  return { success: true };
}

export function importStudentsBatch(
  candidateRecords: Array<{
    registration_number: string;
    full_name: string;
    email: string;
    phone?: string;
    specialty_code: string;
    academic_year: number;
    group_number: number;
  }>,
  conflictResolution: 'skip' | 'overwrite' | 'suffix',
  actor: UserProfile | null
): { importedCount: number; skippedCount: number; errors: string[] } {
  const students = getFromStorage<StudentRecord[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
  let importedCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  for (const c of candidateRecords) {
    let matricule = c.registration_number.trim().toUpperCase();
    const existingIdx = students.findIndex((s) => s.registration_number.toUpperCase() === matricule);

    if (existingIdx >= 0) {
      if (conflictResolution === 'skip') {
        skippedCount++;
        continue;
      } else if (conflictResolution === 'overwrite') {
        students[existingIdx] = {
          ...students[existingIdx],
          full_name: c.full_name,
          email: c.email,
          specialty_code: c.specialty_code,
          academic_year: c.academic_year,
          group_number: c.group_number,
        };
        importedCount++;
        continue;
      } else if (conflictResolution === 'suffix') {
        matricule = `${matricule}-R`;
      }
    }

    const newStudent: StudentRecord = {
      id: 'std_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
      registration_number: matricule,
      full_name: c.full_name,
      email: c.email,
      phone: c.phone,
      specialty_code: c.specialty_code,
      academic_year: c.academic_year,
      group_number: c.group_number,
      photo_status: 'pending',
      is_registered: true,
      created_at: new Date().toISOString().split('T')[0],
    };

    students.push(newStudent);
    importedCount++;
  }

  setToStorage(STORAGE_KEYS.STUDENTS, students);
  logAuditEvent(actor, 'BATCH_IMPORT_STUDENTS', 'students', 'batch', {
    importedCount,
    skippedCount,
    conflictResolution,
  });

  return { importedCount, skippedCount, errors };
}

// 6. TEACHER OPERATIONS
export function getAllTeachers(): TeacherRecord[] {
  return getFromStorage<TeacherRecord[]>(STORAGE_KEYS.TEACHERS, INITIAL_TEACHERS);
}

export function getTeacherById(id: string): TeacherRecord | null {
  const teachers = getAllTeachers();
  return teachers.find((t) => t.id === id) || null;
}

export function assignTeacherToGroup(
  teacherId: string,
  assignment: { group_id: number; specialty_code: string; academic_year: number; group_number: number; subject_name: string },
  actor: UserProfile | null
): boolean {
  const teachers = getAllTeachers();
  const tch = teachers.find((t) => t.id === teacherId);
  if (!tch) return false;

  const exists = tch.assigned_groups.some(
    (g) => g.group_id === assignment.group_id && g.subject_name === assignment.subject_name
  );
  if (!exists) {
    tch.assigned_groups.push(assignment);
    setToStorage(STORAGE_KEYS.TEACHERS, teachers);
    logAuditEvent(actor, 'ASSIGN_TEACHER_GROUP', 'teacher_group_assignments', teacherId, assignment);
  }
  return true;
}

// 7. DIGITAL STUDENT CARD OPERATIONS
export function getDigitalCardByStudentId(studentId: string): DigitalStudentCard | null {
  const cards = getFromStorage<DigitalStudentCard[]>(STORAGE_KEYS.CARDS, []);
  const existing = cards.find((c) => c.student_id === studentId);
  if (existing) return existing;

  // Auto-generate card structure if student exists
  const student = getStudentById(studentId);
  if (!student) return null;

  const specName = getSpecialtyName(student.specialty_code);
  const card = createStudentCard(student, specName);
  cards.push(card);
  setToStorage(STORAGE_KEYS.CARDS, cards);
  return card;
}

export function getAllStudentCards(): DigitalStudentCard[] {
  return getFromStorage<DigitalStudentCard[]>(STORAGE_KEYS.CARDS, []);
}

export function updateCardPhoto(studentId: string, photoDataUrl: string): { success: boolean; card?: DigitalStudentCard; error?: string } {
  const cards = getFromStorage<DigitalStudentCard[]>(STORAGE_KEYS.CARDS, []);
  let card = cards.find((c) => c.student_id === studentId);

  if (!card) {
    const student = getStudentById(studentId);
    if (!student) return { success: false, error: 'الطالب غير موجود' };
    card = createStudentCard(student, getSpecialtyName(student.specialty_code));
    cards.push(card);
  }

  card.photo_url = photoDataUrl;
  card.status = 'pending'; // Requires admin approval
  setToStorage(STORAGE_KEYS.CARDS, cards);

  // Update student table as well
  const students = getFromStorage<StudentRecord[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
  const std = students.find((s) => s.id === studentId);
  if (std) {
    std.photo_url = photoDataUrl;
    std.photo_status = 'pending';
    setToStorage(STORAGE_KEYS.STUDENTS, students);
  }

  return { success: true, card };
}

export function reviewStudentCard(
  studentId: string,
  approved: boolean,
  rejectionReason: string | undefined,
  adminActor: UserProfile | null
): boolean {
  const cards = getFromStorage<DigitalStudentCard[]>(STORAGE_KEYS.CARDS, []);
  const card = cards.find((c) => c.student_id === studentId);
  if (!card) return false;

  card.status = approved ? 'approved' : 'rejected';
  card.approved_by_name = adminActor?.full_name || 'إدارة الملحقة';
  card.approved_at = new Date().toISOString();
  card.rejection_reason = approved ? undefined : rejectionReason || 'الصورة غير مطابقة للمعايير الرسمية';

  setToStorage(STORAGE_KEYS.CARDS, cards);

  // Sync student photo status
  const students = getFromStorage<StudentRecord[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
  const std = students.find((s) => s.id === studentId);
  if (std) {
    std.photo_status = card.status;
    setToStorage(STORAGE_KEYS.STUDENTS, students);
  }

  logAuditEvent(adminActor, approved ? 'APPROVE_CARD' : 'REJECT_CARD', 'student_cards', card.id, {
    student_id: studentId,
    reason: rejectionReason,
  });

  return true;
}

// 8. REGISTRATION APPLICATIONS (NEW STUDENTS)
const INITIAL_APPLICATIONS: StudentRegistrationApplication[] = [
  {
    id: 'app-01',
    full_name: 'حسام بن سالم',
    email: 'hossam.salem@gmail.com',
    phone: '0671998877',
    date_of_birth: '2006-05-18',
    bac_registration_number: '39084721',
    bac_year: 2024,
    high_school_branch: 'علوم تجريبية',
    requested_specialty: 'snv_cem',
    status: 'pending',
    created_at: '2024-10-10',
  },
  {
    id: 'app-02',
    full_name: 'آمال غزال',
    email: 'amal.ghezzal@gmail.com',
    phone: '0672112233',
    date_of_birth: '2006-03-22',
    bac_registration_number: '39091834',
    bac_year: 2024,
    high_school_branch: 'رياضيات',
    requested_specialty: 'info_cem',
    status: 'pending',
    created_at: '2024-10-12',
  },
];

export function getRegistrationApplications(): StudentRegistrationApplication[] {
  return getFromStorage<StudentRegistrationApplication[]>(STORAGE_KEYS.APPLICATIONS, INITIAL_APPLICATIONS);
}

export function submitRegistrationApplication(
  app: Omit<StudentRegistrationApplication, 'id' | 'status' | 'created_at'>
): StudentRegistrationApplication {
  const list = getRegistrationApplications();
  const newApp: StudentRegistrationApplication = {
    ...app,
    id: 'app_' + Date.now().toString(36),
    status: 'pending',
    created_at: new Date().toISOString().split('T')[0],
  };
  list.unshift(newApp);
  setToStorage(STORAGE_KEYS.APPLICATIONS, list);
  return newApp;
}

export function reviewRegistrationApplication(
  appId: string,
  approved: boolean,
  notes: string | undefined,
  adminActor: UserProfile | null
): { success: boolean; createdStudent?: StudentRecord; error?: string } {
  const list = getRegistrationApplications();
  const app = list.find((a) => a.id === appId);
  if (!app) return { success: false, error: 'الطلب غير موجود' };

  app.status = approved ? 'approved' : 'rejected';
  app.reviewed_by = adminActor?.full_name || 'مسؤول المنصة';
  app.notes = notes;
  setToStorage(STORAGE_KEYS.APPLICATIONS, list);

  let createdStudent: StudentRecord | undefined;
  if (approved) {
    // Generate official matricule: 24 (bac year) + 39 (Djelfa) + 6 digits
    const count = getFromStorage<StudentRecord[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS).length;
    const matricule = `${(app.bac_year % 100).toString()}390${(1000 + count).toString()}`;

    createdStudent = {
      id: 'std_' + Date.now().toString(36),
      registration_number: matricule,
      full_name: app.full_name,
      email: app.email,
      phone: app.phone,
      specialty_code: app.requested_specialty,
      academic_year: 1,
      group_number: 1,
      group_id: 101,
      date_of_birth: app.date_of_birth,
      photo_status: 'pending',
      is_registered: true,
      created_at: new Date().toISOString().split('T')[0],
    };

    saveStudentRecord(createdStudent, adminActor);
  }

  logAuditEvent(adminActor, approved ? 'APPROVE_REGISTRATION' : 'REJECT_REGISTRATION', 'student_registration_requests', appId, {
    approved,
    notes,
  });

  return { success: true, createdStudent };
}

// 9. AUDIT LOGS
export function getAuditLogs(): AuditLogItem[] {
  return getFromStorage<AuditLogItem[]>(STORAGE_KEYS.AUDIT_LOGS, []);
}

export function logAuditEvent(
  actor: UserProfile | null,
  action: string,
  targetTable: string,
  targetId: string,
  details: Record<string, any>
): void {
  const logs = getAuditLogs();
  const entry = createAuditLogEntry(actor, action, targetTable, targetId, details);
  logs.unshift(entry);
  // Keep last 200 logs
  setToStorage(STORAGE_KEYS.AUDIT_LOGS, logs.slice(0, 200));
}
