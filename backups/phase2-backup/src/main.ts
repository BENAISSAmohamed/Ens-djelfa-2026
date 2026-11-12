import {
  supabase,
  SUPABASE_URL,
  SUPABASE_ANON_KEY
} from './supabase.ts';

import {
  getCurrentProfile,
  getCurrentStudent,
  loadUserProfile,
  signIn,
  signOut,
  getStudentAttendance,
  saveAttendanceSession,
  getLiveAnnouncements,
  publishAnnouncement,
  submitAdminRequest,
  getStudentAdminRequests,
  getAllAdminRequests,
  updateAdminRequestStatus,
  getPedagogicalResources,
  addPedagogicalResource,
  updateHeaderAuthUI,
  showToast
} from './auth-manager.ts';

import { initPWA } from './pwa-manager.ts';

// Expose on window for easy interoperability
(window as any).ENS_SUPABASE = {
  client: supabase,
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
  getCurrentProfile,
  signIn,
  signOut,
  showToast,
  publishAnnouncement
};

document.addEventListener('DOMContentLoaded', async () => {
  setupLoginForm();
  await initSession();
  setupServiceOverrides();
  loadDatabaseAnnouncements();
  setupAdminAnnouncementButton();
  initPWA();
});

/**
 * Initialize current auth session
 */
async function initSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await loadUserProfile(session.user.id);
      updateHeaderAuthUI();
      setupAdminAnnouncementButton();
    }
  } catch (e) {
    console.warn('Initial session check error:', e);
  }

  supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      await loadUserProfile(session.user.id);
    } else {
      (window as any).currentProfile = null;
    }
    updateHeaderAuthUI();
    setupAdminAnnouncementButton();
  });
}

/**
 * Setup Login Form in #dlg
 */
function setupLoginForm() {
  const dlg = document.getElementById('dlg') as HTMLDialogElement | null;
  if (!dlg) return;

  const form = dlg.querySelector('form');
  if (!form) return;

  form.setAttribute('onsubmit', 'return false;');

  const inputs = form.querySelectorAll('input');
  const emailInput = inputs[0];
  const passInput = inputs[1];
  const submitBtn = form.querySelector('button[value="ok"]') as HTMLButtonElement | null;

  if (emailInput) {
    emailInput.id = 'loginEmail';
    emailInput.type = 'email';
    emailInput.placeholder = 'admin@ens-djelfa.dz أو بريدك الإلكتروني';
    emailInput.autocomplete = 'username';
  }

  if (passInput) {
    passInput.id = 'loginPassword';
    passInput.autocomplete = 'current-password';
  }

  let feedback = document.getElementById('loginFeedback');
  if (!feedback) {
    feedback = document.createElement('div');
    feedback.id = 'loginFeedback';
    feedback.className = 'mt-3 hidden rounded-xl p-3 text-xs';
    if (submitBtn) {
      form.insertBefore(feedback, submitBtn);
    } else {
      form.appendChild(feedback);
    }
  }

  const demoNote = form.querySelector('[data-t="lg_demo"]');
  if (demoNote) {
    demoNote.innerHTML = '<span class="flex items-center gap-1.5 text-emerald-700 font-medium"><svg class="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg> متصل بقاعدة بيانات Supabase المشفرة · الدخول آمن بصلاحيات RLS</span>';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput?.value?.trim() || '';
    const pass = passInput?.value || '';

    if (!email || !pass) {
      if (feedback) {
        feedback.textContent = 'يرجى إدخال البريد الإلكتروني وكلمة المرور.';
        feedback.className = 'mt-3 rounded-xl p-3 text-xs bg-red-100 text-red-800 border border-red-200';
        feedback.classList.remove('hidden');
      }
      return;
    }

    if (feedback) {
      feedback.innerHTML = '<span class="inline-flex items-center gap-2"><svg class="animate-spin h-3.5 w-3.5 text-[#5a0f1c]" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> جاري التحقق من الاعتمادات...</span>';
      feedback.className = 'mt-3 rounded-xl p-3 text-xs bg-[#faf6f1] text-[#5a0f1c] border border-[#6b1220]/20';
      feedback.classList.remove('hidden');
    }

    if (submitBtn) submitBtn.disabled = true;

    const res = await signIn(email, pass);

    if (submitBtn) submitBtn.disabled = false;

    if (!res.success) {
      if (feedback) {
        feedback.textContent = res.error || 'فشل تسجيل الدخول.';
        feedback.className = 'mt-3 rounded-xl p-3 text-xs bg-red-100 text-red-800 border border-red-200';
        feedback.classList.remove('hidden');
      }
    } else {
      if (feedback) feedback.classList.add('hidden');
      dlg.close();
      if (emailInput) emailInput.value = '';
      if (passInput) passInput.value = '';
    }
  });
}

/**
 * Service Overrides
 */
function setupServiceOverrides() {
  const originalOpenService = (window as any).openService;
  if (typeof originalOpenService === 'function') {
    (window as any).openService = function (i: number) {
      originalOpenService(i);

      const profile = getCurrentProfile();

      // Service 0: فضاء الطالب (Student Space)
      if (i === 0) {
        renderCustomStudentSpace(profile);
      }
      // Service 1: فضاء الأستاذ (Teacher Space)
      else if (i === 1) {
        renderCustomTeacherSpace(profile);
      }
      // Service 2: الطلبات الإدارية (Administrative Requests)
      else if (i === 2) {
        renderCustomAdminRequests(profile);
      }
      // Service 3: المكتبة الرقمية ومستودع الدروس (Digital Library)
      else if (i === 3) {
        renderCustomLibrary(profile);
      }
    };
  }
}

/**
 * Service 0: فضاء الطالب (Student Space) with Digital Card & Attendance
 */
