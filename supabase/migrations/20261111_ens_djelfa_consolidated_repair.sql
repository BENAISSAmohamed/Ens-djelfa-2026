-- ==============================================================================
-- ENS DJELFA — CONSOLIDATED PRODUCTION DATABASE MIGRATION (SECURITY REDESIGNED V2)
-- Higher Normal School Branch of Djelfa | ملحقة المدرسة العليا للأساتذة - الجلفة
--
-- Target Project: https://jhdfamkdxytpgtjxlhpm.supabase.co
-- Date: November 2026
--
-- CORE ARCHITECTURAL & SECURITY PRINCIPLES:
-- 1. FIRST-ADMIN INITIALIZATION WITHOUT SECURITY DEFINER PRIVILEGE HOLES:
--    - The trigger public.prevent_role_escalation() is SECURITY INVOKER (not SECURITY DEFINER).
--    - In SECURITY INVOKER mode, current_user evaluates to the actual calling role ('authenticated', 'anon', etc.).
--    - Trusted owner elevation requires session_user IN ('postgres', 'supabase_admin') or (auth.jwt() ->> 'role') = 'service_role'.
--    - Ordinary self-registration is strictly and unconditionally restricted to 'student'.
--    - No zero-admin exception exists; no caller can elevate themselves through the API.
-- 2. COMPLETE RESOLUTION OF CIRCULAR RLS DEPENDENCIES:
--    - All cross-table checks (teacher session validation, student group verification) are encapsulated
--      in narrowly scoped SECURITY DEFINER helper functions in schema 'private' with fixed empty search_path.
--    - RLS policies do not execute recursive subqueries across profiles/students/attendance tables.
-- 3. SEPARATED ANONYMOUS ACCESS:
--    - Anonymous users have dedicated, standalone SELECT policies on public tables without invoking private.is_admin().
--    - All private tables have direct access explicitly revoked from 'anon'.
-- 4. COMPREHENSIVE LEAST-PRIVILEGE GRANTS:
--    - Authenticated users receive explicit table grants matching their RLS permissions.
--    - Anonymous visitors receive only SELECT on public published content and INSERT on registration applications.
-- 5. COLUMN-LEVEL IMMUTABILITY ENFORCED VIA DATABASE TRIGGERS:
--    - Students cannot tamper with roles, registration numbers, academic assignments, or approval statuses.
--    - Users can only mark their own notifications as read (is_read); all other fields are immutable.
--    - Users can only cancel their own appointments and event registrations (status = 'cancelled').
-- 6. ABUSE-RESISTANT CERTIFICATE VERIFICATION RPC:
--    - Direct table access revoked from anon.
--    - RPC enforces strict regex/length checks, exact matching, and minimum public response fields.
-- 7. ZERO FABRICATED DATA:
--    - All dummy student, teacher, club, and certificate seed records removed.
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- PART 1: EXTENSIONS & PRIVATE SECURITY SCHEMA
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM public, anon;
GRANT USAGE ON SCHEMA private TO authenticated;

-- ==============================================================================
-- PART 2: SCHEMA REPAIR — ENSURE REQUIRED COLUMNS & CONSTRAINTS EXIST
-- (Must be executed before any function or policy references these columns)
-- ==============================================================================

-- 1. Table: public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check
      CHECK (role IN ('student', 'teacher', 'admin', 'super_admin'));
  END IF;
END $$;

-- 2. Table: public.students
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS birth_place TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS wilaya_of_residence TEXT DEFAULT 'الجلفة';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS blood_group TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS photo_status TEXT DEFAULT 'pending';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS is_registered BOOLEAN DEFAULT TRUE;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Table: public.announcements
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4. Table: public.resources
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS specialty_code TEXT;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS doc_type TEXT DEFAULT 'course';
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS author_name TEXT;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS downloads INT DEFAULT 0;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 5. Table: public.attendance_sessions
ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS group_name TEXT;
ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS specialty TEXT;
ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS room TEXT;
ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 6. Table: public.attendance_records
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ==============================================================================
-- PART 3: CREATE MISSING APPLICATION TABLES WITH INTEGRITY CONSTRAINTS
-- ==============================================================================

-- 7. Table: public.administrative_requests
CREATE TABLE IF NOT EXISTS public.administrative_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_name TEXT,
  document_type TEXT NOT NULL,
  reason TEXT,
  specialty TEXT,
  level TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'approved', 'ready', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Table: public.administrative_appointments
CREATE TABLE IF NOT EXISTS public.administrative_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_name TEXT,
  office TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Table: public.academic_events
CREATE TABLE IF NOT EXISTS public.academic_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('exam', 'holiday', 'deadline', 'event', 'club')),
  date DATE NOT NULL,
  end_date DATE,
  specialty TEXT DEFAULT 'all',
  level TEXT DEFAULT 'all',
  notes TEXT,
  is_official BOOLEAN DEFAULT TRUE,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Table: public.digital_student_cards
