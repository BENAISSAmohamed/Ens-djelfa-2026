// Student Life Portal Store & Data Repository
// ملحقة المدرسة العليا للأساتذة - الجلفة — بوابة الحياة الطلابية

import {
  StudentClub,
  ClubMembershipApplication,
  StudentEvent,
  EventRegistration,
  StudentCompetition,
  CompetitionSubmission,
  ParticipationCertificate,
  ExhibitionAchievement,
  MembershipStatus,
} from './types';
import { supabase } from '../supabase';

const STORAGE_KEYS = {
  CLUBS: 'ens_sl_clubs',
  APPLICATIONS: 'ens_sl_club_applications',
  EVENTS: 'ens_sl_events',
  REGISTRATIONS: 'ens_sl_event_registrations',
  COMPETITIONS: 'ens_sl_competitions',
  SUBMISSIONS: 'ens_sl_comp_submissions',
  CERTIFICATES: 'ens_sl_certificates',
  EXHIBITION: 'ens_sl_exhibitions',
};

// 1. OFFICIAL CLUBS SEED
const SEED_CLUBS: StudentClub[] = [
  {
    id: 'club-khwarizmi',
    name_ar: 'نادي الخوارزمي للإعلام الآلي والذكاء الاصطناعي',
    name_fr: 'Club Al-Khwarizmi d’Informatique & IA',
    category: 'scientific',
    logo_emoji: '💻',
    description: 'نادي علمي متخصص في البرمجة، هندسة الويب، الذكاء الاصطناعي في التعليم، وتطوير الوسائط والبرمجيات البيداغوجية لمتربصي المدارس العليا.',
    objectives: [
      'تنظيم ورشات البرمجة بلغة بايثون والذكاء الاصطناعي التوليدي',
      'تطوير منصات وتطبيقات بيداغوجية موجهة للطورين المتوسط والثانوي',
      'المشاركة في الهاكاثونات الجامعية الوطنية والدولية'
    ],
    supervisor_name: 'د. يوسف شارف (أستاذ الإعلام الآلي)',
    student_coordinator: 'أيمن بلخيري (سنة 2 إعلام آلي)',
    contact_email: 'khwarizmi@ens-djelfa.dz',
    meeting_location: 'مخبر الإعلام الآلي 02 (الجناح العلمي)',
    founded_year: 2024,
    max_capacity: 50,
    current_members_count: 38,
    status: 'active',
    achievements: [
      'المرتبة الأولى في مسابقة المشاريع البرمجية لجامعات الوسط 2025',
      'تنظيم ورشة البرمجة للأطفال خلال العطلة المدرسية'
    ]
  },
  {
    id: 'club-haytham',
    name_ar: 'نادي ابن الهيثم للعلوم الطبيعية والبيئة',
    name_fr: 'Club Ibn Al-Haytham des Sciences & Environnement',
    category: 'scientific',
    logo_emoji: '🔬',
    description: 'فضاء علمي مخبري يهتم بالتجارب البيولوجية، علوم الأرض، الحفاظ على التنوع البيولوجي لمنطقة الجلفة والسهوب، والتوعية الإيكولوجية.',
    objectives: [
      'تنظيم الخرجات الاستكشافية الجيولوجية والبيئية بولاية الجلفة',
      'إعداد حقائب التجارب البيداغوجية لأساتذة العلوم الطبيعية',
      'معرض النباتات الطبية والغطاء النباتي السهبي'
    ],
    supervisor_name: 'أ.د. حنان بن سالم (أستاذة علوم الطبيعة والحياة)',
    student_coordinator: 'مريم عثماني (سنة 2 علوم طبيعية)',
    contact_email: 'haytham@ens-djelfa.dz',
    meeting_location: 'المخبر البيداغوجي 01',
    founded_year: 2024,
    max_capacity: 45,
    current_members_count: 41,
    status: 'active',
    achievements: [
      'إصدار دليل نباتات ولاية الجلفة المصور',
      'حملة تشجير محيط الملحقة وغرس 300 شجرة'
    ]
  },
  {
    id: 'club-fusha',
    name_ar: 'نادي الفصحى للأدب العربي والمناظرات الفكرية',
    name_fr: 'Club Al-Fusha de Littérature et Débats',
    category: 'cultural',
    logo_emoji: '📜',
    description: 'يهتم النادي بفنون البلاغة والشعر، فن الخطابة والمناظرات الجامعية، الإملاء والتحرير المتقدم، والمجلات الثقافية لأساتذة المستقبل.',
    objectives: [
      'تدريب الطلبة على فنون الإلقاء والخطابة والمناظرة التنافسية',
      'إقامة أمسيات شعرية ومسابقات كتابة القصة القصيرة والمقال التربوي',
      'ورشات تعليم الخط العربي الأصيل'
    ],
    supervisor_name: 'د. لخضر بوعبد الله (أستاذ الأدب العربي)',
    student_coordinator: 'عبد الرؤوف سويسي (سنة 2 لغة عربية)',
    contact_email: 'fusha@ens-djelfa.dz',
    meeting_location: 'قاعة المحاضرات (ب)',
    founded_year: 2024,
    max_capacity: 60,
    current_members_count: 52,
    status: 'active',
    achievements: [
      'تنظيم البطولة السنوية الأولى للمناظرات الجامعية بالملحقة 2025',
      'إصدار مجلة "مداد الأساتذة" الدورية'
    ]
  },
  {
    id: 'club-sport',
    name_ar: 'النادي الرياضي الجامعي — ملحقة الجلفة',
    name_fr: 'Club Sportif Universitaire ENS Djelfa',
    category: 'sports',
    logo_emoji: '⚽',
    description: 'تنشيط الحياة الرياضية الطلابية من خلال تنظيم دوريات كرة القدم، كرة السلة، كرة اليد، ألعاب القوى، والشطرنج للطلبة والأساتذة.',
    objectives: [
      'تنظيم دوري الاستقلال الجامعي السنوي لكرة القدم',
      'إعداد فرق الملحقة للمشاركة في البطولات الجامعية الجهوية والوطنية',
      'نشر ثقافة اللياقة البدنية والنشاط الرياضي الوقائي'
    ],
    supervisor_name: 'أ. كمال رحماني (أستاذ التربية البدنية والرياضية)',
    student_coordinator: 'عمر فاروق حاشي (سنة 2 تربية بدنية)',
    contact_email: 'sports@ens-djelfa.dz',
    meeting_location: 'القاعة الرياضية المتعددة الرياضات',
    founded_year: 2024,
    max_capacity: 80,
    current_members_count: 67,
    status: 'active',
    achievements: [
      'الميدالية الفضية في دوري الجامعات الجهوي لكرة اليد 2025',
      'تنظيم دوري الشطرنج التكتيكي لأساتذة وطلبة الملحقة'
    ]
  },
  {
    id: 'club-media',
    name_ar: 'نادي النبراس للإعلام والإنتاج البيداغوجي الرقمي',
    name_fr: 'Club An-Nibras Média & Création',
    category: 'media',
    logo_emoji: '🎙️',
    description: 'تغطية الفعاليات والملتقيات العلمية، تصوير وإنتاج الدروس المرئية، وإدارة المحتوى الإعلامي والرقمي الهادف للملحقة.',
    objectives: [
      'توثيق التظاهرات العلمية والتربوية المقامة بالملحقة',
      'تدريب الطلبة على المونتاج والتصوير والبودكاست التعليمي',
      'تصميم الكبسولات التعليمية الرقمية المساعدة'
    ],
    supervisor_name: 'د. فاطمة الزهراء بن عيسى',
    student_coordinator: 'سارة مرابط (سنة 1 لغة إنجليزية)',
    contact_email: 'media@ens-djelfa.dz',
    meeting_location: 'أستوديو الإنتاج السمعي البصري',
    founded_year: 2025,
    max_capacity: 40,
    current_members_count: 29,
    status: 'active',
    achievements: [
      'إنتاج السلسلة الوثائقية التعريفية بتخصصات المدرسة',
      'إطلاق بودكاست "أستاذ الغد"'
    ]
  }
];