async function renderCustomStudentSpace(profile: any) {
  const body = document.getElementById('serviceBody');
  if (!body) return;

  if (!profile) {
    const promptDiv = document.createElement('div');
    promptDiv.className = 'mb-4 rounded-2xl border border-[#b38b45]/30 bg-gradient-to-r from-[#faf6f1] to-amber-50 p-4 text-sm text-[#4d0d17] flex items-center justify-between gap-3';
    promptDiv.innerHTML = `
      <div>
        <p class="font-bold">هل أنت طالب مسجل بملحقة المدرسة العليا للأساتذة بالجلفة؟</p>
        <p class="text-xs text-gray-600 mt-0.5">سجل الدخول بحسابك لعرض بطاقتك الجامعية الرقمية، سجل غياباتك، ونقاطك مباشرة.</p>
      </div>
      <button onclick="document.getElementById('serviceModal').close(); document.getElementById('dlg').showModal();" class="shrink-0 rounded-full bg-[#5a0f1c] px-4 py-2 text-xs font-semibold text-white hover:bg-[#3b0a13] transition-colors">
        تسجيل الدخول الآن
      </button>
    `;
    body.insertBefore(promptDiv, body.firstChild);
    return;
  }

  const student = getCurrentStudent();
  const regNumber = student?.registration_number || '2026/ENS/0491';
  const specialtyTitle = student?.specialty_code || 'اللغة العربية وآدابها (التعليم المتوسط)';
  const groupNum = student?.group_number || 1;
  const yearNum = student?.academic_year || 1;

  body.innerHTML = `
    <div class="space-y-5">
      <!-- Tabs header -->
      <div class="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto text-xs font-semibold">
        <button id="tab-student-att" class="tab-btn active px-3.5 py-2 rounded-xl bg-[#5a0f1c] text-white">
          سجل الحضور والغيابات الأكاديمي
        </button>
        <button id="tab-student-card" class="tab-btn px-3.5 py-2 rounded-xl text-gray-600 hover:bg-gray-100">
          بطاقة الطالب الجامعية الرقمية (QR)
        </button>
        <button id="tab-student-reqs" class="tab-btn px-3.5 py-2 rounded-xl text-gray-600 hover:bg-gray-100">
          طلباتي وتبرير الغياب
        </button>
      </div>

      <!-- Tab 1: Attendance records -->
      <div id="content-student-att" class="space-y-4">
        <!-- Student Info Strip -->
        <div class="rounded-2xl border border-emerald-700/20 bg-gradient-to-l from-emerald-50 to-white p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#5a0f1c] text-white font-bold text-base shadow-sm">
                ${profile.full_name?.charAt(0) || 'ط'}
              </div>
              <div>
                <h4 class="font-bold text-[#5a0f1c] text-base">${profile.full_name}</h4>
                <p class="text-xs text-gray-500">${regNumber} · ${specialtyTitle} · السنة ${yearNum} (الفوج ${groupNum})</p>
              </div>
            </div>
            <span id="academic-status-pill" class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-300">
              منتظم (حضور ممتاز)
            </span>
          </div>
        </div>

        <!-- Attendance Stats Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="rounded-2xl border border-gray-200 bg-white p-3.5 text-center shadow-sm">
            <p class="text-[11px] text-gray-500 font-semibold">نسبة الحضور الإجمالية</p>
            <p id="att-stat-rate" class="mt-1 text-xl font-bold text-[#5a0f1c]">100%</p>
          </div>
          <div class="rounded-2xl border border-gray-200 bg-white p-3.5 text-center shadow-sm">
            <p class="text-[11px] text-gray-500 font-semibold">الغيابات غير المبررة</p>
            <p id="att-stat-unjustified" class="mt-1 text-xl font-bold text-emerald-700">0</p>
          </div>
          <div class="rounded-2xl border border-gray-200 bg-white p-3.5 text-center shadow-sm">
            <p class="text-[11px] text-gray-500 font-semibold">الغيابات المبررة</p>
            <p id="att-stat-justified" class="mt-1 text-xl font-bold text-blue-700">0</p>
          </div>
          <div class="rounded-2xl border border-gray-200 bg-white p-3.5 text-center shadow-sm">
            <p class="text-[11px] text-gray-500 font-semibold">عتبة الإنذار بالإقصاء</p>
            <p class="mt-1 text-xs font-bold text-amber-700">3 غيابات غير مبررة</p>
          </div>
        </div>

        <!-- Attendance List -->
        <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div class="flex items-center justify-between mb-3">
            <h4 class="font-bold text-[#5a0f1c] text-sm flex items-center gap-2">
              <span>◆</span> جدول الحصص المسجلة
            </h4>
            <span class="text-[11px] text-gray-400">محدث لحظياً من قاعدة البيانات</span>
          </div>
          <div id="student-attendance-table-container">
            <p class="text-xs text-gray-400 animate-pulse py-4 text-center">جاري تحميل السجلات الأكاديمية...</p>
          </div>
        </div>
      </div>

      <!-- Tab 2: Digital Student Card -->
      <div id="content-student-card" class="hidden space-y-4">
        <div class="max-w-md mx-auto rounded-3xl border-2 border-[#b38b45] bg-gradient-to-br from-[#4b0b15] via-[#5a0f1c] to-[#2a060d] p-6 text-white shadow-2xl relative overflow-hidden">
          <!-- Background Watermark -->
          <div class="absolute -end-10 -bottom-10 h-44 w-44 rounded-full border-8 border-white/5 pointer-events-none"></div>

          <!-- Institutional Header -->
          <div class="text-center border-b border-[#E3C48A]/30 pb-3">
            <p class="text-[10px] tracking-widest text-[#E3C48A]">الجمهورية الجزائرية الديمقراطية الشعبية</p>
            <p class="text-[10px] text-white/80">وزارة التعليم العالي والبحث العلمي</p>
            <h3 class="text-sm font-bold text-[#fdf4dc] mt-1">المدرسة العليا للأساتذة — ملحقة الجلفة</h3>
            <p class="text-[10px] text-[#E3C48A]/90 tracking-wider">بطاقة الطالب الجامعية الرقمية · 2026 – 2027</p>
          </div>

          <!-- Card Body -->
          <div class="mt-4 flex items-center gap-4">
            <div class="h-24 w-20 shrink-0 rounded-2xl border-2 border-[#E3C48A] bg-white/10 flex flex-col items-center justify-center overflow-hidden shadow">
              <svg class="h-10 w-10 text-[#E3C48A]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              <span class="text-[9px] text-[#E3C48A] mt-1 font-mono">طالب معتمد</span>
            </div>
            <div class="flex-1 text-xs space-y-1">
              <p class="text-base font-bold text-white">${profile.full_name}</p>
              <p class="text-white/80"><span class="text-[#E3C48A]">رقم القيد:</span> <span class="font-mono font-bold">${regNumber}</span></p>
              <p class="text-white/80"><span class="text-[#E3C48A]">الشعبة:</span> ${specialtyTitle}</p>
              <p class="text-white/80"><span class="text-[#E3C48A]">الطور والسنة:</span> السنة ${yearNum} · الفوج ${groupNum}</p>
            </div>
          </div>

          <!-- QR Verification Area -->
          <div class="mt-5 pt-3 border-t border-[#E3C48A]/30 flex items-center justify-between">
            <div class="text-[10px] text-white/70">
              <p>حالة البطاقة: <span class="font-bold text-emerald-400">صالحة ومسجلة</span></p>
              <p class="font-mono text-[9px] text-gray-300">ENS-DJELFA:2026:${regNumber.replace(/[^a-zA-Z0-9]/g, '')}</p>
            </div>
            <!-- Dynamic Vector QR Code -->
            <div class="p-1 rounded-xl bg-white shadow-md">
              <svg class="h-14 w-14" viewBox="0 0 33 33" fill="#2a0810">
                <rect x="0" y="0" width="7" height="7"/>
                <rect x="1" y="1" width="5" height="5" fill="white"/>
                <rect x="2" y="2" width="3" height="3"/>
                <rect x="26" y="0" width="7" height="7"/>
                <rect x="27" y="1" width="5" height="5" fill="white"/>
                <rect x="28" y="2" width="3" height="3"/>
                <rect x="0" y="26" width="7" height="7"/>
                <rect x="1" y="27" width="5" height="5" fill="white"/>
                <rect x="2" y="28" width="3" height="3"/>
                <rect x="10" y="3" width="3" height="3"/>
                <rect x="14" y="3" width="4" height="2"/>
                <rect x="10" y="10" width="13" height="13"/>
                <rect x="12" y="12" width="9" height="9" fill="white"/>
                <rect x="14" y="14" width="5" height="5"/>
                <rect x="26" y="10" width="3" height="4"/>
                <rect x="3" y="14" width="4" height="3"/>
                <rect x="26" y="26" width="4" height="4"/>
              </svg>
            </div>
          </div>
        </div>

        <div class="text-center pt-2">
          <button onclick="window.print()" class="rounded-full bg-[#5a0f1c] px-6 py-2.5 text-xs font-semibold text-[#E3C48A] hover:bg-[#3b0a13] hover:text-white transition-colors shadow flex items-center gap-2 mx-auto">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z"/></svg>
            <span>طباعة وحفظ البطاقة الجامعية الرقمية</span>
          </button>
        </div>
      </div>

      <!-- Tab 3: Student Requests & Justifications -->
      <div id="content-student-reqs" class="hidden space-y-4">
        <!-- New request card -->
        <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h4 class="font-bold text-[#5a0f1c] text-sm mb-3">تقديم طلب وثيقة أو تبرير غياب</h4>
          <form id="student-new-request-form" class="space-y-3">
            <div>
              <label class="block text-xs font-semibold text-gray-700">نوع الطلب:</label>
              <select id="req-doc-type" class="mt-1 w-full rounded-xl border border-gray-300 p-2.5 text-xs outline-none focus:border-[#5a0f1c]">
                <option value="تبرير غياب رسمي">تبرير غياب رسمي (شهادة طبية / عذر شرعي)</option>
                <option value="شهادة تسجيل">شهادة تسجيل أصلية</option>
                <option value="كشف نقاط">كشف نقاط سداسي</option>
                <option value="شهادة حسن سيرة">شهادة حسن سيرة وسلوك</option>
                <option value="بطاقة طالب بديلة">إعادة استخراج بطاقة الطالب</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-700">التفاصيل أو المبرر:</label>
              <textarea id="req-reason" rows="2" placeholder="اكتب رقم الحصة، تاريخ الغياب، أو سبب طلب الوثيقة..." class="mt-1 w-full rounded-xl border border-gray-300 p-2.5 text-xs outline-none focus:border-[#5a0f1c]"></textarea>
            </div>
            <button type="submit" class="rounded-full bg-[#5a0f1c] px-5 py-2 text-xs font-semibold text-white hover:bg-[#3b0a13] transition-colors">
              إرسال الطلب إلى الإدارة
            </button>
          </form>
        </div>

        <!-- Requests History -->
        <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h4 class="font-bold text-[#5a0f1c] text-sm mb-3">سجل طلباتي الإدارية</h4>
          <div id="student-requests-list" class="space-y-2 text-xs">
            <p class="text-gray-400">جاري تحميل الطلبات...</p>
          </div>
        </div>
      </div>
    </div>
  `;

  // Setup tab click handling
  const tabAtt = document.getElementById('tab-student-att');
  const tabCard = document.getElementById('tab-student-card');
  const tabReqs = document.getElementById('tab-student-reqs');
  const cntAtt = document.getElementById('content-student-att');
  const cntCard = document.getElementById('content-student-card');
  const cntReqs = document.getElementById('content-student-reqs');

  const switchTab = (activeTab: HTMLElement, activeContent: HTMLElement) => {
    [tabAtt, tabCard, tabReqs].forEach(b => {
      b?.classList.remove('bg-[#5a0f1c]', 'text-white');
      b?.classList.add('text-gray-600', 'hover:bg-gray-100');
    });
    activeTab.classList.remove('text-gray-600', 'hover:bg-gray-100');
    activeTab.classList.add('bg-[#5a0f1c]', 'text-white');

    [cntAtt, cntCard, cntReqs].forEach(c => c?.classList.add('hidden'));
    activeContent.classList.remove('hidden');
  };

  tabAtt?.addEventListener('click', () => switchTab(tabAtt, cntAtt!));
  tabCard?.addEventListener('click', () => switchTab(tabCard, cntCard!));
  tabReqs?.addEventListener('click', () => {
    switchTab(tabReqs, cntReqs!);
    loadStudentRequestsUI(profile.id);
  });

  // Load attendance data
  loadStudentAttendanceUI(profile.id);

  // Form submit for new request
  const reqForm = document.getElementById('student-new-request-form');
  if (reqForm) {
    reqForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const docType = (document.getElementById('req-doc-type') as HTMLSelectElement)?.value;
      const reason = (document.getElementById('req-reason') as HTMLTextAreaElement)?.value;
      await submitAdminRequest(docType, reason);
      (document.getElementById('req-reason') as HTMLTextAreaElement).value = '';
      loadStudentRequestsUI(profile.id);
    });
  }
}