CREATE TABLE IF NOT EXISTS public.digital_student_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  matricule TEXT NOT NULL,
  card_number TEXT NOT NULL UNIQUE,
  qr_code_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired', 'pending_approval')),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE NOT NULL DEFAULT ((CURRENT_DATE + INTERVAL '1 year')::date),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Table: public.student_registration_applications
CREATE TABLE IF NOT EXISTS public.student_registration_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  bac_registration_number TEXT NOT NULL,
  bac_year INT NOT NULL,
  specialty_code TEXT NOT NULL,
  date_of_birth DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- 12. Table: public.student_clubs
CREATE TABLE IF NOT EXISTS public.student_clubs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('scientific', 'cultural', 'sports', 'media')),
  logo TEXT,
  description TEXT,
  objectives TEXT[],
  supervisor TEXT,
  coordinators TEXT[],
  contact_email TEXT,
  contact_phone TEXT,
  capacity INT DEFAULT 50,
  membership_requirements TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'suspended', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Table: public.club_applications
CREATE TABLE IF NOT EXISTS public.club_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id TEXT NOT NULL REFERENCES public.student_clubs(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_matricule TEXT NOT NULL,
  specialty TEXT NOT NULL,
  motivation TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'waitlist')),
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Table: public.student_events
CREATE TABLE IF NOT EXISTS public.student_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  registration_deadline TIMESTAMPTZ NOT NULL,
  capacity INT NOT NULL,
  organizer TEXT NOT NULL,
  eligibility TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'published', 'registration_open', 'full', 'completed', 'rejected', 'archived')),
  qr_checkin_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Table: public.event_registrations
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL REFERENCES public.student_events(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_matricule TEXT NOT NULL,
  specialty TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'waitlisted', 'cancelled', 'attended')),
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT event_student_unique UNIQUE (event_id, student_id)
);

-- 16. Table: public.participation_certificates
CREATE TABLE IF NOT EXISTS public.participation_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_code TEXT NOT NULL UNIQUE,
  student_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  recipient_name TEXT NOT NULL,
  event_or_activity_title TEXT NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  organizer TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Table: public.exhibition_achievements
CREATE TABLE IF NOT EXISTS public.exhibition_achievements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  authors TEXT[] NOT NULL,
  lead_student_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  media_url TEXT,
  likes INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. Table: public.in_app_notifications
CREATE TABLE IF NOT EXISTS public.in_app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT DEFAULT 'system',
  is_read BOOLEAN DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verification rate-limiting helper table in schema 'private'
CREATE TABLE IF NOT EXISTS private.certificate_verification_attempts (
  id BIGSERIAL PRIMARY KEY,
  ip_address TEXT,
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  is_successful BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_cert_attempts ON private.certificate_verification_attempts (attempted_at);

-- ==============================================================================
-- PART 4: SECURITY DEFINER ISOLATION ENGINES (ELIMINATES RLS RECURSION)
-- ==============================================================================

-- Evaluates if the authenticated caller is an active verified administrator
-- Bypasses RLS internally with empty search_path to prevent infinite recursion
CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
      AND is_active = TRUE
  );
$$;

GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;

-- Evaluates if the authenticated caller is an active verified teacher
CREATE OR REPLACE FUNCTION private.is_teacher()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'teacher'
      AND is_active = TRUE
  );
$$;

GRANT EXECUTE ON FUNCTION private.is_teacher() TO authenticated;

-- Non-recursive check: Checks whether a student is enrolled in a session taught by the teacher
CREATE OR REPLACE FUNCTION private.teacher_has_student_in_session(p_teacher_id UUID, p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.attendance_sessions s
    JOIN public.attendance_records r ON r.session_id = s.id
    WHERE s.teacher_id = p_teacher_id
      AND r.student_id = p_student_id
  );
$$;

GRANT EXECUTE ON FUNCTION private.teacher_has_student_in_session(UUID, UUID) TO authenticated;

-- Non-recursive check: Checks whether a student belongs to a group/specialty taught by the teacher
CREATE OR REPLACE FUNCTION private.teacher_teaches_group(p_teacher_id UUID, p_specialty_code TEXT, p_group_number INT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.attendance_sessions s
    WHERE s.teacher_id = p_teacher_id
      AND s.specialty_code = p_specialty_code
      AND s.group_number = p_group_number
  );
$$;

GRANT EXECUTE ON FUNCTION private.teacher_teaches_group(UUID, TEXT, INT) TO authenticated;

-- Non-recursive check: Verifies attendance record ownership for a student
CREATE OR REPLACE FUNCTION private.student_matches_attendance_record(p_record_student_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students s
    WHERE (s.id = p_record_student_id OR s.user_id = p_record_student_id)
      AND (s.user_id = p_user_id OR s.id = p_user_id)
  );
$$;

GRANT EXECUTE ON FUNCTION private.student_matches_attendance_record(UUID, UUID) TO authenticated;