// 2. SEED EVENTS
const SEED_EVENTS: StudentEvent[] = [
  {
    id: 'evt-2026-01',
    title: 'الملتقى الطلابي السنوي للابتكار البيداغوجي والذكاء الاصطناعي',
    description: 'محاضرات تطبيقية وورشات عمل حول إدماج أدوات الذكاء الاصطناعي في التدريس وتصميم الدروس التفاعلية للطورين المتوسط والثانوي.',
    category: 'conference',
    club_id: 'club-khwarizmi',
    club_name: 'نادي الخوارزمي للإعلام الآلي',
    organizer: 'نادي الخوارزمي بالتعاون مع مصلحة الأنشطة البيداغوجية',
    location: 'قاعة المحاضرات الكبرى (أ)',
    start_date: '2026-11-25 09:00',
    end_date: '2026-11-25 16:30',
    registration_deadline: '2026-11-23',
    max_capacity: 120,
    registered_count: 88,
    status: 'upcoming',
    eligibility: 'مفتوح لجميع طلبة وأساتذة الملحقة',
    gives_certificate: true,
    banner_color: 'from-[#5a0f1c] to-[#7f1d2d]'
  },
  {
    id: 'evt-2026-02',
    title: 'البطولة الطلابية الأولى للمناظرات وفنون الخطابة',
    description: 'مناظرات فكرية وتربوية تنافسية بين فرق التخصصات حول قضايا التعليم المعاصر والمنظومة التربوية.',
    category: 'tournament',
    club_id: 'club-fusha',
    club_name: 'نادي الفصحى للأدب العربي',
    organizer: 'نادي الفصحى للأدب العربي والمناظرات',
    location: 'قاعة المحاضرات (ب)',
    start_date: '2026-12-05 13:30',
    end_date: '2026-12-06 17:00',
    registration_deadline: '2026-11-30',
    max_capacity: 60,
    registered_count: 42,
    status: 'upcoming',
    eligibility: 'فرق طلابية من 3 أفراد مسجلين بالملحقة',
    gives_certificate: true,
    banner_color: 'from-[#854d0e] to-[#a16207]'
  },
  {
    id: 'evt-2026-03',
    title: 'دوري كرة القدم المصغرة داخل الصالات (طبعة الخريف)',
    description: 'دوري رياضي تنافسي يجمع فرق السنوات والأطوار التعليمية لترسيخ الروح الرياضية والترابط الأخوي.',
    category: 'tournament',
    club_id: 'club-sport',
    club_name: 'النادي الرياضي الجامعي',
    organizer: 'النادي الرياضي الجامعي',
    location: 'القاعة المتعددة الرياضات',
    start_date: '2026-12-10 14:00',
    end_date: '2026-12-15 18:00',
    registration_deadline: '2026-12-03',
    max_capacity: 80,
    registered_count: 64,
    status: 'upcoming',
    eligibility: 'فرق ممثلة للأفواج البيداغوجية',
    gives_certificate: false,
    banner_color: 'from-[#14532d] to-[#166534]'
  }
];

