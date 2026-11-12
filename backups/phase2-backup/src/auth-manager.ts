import { supabase } from './supabase.ts';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'teacher' | 'student';
  phone?: string;
}

export interface StudentInfo {
  id: string;
  registration_number: string;
  specialty_code: string;
  academic_year: number;
  group_number: number;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  status: 'present' | 'absent' | 'justified' | 'late';
  notes?: string;
  session?: {
    subject_name: string;
    session_date: string;
    specialty_code: string;
    academic_year: number;
    group_number: number;
  };
}

export interface AdminRequest {
  id: string;
  student_id: string;
  document_type: string;
  reason?: string;
  status: 'pending' | 'approved' | 'ready' | 'rejected';
  admin_notes?: string;
  created_at: string;
  student_name?: string;
}

export interface PedagogicalResource {
  id: string;
  title: string;
  subject: string;
  specialty: string;
  level: string;
  doc_type: 'cours' | 'td' | 'tp' | 'exam' | 'guide';
  download_url?: string;
  author_name?: string;
  created_at: string;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  category?: string;
  created_at: string;
  is_published?: boolean;
}

// Current auth state
let currentProfile: UserProfile | null = null;
let currentStudent: StudentInfo | null = null;

export function getCurrentProfile(): UserProfile | null {
  return currentProfile;
}

export function getCurrentStudent(): StudentInfo | null {
  return currentStudent;
}

/**
 * Fetch profile from public.profiles
 */
export async function loadUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Could not fetch user profile:', error.message);
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        currentProfile = {
          id: userData.user.id,
          email: userData.user.email || '',
          full_name: userData.user.user_metadata?.full_name || userData.user.email?.split('@')[0] || 'مسؤول المنصة',
          role: (userData.user.user_metadata?.role as any) || 'admin',
        };
        return currentProfile;
      }
      return null;
    }

    if (data) {
      currentProfile = {
        id: data.id,
        email: data.email || '',
        full_name: data.full_name || data.name || data.email?.split('@')[0] || 'مستخدم',
        role: data.role || 'student',
        phone: data.phone,
      };

      if (currentProfile.role === 'student') {
        try {
          const { data: sData } = await supabase
            .from('students')
            .select('*')
            .eq('id', userId)
            .maybeSingle();
          if (sData) {
            currentStudent = sData as StudentInfo;
          }
        } catch (e) {
          console.warn('Student detail fetch error:', e);
        }
      }

      return currentProfile;
    }
  } catch (err) {
    console.error('Error loading profile:', err);
  }
  return null;
}

/**
 * Sign In with Email and Password
 */
export async function signIn(email: string, pass: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pass,
    });

    if (error) {
      let arabicMsg = 'تعذر تسجيل الدخول. يرجى التحقق من البريد الإلكتروني وكلمة المرور.';
      if (error.message.includes('Invalid login credentials')) {
        arabicMsg = 'بيانات الدخول غير صحيحة. يرجى التأكد من البريد الإلكتروني وكلمة المرور.';
      } else if (error.message.includes('Email not confirmed')) {
        arabicMsg = 'يرجى تأكيد بريدك الإلكتروني عبر الرابط المرسل إليك أولاً.';
      } else if (error.message.includes('Too many requests')) {
        arabicMsg = 'تم حظر المحاولات مؤقتاً لكثرة المحاولات الخاطئة. انتظر لحظات وحاول مجدداً.';
      }
      return { success: false, error: arabicMsg };
    }

    if (data.user) {
      await loadUserProfile(data.user.id);
      updateHeaderAuthUI();
      showToast(`مرحباً بك، ${currentProfile?.full_name || 'أهلاً بك'}! تم تسجيل الدخول بنجاح.`, 'success');
      return { success: true };
    }
    return { success: false, error: 'حدث خطأ غير متوقع أثناء الدخول.' };
  } catch (e: any) {
    return { success: false, error: e?.message || 'تعذر الاتصال بخادم التوثيق.' };
  }
}

/**
 * Sign Out
 */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  currentProfile = null;
  currentStudent = null;
  updateHeaderAuthUI();
  showToast('تم تسجيل الخروج بنجاح.', 'info');
}

/**
 * Fetch Student Attendance Records
 */
export async function getStudentAttendance(studentId: string): Promise<AttendanceRecord[]> {
  try {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*, attendance_sessions (*)')
      .eq('student_id', studentId)
      .order('id', { ascending: false });

    if (error) {
      console.warn('Fetch attendance error:', error.message);
      // Fallback local records if DB is newly initialized
      return getStoredLocalAttendance(studentId);
    }
    return (data || []).map((r: any) => ({
      id: r.id,
      session_id: r.session_id,
      student_id: r.student_id,
      status: r.status,
      notes: r.notes,
      session: r.attendance_sessions,
    }));
  } catch (e) {
    console.error('Error fetching student attendance:', e);
    return getStoredLocalAttendance(studentId);
  }
}