-- ==============================================================================
-- PART 5: SECURITY INVOKER TRIGGERS & COLUMN-LEVEL DATA GUARDS
-- ==============================================================================

-- Trigger function: Prevents unauthorized role and active status modifications.
-- IMPORTANT: Defined as SECURITY INVOKER (NOT SECURITY DEFINER).
-- In SECURITY INVOKER mode, session_user correctly reflects the real connected role
-- ('authenticator' for PostgREST API connections vs 'postgres' for direct SQL Editor execution).
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_is_trusted_owner BOOLEAN;
  v_is_admin BOOLEAN;
BEGIN
  -- Trusted owner check: true ONLY when executing directly in Supabase Dashboard SQL Editor (postgres)
  -- or via trusted server-side service_role hook.
  v_is_trusted_owner := (
    session_user IN ('postgres', 'supabase_admin')
    OR (auth.jwt() ->> 'role') = 'service_role'
  );

  v_is_admin := private.is_admin();

  IF TG_OP = 'INSERT' THEN
    -- If caller is not the database owner or a verified administrator:
    IF NOT (v_is_trusted_owner OR v_is_admin) THEN
      -- Force role to 'student' unconditionally; reject any elevation attempt
      IF NEW.role IS DISTINCT FROM 'student' THEN
        RAISE EXCEPTION 'Privilege escalation denied: Self-registration is strictly restricted to student accounts.';
      END IF;
      -- Force account to active (prevents malicious inactive injection)
      NEW.is_active := TRUE;
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    -- If caller is not the database owner or a verified administrator:
    IF NOT (v_is_trusted_owner OR v_is_admin) THEN
      IF (NEW.role IS DISTINCT FROM OLD.role) THEN
        RAISE EXCEPTION 'Privilege escalation denied: Only administrators may modify account roles.';
      END IF;
      IF (NEW.is_active IS DISTINCT FROM OLD.is_active) THEN
        RAISE EXCEPTION 'Privilege escalation denied: Only administrators may alter account activation status.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger function: Protects official academic student fields
CREATE OR REPLACE FUNCTION public.protect_student_academic_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NOT private.is_admin() THEN
    IF NEW.registration_number IS DISTINCT FROM OLD.registration_number
       OR NEW.academic_year IS DISTINCT FROM OLD.academic_year
       OR NEW.group_number IS DISTINCT FROM OLD.group_number
       OR NEW.specialty_code IS DISTINCT FROM OLD.specialty_code
       OR NEW.is_registered IS DISTINCT FROM OLD.is_registered
       OR NEW.photo_status IS DISTINCT FROM OLD.photo_status THEN
      RAISE EXCEPTION 'Column protection: Official academic records may only be altered by university administration.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger function: Protects administrative requests state transitions
CREATE OR REPLACE FUNCTION public.protect_request_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NOT private.is_admin() THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.status IS DISTINCT FROM 'pending' THEN
        RAISE EXCEPTION 'Status tampering denied: New administrative requests must start as pending.';
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.status IS DISTINCT FROM OLD.status OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes THEN
        RAISE EXCEPTION 'Status tampering denied: Only administrators may review or alter request status.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger function: Protects administrative appointments state transitions
CREATE OR REPLACE FUNCTION public.protect_appointment_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NOT private.is_admin() THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.status IS DISTINCT FROM 'pending' THEN
        RAISE EXCEPTION 'Status tampering denied: New appointments must start as pending.';
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.user_id != OLD.user_id
         OR NEW.office != OLD.office
         OR NEW.appointment_date != OLD.appointment_date
         OR NEW.time_slot != OLD.time_slot
         OR NEW.reason != OLD.reason
         OR NEW.status != 'cancelled' THEN
        RAISE EXCEPTION 'Column protection: Users may only cancel their appointments and cannot alter appointment details or status.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger function: Protects event registrations state transitions
CREATE OR REPLACE FUNCTION public.protect_event_registration_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NOT private.is_admin() THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.status NOT IN ('registered', 'waitlisted') THEN
        RAISE EXCEPTION 'Status tampering denied: Event registrations must start as registered or waitlisted.';
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.student_id != OLD.student_id
         OR NEW.event_id != OLD.event_id
         OR NEW.student_name != OLD.student_name
         OR NEW.student_matricule != OLD.student_matricule
         OR NEW.specialty != OLD.specialty
         OR NEW.status != 'cancelled' THEN
        RAISE EXCEPTION 'Column protection: Students may only cancel their registration and cannot mark attendance or alter records.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger function: Protects notification fields from user tampering
CREATE OR REPLACE FUNCTION public.protect_notification_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NOT private.is_admin() THEN
    IF NEW.user_id != OLD.user_id
       OR NEW.title != OLD.title
       OR NEW.body != OLD.body
       OR NEW.category IS DISTINCT FROM OLD.category
       OR NEW.link IS DISTINCT FROM OLD.link
       OR NEW.created_at != OLD.created_at THEN
      RAISE EXCEPTION 'Column protection: Non-administrators may only modify the is_read field of notifications.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger function: Protects club applications state transitions
