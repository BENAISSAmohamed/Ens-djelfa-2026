// Types for Student Life Portal — ملحقة المدرسة العليا للأساتذة - الجلفة
// بوابة الحياة الطلابية والنوادي

export type ClubCategory = 'scientific' | 'cultural' | 'sports' | 'media';
export type ClubStatus = 'active' | 'pending' | 'suspended' | 'archived';

export interface StudentClub {
  id: string;
  name_ar: string;
  name_fr: string;
  category: ClubCategory;
  logo_emoji: string;
  description: string;
  objectives: string[];
  supervisor_name: string; // الأستاذ المشرف
  student_coordinator: string; // الطالب المنسق
  contact_email: string;
  meeting_location: string;
  founded_year: number;
  max_capacity: number;
  current_members_count: number;
  status: ClubStatus;
  achievements: string[];
}

export type MembershipStatus = 'pending' | 'approved' | 'rejected' | 'waitlist';

export interface ClubMembershipApplication {
  id: string;
  club_id: string;
  club_name: string;
  student_id: string;
  student_name: string;
  registration_number: string;
  specialty_code: string;
  academic_year: number;
  motivation: string;
  submitted_at: string;
  status: MembershipStatus;
  admin_notes?: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

export type EventCategory = 'workshop' | 'conference' | 'tournament' | 'exhibition' | 'cultural_evening';
export type EventStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

export interface StudentEvent {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  club_id?: string;
  club_name?: string;
  organizer: string;
  location: string;
  start_date: string;
  end_date: string;
  registration_deadline: string;
  max_capacity: number;
  registered_count: number;
  status: EventStatus;
  eligibility: string;
  gives_certificate: boolean;
  banner_color?: string;
}

export interface EventRegistration {
  id: string;
  event_id: string;
  event_title: string;
  student_id: string;
  student_name: string;
  registration_number: string;
  registered_at: string;
  status: 'confirmed' | 'cancelled' | 'attended';
  ticket_code: string;
}

export type CompetitionStatus = 'open' | 'evaluating' | 'completed';

export interface StudentCompetition {
  id: string;
  title: string;
  description: string;
  category: 'scientific_innovation' | 'literature' | 'sports' | 'coding';
  deadline: string;
  organizer: string;
  prizes: string[];
  rules: string[];
  status: CompetitionStatus;
  submissions_count: number;
}

export interface CompetitionSubmission {
  id: string;
  competition_id: string;
  competition_title: string;
  student_id: string;
  student_name: string;
  project_title: string;
  summary: string;
  submitted_at: string;
  evaluation_score?: number;
  jury_feedback?: string;
  award?: string;
}

export interface ParticipationCertificate {
  id: string;
  verification_code: string; // Unique public code e.g. ENSD-CERT-2026-XXXX
  recipient_name: string;
  registration_number: string;
  event_or_activity_title: string;
  category: 'club_membership' | 'event_participation' | 'competition_winner' | 'workshop';
  issue_date: string;
  issuer_authority: string; // e.g. إدارة ملحقة المدرسة العليا للأساتذة - الجلفة
  is_valid: boolean;
}

export type ExhibitionStatus = 'pending_review' | 'approved' | 'featured' | 'rejected';

export interface ExhibitionAchievement {
  id: string;
  title: string;
  author_name: string;
  registration_number: string;
  specialty_name: string;
  category: 'scientific_poster' | 'digital_project' | 'calligraphy' | 'pedagogical_tool';
  summary: string;
  date_added: string;
  likes_count: number;
  status: ExhibitionStatus;
  badge?: string;
}