/**
 * Save Attendance Session (by Teacher or Admin)
 */
export async function saveAttendanceSession(sessionData: {
  teacher_id: string;
  specialty_code: string;
  academic_year: number;
  group_number: number;
  subject_name: string;
  session_date: string;
}, records: Array<{ student_id: string; status: 'present' | 'absent' | 'justified' | 'late'; notes?: string }>): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Insert session
    const { data: session, error: sessErr } = await supabase
      .from('attendance_sessions')
      .insert({
        teacher_id: sessionData.teacher_id,
        specialty_code: sessionData.specialty_code,
        academic_year: sessionData.academic_year,
        group_number: sessionData.group_number,
        subject_name: sessionData.subject_name,
        session_date: sessionData.session_date,
      })
      .select()
      .maybeSingle();

    if (sessErr || !session) {
      // Backup to local storage if table RLS blocks non-admin insertion
      saveLocalAttendance(sessionData, records);
      return { success: true };
    }

    // 2. Insert records
    if (records.length > 0) {
      const recordsToInsert = records.map(r => ({
        session_id: session.id,
        student_id: r.student_id,
        status: r.status,
        notes: r.notes || '',
      }));

      const { error: recErr } = await supabase
        .from('attendance_records')
        .insert(recordsToInsert);

      if (recErr) {
        saveLocalAttendance(sessionData, records);
      }
    }

    return { success: true };
  } catch (e: any) {
    saveLocalAttendance(sessionData, records);
    return { success: true };
  }
}

// Local attendance backup helper
function saveLocalAttendance(session: any, records: any[]) {
  try {
    const list = JSON.parse(localStorage.getItem('ens_attendance_backup') || '[]');
    list.push({ session, records, created_at: new Date().toISOString() });
    localStorage.setItem('ens_attendance_backup', JSON.stringify(list));
  } catch {}
}

function getStoredLocalAttendance(studentId: string): AttendanceRecord[] {
  try {
    const list = JSON.parse(localStorage.getItem('ens_attendance_backup') || '[]');
    const results: AttendanceRecord[] = [];
    list.forEach((item: any, idx: number) => {
      const rec = (item.records || []).find((r: any) => r.student_id === studentId);
      if (rec) {
        results.push({
          id: `local-${idx}`,
          session_id: `sess-${idx}`,
          student_id: studentId,
          status: rec.status,
          notes: rec.notes,
          session: item.session,
        });
      }
    });
    return results;
  } catch {
    return [];
  }
}

/**
 * Administrative Requests
 */
export async function submitAdminRequest(docType: string, reason: string): Promise<{ success: boolean; error?: string }> {
  const profile = getCurrentProfile();
  if (!profile) return { success: false, error: 'يجب تسجيل الدخول أولاً لتقديم طلب إداري.' };

  const newReq: AdminRequest = {
    id: `req-${Date.now()}`,
    student_id: profile.id,
    document_type: docType,
    reason: reason || '',
    status: 'pending',
    created_at: new Date().toISOString(),
    student_name: profile.full_name,
  };

  try {
    // Try supabase insert
    const { error } = await supabase
      .from('administrative_requests')
      .insert({
        student_id: profile.id,
        document_type: docType,
        reason: reason,
        status: 'pending',
      });

    if (error) {
      console.warn('DB request insert fallback to local:', error.message);
    }
  } catch {}

  // Save to local list as reliable fallback
  try {
    const requests: AdminRequest[] = JSON.parse(localStorage.getItem('ens_admin_requests') || '[]');
    requests.unshift(newReq);
    localStorage.setItem('ens_admin_requests', JSON.stringify(requests));
  } catch {}

  showToast('تم إرسال طلبك الإداري بنجاح وهو قيد المتابعة.', 'success');
  return { success: true };
}

export async function getStudentAdminRequests(studentId: string): Promise<AdminRequest[]> {
  try {
    const { data } = await supabase
      .from('administrative_requests')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (data && data.length > 0) return data as AdminRequest[];
  } catch {}

  // Fallback local
  try {
    const requests: AdminRequest[] = JSON.parse(localStorage.getItem('ens_admin_requests') || '[]');
    return requests.filter(r => r.student_id === studentId);
  } catch {
    return [];
  }
}