CREATE OR REPLACE FUNCTION public.protect_club_application_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NOT private.is_admin() THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.status IS DISTINCT FROM 'pending' THEN
        RAISE EXCEPTION 'Status tampering denied: Club membership applications must start as pending.';
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.status IS DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'Status tampering denied: Only administrators may review or modify membership application status.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger function: Protects exhibition achievements state transitions
CREATE OR REPLACE FUNCTION public.protect_exhibition_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NOT private.is_admin() THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.status IS DISTINCT FROM 'pending' THEN
        RAISE EXCEPTION 'Status tampering denied: Student exhibition submissions must start as pending review.';
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.status IS DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'Status tampering denied: Only administrators may approve or publish exhibition submissions.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ==============================================================================
-- PART 6: ATTACH SECURITY TRIGGERS
-- ==============================================================================

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();

DROP TRIGGER IF EXISTS trg_protect_student_academic_columns ON public.students;
CREATE TRIGGER trg_protect_student_academic_columns
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_student_academic_columns();

DROP TRIGGER IF EXISTS trg_protect_request_status ON public.administrative_requests;
CREATE TRIGGER trg_protect_request_status
  BEFORE INSERT OR UPDATE ON public.administrative_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_request_status();

DROP TRIGGER IF EXISTS trg_protect_appointment_columns ON public.administrative_appointments;
CREATE TRIGGER trg_protect_appointment_columns
  BEFORE INSERT OR UPDATE ON public.administrative_appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_appointment_columns();

DROP TRIGGER IF EXISTS trg_protect_event_registration_columns ON public.event_registrations;
CREATE TRIGGER trg_protect_event_registration_columns
  BEFORE INSERT OR UPDATE ON public.event_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_event_registration_columns();

DROP TRIGGER IF EXISTS trg_protect_notification_columns ON public.in_app_notifications;
CREATE TRIGGER trg_protect_notification_columns
  BEFORE UPDATE ON public.in_app_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_notification_columns();

DROP TRIGGER IF EXISTS trg_protect_club_application_status ON public.club_applications;
CREATE TRIGGER trg_protect_club_application_status
  BEFORE INSERT OR UPDATE ON public.club_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_club_application_status();

DROP TRIGGER IF EXISTS trg_protect_exhibition_status ON public.exhibition_achievements;
CREATE TRIGGER trg_protect_exhibition_status
  BEFORE INSERT OR UPDATE ON public.exhibition_achievements
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_exhibition_status();

-- ==============================================================================
-- PART 7: COMPREHENSIVE RLS POLICIES (PURGE LEGACY & APPLY NON-RECURSIVE RULES)
-- ==============================================================================

-- 1. Table: public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles self or staff read" ON public.profiles;
DROP POLICY IF EXISTS "Profiles self or admin read" ON public.profiles;
DROP POLICY IF EXISTS "Profiles self insert student" ON public.profiles;
DROP POLICY IF EXISTS "Profiles self update non-privileged" ON public.profiles;
DROP POLICY IF EXISTS "Profiles admin delete" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_scoped" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;

CREATE POLICY "profiles_select_scoped" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR private.is_admin()
    OR (
      private.is_teacher() AND private.teacher_has_student_in_session(auth.uid(), profiles.id)
    )
  );

CREATE POLICY "profiles_insert_student_self" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    id = auth.uid() AND (role = 'student' OR role IS NULL)
  );

CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR private.is_admin())
  WITH CHECK (id = auth.uid() OR private.is_admin());

CREATE POLICY "profiles_admin_manage" ON public.profiles
  FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

-- 2. Table: public.students
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "students_select_policy" ON public.students;
DROP POLICY IF EXISTS "students_admin_mutation" ON public.students;
DROP POLICY IF EXISTS "Students self or staff read" ON public.students;
DROP POLICY IF EXISTS "Students admin manage" ON public.students;
DROP POLICY IF EXISTS "students_select_scoped" ON public.students;

CREATE POLICY "students_select_scoped" ON public.students
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR id = auth.uid()
    OR private.is_admin()
    OR (
      private.is_teacher() AND (
        private.teacher_has_student_in_session(auth.uid(), students.id)
        OR private.teacher_teaches_group(auth.uid(), students.specialty_code, students.group_number)
      )
    )
  );

CREATE POLICY "students_admin_manage" ON public.students
  FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

-- 3. Table: public.announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "announcements_read_public" ON public.announcements;
DROP POLICY IF EXISTS "Announcements public read published" ON public.announcements;
DROP POLICY IF EXISTS "Announcements admin manage" ON public.announcements;
DROP POLICY IF EXISTS "announcements_select_published" ON public.announcements;