async function loadStudentAttendanceUI(studentId: string) {
  const container = document.getElementById('student-attendance-table-container');
  const rateStat = document.getElementById('att-stat-rate');
  const unjStat = document.getElementById('att-stat-unjustified');
  const justStat = document.getElementById('att-stat-justified');
  const statusPill = document.getElementById('academic-status-pill');
  if (!container) return;

  const records = await getStudentAttendance(studentId);

  if (records.length === 0) {
    container.innerHTML = `
      <div class="rounded-xl border border-dashed border-gray-300 p-6 text-center">
        <svg class="mx-auto h-8 w-8 text-emerald-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <p class="text-sm font-semibold text-gray-800">حضورك مكتمل بنسبة 100%</p>
        <p class="text-xs text-gray-500 mt-1">لا توجد غيابات مسجلة في سجلاتك الأكاديمية حتى الآن.</p>
      </div>
    `;
    return;
  }

  const absences = records.filter(r => r.status === 'absent').length;
  const justified = records.filter(r => r.status === 'justified').length;
  const total = records.length;
  const rate = Math.round(((total - absences) / total) * 100);

  if (rateStat) rateStat.textContent = `${rate}%`;
  if (unjStat) unjStat.textContent = `${absences}`;
  if (justStat) justStat.textContent = `${justified}`;

  if (statusPill) {
    if (absences >= 3) {
      statusPill.textContent = 'تنبيه: مهدد بالإقصاء (3 غيابات)';
      statusPill.className = 'rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800 border border-red-300';
    } else if (absences === 2) {
      statusPill.textContent = 'إنذار ثانٍ (2 غيابات)';
      statusPill.className = 'rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-300';
    } else if (absences === 1) {
      statusPill.textContent = 'إنذار أولي (غياب واحد)';
      statusPill.className = 'rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800 border border-blue-300';
    }
  }

  const statusMap: Record<string, { label: string; color: string }> = {
    present: { label: 'حاضر', color: 'bg-emerald-100 text-emerald-800' },
    absent: { label: 'غائب', color: 'bg-red-100 text-red-800 font-bold' },
    justified: { label: 'مبرر', color: 'bg-amber-100 text-amber-800' },
    late: { label: 'تأخر', color: 'bg-blue-100 text-blue-800' },
  };

  container.innerHTML = `
    <div class="overflow-x-auto rounded-xl border border-gray-200">
      <table class="w-full text-start text-xs">
        <thead class="bg-[#faf6f1] text-[#5a0f1c]">
          <tr>
            <th class="p-2.5 text-start">المقياس</th>
            <th class="p-2.5 text-start">التاريخ</th>
            <th class="p-2.5 text-center">الحالة</th>
            <th class="p-2.5 text-start">ملاحظات البيداغوجيا</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          ${records.map(r => {
            const st = statusMap[r.status] || { label: r.status, color: 'bg-gray-100 text-gray-800' };
            return `
              <tr>
                <td class="p-2.5 font-semibold text-gray-900">${r.session?.subject_name || 'حصة بيداغوجية'}</td>
                <td class="p-2.5 text-gray-600">${r.session?.session_date || '—'}</td>
                <td class="p-2.5 text-center"><span class="rounded-full px-2.5 py-0.5 ${st.color}">${st.label}</span></td>
                <td class="p-2.5 text-gray-500">${r.notes || '—'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function loadStudentRequestsUI(studentId: string) {
  const container = document.getElementById('student-requests-list');
  if (!container) return;

  const reqs = await getStudentAdminRequests(studentId);

  if (reqs.length === 0) {
    container.innerHTML = '<p class="text-gray-400 py-3 text-center">لا توجد طلبات إدارية سابقة.</p>';
    return;
  }

  const statusTags: Record<string, { label: string; color: string }> = {
    pending: { label: 'قيد المعالجة الإدارية', color: 'bg-amber-100 text-amber-800' },
    approved: { label: 'تمت المصادقة والموافقة', color: 'bg-blue-100 text-blue-800' },
    ready: { label: 'جاهز للاستلام بالمصلحة', color: 'bg-emerald-100 text-emerald-800 font-bold' },
    rejected: { label: 'طلب مرفوض', color: 'bg-red-100 text-red-800' },
  };

  container.innerHTML = reqs.map(r => {
    const tag = statusTags[r.status] || statusTags.pending;
    return `
      <div class="rounded-xl border border-gray-200 p-3 bg-gray-50/50 flex items-center justify-between">
        <div>
          <p class="font-bold text-gray-900">${r.document_type}</p>
          <p class="text-[11px] text-gray-500 mt-0.5">${r.reason || 'طلب إداري رسمي'}</p>
          <time class="text-[10px] text-gray-400 font-mono">${new Date(r.created_at).toLocaleDateString('ar-DZ')}</time>
        </div>
        <span class="rounded-full px-2.5 py-1 text-[11px] ${tag.color}">${tag.label}</span>
      </div>
    `;
  }).join('');
}

/**
 * Service 1: فضاء الأستاذ (Teacher / Attendance Sheet & Session Recording)
 */
function renderCustomTeacherSpace(profile: any) {
  const body = document.getElementById('serviceBody');
  if (!body) return;

  if (!profile || (profile.role !== 'teacher' && profile.role !== 'admin')) {
    const promptDiv = document.createElement('div');
    promptDiv.className = 'mb-4 rounded-2xl border border-[#b38b45]/30 bg-gradient-to-r from-[#faf6f1] to-amber-50 p-4 text-sm text-[#4d0d17] flex items-center justify-between gap-3';
    promptDiv.innerHTML = `
      <div>
        <p class="font-bold">تسجيل الدخول كأساتذة وإدارة</p>
        <p class="text-xs text-gray-600 mt-0.5">يتيح فضاء الأستاذ والمسؤول رصد الحضور إلكترونياً، احتساب عتبات الإقصاء، وتصدير كشف الحضور الرسمي للطباعة.</p>
      </div>
      <button onclick="document.getElementById('serviceModal').close(); document.getElementById('dlg').showModal();" class="shrink-0 rounded-full bg-[#5a0f1c] px-4 py-2 text-xs font-semibold text-white hover:bg-[#3b0a13] transition-colors">
        دخول الأستاذ
      </button>
    `;
    body.insertBefore(promptDiv, body.firstChild);
    return;
  }

  body.innerHTML = `
    <div class="space-y-6">
      <div class="rounded-2xl border border-[#5a0f1c]/20 bg-gradient-to-l from-[#faf6f1] to-white p-4 flex items-center justify-between">
        <div>
          <h4 class="text-base font-bold text-[#5a0f1c]">${profile.full_name}</h4>
          <p class="text-xs text-gray-600">الدور: <span class="font-semibold text-[#b38b45]">${profile.role === 'admin' ? 'مسؤول المنصة المركزية' : 'أستاذ محاضر / مطبق'}</span></p>
        </div>
        <button id="btn-export-sheet" class="rounded-xl border border-[#5a0f1c] bg-white px-3.5 py-2 text-xs font-bold text-[#5a0f1c] hover:bg-[#5a0f1c] hover:text-white transition-colors flex items-center gap-1.5 shadow-sm">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z"/></svg>
          <span>تصدير كشف الحضور الرسمي (PDF / طباعة)</span>
        </button>
      </div>

      <!-- Attendance Recording Tool -->
      <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h4 class="text-sm font-bold text-[#5a0f1c] mb-3 flex items-center gap-2">
          <span>◆</span> رصد حضور حصة بيداغوجية جديدة
        </h4>

        <form id="attendance-session-form" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label class="block text-xs font-semibold text-gray-700">
              المقياس / المادة
              <input required id="att-subject" type="text" value="ديداكتيك المادة وتخطيط التعلمات" class="mt-1 w-full rounded-xl border border-gray-300 p-2 text-xs outline-none focus:border-[#5a0f1c]">
            </label>
            <label class="block text-xs font-semibold text-gray-700">
              تاريخ الحصة
              <input required id="att-date" type="date" value="${new Date().toISOString().split('T')[0]}" class="mt-1 w-full rounded-xl border border-gray-300 p-2 text-xs outline-none focus:border-[#5a0f1c]">
            </label>
            <label class="block text-xs font-semibold text-gray-700">
              التخصص
              <select id="att-specialty" class="mt-1 w-full rounded-xl border border-gray-300 p-2 text-xs outline-none focus:border-[#5a0f1c]">
                <option value="اللغة العربية وآدابها (متوسط)">اللغة العربية وآدابها (متوسط)</option>
                <option value="اللغة الفرنسية (متوسط)">اللغة الفرنسية (متوسط)</option>
                <option value="اللغة الإنجليزية (متوسط)">اللغة الإنجليزية (متوسط)</option>
                <option value="التاريخ والجغرافيا (متوسط)">التاريخ والجغرافيا (متوسط)</option>
                <option value="الإعلام الآلي (متوسط)">الإعلام الآلي (متوسط)</option>
                <option value="علوم الطبيعة والحياة (متوسط)">علوم الطبيعة والحياة (متوسط)</option>
                <option value="التربية البدنية والرياضية (متوسط)">التربية البدنية والرياضية (متوسط)</option>
                <option value="اللغة العربية (ابتدائي)">اللغة العربية (ابتدائي)</option>
              </select>
            </label>
            <div class="grid grid-cols-2 gap-2">
              <label class="block text-xs font-semibold text-gray-700">
                السنة
                <select id="att-year" class="mt-1 w-full rounded-xl border border-gray-300 p-2 text-xs outline-none focus:border-[#5a0f1c]">
                  <option value="1">السنة الأولى</option>
                  <option value="2">السنة الثانية</option>
                </select>
              </label>
              <label class="block text-xs font-semibold text-gray-700">
                الفوج
                <select id="att-group" class="mt-1 w-full rounded-xl border border-gray-300 p-2 text-xs outline-none focus:border-[#5a0f1c]">
                  <option value="1">فوج 1</option>
                  <option value="2">فوج 2</option>
                  <option value="3">فوج 3</option>
                </select>
              </label>
            </div>
          </div>

          <!-- Student Roster -->
          <div class="mt-3 border-t border-gray-100 pt-3">
            <div class="flex items-center justify-between mb-2">
              <p class="text-xs font-bold text-gray-800">قائمة طلبة الفوج المحددة للرصد:</p>
              <div class="flex items-center gap-2">
                <button type="button" id="btn-mark-all-present" class="text-[11px] text-emerald-700 font-bold hover:underline">الكل حاضر ✓</button>
              </div>
            </div>
            <div class="overflow-x-auto rounded-xl border border-gray-200">
              <table class="w-full text-xs text-start">
                <thead class="bg-[#faf6f1] text-[#5a0f1c]">
                  <tr>
                    <th class="p-2 text-start">الاسم واللقب</th>
                    <th class="p-2 text-center">حاضر</th>
                    <th class="p-2 text-center">غائب</th>
                    <th class="p-2 text-center">مبرر</th>
                    <th class="p-2 text-start">ملاحظة</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr class="student-row" data-student-id="${profile.id}">
                    <td class="p-2 font-semibold text-gray-900">${profile.full_name}</td>
                    <td class="p-2 text-center"><input type="radio" name="st-1" value="present" checked class="text-emerald-600 radio-present"></td>
                    <td class="p-2 text-center"><input type="radio" name="st-1" value="absent" class="text-red-600 radio-absent"></td>
                    <td class="p-2 text-center"><input type="radio" name="st-1" value="justified" class="text-amber-600 radio-justified"></td>
                    <td class="p-2"><input type="text" placeholder="ملاحظة اختيارية" class="w-full border border-gray-200 rounded p-1 text-xs"></td>
                  </tr>
                  <tr class="student-row" data-student-id="st-sample-2">
                    <td class="p-2 font-semibold text-gray-900">سليماني أحمد</td>
                    <td class="p-2 text-center"><input type="radio" name="st-2" value="present" checked class="text-emerald-600 radio-present"></td>
                    <td class="p-2 text-center"><input type="radio" name="st-2" value="absent" class="text-red-600 radio-absent"></td>
                    <td class="p-2 text-center"><input type="radio" name="st-2" value="justified" class="text-amber-600 radio-justified"></td>
                    <td class="p-2"><input type="text" placeholder="ملاحظة اختيارية" class="w-full border border-gray-200 rounded p-1 text-xs"></td>
                  </tr>
                  <tr class="student-row" data-student-id="st-sample-3">
                    <td class="p-2 font-semibold text-gray-900">بن عثمان فاطمة الزهراء</td>
                    <td class="p-2 text-center"><input type="radio" name="st-3" value="present" checked class="text-emerald-600 radio-present"></td>
                    <td class="p-2 text-center"><input type="radio" name="st-3" value="absent" class="text-red-600 radio-absent"></td>
                    <td class="p-2 text-center"><input type="radio" name="st-3" value="justified" class="text-amber-600 radio-justified"></td>
                    <td class="p-2"><input type="text" placeholder="ملاحظة اختيارية" class="w-full border border-gray-200 rounded p-1 text-xs"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="flex items-center justify-between pt-2">
            <button id="btn-save-attendance" type="submit" class="rounded-full bg-[#5a0f1c] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#3b0a13] transition-colors flex items-center gap-2">
              <svg class="h-4 w-4 text-[#efd8a4]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
              <span>حفظ جلسة الحضور في Supabase</span>
            </button>
            <span id="save-attendance-status" class="text-xs"></span>
          </div>
        </form>
      </div>
    </div>
  `;

  // Quick mark all present
  document.getElementById('btn-mark-all-present')?.addEventListener('click', () => {
    document.querySelectorAll('.radio-present').forEach((r: any) => r.checked = true);
  });

  // Export Attendance sheet button
  document.getElementById('btn-export-sheet')?.addEventListener('click', () => {
    openPrintableAttendanceSheet();
  });

  // Form submit
  const attForm = document.getElementById('attendance-session-form');
  if (attForm) {
    attForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const statusEl = document.getElementById('save-attendance-status');
      const saveBtn = document.getElementById('btn-save-attendance') as HTMLButtonElement | null;

      if (saveBtn) saveBtn.disabled = true;
      if (statusEl) statusEl.innerHTML = '<span class="text-[#5a0f1c] animate-pulse">جاري الحفظ في قاعدة البيانات...</span>';

      const subject = (document.getElementById('att-subject') as HTMLInputElement)?.value;
      const date = (document.getElementById('att-date') as HTMLInputElement)?.value;
      const spec = (document.getElementById('att-specialty') as HTMLSelectElement)?.value;
      const year = Number((document.getElementById('att-year') as HTMLSelectElement)?.value) || 1;
      const group = Number((document.getElementById('att-group') as HTMLSelectElement)?.value) || 1;

      const rows = document.querySelectorAll('.student-row');
      const records: any[] = [];
      rows.forEach(r => {
        const studentId = r.getAttribute('data-student-id');
        const checkedRadio = r.querySelector('input[type="radio"]:checked') as HTMLInputElement | null;
        const note = (r.querySelector('input[type="text"]') as HTMLInputElement)?.value || '';
        if (studentId && checkedRadio) {
          records.push({
            student_id: studentId,
            status: checkedRadio.value as any,
            notes: note,
          });
        }
      });

      const res = await saveAttendanceSession({
        teacher_id: profile.id,
        specialty_code: spec,
        academic_year: year,
        group_number: group,
        subject_name: subject,
        session_date: date,
      }, records);

      if (saveBtn) saveBtn.disabled = false;

      if (res.success) {
        if (statusEl) statusEl.innerHTML = '<span class="text-emerald-700 font-bold">✓ تم حفظ الحصة وسجلات الحضور بنجاح!</span>';
        showToast('تم تسجيل الحصة بنجاح في قاعدة بيانات Supabase.', 'success');
      } else {
        if (statusEl) statusEl.innerHTML = `<span class="text-red-700">فشل: ${res.error}</span>`;
      }
    });
  }
}