// 3. SEED COMPETITIONS
const SEED_COMPETITIONS: StudentCompetition[] = [
  {
    id: 'comp-01',
    title: 'جائزة المدرسة العليا لأفضل وسيلة تعليمية بيداغوجية مبتكرة',
    description: 'مسابقة لأفضل مجسم، تطبيق تفاعلي، أو تجربة تعليمية مبتكرة تُبسط مفهوماً علمياً معقداً للمتعلمين.',
    category: 'scientific_innovation',
    deadline: '2026-12-20',
    organizer: 'إدارة الملحقة بالتنسيق مع النوادي العلمية',
    prizes: [
      'المرتبة الأولى: درع التميز البيداغوجي + حاسوب محمول',
      'المرتبة الثانية: لوحة إلكترونية + حقيبة مراجع بيداغوجية',
      'المرتبة الثالثة: شهادة تميز + اشتراك سنوي في مكتبة علمية'
    ],
    rules: [
      'أن يكون المشروع من إنجاز فردي أو فريق لا يتجاوز 3 طلبة مسجلين بالملحقة',
      'تقديم تقرير بيداغوجي يشرح طريقة توظيف الوسيلة في القسم',
      'إرفاق نموذج عملي أو رابط المعاينة التفاعلية'
    ],
    status: 'open',
    submissions_count: 14
  },
  {
    id: 'comp-02',
    title: 'المسابقة الأدبية في كتابة القصة القصيرة والقصيدة التعليمية',
    description: 'مسابقة أدبية تركز على إبراز جماليات اللغة العربية وتعزيز القيم التربوية السامية لدى الجيل الناشئ.',
    category: 'literature',
    deadline: '2026-12-28',
    organizer: 'نادي الفصحى للأدب العربي',
    prizes: [
      'طبع ونشر الأعمال الفائزة في مجلة الملحقة الرسمية',
      'مكافآت وجوائز قيمة للمراتب الثلاث الأولى'
    ],
    rules: [
      'أن تكون المشاركة باللغة العربية الفصحى السليمة',
      'أن تعالج موضوعاً تربوياً أو رسالة المعلم في المجتمع'
    ],
    status: 'open',
    submissions_count: 19
  }
];