CREATE POLICY "announcements_anon_select" ON public.announcements
  FOR SELECT TO anon
  USING (is_published = TRUE);

CREATE POLICY "announcements_authenticated_select" ON public.announcements
  FOR SELECT TO authenticated
  USING (is_published = TRUE OR private.is_admin());

CREATE POLICY "announcements_admin_manage" ON public.announcements
  FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

-- 4. Table: public.resources
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resources_read_public" ON public.resources;
DROP POLICY IF EXISTS "Resources public read published" ON public.resources;
DROP POLICY IF EXISTS "Resources staff manage" ON public.resources;
DROP POLICY IF EXISTS "resources_select_published" ON public.resources;
DROP POLICY IF EXISTS "resources_teacher_insert" ON public.resources;

CREATE POLICY "resources_anon_select" ON public.resources
  FOR SELECT TO anon
  USING (is_published = TRUE);

CREATE POLICY "resources_authenticated_select" ON public.resources
  FOR SELECT TO authenticated
  USING (is_published = TRUE OR private.is_admin() OR private.is_teacher());

CREATE POLICY "resources_teacher_insert" ON public.resources
  FOR INSERT TO authenticated
  WITH CHECK (private.is_admin() OR private.is_teacher());

CREATE POLICY "resources_admin_manage" ON public.resources
  FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

-- 5. Table: public.attendance_sessions
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Attendance sessions teacher or admin select" ON public.attendance_sessions;
DROP POLICY IF EXISTS "Attendance sessions teacher or admin insert" ON public.attendance_sessions;
DROP POLICY IF EXISTS "Attendance sessions teacher update own" ON public.attendance_sessions;
DROP POLICY IF EXISTS "Attendance sessions admin manage" ON public.attendance_sessions;
DROP POLICY IF EXISTS "attendance_sessions_select" ON public.attendance_sessions;
DROP POLICY IF EXISTS "attendance_sessions_insert" ON public.attendance_sessions;
DROP POLICY IF EXISTS "attendance_sessions_update" ON public.attendance_sessions;

CREATE POLICY "attendance_sessions_select" ON public.attendance_sessions
  FOR SELECT TO authenticated
  USING (teacher_id = auth.uid() OR private.is_admin());

CREATE POLICY "attendance_sessions_insert" ON public.attendance_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    (teacher_id = auth.uid() AND private.is_teacher())
    OR private.is_admin()
  );

CREATE POLICY "attendance_sessions_update" ON public.attendance_sessions
  FOR UPDATE TO authenticated
  USING (
    (teacher_id = auth.uid() AND private.is_teacher())
    OR private.is_admin()
  )
  WITH CHECK (
    (teacher_id = auth.uid() AND private.is_teacher())
    OR private.is_admin()
  );

CREATE POLICY "attendance_sessions_admin_manage" ON public.attendance_sessions
  FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

-- 6. Table: public.attendance_records
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attendance_student_read" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_teacher_access" ON public.attendance_records;
DROP POLICY IF EXISTS "Attendance records student self read" ON public.attendance_records;
DROP POLICY IF EXISTS "Attendance records teacher or admin manage" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_records_select" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_records_teacher_manage" ON public.attendance_records;

CREATE POLICY "attendance_records_select" ON public.attendance_records
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR private.student_matches_attendance_record(attendance_records.student_id, auth.uid())
    OR private.is_admin()
    OR (
      private.is_teacher() AND EXISTS (
        SELECT 1 FROM public.attendance_sessions sess
        WHERE sess.id = attendance_records.session_id
          AND sess.teacher_id = auth.uid()
      )
    )
  );

CREATE POLICY "attendance_records_teacher_manage" ON public.attendance_records
  FOR ALL TO authenticated
  USING (
    private.is_admin()
    OR (
      private.is_teacher() AND EXISTS (
        SELECT 1 FROM public.attendance_sessions sess
        WHERE sess.id = attendance_records.session_id
          AND sess.teacher_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    private.is_admin()
    OR (
      private.is_teacher() AND EXISTS (
        SELECT 1 FROM public.attendance_sessions sess
        WHERE sess.id = attendance_records.session_id
          AND sess.teacher_id = auth.uid()
      )
    )
  );

-- 7. Table: public.administrative_requests
ALTER TABLE public.administrative_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin requests student self read" ON public.administrative_requests;
DROP POLICY IF EXISTS "Admin requests student self insert" ON public.administrative_requests;
DROP POLICY IF EXISTS "Admin requests admin manage" ON public.administrative_requests;
DROP POLICY IF EXISTS "admin_requests_select" ON public.administrative_requests;
DROP POLICY IF EXISTS "admin_requests_insert_pending" ON public.administrative_requests;

CREATE POLICY "admin_requests_select" ON public.administrative_requests
  FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR private.is_admin());

CREATE POLICY "admin_requests_insert_pending" ON public.administrative_requests
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() AND status = 'pending');