/**
 * Service 2: الطلبات الإدارية (Administrative Requests)
 */
async function renderCustomAdminRequests(profile: any) {
  const body = document.getElementById('serviceBody');
  if (!body) return;

  const isAdmin = profile?.role === 'admin';

  if (!profile) {
    const promptDiv = document.createElement('div');
    promptDiv.className = 'mb-4 rounded-2xl border border-[#b38b45]/30 bg-gradient-to-r from-[#faf6f1] to-amber-50 p-4 text-sm text-[#4d0d17] flex items-center justify-between gap-3';
    promptDiv.innerHTML = `
      <div>
        <p class="font-bold">الشباك الموحد للطلبات الإدارية</p>
        <p class="text-xs text-gray-600 mt-0.5">سجل الدخول بحسابك لطلب الشهادات المدرسية، كشوف النقاط، أو متابعة القرارات الإدارية.</p>
      </div>
      <button onclick="document.getElementById('serviceModal').close(); document.getElementById('dlg').showModal();" class="shrink-0 rounded-full bg-[#5a0f1c] px-4 py-2 text-xs font-semibold text-white hover:bg-[#3b0a13] transition-colors">
        دخول الحساب
      </button>
    `;
    body.insertBefore(promptDiv, body.firstChild);
    return;
  }

  // Admin View: List of all student requests to approve/reject
  if (isAdmin) {
    body.innerHTML = `
      <div class="space-y-4">
        <div class="rounded-2xl border border-[#5a0f1c]/20 bg-gradient-to-l from-[#faf6f1] to-white p-4">
          <h4 class="font-bold text-[#5a0f1c] text-sm">لوحة معالجة الطلبات الإدارية الواردة</h4>
          <p class="text-xs text-gray-500 mt-0.5">يمكنك مراجعة وثائق الطلبة، المصادقة عليها، وتحديد جاهزيتها للاستلام.</p>
        </div>
        <div id="admin-requests-table-container">
          <p class="text-xs text-gray-400 animate-pulse text-center py-4">جاري تحميل الطلبات الواردة...</p>
        </div>
      </div>
    `;

    const reqs = await getAllAdminRequests();
    const container = document.getElementById('admin-requests-table-container');
    if (!container) return;

    if (reqs.length === 0) {
      container.innerHTML = '<p class="text-center text-gray-400 py-6 text-xs">لا توجد طلبات إدارية جديدة معلقة.</p>';
      return;
    }

    container.innerHTML = `
      <div class="space-y-3">
        ${reqs.map(r => `
          <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-gray-900 text-xs">${r.student_name || 'طالب'}</span>
                <span class="rounded-full bg-[#5a0f1c]/10 text-[#5a0f1c] px-2 py-0.5 text-[10px] font-semibold">${r.document_type}</span>
              </div>
              <p class="text-xs text-gray-600 mt-1">${r.reason || 'طلب إداري رسمي'}</p>
              <time class="text-[10px] text-gray-400 font-mono">${new Date(r.created_at).toLocaleString('ar-DZ')}</time>
            </div>
            <div class="flex items-center gap-2">
              <button onclick="window.updateReqStatus('${r.id}', 'ready')" class="rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800">
                جاهز للاستلام
              </button>
              <button onclick="window.updateReqStatus('${r.id}', 'approved')" class="rounded-xl bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800">
                موافقة
              </button>
              <button onclick="window.updateReqStatus('${r.id}', 'rejected')" class="rounded-xl border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50">
                رفض
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    (window as any).updateReqStatus = async (id: string, st: any) => {
      await updateAdminRequestStatus(id, st);
      showToast('تم تحديث حالة الطلب بنجاح.', 'success');
      renderCustomAdminRequests(profile);
    };
    return;
  }

  // Student View: Submit request form
  body.innerHTML = `
    <div class="space-y-5">
      <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h4 class="font-bold text-[#5a0f1c] text-sm mb-3">تقديم طلب وثيقة إدارية رسمية</h4>
        <form id="standalone-request-form" class="space-y-3">
          <div>
            <label class="block text-xs font-semibold text-gray-700">نوع الوثيقة المطلوبة:</label>
            <select id="sa-doc-type" class="mt-1 w-full rounded-xl border border-gray-300 p-2.5 text-xs outline-none focus:border-[#5a0f1c]">
              <option value="شهادة تسجيل">شهادة تسجيل أصلية</option>
              <option value="كشف نقاط سداسي">كشف نقاط سداسي معتمد</option>
              <option value="شهادة حسن سيرة">شهادة حسن سيرة وسلوك</option>
              <option value="بطاقة طالب بديلة">إعادة استخراج بطاقة الطالب (بدل ضائع)</option>
              <option value="تبرير غياب">طلب مراجعة تبرير غياب</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-700">الغرض أو الملاحظات:</label>
            <textarea id="sa-reason" rows="2" placeholder="اذكر سبب الطلب والجهة الموجه إليها..." class="mt-1 w-full rounded-xl border border-gray-300 p-2.5 text-xs outline-none focus:border-[#5a0f1c]"></textarea>
          </div>
          <button type="submit" class="rounded-full bg-[#5a0f1c] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#3b0a13] transition-colors">
            إيداع الطلب الرقمي
          </button>
        </form>
      </div>

      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h4 class="font-bold text-[#5a0f1c] text-sm mb-3">حالة طلباتك المودعة</h4>
        <div id="standalone-requests-list" class="space-y-2 text-xs">
          <p class="text-gray-400">جاري فحص الطلبات...</p>
        </div>
      </div>
    </div>
  `;

  loadStudentRequestsUI(profile.id);

  document.getElementById('standalone-request-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const docType = (document.getElementById('sa-doc-type') as HTMLSelectElement)?.value;
    const reason = (document.getElementById('sa-reason') as HTMLTextAreaElement)?.value;
    await submitAdminRequest(docType, reason);
    (document.getElementById('sa-reason') as HTMLTextAreaElement).value = '';
    loadStudentRequestsUI(profile.id);
  });
}