// 4. SEED CERTIFICATES
const SEED_CERTIFICATES: ParticipationCertificate[] = [
  {
    id: 'cert-101',
    verification_code: 'ENSD-2026-08492',
    recipient_name: 'أحمد بن يحيى قاسمي',
    registration_number: '2439014285',
    event_or_activity_title: 'دورة إعداد الوسائط التعليمية التفاعلية الرقمية',
    category: 'workshop',
    issue_date: '2026-10-15',
    issuer_authority: 'ملحقة المدرسة العليا للأساتذة - الجلفة',
    is_valid: true
  },
  {
    id: 'cert-102',
    verification_code: 'ENSD-2026-07119',
    recipient_name: 'خديجة لمين بن عيسى',
    registration_number: '2339028114',
    event_or_activity_title: 'عضوية نشطة — نادي الخوارزمي للإعلام الآلي والذكاء الاصطناعي',
    category: 'club_membership',
    issue_date: '2026-06-30',
    issuer_authority: 'ملحقة المدرسة العليا للأساتذة - الجلفة',
    is_valid: true
  },
  {
    id: 'cert-103',
    verification_code: 'ENSD-2026-09551',
    recipient_name: 'عصام الدين تواتي',
    registration_number: '2439055819',
    event_or_activity_title: 'المشاركة المتميزة في دورة مناظرات الفصحى الجامعية',
    category: 'event_participation',
    issue_date: '2026-10-28',
    issuer_authority: 'ملحقة المدرسة العليا للأساتذة - الجلفة',
    is_valid: true
  }
];

// 5. SEED EXHIBITION ACHIEVEMENTS
const SEED_EXHIBITIONS: ExhibitionAchievement[] = [
  {
    id: 'exh-01',
    title: 'تطبيق "المعلم الرقمي": وسيلة تفاعلية لمحاكاة التجارب الكيميائية',
    author_name: 'أيمن بلخيري ومحمد طه حيدوسي',
    registration_number: '2339019284',
    specialty_name: 'إعلام آلي — أستاذ التعليم المتوسط',
    category: 'pedagogical_tool',
    summary: 'تطبيق ويب تعليمي ثلاثي الأبعاد يسمح لأساتذة الطور المتوسط بإجراء تجارب الذرة والجدول الدوري في بيئة آمنة تفاعلية.',
    date_added: '2026-10-20',
    likes_count: 48,
    status: 'featured',
    badge: 'مشروع متميز 2026'
  },
  {
    id: 'exh-02',
    title: 'ملصق علمي: دراسة الغطاء النباتي المقاوم للجفاف في هضاب الجلفة',
    author_name: 'مريم عثماني وإكرام بن زيان',
    registration_number: '2439041189',
    specialty_name: 'علوم طبيعية — أستاذ التعليم المتوسط',
    category: 'scientific_poster',
    summary: 'بحث ميداني مصور يوثق 18 صنفاً نباتياً سهبياً مع طرق إدماجها في المنهاج الدراسي للتربية العلمية.',
    date_added: '2026-10-25',
    likes_count: 36,
    status: 'approved'
  },
  {
    id: 'exh-03',
    title: 'لوحة الخط الديواني الجلي: "وقل رب زدني علما"',
    author_name: 'عبد الرحيم طيباوي',
    registration_number: '2439038221',
    specialty_name: 'لغة عربية — أستاذ التعليم الابتدائي',
    category: 'calligraphy',
    summary: 'لوحة فنية خطية حروفيّة بالحبر التقليدي والورق المقهر، فازت بالمرتبة الأولى في مسابقة الإبداع الفني بالملحقة.',
    date_added: '2026-11-02',
    likes_count: 53,
    status: 'featured',
    badge: 'المرتبة الأولى'
  }
];

// STORAGE HELPERS
const memStorage = new Map<string, string>();