CREATE POLICY "admin_requests_admin_manage" ON public.administrative_requests
  FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

-- 8. Table: public.administrative_appointments
ALTER TABLE public.administrative_appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Appointments user self read" ON public.administrative_appointments;
DROP POLICY IF EXISTS "Appointments user self insert" ON public.administrative_appointments;
DROP POLICY IF EXISTS "Appointments user self cancel" ON public.administrative_appointments;
DROP POLICY IF EXISTS "Appointments admin manage" ON public.administrative_appointments;
DROP POLICY IF EXISTS "appointments_select" ON public.administrative_appointments;
DROP POLICY IF EXISTS "appointments_insert_pending" ON public.administrative_appointments;
DROP POLICY IF EXISTS "appointments_update_cancel" ON public.administrative_appointments;

CREATE POLICY "appointments_select" ON public.administrative_appointments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.is_admin());

CREATE POLICY "appointments_insert_pending" ON public.administrative_appointments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "appointments_update_cancel" ON public.administrative_appointments
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR private.is_admin())
  WITH CHECK ((user_id = auth.uid() AND status = 'cancelled') OR private.is_admin());

CREATE POLICY "appointments_admin_manage" ON public.administrative_appointments
  FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

-- 9. Table: public.academic_events
ALTER TABLE public.academic_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Academic events public read" ON public.academic_events;
DROP POLICY IF EXISTS "Academic events admin manage" ON public.academic_events;
DROP POLICY IF EXISTS "academic_events_select" ON public.academic_events;

CREATE POLICY "academic_events_anon_select" ON public.academic_events
  FOR SELECT TO anon
  USING (is_archived = FALSE);

CREATE POLICY "academic_events_authenticated_select" ON public.academic_events
  FOR SELECT TO authenticated
  USING (is_archived = FALSE OR private.is_admin());

CREATE POLICY "academic_events_admin_manage" ON public.academic_events
  FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

-- 10. Table: public.digital_student_cards
ALTER TABLE public.digital_student_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cards_select_policy" ON public.digital_student_cards;
DROP POLICY IF EXISTS "cards_update_student_photo" ON public.digital_student_cards;
DROP POLICY IF EXISTS "cards_admin_all" ON public.digital_student_cards;
DROP POLICY IF EXISTS "Student cards self or staff read" ON public.digital_student_cards;
DROP POLICY IF EXISTS "Student cards admin manage" ON public.digital_student_cards;
DROP POLICY IF EXISTS "student_cards_select" ON public.digital_student_cards;

CREATE POLICY "student_cards_select" ON public.digital_student_cards
  FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR private.is_admin());

CREATE POLICY "student_cards_admin_manage" ON public.digital_student_cards
  FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

-- 11. Table: public.student_registration_applications
ALTER TABLE public.student_registration_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Registration apps public submit" ON public.student_registration_applications;
DROP POLICY IF EXISTS "Registration apps admin review" ON public.student_registration_applications;
DROP POLICY IF EXISTS "reg_apps_insert_public" ON public.student_registration_applications;

CREATE POLICY "reg_apps_insert_public" ON public.student_registration_applications
  FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pending');

CREATE POLICY "reg_apps_admin_manage" ON public.student_registration_applications
  FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

-- 12. Table: public.student_clubs
ALTER TABLE public.student_clubs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Student clubs public read" ON public.student_clubs;
DROP POLICY IF EXISTS "Student clubs admin manage" ON public.student_clubs;
DROP POLICY IF EXISTS "student_clubs_select" ON public.student_clubs;

CREATE POLICY "student_clubs_anon_select" ON public.student_clubs
  FOR SELECT TO anon
  USING (status = 'active');

CREATE POLICY "student_clubs_authenticated_select" ON public.student_clubs
  FOR SELECT TO authenticated
  USING (status = 'active' OR private.is_admin());

CREATE POLICY "student_clubs_admin_manage" ON public.student_clubs
  FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

-- 13. Table: public.club_applications
ALTER TABLE public.club_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Club apps student self read" ON public.club_applications;
DROP POLICY IF EXISTS "Club apps student self submit" ON public.club_applications;
DROP POLICY IF EXISTS "Club apps admin manage" ON public.club_applications;
DROP POLICY IF EXISTS "club_apps_select" ON public.club_applications;
DROP POLICY IF EXISTS "club_apps_insert_pending" ON public.club_applications;

CREATE POLICY "club_apps_select" ON public.club_applications
  FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR private.is_admin());

CREATE POLICY "club_apps_insert_pending" ON public.club_applications
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() AND status = 'pending');

CREATE POLICY "club_apps_admin_manage" ON public.club_applications
  FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

-- 14. Table: public.student_events
ALTER TABLE public.student_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Student events public read" ON public.student_events;
DROP POLICY IF EXISTS "Student events admin manage" ON public.student_events;
DROP POLICY IF EXISTS "student_events_select" ON public.student_events;