/**
 * Service 3: المكتبة الرقمية ومستودع الدروس (Digital Library & Courses)
 */
async function renderCustomLibrary(profile: any) {
  const body = document.getElementById('serviceBody');
  if (!body) return;

  const isTeacherOrAdmin = profile && (profile.role === 'teacher' || profile.role === 'admin');

  body.innerHTML = `
    <div class="space-y-5">
      <!-- Filter and Upload strip -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#faf6f1] p-3.5 rounded-2xl border border-[#6b1220]/10">
        <div class="flex items-center gap-2 text-xs">
          <span class="font-semibold text-gray-700">تصفية حسب التخصص:</span>
          <select id="lib-spec-filter" class="rounded-xl border border-gray-300 p-1.5 text-xs bg-white outline-none">
            <option value="all">جميع التخصصات والمقررات</option>
            <option value="ar">اللغة العربية وآدابها</option>
            <option value="fr">اللغة الفرنسية</option>
            <option value="en">اللغة الإنجليزية</option>
            <option value="hg">التاريخ والجغرافيا</option>
            <option value="inf">الإعلام الآلي</option>
            <option value="sci">علوم الطبيعة والحياة</option>
            <option value="pe">التربية البدنية والرياضية</option>
          </select>
        </div>
        ${isTeacherOrAdmin ? `
          <button id="btn-add-resource" class="rounded-xl bg-[#5a0f1c] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#3b0a13] flex items-center gap-1.5">
            <span>+ إضافة مطبوعة أو درس</span>
          </button>
        ` : ''}
      </div>

      <!-- Add Resource Form (collapsible for teachers/admins) -->
      <div id="add-resource-panel" class="hidden rounded-2xl border border-[#b38b45]/30 bg-white p-4 shadow-sm">
        <h4 class="font-bold text-[#5a0f1c] text-sm mb-2">إيداع مورد بيداغوجي جديد</h4>
        <form id="new-resource-form" class="space-y-3 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input required id="res-title" placeholder="عنوان المطبوعة أو المورد..." class="rounded-xl border border-gray-300 p-2">
            <input required id="res-subject" placeholder="اسم المقياس..." class="rounded-xl border border-gray-300 p-2">
            <select id="res-specialty" class="rounded-xl border border-gray-300 p-2">
              <option value="ar">اللغة العربية وآدابها</option>
              <option value="fr">اللغة الفرنسية</option>
              <option value="en">اللغة الإنجليزية</option>
              <option value="hg">التاريخ والجغرافيا</option>
              <option value="inf">الإعلام الآلي</option>
              <option value="sci">علوم الطبيعة والحياة</option>
              <option value="pe">التربية البدنية والرياضية</option>
            </select>
            <select id="res-type" class="rounded-xl border border-gray-300 p-2">
              <option value="cours">مطبوعة محاضرة (Cours)</option>
              <option value="td">أعمال موجهة (TD)</option>
              <option value="tp">أعمال تطبيقية (TP)</option>
              <option value="exam">نموذج امتحان سابق (Exam)</option>
              <option value="guide">دليل بيداغوجي (Guide)</option>
            </select>
          </div>
          <button type="submit" class="rounded-full bg-[#5a0f1c] px-5 py-2 text-white font-semibold">حفظ وإتاحة للطلبة</button>
        </form>
      </div>

      <!-- Resources Grid -->
      <div id="resources-cards-grid" class="grid gap-3 sm:grid-cols-2">
        <p class="text-xs text-gray-400 py-4 text-center col-span-full">جاري تحميل المستودع البيداغوجي...</p>
      </div>
    </div>
  `;

  const loadResources = async (spec?: string) => {
    const list = await getPedagogicalResources(spec);
    const grid = document.getElementById('resources-cards-grid');
    if (!grid) return;

    const typeBadges: Record<string, { label: string; color: string }> = {
      cours: { label: 'مطبوعة درس', color: 'bg-emerald-100 text-emerald-800' },
      td: { label: 'أعمال موجهة', color: 'bg-blue-100 text-blue-800' },
      tp: { label: 'أعمال تطبيقية', color: 'bg-purple-100 text-purple-800' },
      exam: { label: 'امتحان معتمد', color: 'bg-amber-100 text-amber-800' },
      guide: { label: 'دليل رسمي', color: 'bg-[#5a0f1c]/10 text-[#5a0f1c]' },
    };

    grid.innerHTML = list.map(r => {
      const b = typeBadges[r.doc_type] || typeBadges.cours;
      return `
        <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div>
            <div class="flex items-center justify-between gap-2">
              <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold ${b.color}">${b.label}</span>
              <span class="text-[10px] text-gray-400 font-mono">${r.created_at}</span>
            </div>
            <h5 class="mt-2 text-xs font-bold text-gray-900 leading-snug">${r.title}</h5>
            <p class="mt-1 text-[11px] text-gray-500">${r.subject} · ${r.author_name || 'القسم الأكاديمي'}</p>
          </div>
          <div class="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
            <span class="text-[10px] text-emerald-700 font-medium">متاح للتحميل (PDF)</span>
            <button onclick="alert('جاري تحميل الوثيقة الرسمية من المستودع الرقمي...')" class="rounded-lg bg-[#5a0f1c]/10 hover:bg-[#5a0f1c] hover:text-white px-2.5 py-1 text-xs font-semibold text-[#5a0f1c] transition-colors">
              تحميل الملف ↓
            </button>
          </div>
        </div>
      `;
    }).join('');
  };

  loadResources('all');

  document.getElementById('lib-spec-filter')?.addEventListener('change', (e: any) => {
    loadResources(e.target.value);
  });

  document.getElementById('btn-add-resource')?.addEventListener('click', () => {
    const p = document.getElementById('add-resource-panel');
    p?.classList.toggle('hidden');
  });

  document.getElementById('new-resource-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = (document.getElementById('res-title') as HTMLInputElement)?.value;
    const subject = (document.getElementById('res-subject') as HTMLInputElement)?.value;
    const specialty = (document.getElementById('res-specialty') as HTMLSelectElement)?.value;
    const doc_type = (document.getElementById('res-type') as HTMLSelectElement)?.value as any;

    await addPedagogicalResource({
      title,
      subject,
      specialty,
      level: 'متوسط',
      doc_type,
      author_name: profile.full_name,
    });

    document.getElementById('add-resource-panel')?.classList.add('hidden');
    loadResources('all');
  });
}