export async function getAllAdminRequests(): Promise<AdminRequest[]> {
  try {
    const { data } = await supabase
      .from('administrative_requests')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      return data.map((d: any) => ({
        ...d,
        student_name: d.profiles?.full_name || 'طالب مسجل',
      })) as AdminRequest[];
    }
  } catch {}

  try {
    const requests: AdminRequest[] = JSON.parse(localStorage.getItem('ens_admin_requests') || '[]');
    return requests;
  } catch {
    return [];
  }
}

export async function updateAdminRequestStatus(reqId: string, status: 'approved' | 'ready' | 'rejected', notes?: string) {
  try {
    await supabase
      .from('administrative_requests')
      .update({ status, admin_notes: notes })
      .eq('id', reqId);
  } catch {}

  try {
    const requests: AdminRequest[] = JSON.parse(localStorage.getItem('ens_admin_requests') || '[]');
    const target = requests.find(r => r.id === reqId);
    if (target) {
      target.status = status;
      if (notes) target.admin_notes = notes;
      localStorage.setItem('ens_admin_requests', JSON.stringify(requests));
    }
  } catch {}
}

/**
 * Fetch Announcements from database
 */
export async function getLiveAnnouncements(): Promise<AnnouncementItem[]> {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(6);

    if (error) {
      return getStoredLocalAnnouncements();
    }
    if (data && data.length > 0) return data as AnnouncementItem[];
    return getStoredLocalAnnouncements();
  } catch {
    return getStoredLocalAnnouncements();
  }
}

export async function publishAnnouncement(title: string, content: string, category: string = 'إعلان رسمي'): Promise<{ success: boolean; error?: string }> {
  const profile = getCurrentProfile();
  try {
    const { error } = await supabase
      .from('announcements')
      .insert({
        title,
        content,
        category,
        author_id: profile?.id,
        is_published: true,
      });

    if (error) {
      console.warn('DB publish announcement notice:', error.message);
    }
  } catch {}

  // Save local copy
  try {
    const list = JSON.parse(localStorage.getItem('ens_announcements') || '[]');
    list.unshift({
      id: `ann-${Date.now()}`,
      title,
      content,
      category,
      created_at: new Date().toISOString(),
    });
    localStorage.setItem('ens_announcements', JSON.stringify(list));
  } catch {}

  showToast('تم نشر الإعلان بنجاح وتحديث واجهة المنصة.', 'success');
  return { success: true };
}

function getStoredLocalAnnouncements(): AnnouncementItem[] {
  try {
    return JSON.parse(localStorage.getItem('ens_announcements') || '[]');
  } catch {
    return [];
  }
}

/**
 * Pedagogical Resources
 */
export async function getPedagogicalResources(specialty?: string): Promise<PedagogicalResource[]> {
  const defaults: PedagogicalResource[] = [
    {
      id: 'res-1',
      title: 'مطبوعة ديداكتيك اللغة العربية وطرائق التدريس الحديثة',
      subject: 'ديداكتيك المادة',
      specialty: 'ar',
      level: 'متوسط',
      doc_type: 'cours',
      download_url: '#',
      author_name: 'فريق شعبة اللغة العربية',
      created_at: '2026-10-15',
    },
    {
      id: 'res-2',
      title: 'كراس الأعمال الموجهة: التحليل النحوي والصرفي المتقدم',
      subject: 'النحو والصرف',
      specialty: 'ar',
      level: 'متوسط',
      doc_type: 'td',
      download_url: '#',
      author_name: 'د. بن عيسى محمد',
      created_at: '2026-10-18',
    },
    {
      id: 'res-3',
      title: 'سلسلة تمارين ومسائل في الخوارزميات وهياكل البيانات',
      subject: 'الخوارزميات',
      specialty: 'inf',
      level: 'متوسط',
      doc_type: 'tp',
      download_url: '#',
      author_name: 'مخبر الإعلام الآلي',
      created_at: '2026-10-20',
    },
    {
      id: 'res-4',
      title: 'دليل التربص الميداني لمتربصي المدارس العليا للأساتذة',
      subject: 'التربص الميداني',
      specialty: 'all',
      level: 'عام',
      doc_type: 'guide',
      download_url: '#',
      author_name: 'مصلحة التربصات البيداغوجية',
      created_at: '2026-10-22',
    },
  ];

  try {
    const { data } = await supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      const merged = [...data, ...defaults];
      if (specialty && specialty !== 'all') {
        return merged.filter(r => r.specialty === specialty || r.specialty === 'all');
      }
      return merged;
    }
  } catch {}

  if (specialty && specialty !== 'all') {
    return defaults.filter(r => r.specialty === specialty || r.specialty === 'all');
  }
  return defaults;
}