CREATE POLICY "student_events_anon_select" ON public.student_events
  FOR SELECT TO anon
  USING (status IN ('published', 'registration_open', 'full', 'completed'));

CREATE POLICY "student_events_authenticated_select" ON public.student_events
  FOR SELECT TO authenticated
  USING (status IN ('published', 'registration_open', 'full', 'completed') OR private.is_admin());

CREATE POLICY "student_events_admin_manage" ON public.student_events
  FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

-- 15. Table: public.event_registrations
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Event reg student self read" ON public.event_registrations;
DROP POLICY IF EXISTS "Event reg student self insert" ON public.event_registrations;
DROP POLICY IF EXISTS "Event reg student self cancel" ON public.event_registrations;
DROP POLICY IF EXISTS "Event reg admin manage" ON public.event_registrations;
DROP POLICY IF EXISTS "event_reg_select" ON public.event_registrations;
DROP POLICY IF EXISTS "event_reg_insert_self" ON public.event_registrations;
DROP POLICY IF EXISTS "event_reg_update_cancel" ON public.event_registrations;

CREATE POLICY "event_reg_select" ON public.event_registrations
  FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR private.is_admin());

CREATE POLICY "event_reg_insert_self" ON public.event_registrations
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() AND status IN ('registered', 'waitlisted'));

CREATE POLICY "event_reg_update_cancel" ON public.event_registrations
  FOR UPDATE TO authenticated
  USING (student_id = auth.uid() OR private.is_admin())
  WITH CHECK ((student_id = auth.uid() AND status = 'cancelled') OR private.is_admin());

CREATE POLICY "event_reg_admin_manage" ON public.event_registrations
  FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

-- 16. Table: public.participation_certificates
ALTER TABLE public.participation_certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Certificates public verify" ON public.participation_certificates;
DROP POLICY IF EXISTS "Certificates student self read" ON public.participation_certificates;
DROP POLICY IF EXISTS "Certificates admin manage" ON public.participation_certificates;
DROP POLICY IF EXISTS "certificates_select_self" ON public.participation_certificates;

CREATE POLICY "certificates_select_self" ON public.participation_certificates
  FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR private.is_admin());

CREATE POLICY "certificates_admin_manage" ON public.participation_certificates
  FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

-- 17. Table: public.exhibition_achievements
ALTER TABLE public.exhibition_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Exhibition public read" ON public.exhibition_achievements;
DROP POLICY IF EXISTS "Exhibition student submit" ON public.exhibition_achievements;
DROP POLICY IF EXISTS "Exhibition admin manage" ON public.exhibition_achievements;
DROP POLICY IF EXISTS "exhibition_select" ON public.exhibition_achievements;
DROP POLICY IF EXISTS "exhibition_insert_pending" ON public.exhibition_achievements;

CREATE POLICY "exhibition_anon_select" ON public.exhibition_achievements
  FOR SELECT TO anon
  USING (status = 'published');

CREATE POLICY "exhibition_authenticated_select" ON public.exhibition_achievements
  FOR SELECT TO authenticated
  USING (status = 'published' OR private.is_admin());

CREATE POLICY "exhibition_insert_pending" ON public.exhibition_achievements
  FOR INSERT TO authenticated
  WITH CHECK (
    (lead_student_id = auth.uid() AND status = 'pending')
    OR private.is_admin()
  );

CREATE POLICY "exhibition_admin_manage" ON public.exhibition_achievements
  FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

-- 18. Table: public.in_app_notifications
ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Notifications user self read" ON public.in_app_notifications;
DROP POLICY IF EXISTS "Notifications user mark read" ON public.in_app_notifications;
DROP POLICY IF EXISTS "Notifications admin manage" ON public.in_app_notifications;
DROP POLICY IF EXISTS "Notifications user self read and update" ON public.in_app_notifications;
DROP POLICY IF EXISTS "notifications_select" ON public.in_app_notifications;
DROP POLICY IF EXISTS "notifications_update_read" ON public.in_app_notifications;

CREATE POLICY "notifications_select" ON public.in_app_notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.is_admin());

CREATE POLICY "notifications_update_read" ON public.in_app_notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR private.is_admin())
  WITH CHECK (user_id = auth.uid() OR private.is_admin());

CREATE POLICY "notifications_admin_manage" ON public.in_app_notifications
  FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