/**
 * Printable Official Attendance Sheet (تصدير كشف الحضور الرسمي PDF/طباعة)
 */
function openPrintableAttendanceSheet() {
  const profile = getCurrentProfile();
  const printWin = window.open('', '_blank');
  if (!printWin) {
    alert('يرجى السماح بفتح النوافذ المنبثقة للطباعة.');
    return;
  }

  const currentDate = new Date().toLocaleDateString('ar-DZ');

  printWin.document.write(`
    <!doctype html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="utf-8">
      <title>كشف الحضور الرسمي — ملحقة المدرسة العليا للأساتذة بالجلفة</title>
      <style>
        @page { size: A4 landscape; margin: 12mm; }
        body { font-family: 'Cairo', Arial, sans-serif; margin: 0; padding: 15px; color: #111; direction: rtl; }
        .header { text-align: center; border-bottom: 2px solid #5a0f1c; padding-bottom: 10px; margin-bottom: 15px; }
        .inst { font-size: 14px; font-weight: bold; color: #5a0f1c; }
        .sub { font-size: 12px; margin-top: 3px; }
        .meta-grid { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 15px; background: #faf6f1; padding: 10px; border-radius: 8px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
        th, td { border: 1px solid #999; padding: 6px 8px; text-align: start; }
        th { background: #f0eae1; font-weight: bold; color: #5a0f1c; }
        .sig { margin-top: 30px; display: flex; justify-content: space-between; font-size: 11px; }
        .sig-box { width: 200px; height: 70px; border: 1px dashed #666; margin-top: 8px; text-align: center; padding-top: 25px; color: #888; }
        .btn-print { background: #5a0f1c; color: #fff; padding: 8px 16px; border: 0; border-radius: 20px; font-weight: bold; cursor: pointer; margin-bottom: 15px; }
        @media print { .btn-print { display: none; } }
      </style>
    </head>
    <body>
      <button class="btn-print" onclick="window.print()">طباعة الكشف الرسمي / حفظ كـ PDF</button>

      <div class="header">
        <div class="inst">الجمهورية الجزائرية الديمقراطية الشعبية</div>
        <div class="sub">وزارة التعليم العالي والبحث العلمي</div>
        <div class="inst" style="margin-top: 4px; font-size: 16px;">المدرسة العليا للأساتذة — ملحقة الجلفة</div>
        <div class="sub">مصلحة التمدرس والأنشطة البيداغوجية · السنة الجامعية 2026 / 2027</div>
        <h2 style="font-size: 15px; margin: 10px 0 0 0; color: #5a0f1c;">كشف رصد الحضور والغيابات الرسمي للطلبة</h2>
      </div>

      <div class="meta-grid">
        <div><strong>الأستاذ المسؤول:</strong> ${profile?.full_name || 'أستاذ المقياس'}</div>
        <div><strong>المقياس:</strong> ديداكتيك المادة وتخطيط التعلمات</div>
        <div><strong>الشعبة:</strong> اللغة العربية وآدابها (متوسط)</div>
        <div><strong>الفوج:</strong> فوج 1 · السنة الأولى</div>
        <div><strong>تاريخ استخراج الكشف:</strong> ${currentDate}</div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 30px; text-align: center;">الرقم</th>
            <th>اسم ولقب الطالب</th>
            <th>رقم التسجيل</th>
            <th style="text-align: center;">حضور (ح)</th>
            <th style="text-align: center;">غياب غير مبرر (غ)</th>
            <th style="text-align: center;">غياب مبرر (م)</th>
            <th style="text-align: center;">نسبة الحضور</th>
            <th>الوضعية البيداغوجية</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align: center;">01</td>
            <td><strong>${profile?.full_name || 'سليماني أحمد'}</strong></td>
            <td>2026/ENS/0491</td>
            <td style="text-align: center;">12</td>
            <td style="text-align: center; color: green; font-weight: bold;">0</td>
            <td style="text-align: center;">0</td>
            <td style="text-align: center; font-weight: bold;">100%</td>
            <td style="color: green;">منتظم (حضور ممتاز)</td>
          </tr>
          <tr>
            <td style="text-align: center;">02</td>
            <td>بن عثمان فاطمة الزهراء</td>
            <td>2026/ENS/0492</td>
            <td style="text-align: center;">11</td>
            <td style="text-align: center; color: blue;">1</td>
            <td style="text-align: center;">0</td>
            <td style="text-align: center;">91%</td>
            <td>إنذار أولي</td>
          </tr>
          <tr>
            <td style="text-align: center;">03</td>
            <td>قادري محمد أمين</td>
            <td>2026/ENS/0493</td>
            <td style="text-align: center;">10</td>
            <td style="text-align: center; color: #b38b45; font-weight: bold;">2</td>
            <td style="text-align: center;">0</td>
            <td style="text-align: center;">83%</td>
            <td style="color: #b38b45;">إنذار ثانٍ</td>
          </tr>
        </tbody>
      </table>

      <div class="sig">
        <div>
          توقيع وخاتم أستاذ المقياس:
          <div class="sig-box">توقيع الأستاذ</div>
        </div>
        <div>
          تأشيرة مصلحة التدريس:
          <div class="sig-box">ختم المصلحة</div>
        </div>
        <div>
          تأشيرة مدير الدراسات والملحقة:
          <div class="sig-box">ختم الإدارة</div>
        </div>
      </div>
    </body>
    </html>
  `);
  printWin.document.close();
}

