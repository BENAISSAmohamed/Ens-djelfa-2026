// Types for ENS Djelfa University Portal
// ملحقة المدرسة العليا للأساتذة - الجلفة

export type UserRole = 'student' | 'teacher' | 'admin' | 'super_admin';

export type CardStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type AttendanceStatus = 'present' | 'absent' | 'justified' | 'late';

export type RegistrationRequestStatus = 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  is_active: boolean;
  avatar_url?: string;
  created_at: string;
}

export interface AdministrativePermissions {
  admin_id: string;
  can_manage_students: boolean;
  can_manage_teachers: boolean;
  can_manage_cards: boolean;
  can_manage_announcements: boolean;
  can_manage_calendar: boolean;
  can_manage_resources: boolean;
  can_view_audit_logs: boolean;
}

export interface SpecialtyItem {
  code: string;
  name_ar: string;
  name_fr: string;
  degree_type: string;
  duration_years: number;
}

export interface AcademicGroup {
  id: number;
  specialty_code: string;
  academic_year: number; // 1 to 5
  group_number: number;  // 1, 2, 3...
  label: string;
}

export interface StudentRecord {
  id: string;
  registration_number: string; // Official Matricule
  full_name: string;
  email: string;
  phone?: string;
  specialty_code: string;
  academic_year: number;
  group_number: number;
  group_id?: number;
  date_of_birth?: string;
  wilaya_of_residence?: string;
  photo_url?: string;
  photo_status: CardStatus;
  is_registered: boolean;
  created_at: string;
}

export interface TeacherRecord {
  id: string;
  employee_number: string;
  full_name: string;
  email: string;
  phone?: string;
  specialty_code: string;
  department: string;
  academic_rank: string;
  assigned_groups: {
    group_id: number;
    specialty_code: string;
    academic_year: number;
    group_number: number;
    subject_name: string;
  }[];
}

export interface DigitalStudentCard {
  id: string;
  student_id: string;
  card_number: string;
  full_name: string;
  registration_number: string;
  specialty_name: string;
  specialty_code: string;
  academic_year: number;
  group_number: number;
  photo_url?: string;
  status: CardStatus;
  qr_code_hash: string;
  issue_date: string;
  expiry_date: string;
  approved_by_name?: string;
  approved_at?: string;
  rejection_reason?: string;
}

export interface CardVerificationResult {
  is_valid: boolean;
  card_status: CardStatus;
  institution: string;
  student_initials: string;
  registration_number: string;
  specialty_name: string;
  academic_year: number;
  issue_date: string;
  expiry_date: string;
  verification_timestamp: string;
  message: string;
}

export interface AttendanceSession {
  id: string;
  teacher_id: string;
  teacher_name?: string;
  specialty_code: string;
  academic_year: number;
  group_number: number;
  subject_name: string;
  session_date: string;
  slot_index: number;
  room_number?: string;
  records: {
    student_id: string;
    student_name: string;
    registration_number: string;
    status: AttendanceStatus;
    notes?: string;
  }[];
}

export interface StudentRegistrationApplication {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  bac_registration_number: string;
  bac_year: number;
  high_school_branch: string;
  requested_specialty: string;
  status: RegistrationRequestStatus;
  created_at: string;
  reviewed_by?: string;
  notes?: string;
}

export interface AuditLogItem {
  id: string;
  actor_id: string;
  actor_name?: string;
  actor_role: string;
  action: string;
  target_table: string;
  target_id: string;
  details: Record<string, any>;
  created_at: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