-- ==============================================================================
-- PART 8: SECURE CERTIFICATE VERIFICATION RPC
-- (Strict regex validation, abuse rate throttling, minimal public disclosure)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.verify_certificate_code(p_code TEXT)
RETURNS TABLE (
  verification_code TEXT,
  recipient_name TEXT,
  event_or_activity_title TEXT,
  issue_date DATE,
  organizer TEXT,
  is_verified BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_clean_code TEXT;
  v_failed_attempts INT;
BEGIN
  -- 1. Input sanitization: reject null or empty strings
  IF p_code IS NULL THEN
    RETURN;
  END IF;

  v_clean_code := UPPER(TRIM(p_code));

  -- 2. Strict format validation: alphanumeric with dashes, length 8 to 32 characters
  IF v_clean_code !~ '^[A-Z0-9\-]{8,32}$' THEN
    RETURN;
  END IF;

  -- 3. Abuse prevention & brute-force mitigation:
  -- Check failed attempts in the last 60 seconds
  SELECT COUNT(*) INTO v_failed_attempts
  FROM private.certificate_verification_attempts
  WHERE attempted_at > (NOW() - INTERVAL '1 minute')
    AND is_successful = FALSE;

  IF v_failed_attempts > 60 THEN
    -- System-wide throttling under high attack volume
    RETURN;
  END IF;

  -- 4. Query exact certificate match
  RETURN QUERY
  SELECT 
    c.verification_code,
    c.recipient_name,
    c.event_or_activity_title,
    c.issue_date,
    c.organizer,
    c.is_verified
  FROM public.participation_certificates c
  WHERE c.verification_code = v_clean_code
    AND c.is_verified = TRUE
  LIMIT 1;

  -- 5. Log attempt outcome if not found (non-blocking)
  IF NOT FOUND THEN
    INSERT INTO private.certificate_verification_attempts (attempted_at, is_successful)
    VALUES (NOW(), FALSE);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_certificate_code(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.verify_certificate_code(TEXT) TO anon, authenticated;

-- ==============================================================================
-- PART 9: PERFORMANCE & SECURITY INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role, is_active);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON public.students (user_id);
CREATE INDEX IF NOT EXISTS idx_students_matricule ON public.students (registration_number);
CREATE INDEX IF NOT EXISTS idx_students_group ON public.students (specialty_code, group_number);
CREATE INDEX IF NOT EXISTS idx_attendance_records_lookup ON public.attendance_records (session_id, student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_teacher ON public.attendance_sessions (teacher_id, session_date);
CREATE INDEX IF NOT EXISTS idx_admin_requests_student ON public.administrative_requests (student_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_user ON public.administrative_appointments (user_id, status);
CREATE INDEX IF NOT EXISTS idx_cert_code ON public.participation_certificates (verification_code);
CREATE INDEX IF NOT EXISTS idx_event_reg_unique ON public.event_registrations (event_id, student_id);

-- ==============================================================================
-- PART 10: COMPLETE LEAST-PRIVILEGE POSTGRESQL GRANTS
-- ==============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Explicit Table Grants for Authenticated Users (strictly governed by RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.administrative_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.administrative_appointments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academic_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.digital_student_cards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_registration_applications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_clubs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_applications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_registrations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.participation_certificates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exhibition_achievements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.in_app_notifications TO authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Minimal Grants for Anonymous Visitors (Public read-only content + pre-registration insert)
GRANT SELECT ON public.announcements TO anon;
GRANT SELECT ON public.resources TO anon;
GRANT SELECT ON public.academic_events TO anon;
GRANT SELECT ON public.student_clubs TO anon;
GRANT SELECT ON public.student_events TO anon;
GRANT SELECT ON public.exhibition_achievements TO anon;
GRANT INSERT ON public.student_registration_applications TO anon;

-- Explicitly revoke anonymous access to private tables & direct certificate dumps
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.students FROM anon;
REVOKE ALL ON public.attendance_sessions FROM anon;
REVOKE ALL ON public.attendance_records FROM anon;
REVOKE ALL ON public.administrative_requests FROM anon;
REVOKE ALL ON public.administrative_appointments FROM anon;
REVOKE ALL ON public.digital_student_cards FROM anon;
REVOKE ALL ON public.club_applications FROM anon;
REVOKE ALL ON public.event_registrations FROM anon;
REVOKE ALL ON public.participation_certificates FROM anon;
REVOKE ALL ON public.in_app_notifications FROM anon;

-- Signal PostgREST to reload its schema cache immediately
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ==============================================================================
-- PART 11: TRUSTED-OWNER INITIAL ADMIN INITIALIZATION (DOCUMENTATION ONLY)
-- ==============================================================================
-- The migration above contains ZERO privilege escalation paths for anonymous or
-- self-registering users. To initialize the very first administrator account:
--
-- 1. Create the user in Supabase Auth (e.g., via signup or Supabase Auth dashboard).
-- 2. Open the Supabase Dashboard -> SQL Editor (which executes as 'postgres').
-- 3. Execute this single promotion statement:
--
--    UPDATE public.profiles
--    SET role = 'admin', is_active = TRUE, updated_at = NOW()
--    WHERE email = 'OFFICIAL_ADMIN_EMAIL@ens-djelfa.dz';
--
-- Because session_user is 'postgres', the trigger public.prevent_role_escalation()
-- authorizes the update. Any ordinary user attempting this via the API will be blocked.
-- ==============================================================================