function getStorageBackend() {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  if (typeof globalThis !== 'undefined' && (globalThis as unknown as { localStorage?: Storage }).localStorage) {
    return (globalThis as unknown as { localStorage: Storage }).localStorage;
  }
  return {
    getItem: (k: string) => memStorage.get(k) ?? null,
    setItem: (k: string, v: string) => { memStorage.set(k, v); },
    removeItem: (k: string) => { memStorage.delete(k); },
    clear: () => { memStorage.clear(); }
  };
}

function getList<T>(key: string, seed: T[]): T[] {
  try {
    const storage = getStorageBackend();
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : seed;
  } catch {
    return seed;
  }
}

function saveList<T>(key: string, val: T[]): void {
  try {
    const storage = getStorageBackend();
    storage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.warn(`Storage write error for ${key}:`, e);
  }
}

// -------------------------------------------------------------
// PUBLIC STORE APIS
// -------------------------------------------------------------

// --- Clubs ---
export function getAllClubs(category?: string, query?: string): StudentClub[] {
  const clubs = getList<StudentClub>(STORAGE_KEYS.CLUBS, SEED_CLUBS);
  return clubs.filter(c => {
    if (category && category !== 'all' && c.category !== category) return false;
    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      const matchName = c.name_ar.toLowerCase().includes(q) || c.name_fr.toLowerCase().includes(q);
      const matchDesc = c.description.toLowerCase().includes(q);
      const matchCoord = c.supervisor_name.toLowerCase().includes(q) || c.student_coordinator.toLowerCase().includes(q);
      return matchName || matchDesc || matchCoord;
    }
    return true;
  });
}

export function getClubById(id: string): StudentClub | null {
  const clubs = getList<StudentClub>(STORAGE_KEYS.CLUBS, SEED_CLUBS);
  return clubs.find(c => c.id === id) || null;
}

export function saveClub(club: StudentClub): boolean {
  const clubs = getList<StudentClub>(STORAGE_KEYS.CLUBS, SEED_CLUBS);
  const idx = clubs.findIndex(c => c.id === club.id);
  if (idx >= 0) {
    clubs[idx] = club;
  } else {
    clubs.unshift(club);
  }
  saveList(STORAGE_KEYS.CLUBS, clubs);
  return true;
}

// --- Club Applications ---
export function applyForClubMembership(app: Omit<ClubMembershipApplication, 'id' | 'submitted_at' | 'status'>): { success: boolean; error?: string; application?: ClubMembershipApplication } {
  const club = getClubById(app.club_id);
  if (!club) return { success: false, error: 'النادي المحدد غير موجود.' };
  if (club.status !== 'active') return { success: false, error: 'هذا النادي غير نشط حالياً لاستقبال الطلبات.' };

  const apps = getList<ClubMembershipApplication>(STORAGE_KEYS.APPLICATIONS, []);
  
  // Check if student already applied and pending or approved
  const existing = apps.find(a => a.club_id === app.club_id && a.student_id === app.student_id && a.status !== 'rejected');
  if (existing) {
    return {
      success: false,
      error: existing.status === 'approved' ? 'أنت عضو مسجل بالفعل في هذا النادي.' : 'طلبك السابق لهذا النادي قيد الدراسة حالياً.'
    };
  }

  const newApp: ClubMembershipApplication = {
    id: 'app-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
    submitted_at: new Date().toISOString(),
    status: club.current_members_count >= club.max_capacity ? 'waitlist' : 'pending',
    ...app,
  };

  apps.unshift(newApp);
  saveList(STORAGE_KEYS.APPLICATIONS, apps);
  return { success: true, application: newApp };
}

export function getApplicationsForStudent(studentId: string): ClubMembershipApplication[] {
  const apps = getList<ClubMembershipApplication>(STORAGE_KEYS.APPLICATIONS, []);
  return apps.filter(a => a.student_id === studentId);
}

export function getAllApplications(): ClubMembershipApplication[] {
  return getList<ClubMembershipApplication>(STORAGE_KEYS.APPLICATIONS, []);
}