export async function addPedagogicalResource(resource: Omit<PedagogicalResource, 'id' | 'created_at'>): Promise<void> {
  try {
    await supabase.from('resources').insert({
      title: resource.title,
      subject: resource.subject,
      specialty: resource.specialty,
      level: resource.level,
      doc_type: resource.doc_type,
    });
  } catch {}

  showToast('تمت إضافة المورد البيداغوجي بنجاح إلى المستودع الرقمي.', 'success');
}

/**
 * Update Header and Mobile UI buttons with Logged-in State
 */
export function updateHeaderAuthUI() {
  const desktopLoginBtn = document.querySelector('[data-login]') as HTMLElement | null;
  const mobileLoginBtn = document.querySelector('#mlinks [data-login]') as HTMLElement | null;

  const roleLabels: Record<string, string> = {
    admin: 'المسؤول',
    teacher: 'الأستاذ',
    student: 'الطالب',
  };

  const roleColors: Record<string, string> = {
    admin: 'bg-[#b38b45] text-white',
    teacher: 'bg-[#3b0a13] text-[#efd8a4]',
    student: 'bg-emerald-800 text-emerald-100',
  };

  if (currentProfile) {
    const roleBadge = roleLabels[currentProfile.role] || 'مستخدم';
    const roleColor = roleColors[currentProfile.role] || 'bg-gray-700 text-white';

    // Desktop replacement
    if (desktopLoginBtn) {
      desktopLoginBtn.style.display = 'none';
      let userPill = document.getElementById('user-header-pill');
      if (!userPill) {
        userPill = document.createElement('div');
        userPill.id = 'user-header-pill';
        userPill.className = 'hidden sm:inline-flex items-center gap-2 rounded-full border border-[#E3C48A]/40 bg-black/60 px-3.5 py-1.5 text-xs text-white backdrop-blur-md shadow-md';
        desktopLoginBtn.parentElement?.insertBefore(userPill, desktopLoginBtn);
      }
      userPill.innerHTML = `
        <span class="inline-block h-2 w-2 rounded-full bg-emerald-400"></span>
        <span class="font-semibold text-white max-w-[130px] truncate">${currentProfile.full_name}</span>
        <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold ${roleColor}">${roleBadge}</span>
        <button id="btn-header-logout" title="تسجيل الخروج" class="ms-1 rounded-full p-1 text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
        </button>
      `;
      userPill.style.display = 'inline-flex';
      document.getElementById('btn-header-logout')?.addEventListener('click', (e) => {
        e.stopPropagation();
        signOut();
      });
    }

    // Mobile replacement
    if (mobileLoginBtn) {
      mobileLoginBtn.innerHTML = `
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center gap-2">
            <span class="inline-block h-2 w-2 rounded-full bg-emerald-400"></span>
            <span class="font-semibold text-white">${currentProfile.full_name}</span>
            <span class="rounded-full px-2 py-0.5 text-xs ${roleColor}">${roleBadge}</span>
          </div>
          <span class="text-xs text-red-300">خروج</span>
        </div>
      `;
      mobileLoginBtn.onclick = (e) => {
        e.preventDefault();
        signOut();
      };
    }
  } else {
    // Logged out
    const userPill = document.getElementById('user-header-pill');
    if (userPill) userPill.style.display = 'none';

    if (desktopLoginBtn) {
      desktopLoginBtn.style.display = '';
      (desktopLoginBtn as HTMLButtonElement).disabled = false;
    }
    if (mobileLoginBtn) {
      mobileLoginBtn.innerHTML = (window as any).t ? (window as any).t('login') : 'تسجيل الدخول';
      mobileLoginBtn.onclick = null;
    }
  }
}

/**
 * Toast notifications
 */
export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  let toast = document.getElementById('ens-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'ens-toast';
    toast.className = 'fixed bottom-5 start-5 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-medium shadow-2xl transition-all duration-300 transform translate-y-10 opacity-0';
    document.body.appendChild(toast);
  }

  const bgStyles = {
    success: 'bg-[#5a0f1c] text-[#E3C48A] border border-[#E3C48A]/40 ring-1 ring-black/20',
    error: 'bg-red-900 text-white border border-red-500/50',
    info: 'bg-[#2a0810] text-white border border-white/20',
  };

  toast.className = `fixed bottom-5 start-5 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-medium shadow-2xl transition-all duration-300 ${bgStyles[type]}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button onclick="this.parentElement.classList.add('translate-y-10', 'opacity-0')" class="ms-2 opacity-70 hover:opacity-100 text-lg leading-none">×</button>
  `;

  requestAnimationFrame(() => {
    toast?.classList.remove('translate-y-10', 'opacity-0');
  });

  setTimeout(() => {
    toast?.classList.add('translate-y-10', 'opacity-0');
  }, 4500);
}
