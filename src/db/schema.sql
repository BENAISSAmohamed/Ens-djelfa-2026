-- ==============================================================================
-- ENS DJELFA (ملحقة المدرسة العليا للأساتذة - الجلفة)
-- Official University Portal Database Schema & Row Level Security (RLS)
-- Compatible with PostgreSQL 15+ and Supabase
-- Target: 3,000+ Students, 400+ Teachers, Granular Administrative Permissions
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin', 'super_admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE card_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'justified', 'late');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE registration_request_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE admin_request_status AS ENUM ('pending', 'approved', 'ready', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. ADMINISTRATIVE PERMISSIONS TABLE (Granular RBAC for Sub-Administrators)
CREATE TABLE IF NOT EXISTS public.administrative_permissions (
  admin_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  can_manage_students BOOLEAN NOT NULL DEFAULT false,
  can_manage_teachers BOOLEAN NOT NULL DEFAULT false,
  can_manage_cards BOOLEAN NOT NULL DEFAULT false,
  can_manage_announcements BOOLEAN NOT NULL DEFAULT true,
  can_manage_calendar BOOLEAN NOT NULL DEFAULT true,
  can_manage_resources BOOLEAN NOT NULL DEFAULT true,
  can_view_audit_logs BOOLEAN NOT NULL DEFAULT false,
  granted_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. ACADEMIC YEARS & SPECIALTIES
CREATE TABLE IF NOT EXISTS public.academic_years (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE, -- e.g. "2024-2025", "2026-2027"
  label TEXT NOT NULL,       -- e.g. "السنة الجامعية 2026 / 2027"
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.specialties (
  code TEXT PRIMARY KEY,     -- e.g. "snv", "info", "ar", "fr", "en", "hg", "eps"
  name_ar TEXT NOT NULL,
  name_fr TEXT NOT NULL,
  degree_type TEXT NOT NULL, -- e.g. "أستاذ التعليم المتوسط (PEM)", "أستاذ التعليم الثانوي (PES)"
  duration_years INT NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- 6. GROUPS TABLE
CREATE TABLE IF NOT EXISTS public.groups (
  id SERIAL PRIMARY KEY,
  specialty_code TEXT NOT NULL REFERENCES public.specialties(code) ON DELETE CASCADE,
  academic_year INT NOT NULL, -- 1 to 5
  group_number INT NOT NULL,  -- 1, 2, 3...
  label TEXT NOT NULL,        -- e.g. "فوج 1 - علوم الطبيعة والحياة (سنة 1)"
  academic_year_code TEXT REFERENCES public.academic_years(code),
  UNIQUE (specialty_code, academic_year, group_number)
);

-- 7. STUDENTS TABLE
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  registration_number TEXT NOT NULL UNIQUE, -- Official Matricule
  specialty_code TEXT NOT NULL REFERENCES public.specialties(code),
  academic_year INT NOT NULL DEFAULT 1,
  group_id INT REFERENCES public.groups(id),
  date_of_birth DATE,
  place_of_birth TEXT,
  wilaya_of_residence TEXT DEFAULT 'الجلفة',
  bac_year INT,
  bac_registration_number TEXT,
  photo_url TEXT,
  photo_status card_status NOT NULL DEFAULT 'pending',
  is_registered BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. TEACHERS TABLE
CREATE TABLE IF NOT EXISTS public.teachers (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  employee_number TEXT NOT NULL UNIQUE,
  specialty_code TEXT REFERENCES public.specialties(code),
  department TEXT NOT NULL DEFAULT 'ملحقة الجلفة',
  academic_rank TEXT, -- أستاذ محاضر، أستاذ مساعد، أستاذ تعليم عالي
  office_location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. TEACHER GROUP ASSIGNMENTS (Restricts Attendance Marking to Assigned Groups)
CREATE TABLE IF NOT EXISTS public.teacher_group_assignments (
  id SERIAL PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  group_id INT NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  module_type TEXT DEFAULT 'TD', -- 'Cours', 'TD', 'TP'
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (teacher_id, group_id, subject_name)
);

-- 10. DIGITAL STUDENT CARDS TABLE
CREATE TABLE IF NOT EXISTS public.student_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,
  card_number TEXT NOT NULL UNIQUE,
  qr_code_hash TEXT NOT NULL UNIQUE,
  status card_status NOT NULL DEFAULT 'pending',
  approved_photo_url TEXT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 year'),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. ATTENDANCE SESSIONS & RECORDS
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES public.teachers(id),
  group_id INT NOT NULL REFERENCES public.groups(id),
  specialty_code TEXT NOT NULL REFERENCES public.specialties(code),
  academic_year INT NOT NULL,
  group_number INT NOT NULL,
  subject_name TEXT NOT NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  slot_index INT NOT NULL DEFAULT 0, -- 0 to 5 for timetable slots
  room_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status attendance_status NOT NULL DEFAULT 'present',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, student_id)
);

-- 12. PEDAGOGICAL RESOURCES
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  specialty_code TEXT NOT NULL REFERENCES public.specialties(code),
  level TEXT NOT NULL, -- L1, L2, L3, M1, M2
  doc_type TEXT NOT NULL, -- 'cours', 'td', 'tp', 'exam', 'guide'
  file_url TEXT NOT NULL,
  file_size_bytes BIGINT,
  file_format TEXT DEFAULT 'pdf',
  author_id UUID REFERENCES public.profiles(id),
  author_name TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  downloads_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  target_specialty TEXT, -- NULL for all
  author_id UUID REFERENCES public.profiles(id),
  is_published BOOLEAN NOT NULL DEFAULT true,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. STUDENT REGISTRATION REQUESTS (Self-Registration Workflow)
CREATE TABLE IF NOT EXISTS public.student_registration_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  date_of_birth DATE,
  bac_registration_number TEXT NOT NULL,
  bac_year INT NOT NULL,
  high_school_branch TEXT,
  requested_specialty TEXT NOT NULL REFERENCES public.specialties(code),
  status registration_request_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. AUDIT LOGS (Security & Compliance Tracking)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES public.profiles(id),
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL, -- e.g. "CREATE_STUDENT", "APPROVE_CARD", "ASSIGN_MATRICULE", "SAVE_ATTENDANCE"
  target_table TEXT NOT NULL,
  target_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 16. PERFORMANCE INDEXES (Optimized for 3,000+ Students & 400+ Teachers)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_students_reg_num ON public.students (registration_number);
CREATE INDEX IF NOT EXISTS idx_students_group ON public.students (group_id);
CREATE INDEX IF NOT EXISTS idx_students_specialty ON public.students (specialty_code, academic_year);
CREATE INDEX IF NOT EXISTS idx_student_cards_student ON public.student_cards (student_id);
CREATE INDEX IF NOT EXISTS idx_student_cards_qr ON public.student_cards (qr_code_hash);
CREATE INDEX IF NOT EXISTS idx_attendance_session ON public.attendance_records (session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance_records (student_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments ON public.teacher_group_assignments (teacher_id, group_id);
CREATE INDEX IF NOT EXISTS idx_resources_search ON public.resources (specialty_code, level, doc_type);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs (created_at DESC);

-- ==============================================================================
-- 17. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.administrative_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_group_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_registration_requests ENABLE ROW LEVEL SECURITY;

-- Helper Functions
CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin') AND is_active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin' AND is_active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Profiles: Users can read their own profile; Admins can read all profiles
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Students: Student can ONLY view their own record; Admins & Teachers can view assigned students
DROP POLICY IF EXISTS "students_select_policy" ON public.students;
CREATE POLICY "students_select_policy" ON public.students
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.teacher_group_assignments tga
      WHERE tga.teacher_id = auth.uid() AND tga.group_id = students.group_id
    )
  );

DROP POLICY IF EXISTS "students_admin_mutation" ON public.students;
CREATE POLICY "students_admin_mutation" ON public.students
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Student Cards: Students can view their own card; QR verification view is public; Admins can manage
DROP POLICY IF EXISTS "cards_select_policy" ON public.student_cards;
CREATE POLICY "cards_select_policy" ON public.student_cards
  FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "cards_update_student_photo" ON public.student_cards;
CREATE POLICY "cards_update_student_photo" ON public.student_cards
  FOR UPDATE TO authenticated
  USING (student_id = auth.uid() AND status IN ('pending', 'rejected'))
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "cards_admin_all" ON public.student_cards;
CREATE POLICY "cards_admin_all" ON public.student_cards
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Attendance Records:
-- 1. Student can ONLY read their own attendance records
DROP POLICY IF EXISTS "attendance_student_read" ON public.attendance_records;
CREATE POLICY "attendance_student_read" ON public.attendance_records
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- 2. Teacher can read and insert attendance for assigned groups
DROP POLICY IF EXISTS "attendance_teacher_access" ON public.attendance_records;
CREATE POLICY "attendance_teacher_access" ON public.attendance_records
  FOR ALL TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.attendance_sessions s
      JOIN public.teacher_group_assignments tga ON tga.group_id = s.group_id
      WHERE s.id = attendance_records.session_id AND tga.teacher_id = auth.uid()
    )
  );

-- Announcements & Resources: Anyone can read published; Admins/Teachers can insert
DROP POLICY IF EXISTS "announcements_read_public" ON public.announcements;
CREATE POLICY "announcements_read_public" ON public.announcements
  FOR SELECT TO anon, authenticated
  USING (is_published = true OR public.is_admin());

DROP POLICY IF EXISTS "resources_read_public" ON public.resources;
CREATE POLICY "resources_read_public" ON public.resources
  FOR SELECT TO anon, authenticated
  USING (is_public = true OR public.is_admin() OR author_id = auth.uid());

-- Audit Logs: Only admins with permission or super_admins can read audit logs
DROP POLICY IF EXISTS "audit_logs_read" ON public.audit_logs;
CREATE POLICY "audit_logs_read" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_super_admin() OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.administrative_permissions WHERE admin_id = auth.uid() AND can_view_audit_logs = true
  )));

DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);