export function updateApplicationStatus(
  appId: string,
  newStatus: MembershipStatus,
  reviewerName: string,
  adminNotes?: string
): boolean {
  const apps = getList<ClubMembershipApplication>(STORAGE_KEYS.APPLICATIONS, []);
  const idx = apps.findIndex(a => a.id === appId);
  if (idx === -1) return false;

  const app = apps[idx];
  app.status = newStatus;
  app.reviewed_by = reviewerName;
  app.reviewed_at = new Date().toISOString();
  if (adminNotes) app.admin_notes = adminNotes;

  // If approved, increment club member count
  if (newStatus === 'approved') {
    const clubs = getList<StudentClub>(STORAGE_KEYS.CLUBS, SEED_CLUBS);
    const cIdx = clubs.findIndex(c => c.id === app.club_id);
    if (cIdx >= 0) {
      clubs[cIdx].current_members_count = Math.min(clubs[cIdx].max_capacity, clubs[cIdx].current_members_count + 1);
      saveList(STORAGE_KEYS.CLUBS, clubs);
    }
  }

  saveList(STORAGE_KEYS.APPLICATIONS, apps);
  return true;
}

// --- Events & Registrations ---
export function getAllEvents(): StudentEvent[] {
  return getList<StudentEvent>(STORAGE_KEYS.EVENTS, SEED_EVENTS);
}

export function getEventById(id: string): StudentEvent | null {
  const events = getList<StudentEvent>(STORAGE_KEYS.EVENTS, SEED_EVENTS);
  return events.find(e => e.id === id) || null;
}

export function registerForEvent(
  eventId: string,
  studentId: string,
  studentName: string,
  registrationNumber: string
): { success: boolean; error?: string; ticketCode?: string } {
  const events = getList<StudentEvent>(STORAGE_KEYS.EVENTS, SEED_EVENTS);
  const evIdx = events.findIndex(e => e.id === eventId);
  if (evIdx === -1) return { success: false, error: 'الفعالية المحددة غير موجودة.' };

  const event = events[evIdx];
  if (event.status !== 'upcoming') {
    return { success: false, error: 'التسجيل في هذه الفعالية مغلق.' };
  }

  if (event.registered_count >= event.max_capacity) {
    return { success: false, error: 'اكتملت الطاقة الاستيعابية للفعالية.' };
  }

  const regs = getList<EventRegistration>(STORAGE_KEYS.REGISTRATIONS, []);
  const duplicate = regs.find(r => r.event_id === eventId && r.student_id === studentId && r.status === 'confirmed');
  if (duplicate) {
    return { success: false, error: `أنت مسجل بالفعل في هذه الفعالية (رمز التذكرة: ${duplicate.ticket_code}).` };
  }

  const ticketCode = 'TKT-' + Math.random().toString(36).substr(2, 7).toUpperCase();
  const newReg: EventRegistration = {
    id: 'reg-' + Date.now(),
    event_id: eventId,
    event_title: event.title,
    student_id: studentId,
    student_name: studentName,
    registration_number: registrationNumber,
    registered_at: new Date().toISOString(),
    status: 'confirmed',
    ticket_code: ticketCode,
  };

  regs.unshift(newReg);
  event.registered_count += 1;
  events[evIdx] = event;

  saveList(STORAGE_KEYS.REGISTRATIONS, regs);
  saveList(STORAGE_KEYS.EVENTS, events);

  return { success: true, ticketCode };
}

export function getStudentRegistrations(studentId: string): EventRegistration[] {
  const regs = getList<EventRegistration>(STORAGE_KEYS.REGISTRATIONS, []);
  return regs.filter(r => r.student_id === studentId);
}

// --- Competitions ---
export function getAllCompetitions(): StudentCompetition[] {
  return getList<StudentCompetition>(STORAGE_KEYS.COMPETITIONS, SEED_COMPETITIONS);
}

export function submitToCompetition(
  sub: Omit<CompetitionSubmission, 'id' | 'submitted_at'>
): { success: boolean; error?: string } {
  const comps = getList<StudentCompetition>(STORAGE_KEYS.COMPETITIONS, SEED_COMPETITIONS);
  const comp = comps.find(c => c.id === sub.competition_id);
  if (!comp || comp.status !== 'open') {
    return { success: false, error: 'هذه المسابقة غير مفتوحة لاستقبال المشاركات حالياً.' };
  }

  const subs = getList<CompetitionSubmission>(STORAGE_KEYS.SUBMISSIONS, []);
  const newSub: CompetitionSubmission = {
    id: 'sub-' + Date.now(),
    submitted_at: new Date().toISOString(),
    ...sub,
  };

  subs.unshift(newSub);
  comp.submissions_count += 1;

  saveList(STORAGE_KEYS.SUBMISSIONS, subs);
  saveList(STORAGE_KEYS.COMPETITIONS, comps);
  return { success: true };
}