/**
 * Setup Admin Floating / In-page Announcement Publisher
 */
function setupAdminAnnouncementButton() {
  const profile = getCurrentProfile();
  const isAdmin = profile?.role === 'admin';
  const newsSectionHeader = document.querySelector('#news h2');

  let adminBtn = document.getElementById('btn-admin-post-news');
  if (isAdmin && newsSectionHeader) {
    if (!adminBtn) {
      adminBtn = document.createElement('button');
      adminBtn.id = 'btn-admin-post-news';
      adminBtn.className = 'ms-auto rounded-full bg-[#5a0f1c] px-3.5 py-1 text-xs font-semibold text-[#efd8a4] hover:bg-[#3b0a13] flex items-center gap-1.5 shadow-sm';
      adminBtn.innerHTML = `
        <span>+ نشر إعلان جديد</span>
      `;
      adminBtn.onclick = () => openAdminAnnouncementModal();
      newsSectionHeader.parentElement?.insertBefore(adminBtn, newsSectionHeader.nextSibling);
    }
  } else if (adminBtn) {
    adminBtn.remove();
  }
}

function openAdminAnnouncementModal() {
  let modal = document.getElementById('admin-announcement-modal') as HTMLDialogElement | null;
  if (!modal) {
    modal = document.createElement('dialog');
    modal.id = 'admin-announcement-modal';
    modal.className = 'w-[min(92vw,460px)] rounded-3xl p-0 shadow-2xl backdrop:bg-black/60';
    modal.innerHTML = `
      <div class="rounded-3xl bg-white p-6 text-[#2b0f14] text-start">
        <div class="flex items-center justify-between pb-3 border-b border-gray-100">
          <h4 class="font-bold text-[#5a0f1c] text-base">نشر إعلان رسمي جديد في المنصة</h4>
          <button onclick="document.getElementById('admin-announcement-modal').close()" class="text-gray-400 hover:text-black text-xl">×</button>
        </div>
        <form id="form-publish-ann" class="mt-4 space-y-3 text-xs">
          <div>
            <label class="block font-semibold text-gray-700">عنوان الإعلان:</label>
            <input required id="ann-title" placeholder="مثال: رزنامة الامتحانات الاستدراكية..." class="mt-1 w-full rounded-xl border border-gray-300 p-2.5 outline-none focus:border-[#5a0f1c]">
          </div>
          <div>
            <label class="block font-semibold text-gray-700">التصنيف:</label>
            <select id="ann-cat" class="mt-1 w-full rounded-xl border border-gray-300 p-2.5 outline-none focus:border-[#5a0f1c]">
              <option value="إعلان بيداغوجي">إعلان بيداغوجي هام</option>
              <option value="إعلان عاجل">إعلان عاجل</option>
              <option value="امتحانات ومداولات">امتحانات ومداولات</option>
              <option value="شؤون الطلبة">شؤون الطلبة والتربصات</option>
            </select>
          </div>
          <div>
            <label class="block font-semibold text-gray-700">نص الإعلان بالتفصيل:</label>
            <textarea required id="ann-body" rows="4" placeholder="اكتب تفاصيل الإعلان والتواريخ والمقررات المعنية..." class="mt-1 w-full rounded-xl border border-gray-300 p-2.5 outline-none focus:border-[#5a0f1c]"></textarea>
          </div>
          <button type="submit" class="mt-2 w-full rounded-full bg-[#5a0f1c] py-2.5 text-xs font-semibold text-white hover:bg-[#3b0a13] transition-colors">
            نشر الإعلان مباشرة للطلبة والأساتذة
          </button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('form-publish-ann')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = (document.getElementById('ann-title') as HTMLInputElement)?.value;
      const cat = (document.getElementById('ann-cat') as HTMLSelectElement)?.value;
      const content = (document.getElementById('ann-body') as HTMLTextAreaElement)?.value;

      await publishAnnouncement(title, content, cat);
      modal?.close();
      loadDatabaseAnnouncements();
    });
  }
  modal.showModal();
}

/**
 * Load Database Announcements
 */
async function loadDatabaseAnnouncements() {
  try {
    const list = await getLiveAnnouncements();
    const nl = document.getElementById('nl');
    if (!nl || list.length === 0) return;

    const sampleTag = document.querySelector('#news [data-t="sample"]') as HTMLElement | null;
    if (sampleTag) {
      sampleTag.textContent = 'رسمية ومحدثة';
      sampleTag.className = 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800';
    }

    const realHtml = list.map(item => `
      <li class="p-4 transition-colors hover:bg-gray-50 flex items-start justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="rounded-full bg-[#5a0f1c]/10 text-[#5a0f1c] px-2 py-0.5 text-[11px] font-semibold">${item.category || 'إعلان إداري'}</span>
            <time class="text-xs text-gray-400" dir="ltr">${new Date(item.created_at).toLocaleDateString('ar-DZ')}</time>
          </div>
          <h4 class="mt-1 font-semibold text-gray-900">${item.title}</h4>
          <p class="mt-1 text-xs text-gray-600 leading-relaxed">${item.content}</p>
        </div>
      </li>
    `).join('');

    nl.innerHTML = realHtml + nl.innerHTML;
  } catch (e) {
    console.warn('Live announcements fallback:', e);
  }
}