// --- Certificates Verification ---
export function verifyCertificateCode(code: string): ParticipationCertificate | null {
  const clean = code.trim().toUpperCase();
  const certs = getList<ParticipationCertificate>(STORAGE_KEYS.CERTIFICATES, SEED_CERTIFICATES);
  return certs.find(c => c.verification_code.toUpperCase() === clean && c.is_valid) || null;
}

export async function verifyCertificateCodeAsync(code: string): Promise<ParticipationCertificate | null> {
  const clean = code.trim().toUpperCase();
  try {
    // 1. Try secure RPC function (privacy-preserving)
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('verify_certificate_code', { p_code: clean });

    const certItem = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    if (!rpcError && certItem && certItem.verification_code) {
      return {
        id: 'cert-' + certItem.verification_code,
        verification_code: certItem.verification_code,
        recipient_name: certItem.recipient_name,
        registration_number: 'ENSD-VERIFIED',
        event_or_activity_title: certItem.event_or_activity_title,
        category: 'event_participation',
        issue_date: certItem.issue_date,
        issuer_authority: certItem.organizer || 'ملحقة المدرسة العليا للأساتذة - الجلفة',
        is_valid: certItem.is_verified,
      };
    }

    // 2. Fallback to direct query if RPC is not yet created
    const { data, error } = await supabase
      .from('participation_certificates')
      .select('*')
      .eq('verification_code', clean)
      .eq('is_verified', true)
      .maybeSingle();

    if (!error && data) {
      return {
        id: data.id,
        verification_code: data.verification_code,
        recipient_name: data.recipient_name,
        registration_number: data.student_id ? 'ENSD-AUTH' : 'ENSD-OFFICIAL',
        event_or_activity_title: data.event_or_activity_title,
        category: 'event_participation',
        issue_date: data.issue_date,
        issuer_authority: data.organizer || 'ملحقة المدرسة العليا للأساتذة - الجلفة',
        is_valid: data.is_verified,
      };
    }
  } catch {}

  return verifyCertificateCode(clean);
}

export function getCertificatesForStudent(matricule: string): ParticipationCertificate[] {
  const clean = matricule.trim().toUpperCase();
  const certs = getList<ParticipationCertificate>(STORAGE_KEYS.CERTIFICATES, SEED_CERTIFICATES);
  return certs.filter(c => c.registration_number.toUpperCase() === clean);
}

// --- Digital Exhibition ---
export function getExhibitionItems(category?: string, query?: string): ExhibitionAchievement[] {
  const items = getList<ExhibitionAchievement>(STORAGE_KEYS.EXHIBITION, SEED_EXHIBITIONS);
  return items.filter(item => {
    // Only approved and featured items visible to general students
    if (item.status === 'rejected' || item.status === 'pending_review') return false;
    if (category && category !== 'all' && item.category !== category) return false;
    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      return item.title.toLowerCase().includes(q) || item.author_name.toLowerCase().includes(q) || item.summary.toLowerCase().includes(q);
    }
    return true;
  });
}

export function submitExhibitionItem(
  item: Omit<ExhibitionAchievement, 'id' | 'date_added' | 'likes_count' | 'status'>
): { success: boolean } {
  const items = getList<ExhibitionAchievement>(STORAGE_KEYS.EXHIBITION, SEED_EXHIBITIONS);
  const newItem: ExhibitionAchievement = {
    id: 'exh-' + Date.now(),
    date_added: new Date().toISOString().split('T')[0],
    likes_count: 0,
    status: 'pending_review',
    ...item,
  };
  items.unshift(newItem);
  saveList(STORAGE_KEYS.EXHIBITION, items);
  return { success: true };
}

export function likeExhibitionItem(id: string): number {
  const items = getList<ExhibitionAchievement>(STORAGE_KEYS.EXHIBITION, SEED_EXHIBITIONS);
  const idx = items.findIndex(i => i.id === id);
  if (idx >= 0) {
    items[idx].likes_count += 1;
    saveList(STORAGE_KEYS.EXHIBITION, items);
    return items[idx].likes_count;
  }
  return 0;
}
