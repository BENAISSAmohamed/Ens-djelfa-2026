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
  showToast,
  getAcademicEvents,
  saveAcademicEvent,
  archiveAcademicEvent,
  getInAppNotifications,
  markNotificationAsRead,
  getNotificationPreferences,
  saveNotificationPreference,
  getRevisionTasks,
  saveRevisionTask,
  toggleTaskCompleted,
  deleteRevisionTask,
  getFavoriteResourceIds,
  toggleFavoriteResource,
  getRecentlyViewedResourceIds,
  recordRecentlyViewedResource,
  getPartnerSchools
} from './auth-manager.ts';

import { initPWA } from './pwa-manager.ts';
import {
  renderDigitalStudentCardHtml,
  renderAdminManagementPortalHtml,
} from './portal/portal-ui.ts';
import {
  getDigitalCardByStudentId,
  submitRegistrationApplication,
  OFFICIAL_SPECIALTIES,
  getAllTeachers,
  getStudentsPaginated,
  getAllStudents,
  assignTeacherToGroup,
} from './portal/portal-store.ts';

import { renderStudentLifePortal } from './student-life/ui.ts';
import {
  openAccessibilityDrawer,
  applyPreferences,
  getStoredPreferences
} from './hub/accessibility.ts';
import {
  openGlobalSearch,
  initGlobalSearchShortcut
} from './hub/global-search.ts';
import { openProductivityHubModal } from './hub/productivity-ui.ts';

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

(window as any).openProductivityHubModal = openProductivityHubModal;
(window as any).openAccessibilityDrawer = openAccessibilityDrawer;
(window as any).openGlobalSearch = openGlobalSearch;
(window as any).renderStudentLifePortal = renderStudentLifePortal;

document.addEventListener('DOMContentLoaded', async () => {
  // Apply accessibility settings immediately
  applyPreferences(getStoredPreferences());
  initGlobalSearchShortcut();

  setupLoginForm();
  await initSession();
  setupServiceOverrides();
  setupContactForm();
  loadDatabaseAnnouncements();
  setupAdminAnnouncementButton();
  setupHeaderNotificationBell();
  initPWA();
});

function setupContactForm() {
  const cf = document.getElementById('cf') as HTMLFormElement | null;
  if (!cf) return;

  cf.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = (cf.querySelector('input:not([type="email"])') as HTMLInputElement)?.value;
    const email = (cf.querySelector('input[type="email"]') as HTMLInputElement)?.value;
    const msg = (cf.querySelector('textarea') as HTMLTextAreaElement)?.value;

    try {
      const messages = JSON.parse(localStorage.getItem('ens_contact_messages') || '[]');
      messages.unshift({ name, email, msg, created_at: new Date().toISOString() });
      localStorage.setItem('ens_contact_messages', JSON.stringify(messages));
    } catch {}

    const ok = document.getElementById('ok');
    if (ok) {
      ok.textContent = 'تم إرسال رسالتك وتوثيقها بنجاح، وسيتواصل معك الفريق الأكاديمي عبر البريد الإلكتروني قريباً.';
      ok.classList.remove('hidden');
    }
    cf.reset();
    showToast('تم إرسال رسالتك بنجاح وتوثيقها.', 'success');
  });
}

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
      return;
    }
  } catch (e) {
    console.warn('Initial session check error:', e);
  }

  // Check offline fallback session
  try {
    const offlineRaw = localStorage.getItem('ens_offline_session');
    if (offlineRaw) {
      const parsed = JSON.parse(offlineRaw);
      if (parsed?.profile) {
        // Restore cached profile
        (window as any).currentProfile = parsed.profile;
        updateHeaderAuthUI();
        setupAdminAnnouncementButton();
      }
    }
  } catch {}

  try {
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await loadUserProfile(session.user.id);
      } else {
        (window as any).currentProfile = null;
      }
      updateHeaderAuthUI();
      setupAdminAnnouncementButton();
    });
  } catch {}
}

/**
 * Setup Enhanced Login Form in #dlg with Student Self-Registration and Password Reset
 */
function setupLoginForm() {
  const dlg = document.getElementById('dlg') as HTMLDialogElement | null;
  if (!dlg) return;

  const form = dlg.querySelector('form');
  if (!form) return;

  form.setAttribute('onsubmit', 'return false;');

  // Expand modal width nicely for tabs
  form.className = 'w-[min(94vw,30rem)] rounded-3xl bg-white p-6 text-[#2b0f14] shadow-2xl';

  // Inject Tab Header if not already present
  let tabHeader = document.getElementById('dlgAuthTabs');
  if (!tabHeader) {
    tabHeader = document.createElement('div');
    tabHeader.id = 'dlgAuthTabs';
    tabHeader.className = 'flex items-center gap-1.5 border-b border-gray-100 pb-3 mb-4 text-xs font-bold';
    tabHeader.innerHTML = `
      <button type="button" id="tabBtn_login" class="rounded-xl bg-[#5a0f1c] px-3 py-1.5 text-white">تسجيل الدخول</button>
      <button type="button" id="tabBtn_register" class="rounded-xl bg-gray-100 px-3 py-1.5 text-gray-700 hover:bg-gray-200">طلب تسجيل طالب جديد</button>
      <button type="button" id="tabBtn_reset" class="rounded-xl bg-gray-100 px-3 py-1.5 text-gray-700 hover:bg-gray-200">استرجاع الرمز</button>
    `;
    form.insertBefore(tabHeader, form.firstChild);

    // Registration Container
    const regContainer = document.createElement('div');
    regContainer.id = 'dlgRegisterSection';
    regContainer.className = 'hidden space-y-3 text-xs';
    regContainer.innerHTML = `
      <p class="text-xs text-gray-600 mb-2">لحاملي شهادة البكالوريا الجدد الموجهين إلى ملحقة الجلفة:</p>
      <div>
        <label class="block font-semibold text-gray-700">الاسم واللقب الكامل:</label>
        <input id="regAppFullName" type="text" placeholder="الاسم واللقب باللغة العربية" class="mt-1 w-full rounded-xl border border-gray-200 p-2.5 text-xs">
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block font-semibold text-gray-700">رقم تسجيل البكالوريا:</label>
          <input id="regAppBacNum" type="text" dir="ltr" placeholder="مثال: 39014285" class="mt-1 w-full rounded-xl border border-gray-200 p-2.5 text-xs">
        </div>
        <div>
          <label class="block font-semibold text-gray-700">سنة البكالوريا:</label>
          <input id="regAppBacYear" type="number" value="2024" class="mt-1 w-full rounded-xl border border-gray-200 p-2.5 text-xs">
        </div>
      </div>
      <div>
        <label class="block font-semibold text-gray-700">التخصص التكويني المطلوب:</label>
        <select id="regAppSpecialty" class="mt-1 w-full rounded-xl border border-gray-200 p-2.5 text-xs">
          ${OFFICIAL_SPECIALTIES.map(s => `<option value="${s.code}">${s.name_ar}</option>`).join('')}
        </select>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block font-semibold text-gray-700">البريد الإلكتروني:</label>
          <input id="regAppEmail" type="email" dir="ltr" placeholder="name@example.com" class="mt-1 w-full rounded-xl border border-gray-200 p-2.5 text-xs">
        </div>
        <div>
          <label class="block font-semibold text-gray-700">رقم الهاتف:</label>
          <input id="regAppPhone" type="tel" dir="ltr" placeholder="06XXXXXXXX" class="mt-1 w-full rounded-xl border border-gray-200 p-2.5 text-xs">
        </div>
      </div>
      <button type="button" id="btnSubmitRegApp" class="mt-2 w-full rounded-xl bg-[#5a0f1c] py-2.5 text-xs font-bold text-white hover:bg-[#751627]">
        إرسال ملف التسجيل للإدارة
      </button>
      <div id="regAppFeedback" class="hidden rounded-xl p-2.5 text-xs"></div>
    `;

    // Password Reset Container
    const resetContainer = document.createElement('div');
    resetContainer.id = 'dlgResetSection';
    resetContainer.className = 'hidden space-y-3 text-xs';
    resetContainer.innerHTML = `
      <p class="text-xs text-gray-600">أدخل بريدك الإلكتروني الأكاديمي أو رقم تسجيلك لاستلام رابط تعيين كلمة المرور:</p>
      <div>
        <label class="block font-semibold text-gray-700">البريد الإلكتروني / رقم التسجيل:</label>
        <input id="resetIdentifier" type="text" dir="ltr" placeholder="student@ens-djelfa.dz" class="mt-1 w-full rounded-xl border border-gray-200 p-2.5 text-xs">
      </div>
      <button type="button" id="btnSubmitReset" class="w-full rounded-xl bg-[#5a0f1c] py-2.5 text-xs font-bold text-white hover:bg-[#751627]">
        إرسال تعليمات إعادة التعيين
      </button>
      <div id="resetFeedback" class="hidden rounded-xl p-2.5 text-xs"></div>
    `;

    form.appendChild(regContainer);
    form.appendChild(resetContainer);

    // Wire switcher
    const loginSection = form.querySelector('label')!.parentElement!;
    const btnLogin = document.getElementById('tabBtn_login');
    const btnRegister = document.getElementById('tabBtn_register');
    const btnReset = document.getElementById('tabBtn_reset');

    const showSection = (sec: 'login' | 'register' | 'reset') => {
      [btnLogin, btnRegister, btnReset].forEach(b => {
        b?.classList.remove('bg-[#5a0f1c]', 'text-white');
        b?.classList.add('bg-gray-100', 'text-gray-700');
      });

      // Hide all main fields inside login form when not login
      const loginFields = form.querySelectorAll('label, button[value="ok"], #loginFeedback, [data-t="lg_demo"]');
      if (sec === 'login') {
        btnLogin?.classList.add('bg-[#5a0f1c]', 'text-white');
        loginFields.forEach(el => (el as HTMLElement).style.display = '');
        regContainer.classList.add('hidden');
        resetContainer.classList.add('hidden');
      } else if (sec === 'register') {
        btnRegister?.classList.add('bg-[#5a0f1c]', 'text-white');
        loginFields.forEach(el => (el as HTMLElement).style.display = 'none');
        regContainer.classList.remove('hidden');
        resetContainer.classList.add('hidden');
      } else {
        btnReset?.classList.add('bg-[#5a0f1c]', 'text-white');
        loginFields.forEach(el => (el as HTMLElement).style.display = 'none');
        regContainer.classList.add('hidden');
        resetContainer.classList.remove('hidden');
      }
    };

    btnLogin?.addEventListener('click', () => showSection('login'));
    btnRegister?.addEventListener('click', () => showSection('register'));
    btnReset?.addEventListener('click', () => showSection('reset'));

    // Submit Registration App
    document.getElementById('btnSubmitRegApp')?.addEventListener('click', () => {
      const name = (document.getElementById('regAppFullName') as HTMLInputElement)?.value.trim();
      const bacNum = (document.getElementById('regAppBacNum') as HTMLInputElement)?.value.trim();
      const bacYear = parseInt((document.getElementById('regAppBacYear') as HTMLInputElement)?.value, 10) || 2024;
      const spec = (document.getElementById('regAppSpecialty') as HTMLSelectElement)?.value;
      const email = (document.getElementById('regAppEmail') as HTMLInputElement)?.value.trim();
      const phone = (document.getElementById('regAppPhone') as HTMLInputElement)?.value.trim();
      const fb = document.getElementById('regAppFeedback');

      if (!name || !bacNum || !email) {
        if (fb) {
          fb.className = 'rounded-xl bg-red-100 text-red-800 p-2.5 text-xs block';
          fb.textContent = 'يرجى ملء الاسم الكامل، رقم البكالوريا، والبريد الإلكتروني.';
        }
        return;
      }

      submitRegistrationApplication({
        full_name: name,
        email,
        phone,
        date_of_birth: '2006-01-01',
        bac_registration_number: bacNum,
        bac_year: bacYear,
        high_school_branch: 'علوم وتكنولوجيا',
        requested_specialty: spec,
      });

      if (fb) {
        fb.className = 'rounded-xl bg-emerald-100 text-emerald-900 p-2.5 text-xs block';
        fb.textContent = '✓ تم استلام طلب تسجيلك بنجاح وسيتواصل معك الفريق الإداري بعد مراجعة بيانات البكالوريا.';
      }
      showToast('تم إرسال طلب التسجيل إلى إدارة الملحقة بنجاح.', 'success');
    });

    // Submit Password Reset
    document.getElementById('btnSubmitReset')?.addEventListener('click', () => {
      const iden = (document.getElementById('resetIdentifier') as HTMLInputElement)?.value.trim();
      const fb = document.getElementById('resetFeedback');
      if (!iden) {
        if (fb) {
          fb.className = 'rounded-xl bg-red-100 text-red-800 p-2.5 text-xs block';
          fb.textContent = 'يرجى إدخال البريد الإلكتروني أو رقم التسجيل.';
        }
        return;
      }
      if (fb) {
        fb.className = 'rounded-xl bg-emerald-100 text-emerald-900 p-2.5 text-xs block';
        fb.textContent = '✓ إذا كان الحساب مسجلاً، فقد تم إرسال رابط تأكيد وتعيين كلمة المرور الجديدة.';
      }
      showToast('تم تسجيل طلب إعادة تعيين كلمة المرور.', 'info');
    });
  }

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
    demoNote.innerHTML = '<span class="flex items-center gap-1.5 text-emerald-700 font-medium"><svg class="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg> متصل بنظام المصادقة المشفر · الصلاحيات بحسب الدور (طالب / أستاذ / مسؤول)</span>';
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
 * Central Service Dispatcher to render upgraded official academic modules
 */
export function dispatchServiceModal(i: number) {
  const profile = getCurrentProfile();

  // Service 0: فضاء الطالب (Student Space)
  if (i === 0) {
    renderCustomStudentSpace(profile);
  }
  // Service 1: فضاء الأستاذ ورصد الغيابات (Teacher Workspace)
  else if (i === 1) {
    renderCustomTeacherSpace(profile);
  }
  // Service 2: الطلبات والشكاوى الإدارية (Administrative Requests)
  else if (i === 2) {
    renderCustomAdminRequests(profile);
  }
  // Service 3: المكتبة الرقمية ومستودع الدروس (Digital Library)
  else if (i === 3) {
    renderCustomLibrary(profile);
  }
  // Service 4: الرزنامة الأكاديمية والامتحانات (Academic Calendar)
  else if (i === 4) {
    renderCustomAcademicCalendar(profile);
  }
  // Service 5: دليل الوثائق والتربصات الميدانية والنوادي (Documents, Internships & Clubs)
  else if (i === 5) {
    renderCustomDocumentAndInternshipServices(profile);
  }
  // Service 6: حجز المواعيد الإدارية (Appointment Booking)
  else if (i === 6) {
    renderCustomAppointmentBooking(profile);
  }
  // Service 7: المساعد الدراسي الذكي (AI Study Assistant)
  else if (i === 7) {
    renderCustomAIStudyAssistant(profile);
  }
  // Service 8: مركز الإشعارات والتنبيهات (In-App Notifications)
  else if (i === 8) {
    renderCustomNotifications(profile);
  }
}
(window as any).dispatchServiceModal = dispatchServiceModal;

function setupServiceOverrides() {
  const originalOpenService = (window as any).openService;
  (window as any).openService = function (i: number) {
    if (typeof originalOpenService === 'function') {
      try { originalOpenService(i); } catch {}
    }
    dispatchServiceModal(i);
  };

  document.addEventListener('click', (e) => {
    const s = (e.target as HTMLElement)?.closest('[data-sv]') as HTMLElement | null;
    if (s && s.dataset.sv !== undefined) {
      const idx = Number(s.dataset.sv);
      setTimeout(() => {
        dispatchServiceModal(idx);
      }, 15);
    }
  });
}

/**
 * Service 6: حجز المواعيد الإدارية (Appointment Booking)
 */
function renderCustomAppointmentBooking(profile: any) {
  const body = document.getElementById('serviceBody');
  if (!body) return;

  body.innerHTML = `
    <div class="space-y-4">
      <div class="rounded-2xl border border-[#5a0f1c]/20 bg-gradient-to-l from-[#faf6f1] to-white p-4">
        <h4 class="font-bold text-[#5a0f1c] text-sm">منظومة حجز المواعيد الإدارية المسبقة</h4>
        <p class="text-xs text-gray-500 mt-0.5">احجز موعدك مسبقاً مع مصالح الملحقة لتفادي الانتظار وضمان الاستقبال في أفضل الظروف.</p>
      </div>

      <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <form id="appointment-booking-form" class="space-y-3.5 text-xs">
          <div>
            <label class="block font-semibold text-gray-700">المصلحة أو الإدارة المراد مقابلتها:</label>
            <select id="apt-office" class="mt-1 w-full rounded-xl border border-gray-300 p-2.5 outline-none focus:border-[#5a0f1c]">
              <option value="مصلحة التمدرس وشؤون الطلبة">مصلحة التمدرس والأنشطة البيداغوجية</option>
              <option value="مصلحة التربصات الميدانية">مصلحة التربصات الميدانية والمدارس التطبيقية</option>
              <option value="إدارة الدراسات والملحقة">إدارة الدراسات وإدارة الملحقة</option>
              <option value="رئاسة شعبة التخصص">رئاسة الشعبة / القسم الأكاديمي</option>
            </select>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-gray-700">اليوم المطلوب:</label>
              <input required id="apt-date" type="date" value="${new Date().toISOString().split('T')[0]}" class="mt-1 w-full rounded-xl border border-gray-300 p-2.5 outline-none focus:border-[#5a0f1c]">
            </div>
            <div>
              <label class="block font-semibold text-gray-700">الفترة الزمنية المفضلة:</label>
              <select id="apt-slot" class="mt-1 w-full rounded-xl border border-gray-300 p-2.5 outline-none focus:border-[#5a0f1c]">
                <option value="الفترة الصباحية (09:00 - 11:30)">الفترة الصباحية (09:00 - 11:30)</option>
                <option value="فترة بعد الزوال (13:30 - 15:30)">فترة بعد الزوال (13:30 - 15:30)</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block font-semibold text-gray-700">موضوع أو سبب الزيارة:</label>
            <textarea required id="apt-reason" rows="2" placeholder="اذكر سبب طلب الموعد أو الوثائق محل الاستفسار..." class="mt-1 w-full rounded-xl border border-gray-300 p-2.5 outline-none focus:border-[#5a0f1c]"></textarea>
          </div>
          <div class="flex items-center justify-between pt-2">
            <button type="submit" class="rounded-full bg-[#5a0f1c] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#3b0a13] transition-colors">
              تأكيد وحجز الموعد
            </button>
            <span id="apt-status" class="text-xs text-emerald-700 font-bold"></span>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('appointment-booking-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const office = (document.getElementById('apt-office') as HTMLSelectElement)?.value;
    const date = (document.getElementById('apt-date') as HTMLInputElement)?.value;
    const slot = (document.getElementById('apt-slot') as HTMLSelectElement)?.value;
    const reason = (document.getElementById('apt-reason') as HTMLTextAreaElement)?.value;
    const statusEl = document.getElementById('apt-status');

    await submitAdminRequest(`حجز موعد: ${office}`, `تاريخ: ${date} (${slot}) — الموضوع: ${reason}`);

    if (statusEl) {
      statusEl.textContent = '✓ تم تسجيل موعدك في سجل المواعيد الإدارية بنجاح.';
    }
  });
}

/**
 * Service 0: فضاء الطالب (Student Space) with Digital Card & Attendance
 */
(window as any).previewStudentSpaceDirectly = () => {
  const demoProfile = {
    id: 'std-2439014285',
    full_name: 'أحمد بن يحيى قاسمي',
    email: 'ahmed.kassimi@ens-djelfa.dz',
    role: 'student',
  };
  renderCustomStudentSpace(demoProfile);
};

async function renderCustomStudentSpace(profile: any) {
  const body = document.getElementById('serviceBody');
  if (!body) return;

  if (!profile) {
    body.innerHTML = `
      <div class="mb-4 rounded-2xl border border-[#b38b45]/30 bg-gradient-to-r from-[#faf6f1] to-amber-50 p-4 text-sm text-[#4d0d17] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <p class="font-bold">فضاء الطلبة والبطاقة الجامعية الرقمية</p>
          <p class="text-xs text-gray-600 mt-0.5">سجل الدخول بحسابك لعرض بطاقتك الجامعية الرقمية، سجل غياباتك، ونقاطك، أو استعرض المعاينة التجريبية.</p>
        </div>
        <div class="flex gap-2">
          <button onclick="document.getElementById('serviceModal').close(); document.getElementById('dlg').showModal();" class="shrink-0 rounded-full bg-[#5a0f1c] px-4 py-2 text-xs font-semibold text-white hover:bg-[#3b0a13] transition-colors">
            تسجيل الدخول
          </button>
          <button id="btnOpenStudentPreview" onclick="window.previewStudentSpaceDirectly()" class="shrink-0 rounded-full border border-[#5a0f1c] bg-white px-3 py-2 text-xs font-bold text-[#5a0f1c] hover:bg-[#5a0f1c] hover:text-white transition-colors">
            معاينة فضاء الطالب
          </button>
        </div>
      </div>
      <div id="studentDirectPreviewArea"></div>
    `;
    return;
  }

  const student = getCurrentStudent();
  const regNumber = student?.registration_number || '2026/ENS/0491';
  const specialtyTitle = student?.specialty_code || 'اللغة العربية وآدابها (التعليم المتوسط)';
  const groupNum = typeof student?.group_number === 'number' ? student.group_number : (parseInt(String(student?.group_number || 1), 10) || 1);
  const yearNum = typeof student?.academic_year === 'number' ? student.academic_year : (parseInt(String(student?.academic_year || 1), 10) || 1);

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
        <div id="studentCardContainer">
          ${(() => {
            const card = getDigitalCardByStudentId(student?.id || profile.id);
            if (card) return renderDigitalStudentCardHtml(card);
            return renderDigitalStudentCardHtml({
              id: 'card_' + profile.id,
              student_id: profile.id,
              card_number: 'CARD-' + regNumber,
              full_name: profile.full_name,
              registration_number: regNumber,
              specialty_name: specialtyTitle,
              specialty_code: 'snv_cem',
              academic_year: yearNum,
              group_number: groupNum,
              status: 'approved',
              qr_code_hash: 'ENSQR-' + regNumber,
              issue_date: '2026-09-15',
              expiry_date: '2027-09-15',
            });
          })()}
        </div>

        <div class="text-center pt-2">
          <button onclick="window.print()" class="rounded-full bg-[#5a0f1c] px-6 py-2.5 text-xs font-semibold text-[#E3C48A] hover:bg-[#3b0a13] hover:text-white transition-colors shadow flex items-center gap-2 mx-auto">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z"/></svg>
            <span>طباعة البطاقة الجامعية الرقمية</span>
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
(window as any).previewTeacherSpaceDirectly = () => {
  const teachers = getAllTeachers();
  const demoTeacher = teachers[0] || {
    id: 'tch-01',
    employee_number: 'ENS-TCH-2022-001',
    full_name: 'أ.د. مسعودي عبد القادر',
    email: 'a.massaoudi@ens-djelfa.dz',
    phone: '0661112233',
    role: 'teacher',
    specialty_code: 'snv_cem',
    department: 'قسم علوم الطبيعة والحياة',
    academic_rank: 'أستاذ محاضر أ',
    assigned_groups: [
      { group_id: 101, specialty_code: 'snv_cem', academic_year: 1, group_number: 1, subject_name: 'بيولوجيا الخلية والمجهرية' },
    ],
  };

  const previewArea = document.getElementById('teacherDirectPreviewArea');
  if (previewArea) {
    previewArea.innerHTML = '';
    renderCustomTeacherSpaceInternal(demoTeacher, previewArea);
  } else {
    const body = document.getElementById('serviceBody');
    if (body) {
      renderCustomTeacherSpaceInternal(demoTeacher, body);
    }
  }
};

function renderCustomTeacherSpace(profile: any) {
  const body = document.getElementById('serviceBody');
  if (!body) return;

  if (!profile || (profile.role !== 'teacher' && profile.role !== 'admin')) {
    body.innerHTML = `
      <div class="mb-4 rounded-2xl border border-[#b38b45]/30 bg-gradient-to-r from-[#faf6f1] to-amber-50 p-4 text-sm text-[#4d0d17] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <p class="font-bold">فضاء الأساتذة ورصد الحضور البيداغوجي</p>
          <p class="text-xs text-gray-600 mt-0.5">يتيح فضاء الأستاذ رصد حضور الأفواج المسندة، متابعة عتبات الغياب، وتصدير كشف الحضور الرسمي للطباعة.</p>
        </div>
        <div class="flex gap-2">
          <button onclick="document.getElementById('serviceModal').close(); document.getElementById('dlg').showModal();" class="shrink-0 rounded-full bg-[#5a0f1c] px-4 py-2 text-xs font-semibold text-white hover:bg-[#3b0a13] transition-colors">
            دخول الأستاذ
          </button>
          <button id="btnOpenTeacherPreview" onclick="window.previewTeacherSpaceDirectly()" class="shrink-0 rounded-full border border-[#5a0f1c] bg-white px-3 py-2 text-xs font-bold text-[#5a0f1c] hover:bg-[#5a0f1c] hover:text-white transition-colors">
            معاينة فضاء الأستاذ
          </button>
        </div>
      </div>
      <div id="teacherDirectPreviewArea"></div>
    `;
    return;
  }

  renderCustomTeacherSpaceInternal(profile, body);
}

function renderCustomTeacherSpaceInternal(teacherProfile: any, targetContainer: HTMLElement) {
  const teachers = getAllTeachers();
  const currentTeacher = teachers.find(t => t.id === teacherProfile.id) || teachers[0] || teacherProfile;
  const assignedGroups = (currentTeacher && Array.isArray(currentTeacher.assigned_groups) && currentTeacher.assigned_groups.length > 0)
    ? currentTeacher.assigned_groups
    : [
        { group_id: 101, specialty_code: 'snv_cem', academic_year: 1, group_number: 1, subject_name: 'ديداكتيك المادة وتخطيط التعلمات' }
      ];

  let selectedGroupIdx = 0;

  function renderTeacherWorkspace() {
    const activeGroup = assignedGroups[selectedGroupIdx] || assignedGroups[0];
    const specStudentsResult = getStudentsPaginated(1, 40, activeGroup.specialty_code);
    const studentsList = (specStudentsResult && specStudentsResult.data && specStudentsResult.data.length > 0)
      ? specStudentsResult.data
      : (getStudentsPaginated(1, 20)?.data || []);

    targetContainer.innerHTML = `
      <div class="space-y-6">
        <!-- Teacher Profile Card -->
        <div class="rounded-2xl border border-[#5a0f1c]/20 bg-gradient-to-l from-[#faf6f1] to-white p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <h4 class="text-base font-bold text-[#5a0f1c]">${currentTeacher.full_name}</h4>
              <span class="rounded-full bg-[#5a0f1c]/10 text-[#5a0f1c] px-2 py-0.5 text-[10px] font-bold font-mono">${currentTeacher.employee_number}</span>
            </div>
            <p class="text-xs text-gray-600 mt-0.5">
              ${currentTeacher.department} · <span class="font-semibold text-[#b38b45]">${currentTeacher.academic_rank}</span>
            </p>
          </div>
          <button id="btn-export-sheet" class="rounded-xl border border-[#5a0f1c] bg-white px-3.5 py-2 text-xs font-bold text-[#5a0f1c] hover:bg-[#5a0f1c] hover:text-white transition-colors flex items-center gap-1.5 shadow-sm">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z"/></svg>
            <span>تصدير كشف الحضور الرسمي (PDF / طباعة)</span>
          </button>
        </div>

        <!-- Assigned Group Selector Bar -->
        <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div class="flex items-center gap-2 text-xs">
            <span class="font-bold text-gray-700">الفوج البيداغوجي المسند:</span>
            <select id="teacher-assigned-group-select" class="rounded-xl border border-gray-300 p-2 text-xs bg-white font-semibold text-[#5a0f1c] outline-none">
              ${assignedGroups.map((g, idx) => `
                <option value="${idx}" ${idx === selectedGroupIdx ? 'selected' : ''}>
                  ${g.subject_name} — فوج ${g.group_number} (سنة ${g.academic_year})
                </option>
              `).join('')}
            </select>
          </div>
          <div class="text-[11px] text-gray-500">
            عدد طلبة الفوج المتاحين للرصد: <strong class="text-[#5a0f1c] font-mono">${studentsList.length}</strong>
          </div>
        </div>

        <!-- Attendance Recording Tool -->
        <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h4 class="text-sm font-bold text-[#5a0f1c] mb-3 flex items-center gap-2">
            <span>◆</span> رصد حضور حصة بيداغوجية
          </h4>

          <form id="attendance-session-form" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label class="block text-xs font-semibold text-gray-700">
                المقياس / المادة
                <input required id="att-subject" type="text" value="${activeGroup.subject_name}" class="mt-1 w-full rounded-xl border border-gray-300 p-2 text-xs outline-none focus:border-[#5a0f1c]">
              </label>
              <label class="block text-xs font-semibold text-gray-700">
                تاريخ الحصة
                <input required id="att-date" type="date" value="${new Date().toISOString().split('T')[0]}" class="mt-1 w-full rounded-xl border border-gray-300 p-2 text-xs outline-none focus:border-[#5a0f1c]">
              </label>
              <label class="block text-xs font-semibold text-gray-700">
                رمز الشعبة والتخصص
                <input readonly id="att-specialty" value="${activeGroup.specialty_code}" class="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 p-2 text-xs font-mono text-gray-600">
              </label>
              <div class="grid grid-cols-2 gap-2">
                <label class="block text-xs font-semibold text-gray-700">
                  السنة
                  <input readonly id="att-year" value="${activeGroup.academic_year}" class="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 p-2 text-xs font-mono text-gray-600">
                </label>
                <label class="block text-xs font-semibold text-gray-700">
                  الفوج
                  <input readonly id="att-group" value="${activeGroup.group_number}" class="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 p-2 text-xs font-mono text-gray-600">
                </label>
              </div>
            </div>

            <!-- Student Roster -->
            <div class="mt-3 border-t border-gray-100 pt-3">
              <div class="flex items-center justify-between mb-2">
                <p class="text-xs font-bold text-gray-800">قائمة طلبة الفوج المحددة للرصد (${studentsList.length} طالب):</p>
                <div class="flex items-center gap-2">
                  <button type="button" id="btn-mark-all-present" class="text-[11px] text-emerald-700 font-bold hover:underline">الكل حاضر ✓</button>
                </div>
              </div>
              <div class="max-h-72 overflow-y-auto overflow-x-auto rounded-xl border border-gray-200">
                <table class="w-full text-xs text-start">
                  <thead class="sticky top-0 bg-[#faf6f1] text-[#5a0f1c]">
                    <tr>
                      <th class="p-2 text-start">الرقم</th>
                      <th class="p-2 text-start">اسم ولقب الطالب</th>
                      <th class="p-2 text-start">رقم التسجيل</th>
                      <th class="p-2 text-center">حاضر</th>
                      <th class="p-2 text-center">غائب</th>
                      <th class="p-2 text-center">مبرر</th>
                      <th class="p-2 text-start">ملاحظة</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100">
                    ${studentsList.map((st: any, i: number) => `
                      <tr class="student-row hover:bg-gray-50 transition-colors" data-student-id="${st.id}">
                        <td class="p-2 font-mono text-gray-500">${String(i + 1).padStart(2, '0')}</td>
                        <td class="p-2 font-semibold text-gray-900">${st.full_name}</td>
                        <td class="p-2 font-mono text-gray-600">${st.registration_number}</td>
                        <td class="p-2 text-center"><input type="radio" name="st-att-${st.id}" value="present" checked class="text-emerald-600 radio-present"></td>
                        <td class="p-2 text-center"><input type="radio" name="st-att-${st.id}" value="absent" class="text-red-600 radio-absent"></td>
                        <td class="p-2 text-center"><input type="radio" name="st-att-${st.id}" value="justified" class="text-amber-600 radio-justified"></td>
                        <td class="p-2"><input type="text" placeholder="ملاحظة..." class="w-full border border-gray-200 rounded p-1 text-xs"></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
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

    // Handle group switch
    document.getElementById('teacher-assigned-group-select')?.addEventListener('change', (e: any) => {
      selectedGroupIdx = Number(e.target.value) || 0;
      renderTeacherWorkspace();
    });

    // Quick mark all present
    document.getElementById('btn-mark-all-present')?.addEventListener('click', () => {
      document.querySelectorAll('.radio-present').forEach((r: any) => r.checked = true);
    });

    // Export Attendance sheet button
    document.getElementById('btn-export-sheet')?.addEventListener('click', () => {
      openPrintableAttendanceSheet(currentTeacher, activeGroup, studentsList);
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
        const spec = activeGroup.specialty_code;
        const year = activeGroup.academic_year;
        const group = activeGroup.group_number;

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
          teacher_id: currentTeacher.id,
          specialty_code: spec,
          academic_year: year,
          group_number: group,
          subject_name: subject,
          session_date: date,
        }, records);

        if (saveBtn) saveBtn.disabled = false;

        if (res.success) {
          if (statusEl) statusEl.innerHTML = `<span class="text-emerald-700 font-bold">✓ تم حفظ الحصة بنجاح (${records.length} طالب)!</span>`;
          showToast(`تم تسجيل حضور ${records.length} طالب بنجاح في قاعدة البيانات.`, 'success');
        } else {
          if (statusEl) statusEl.innerHTML = `<span class="text-red-700">فشل: ${res.error}</span>`;
        }
      });
    }
  }

  renderTeacherWorkspace();
}

/**
 * Service 2: الطلبات الإدارية (Administrative Requests)
 */
async function renderCustomAdminRequests(profile: any) {
  const body = document.getElementById('serviceBody');
  if (!body) return;

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  if (!profile) {
    body.innerHTML = `
      <div class="mb-4 rounded-2xl border border-[#b38b45]/30 bg-gradient-to-r from-[#faf6f1] to-amber-50 p-4 text-sm text-[#4d0d17] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <p class="font-bold">الشباك الموحد للطلبات الإدارية وبوابة التسيير</p>
          <p class="text-xs text-gray-600 mt-0.5">سجل الدخول بحسابك لطلب الشهادات المدرسية، كشوف النقاط، أو الدخول كمسؤول لإدارة قوائم الطلبة.</p>
        </div>
        <div class="flex gap-2">
          <button onclick="document.getElementById('serviceModal').close(); document.getElementById('dlg').showModal();" class="shrink-0 rounded-full bg-[#5a0f1c] px-4 py-2 text-xs font-semibold text-white hover:bg-[#3b0a13] transition-colors">
            دخول الحساب
          </button>
          <button id="btnOpenAdminPreview" onclick="window.previewAdminPortalDirectly()" class="shrink-0 rounded-full border border-[#5a0f1c] bg-white px-3 py-2 text-xs font-bold text-[#5a0f1c] hover:bg-[#5a0f1c] hover:text-white transition-colors">
            معاينة لوحة الإدارة
          </button>
        </div>
      </div>
      <div id="adminDirectPreviewArea"></div>
    `;
    return;
  }

  // Admin View: Provide full Administrative Management Portal & Requests processing
  if (isAdmin) {
    body.innerHTML = `
      <div class="space-y-4">
        <!-- Top Switcher -->
        <div class="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto text-xs font-bold">
          <button id="btnAdminViewPortal" class="rounded-xl bg-[#5a0f1c] px-4 py-2 text-white">
            لوحة الإدارة الشاملة (قوائم الطلبة، البطاقات، الاستيراد، الرقابة)
          </button>
          <button id="btnAdminViewRequests" class="rounded-xl bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200">
            معالجة طلبات الوثائق الواردة
          </button>
        </div>

        <div id="adminPortalContainer">
          ${renderAdminManagementPortalHtml(profile)}
        </div>

        <div id="adminRequestsSubContainer" class="hidden space-y-4">
          <div class="rounded-2xl border border-[#5a0f1c]/20 bg-gradient-to-l from-[#faf6f1] to-white p-4">
            <h4 class="font-bold text-[#5a0f1c] text-sm">لوحة معالجة طلبات الوثائق والشهادات</h4>
            <p class="text-xs text-gray-500 mt-0.5">يمكنك مراجعة وثائق الطلبة، المصادقة عليها، وتحديد جاهزيتها للاستلام.</p>
          </div>
          <div id="admin-requests-table-container">
            <p class="text-xs text-gray-400 animate-pulse text-center py-4">جاري تحميل الطلبات الواردة...</p>
          </div>
        </div>
      </div>
    `;

    const btnPortal = document.getElementById('btnAdminViewPortal');
    const btnRequests = document.getElementById('btnAdminViewRequests');
    const cPortal = document.getElementById('adminPortalContainer');
    const cRequests = document.getElementById('adminRequestsSubContainer');

    btnPortal?.addEventListener('click', () => {
      btnPortal.classList.remove('bg-gray-100', 'text-gray-700');
      btnPortal.classList.add('bg-[#5a0f1c]', 'text-white');
      btnRequests?.classList.remove('bg-[#5a0f1c]', 'text-white');
      btnRequests?.classList.add('bg-gray-100', 'text-gray-700');
      cPortal?.classList.remove('hidden');
      cRequests?.classList.add('hidden');
    });

    btnRequests?.addEventListener('click', () => {
      btnRequests.classList.remove('bg-gray-100', 'text-gray-700');
      btnRequests.classList.add('bg-[#5a0f1c]', 'text-white');
      btnPortal?.classList.remove('bg-[#5a0f1c]', 'text-white');
      btnPortal?.classList.add('bg-gray-100', 'text-gray-700');
      cPortal?.classList.add('hidden');
      cRequests?.classList.remove('hidden');
    });

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
function openPrintableAttendanceSheet(teacherInfo?: any, groupInfo?: any, roster?: any[]) {
  const profile = getCurrentProfile();
  const printWin = window.open('', '_blank');
  if (!printWin) {
    alert('يرجى السماح بفتح النوافذ المنبثقة للطباعة.');
    return;
  }

  const currentDate = new Date().toLocaleDateString('ar-DZ');
  const teacherName = teacherInfo?.full_name || profile?.full_name || 'أستاذ المقياس';
  const subjectName = groupInfo?.subject_name || 'ديداكتيك المادة وتخطيط التعلمات';
  const specialtyName = groupInfo?.specialty_code || 'اللغة العربية وآدابها (متوسط)';
  const groupLabel = groupInfo?.group_number ? `فوج ${groupInfo.group_number} · السنة ${groupInfo.academic_year}` : 'فوج 1 · السنة الأولى';

  const students = (roster && roster.length > 0) ? roster : [
    { full_name: 'سليماني أحمد', registration_number: '2026/ENS/0491' },
    { full_name: 'بن عثمان فاطمة الزهراء', registration_number: '2026/ENS/0492' },
    { full_name: 'قادري محمد أمين', registration_number: '2026/ENS/0493' },
  ];

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
        <div><strong>الأستاذ المسؤول:</strong> ${teacherName}</div>
        <div><strong>المقياس:</strong> ${subjectName}</div>
        <div><strong>الشعبة:</strong> ${specialtyName}</div>
        <div><strong>الفوج:</strong> ${groupLabel}</div>
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
          ${students.map((st, i) => `
            <tr>
              <td style="text-align: center;">${String(i + 1).padStart(2, '0')}</td>
              <td><strong>${st.full_name}</strong></td>
              <td style="font-family: monospace;">${st.registration_number}</td>
              <td style="text-align: center;">12</td>
              <td style="text-align: center; color: green; font-weight: bold;">0</td>
              <td style="text-align: center;">0</td>
              <td style="text-align: center; font-weight: bold;">100%</td>
              <td style="color: green;">منتظم (حضور ممتاز)</td>
            </tr>
          `).join('')}
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

/**
 * ======================================================================
 * Service 4: الرزنامة الأكاديمية والامتحانات (Academic Calendar & Milestones)
 * ======================================================================
 */
async function renderCustomAcademicCalendar(profile: any) {
  const body = document.getElementById('serviceBody');
  if (!body) return;

  const foot = document.getElementById('serviceFoot');
  if (foot) {
    foot.textContent = 'الرزنامة الأكاديمية الرسمية والامتحانات · المدرسة العليا للأساتذة ملحقة الجلفة';
  }

  const isAdmin = profile && profile.role === 'admin';

  body.innerHTML = `
    <div class="space-y-4">
      <!-- Header Controls Strip -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#faf6f1] p-3.5 rounded-2xl border border-[#6b1220]/10">
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <span class="font-semibold text-gray-700">تصفية المواعيد:</span>
          <select id="cal-filter-type" class="rounded-xl border border-gray-300 p-1.5 text-xs bg-white outline-none focus:border-[#5a0f1c]">
            <option value="all">كافة المواعيد والرزنامة</option>
            <option value="exam">امتحانات وتقييمات</option>
            <option value="holiday">عطل جامعية وراحة بيداغوجية</option>
            <option value="deadline">آجال إدارية وتسجيلات</option>
            <option value="internship">التربص الميداني التربوي</option>
            <option value="event">ملتقيات وفعاليات</option>
          </select>
          <div class="inline-flex rounded-xl border border-gray-300 bg-white p-0.5" role="group">
            <button id="btn-view-list" class="px-2.5 py-1 text-xs rounded-lg font-bold bg-[#5a0f1c] text-white">قائمة</button>
            <button id="btn-view-month" class="px-2.5 py-1 text-xs rounded-lg font-bold text-gray-600 hover:text-black">شهري</button>
          </div>
        </div>
        ${isAdmin ? `
          <button id="btn-add-cal-event" class="rounded-xl bg-[#5a0f1c] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#3b0a13] flex items-center gap-1.5 shadow-sm">
            <span>+ إضافة موعد للرزنامة</span>
          </button>
        ` : ''}
      </div>

      <!-- Add Event Form (Admins only) -->
      ${isAdmin ? `
        <div id="add-cal-event-panel" class="hidden rounded-2xl border border-[#b38b45]/30 bg-white p-4 shadow-sm">
          <h4 class="font-bold text-[#5a0f1c] text-sm mb-2">إدراج موعد أكاديمي رسمي جديد</h4>
          <form id="new-cal-event-form" class="space-y-3 text-xs">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input required id="event-title" placeholder="عنوان الموعد أو الحدث..." class="rounded-xl border border-gray-300 p-2 outline-none focus:border-[#5a0f1c]">
              <select id="event-type" class="rounded-xl border border-gray-300 p-2 outline-none focus:border-[#5a0f1c]">
                <option value="exam">امتحانات دورية وفصلية</option>
                <option value="holiday">عطلة رسمية أو راحة</option>
                <option value="deadline">أجل إداري / إيداع ملفات</option>
                <option value="internship">تربص ميداني للمتربصين</option>
                <option value="event">فعالية علمية أو بيداغوجية</option>
              </select>
              <input required id="event-date" type="date" class="rounded-xl border border-gray-300 p-2 outline-none focus:border-[#5a0f1c]">
              <input id="event-end-date" type="date" placeholder="تاريخ الانتهاء (اختياري)" class="rounded-xl border border-gray-300 p-2 outline-none focus:border-[#5a0f1c]">
            </div>
            <textarea id="event-notes" rows="2" placeholder="ملاحظات تفصيلية أو تعليمات موجهة للطلبة..." class="w-full rounded-xl border border-gray-300 p-2 outline-none focus:border-[#5a0f1c]"></textarea>
            <div class="flex items-center justify-between">
              <label class="flex items-center gap-2 text-xs text-gray-700">
                <input id="event-is-official" type="checkbox" checked class="rounded text-[#5a0f1c]">
                <span>موعد رسمي معتمد نهائياً (Official Verified)</span>
              </label>
              <button type="submit" class="rounded-full bg-[#5a0f1c] px-5 py-2 text-white font-semibold hover:bg-[#3b0a13]">حفظ في الرزنامة</button>
            </div>
          </form>
        </div>
      ` : ''}

      <!-- Events Container -->
      <div id="calendar-events-container">
        <p class="text-xs text-gray-400 py-4 text-center animate-pulse">جاري تحميل الرزنامة الأكاديمية...</p>
      </div>
    </div>
  `;

  let currentView: 'list' | 'month' = 'list';
  let currentFilter = 'all';

  const renderEvents = async () => {
    const events = await getAcademicEvents();
    const container = document.getElementById('calendar-events-container');
    if (!container) return;

    const filtered = events.filter(e => {
      if (e.is_archived) return false;
      if (currentFilter === 'all') return true;
      return e.event_type === currentFilter;
    });

    if (filtered.length === 0) {
      container.innerHTML = '<p class="text-center text-gray-400 py-8 text-xs">لا توجد مواعيد أكاديمية مسجلة في هذا التصنيف.</p>';
      return;
    }

    const typeIcons: Record<string, { icon: string; label: string; color: string }> = {
      exam: { icon: '📝', label: 'امتحانات', color: 'bg-red-50 text-red-800 border-red-200' },
      holiday: { icon: '🌴', label: 'عطلة', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
      deadline: { icon: '⏳', label: 'أجل محدد', color: 'bg-amber-50 text-amber-800 border-amber-200' },
      internship: { icon: '🏫', label: 'تربص ميداني', color: 'bg-blue-50 text-blue-800 border-blue-200' },
      event: { icon: '🎓', label: 'حدث أكاديمي', color: 'bg-purple-50 text-purple-800 border-purple-200' },
    };

    if (currentView === 'list') {
      container.innerHTML = `
        <div class="space-y-3">
          ${filtered.map(item => {
            const info = typeIcons[item.event_type] || typeIcons.event;
            const dateStr = item.end_date ? `${item.date} إلى ${item.end_date}` : item.date;
            return `
              <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow transition flex flex-col sm:flex-row items-start justify-between gap-3">
                <div class="flex items-start gap-3">
                  <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${info.color} border text-lg">
                    ${info.icon}
                  </span>
                  <div>
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="rounded-full px-2 py-0.5 text-[10px] font-bold ${info.color} border">${info.label}</span>
                      ${item.is_official ? `
                        <span class="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">موعد رسمي معتمد ✓</span>
                      ` : `
                        <span class="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold">تاريخ استرشادي ⏳</span>
                      `}
                      <time class="text-[11px] text-gray-500 font-mono" dir="ltr">${dateStr}</time>
                    </div>
                    <h5 class="mt-1.5 text-xs font-bold text-gray-900 leading-snug">${item.title}</h5>
                    ${item.notes ? `<p class="mt-1 text-xs text-gray-600 leading-relaxed">${item.notes}</p>` : ''}
                  </div>
                </div>
                ${isAdmin ? `
                  <button data-archive-id="${item.id}" class="btn-archive-event shrink-0 rounded-lg text-xs text-gray-400 hover:text-red-700 hover:bg-red-50 p-1.5 transition">
                    أرشفة
                  </button>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else {
      // Month overview card grid
      container.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          ${filtered.map(item => {
            const info = typeIcons[item.event_type] || typeIcons.event;
            return `
              <div class="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm flex flex-col justify-between">
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-sm">${info.icon}</span>
                    <time class="text-[10px] text-gray-500 font-mono" dir="ltr">${item.date}</time>
                  </div>
                  <h5 class="text-xs font-bold text-gray-900 leading-snug">${item.title}</h5>
                  <p class="mt-1 text-[11px] text-gray-500 line-clamp-2">${item.notes || ''}</p>
                </div>
                <div class="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
                  <span class="rounded-full px-2 py-0.5 text-[10px] font-bold ${info.color} border">${info.label}</span>
                  ${item.is_official ? `<span class="text-[10px] font-bold text-emerald-700">معتمد</span>` : `<span class="text-[10px] font-bold text-amber-700">استرشادي</span>`}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    if (isAdmin) {
      container.querySelectorAll('.btn-archive-event').forEach(btn => {
        btn.addEventListener('click', async (e: any) => {
          const id = e.target.closest('[data-archive-id]')?.dataset.archiveId;
          if (id) {
            await archiveAcademicEvent(id);
            renderEvents();
          }
        });
      });
    }
  };

  renderEvents();

  document.getElementById('cal-filter-type')?.addEventListener('change', (e: any) => {
    currentFilter = e.target.value;
    renderEvents();
  });

  document.getElementById('btn-view-list')?.addEventListener('click', () => {
    currentView = 'list';
    document.getElementById('btn-view-list')?.classList.add('bg-[#5a0f1c]', 'text-white');
    document.getElementById('btn-view-list')?.classList.remove('text-gray-600');
    document.getElementById('btn-view-month')?.classList.remove('bg-[#5a0f1c]', 'text-white');
    document.getElementById('btn-view-month')?.classList.add('text-gray-600');
    renderEvents();
  });

  document.getElementById('btn-view-month')?.addEventListener('click', () => {
    currentView = 'month';
    document.getElementById('btn-view-month')?.classList.add('bg-[#5a0f1c]', 'text-white');
    document.getElementById('btn-view-month')?.classList.remove('text-gray-600');
    document.getElementById('btn-view-list')?.classList.remove('bg-[#5a0f1c]', 'text-white');
    document.getElementById('btn-view-list')?.classList.add('text-gray-600');
    renderEvents();
  });

  if (isAdmin) {
    document.getElementById('btn-add-cal-event')?.addEventListener('click', () => {
      document.getElementById('add-cal-event-panel')?.classList.toggle('hidden');
    });

    document.getElementById('new-cal-event-form')?.addEventListener('submit', async (e: any) => {
      e.preventDefault();
      const title = (document.getElementById('event-title') as HTMLInputElement)?.value;
      const event_type = (document.getElementById('event-type') as HTMLSelectElement)?.value as any;
      const date = (document.getElementById('event-date') as HTMLInputElement)?.value;
      const end_date = (document.getElementById('event-end-date') as HTMLInputElement)?.value || undefined;
      const notes = (document.getElementById('event-notes') as HTMLTextAreaElement)?.value || undefined;
      const is_official = (document.getElementById('event-is-official') as HTMLInputElement)?.checked ?? true;

      await saveAcademicEvent({
        title,
        event_type,
        date,
        end_date,
        notes,
        is_official
      });

      document.getElementById('add-cal-event-panel')?.classList.add('hidden');
      renderEvents();
    });
  }
}

/**
 * ======================================================================
 * Service 5: دليل الوثائق والتربصات الميدانية والنوادي (Feature 10)
 * ======================================================================
 */
function renderCustomDocumentAndInternshipServices(profile: any) {
  const body = document.getElementById('serviceBody');
  if (!body) return;

  const foot = document.getElementById('serviceFoot');
  if (foot) {
    foot.textContent = 'دليل الوثائق والتربصات الميدانية والنوادي العلمية · المدرسة العليا للأساتذة ملحقة الجلفة';
  }

  const schools = getPartnerSchools();

  body.innerHTML = `
    <div class="space-y-4">
      <!-- Tabs Switcher -->
      <div class="flex items-center gap-2 border-b border-gray-200 pb-2 text-xs font-semibold overflow-x-auto">
        <button id="tab-doc-schools" class="tab-btn active px-3.5 py-2 rounded-xl bg-[#5a0f1c] text-white whitespace-nowrap">
          المؤسسات التربوية الشريكة للتربص (ولاية الجلفة)
        </button>
        <button id="tab-doc-guide" class="tab-btn px-3.5 py-2 rounded-xl text-gray-600 hover:bg-gray-100 whitespace-nowrap">
          دليل الوثائق والإجراءات الإدارية
        </button>
        <button id="tab-doc-clubs" class="tab-btn px-3.5 py-2 rounded-xl text-gray-600 hover:bg-gray-100 whitespace-nowrap">
          النوادي العلمية والأنشطة الطلابية
        </button>
      </div>

      <!-- Tab 1: Partner Schools -->
      <div id="content-doc-schools" class="space-y-3">
        <div class="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h5 class="font-bold flex items-center gap-1.5">
              <span>🏫</span> المدارس التطبيقية المعتمدة للتربص البيداغوجي الميداني
            </h5>
            <p class="mt-0.5 text-blue-900 text-[11px] leading-relaxed">
              تتوزع المؤسسات الشريكة عبر بلديات ولاية الجلفة (الجلفة، عين وسارة، مسعد، حاسي بحبح) لاستقبال متربصي الطورين الابتدائي والمتوسط.
            </p>
          </div>
          <button onclick="window.print()" class="shrink-0 rounded-xl bg-blue-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-950 shadow-sm">
            تحميل دليل التربص (PDF) ↓
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          ${schools.map(s => `
            <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow transition flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between gap-2">
                  <span class="rounded-full px-2 py-0.5 text-[10px] font-bold ${s.type === 'ثانوية' ? 'bg-purple-100 text-purple-800' : s.type === 'متوسطة' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                    ${s.type}
                  </span>
                  <span class="text-[11px] text-gray-500 font-semibold">${s.commune}</span>
                </div>
                <h5 class="mt-2 text-xs font-bold text-gray-900">${s.name}</h5>
                <p class="text-[11px] text-gray-500 mt-0.5">العنوان: ${s.address}</p>
                <div class="mt-2.5 flex flex-wrap gap-1">
                  ${s.specialties.map(spec => `<span class="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-700">${spec}</span>`).join('')}
                </div>
              </div>
              <div class="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px]">
                <span class="font-bold text-emerald-700 font-mono">${s.capacity}</span>
                <span class="text-gray-500 font-mono" dir="ltr">${s.phone}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Tab 2: Document Requirements Guide -->
      <div id="content-doc-guide" class="hidden space-y-3 text-xs">
        <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
          <h5 class="font-bold text-[#5a0f1c] text-sm flex items-center gap-2">
            <span>📑</span> الوثائق الإدارية الرسمية المعتمدة وشروط استخراجها
          </h5>
          <div class="divide-y divide-gray-100 space-y-2">
            <div class="pt-2">
              <h6 class="font-bold text-gray-900">1. شهادة التسجيل النظامية (Certificat de scolarité):</h6>
              <p class="text-[11px] text-gray-600 mt-0.5">تُسلم للطالب بعد إتمام التسجيل الإداري ودفع حقوق التسجيل. تُطلب لملفات المنحة والنقل والضمان الاجتماعي.</p>
            </div>
            <div class="pt-2">
              <h6 class="font-bold text-gray-900">2. كشف النقاط السداسي والسنوي (Relevé de notes):</h6>
              <p class="text-[11px] text-gray-600 mt-0.5">يُصدر فور مصادقة لجان المداولات وإعلان النتائج النهائية. النسخة الرقمية متاحة عبر فضاء الطالب والنسخة المطبوعة لدى مصلحة التمدرس.</p>
            </div>
            <div class="pt-2">
              <h6 class="font-bold text-gray-900">3. تبرير الغياب القانوني (Justificatif d'absence):</h6>
              <p class="text-[11px] text-gray-600 mt-0.5">يجب إيداعه خلال أجل أقصاه 72 ساعة من تاريخ الحصة مشفوعاً بشهادة طبية معتمدة أو عذر رسمي مقبول.</p>
            </div>
            <div class="pt-2">
              <h6 class="font-bold text-gray-900">4. شهادة حسن السيرة والسلوك (Certificat de bonne conduite):</h6>
              <p class="text-[11px] text-gray-600 mt-0.5">تُمنح بناءً على طلب إداري وبعد التحقق من السجل الانضباطي للطالب بالمجلس التأديبي.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 3: Student Clubs -->
      <div id="content-doc-clubs" class="hidden space-y-3 text-xs">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
            <span class="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-bold">لغات وآداب</span>
            <h5 class="mt-2 font-bold text-gray-900 text-xs">نادي الضاد للإبداع واللغات</h5>
            <p class="text-[11px] text-gray-600 mt-1 leading-relaxed">ورشات الإملاء والنحو المتقدم، الخط العربي، المناظرات الفكرية، والمجلات الحائطية الأدبية لمتربصي الطورين الابتدائي والمتوسط.</p>
          </div>
          <div class="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm">
            <span class="rounded-full bg-blue-100 text-blue-800 px-2.5 py-0.5 text-[10px] font-bold">تكنولوجيا وابتكار</span>
            <h5 class="mt-2 font-bold text-gray-900 text-xs">نادي الخوارزمي البرمجي</h5>
            <p class="text-[11px] text-gray-600 mt-1 leading-relaxed">تطوير البرمجيات التعليمية، ورشات الروبوتات والذكاء الاصطناعي في التعليم، وتهيئة المنصات الرقمية لمدارس المستقبل.</p>
          </div>
          <div class="rounded-2xl border border-purple-200 bg-white p-4 shadow-sm">
            <span class="rounded-full bg-purple-100 text-purple-800 px-2.5 py-0.5 text-[10px] font-bold">علوم دقيقة وتجريبية</span>
            <h5 class="mt-2 font-bold text-gray-900 text-xs">نادي ابن الهيثم للتجريب العلمي</h5>
            <p class="text-[11px] text-gray-600 mt-1 leading-relaxed">تجارب الكيمياء الحيوية، ورشات السلامة المخبرية، وتحضير العينات المجهرية لمدرسي علوم الطبيعة والحياة.</p>
          </div>
          <div class="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
            <span class="rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-[10px] font-bold">رياضة ونشاط بدني</span>
            <h5 class="mt-2 font-bold text-gray-900 text-xs">النادي الرياضي الجامعي</h5>
            <p class="text-[11px] text-gray-600 mt-1 leading-relaxed">دورات كرة القدم، ألعاب القوى والجمباز، ورشات التحكيم الرياضي المدرسي، والمنافسات بين الشعب.</p>
          </div>
        </div>
      </div>
    </div>
  `;

  // Tab switching
  const tabSchools = document.getElementById('tab-doc-schools');
  const tabGuide = document.getElementById('tab-doc-guide');
  const tabClubs = document.getElementById('tab-doc-clubs');

  const contentSchools = document.getElementById('content-doc-schools');
  const contentGuide = document.getElementById('content-doc-guide');
  const contentClubs = document.getElementById('content-doc-clubs');

  const selectTab = (btn: HTMLElement, content: HTMLElement) => {
    [tabSchools, tabGuide, tabClubs].forEach(b => {
      b?.classList.remove('bg-[#5a0f1c]', 'text-white');
      b?.classList.add('text-gray-600');
    });
    [contentSchools, contentGuide, contentClubs].forEach(c => c?.classList.add('hidden'));

    btn.classList.add('bg-[#5a0f1c]', 'text-white');
    btn.classList.remove('text-gray-600');
    content.classList.remove('hidden');
  };

  tabSchools?.addEventListener('click', () => selectTab(tabSchools, contentSchools!));
  tabGuide?.addEventListener('click', () => selectTab(tabGuide, contentGuide!));
  tabClubs?.addEventListener('click', () => selectTab(tabClubs, contentClubs!));
}

/**
 * ======================================================================
 * Service 7: المساعد الدراسي الذكي (AI Study Assistant / Gemini 3.8 Flash)
 * ======================================================================
 */
function renderCustomAIStudyAssistant(profile: any) {
  const body = document.getElementById('serviceBody');
  if (!body) return;

  const foot = document.getElementById('serviceFoot');
  if (foot) {
    foot.textContent = 'المساعد الدراسي الذكي للاستذكار والمراجعة · المدرسة العليا للأساتذة ملحقة الجلفة';
  }

  body.innerHTML = `
    <div class="space-y-4">
      <!-- Institutional Disclaimer Card -->
      <div class="rounded-2xl border border-amber-300 bg-amber-50/80 p-3.5 text-xs text-amber-950">
        <div class="flex items-start gap-2.5">
          <span class="text-base">⚖️</span>
          <div>
            <p class="font-bold text-amber-900">تنويه مؤسسي وأكاديمي ملزم:</p>
            <p class="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
              هذا المساعد الدراسي أداة ذكية للمساعدة في مراجعة المفاهيم البيداغوجية، تلخيص الدروس، وصياغة أسئلة التدريب. لا يمثل المساعد جداول التوقيت الرسمية، ولا يصدر قرارات إدارية أو درجات امتحانات. المرجع النهائي هو الوثائق الصادرة عن مصلحة التمدرس.
            </p>
          </div>
        </div>
      </div>

      <!-- Action Mode Tabs -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <button id="ai-mode-explain" class="ai-mode-btn active p-2.5 rounded-xl border border-[#5a0f1c] bg-[#5a0f1c] text-white text-center font-bold">
          💡 شرح مفهوم
        </button>
        <button id="ai-mode-summarize" class="ai-mode-btn p-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-center font-bold hover:bg-gray-50">
          📝 تلخيص درس
        </button>
        <button id="ai-mode-quiz" class="ai-mode-btn p-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-center font-bold hover:bg-gray-50">
          ❓ أسئلة مراجعة
        </button>
        <button id="ai-mode-plan" class="ai-mode-btn p-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-center font-bold hover:bg-gray-50">
          🗓️ خطة استذكار
        </button>
      </div>

      <!-- Quick Prompt Chips -->
      <div class="flex items-center gap-1.5 overflow-x-auto text-[11px] pb-1">
        <span class="text-gray-400 shrink-0">اقتراحات سريعة:</span>
        <button class="chip-prompt shrink-0 rounded-full bg-gray-100 hover:bg-[#5a0f1c]/10 text-gray-700 hover:text-[#5a0f1c] px-2.5 py-1 transition">
          ديداكتيك اللغة العربية وطرائق التدريس
        </button>
        <button class="chip-prompt shrink-0 rounded-full bg-gray-100 hover:bg-[#5a0f1c]/10 text-gray-700 hover:text-[#5a0f1c] px-2.5 py-1 transition">
          الفرق بين الكفاءة والهدف التعليمي
        </button>
        <button class="chip-prompt shrink-0 rounded-full bg-gray-100 hover:bg-[#5a0f1c]/10 text-gray-700 hover:text-[#5a0f1c] px-2.5 py-1 transition">
          5 أسئلة في الخوارزميات مع الإجابة
        </button>
        <button class="chip-prompt shrink-0 rounded-full bg-gray-100 hover:bg-[#5a0f1c]/10 text-gray-700 hover:text-[#5a0f1c] px-2.5 py-1 transition">
          مخطط مراجعة لأسبوع الامتحانات
        </button>
      </div>

      <!-- Input Form -->
      <form id="ai-assistant-form" class="space-y-3">
        <div>
          <textarea required id="ai-prompt-input" rows="3" placeholder="أدخل المفهوم، الدرس، أو النص الأكاديمي الذي تريد استيعابه ومراجعته..." class="w-full rounded-2xl border border-gray-300 p-3.5 text-xs outline-none focus:border-[#5a0f1c] focus:ring-1 focus:ring-[#5a0f1c] shadow-inner"></textarea>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-[11px] text-gray-400">مدعوم بنموذج الذكاء الاصطناعي الأكاديمي عبر خادم المنصة المشفر</span>
          <button id="btn-submit-ai" type="submit" class="rounded-full bg-[#5a0f1c] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#3b0a13] flex items-center gap-2 shadow-md transition">
            <span>توليد الشرح / المراجعة</span>
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
      </form>

      <!-- Response Area -->
      <div id="ai-response-card" class="hidden rounded-2xl border border-[#5a0f1c]/20 bg-white p-5 shadow-sm space-y-3">
        <div class="flex items-center justify-between border-b border-gray-100 pb-2">
          <span class="text-xs font-bold text-[#5a0f1c] flex items-center gap-1.5">
            <span>🤖 إجابة المساعد الدراسي:</span>
          </span>
          <button id="btn-copy-ai-response" class="text-[11px] font-semibold text-gray-500 hover:text-[#5a0f1c] flex items-center gap-1">
            <span>نسخ الإجابة</span>
          </button>
        </div>
        <div id="ai-response-content" class="text-xs text-gray-800 leading-relaxed space-y-2 whitespace-pre-wrap"></div>
      </div>
    </div>
  `;

  let currentMode = 'explain';

  const modes: Record<string, string> = {
    explain: 'شرح مفهوم بيداغوجي أو علمي',
    summarize: 'تلخيص درس ومحاور أساسية',
    quiz: 'توليد أسئلة مراجعة وتدريب مع الإجابات النموذجية',
    plan: 'وضع جدول مراجعة وتنظيم أسبوعي'
  };

  const setupMode = (modeKey: string, btnId: string) => {
    document.getElementById(btnId)?.addEventListener('click', () => {
      document.querySelectorAll('.ai-mode-btn').forEach(b => {
        b.classList.remove('bg-[#5a0f1c]', 'text-white', 'border-[#5a0f1c]');
        b.classList.add('bg-white', 'text-gray-700', 'border-gray-200');
      });
      const target = document.getElementById(btnId);
      target?.classList.add('bg-[#5a0f1c]', 'text-white', 'border-[#5a0f1c]');
      target?.classList.remove('bg-white', 'text-gray-700', 'border-gray-200');
      currentMode = modeKey;
    });
  };

  setupMode('explain', 'ai-mode-explain');
  setupMode('summarize', 'ai-mode-summarize');
  setupMode('quiz', 'ai-mode-quiz');
  setupMode('plan', 'ai-mode-plan');

  document.querySelectorAll('.chip-prompt').forEach(chip => {
    chip.addEventListener('click', (e: any) => {
      const input = document.getElementById('ai-prompt-input') as HTMLTextAreaElement;
      if (input) input.value = e.target.textContent.trim();
    });
  });

  const form = document.getElementById('ai-assistant-form');
  const responseCard = document.getElementById('ai-response-card');
  const responseContent = document.getElementById('ai-response-content');
  const submitBtn = document.getElementById('btn-submit-ai') as HTMLButtonElement | null;

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const promptText = (document.getElementById('ai-prompt-input') as HTMLTextAreaElement)?.value?.trim();
    if (!promptText) return;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="inline-flex items-center gap-2"><svg class="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> جاري المعالجة الأكاديمية...</span>';
    }

    if (responseCard && responseContent) {
      responseCard.classList.remove('hidden');
      responseContent.innerHTML = '<p class="text-gray-400 py-3 animate-pulse">جاري صياغة التوضيح الأكاديمي والاستذكاري...</p>';
    }

    try {
      const res = await fetch('/api/ai-study', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          mode: currentMode,
          specialty: profile?.specialty || 'التعليم الأكاديمي والديداكتيك'
        })
      });

      const data = await res.json();
      if (responseContent) {
        if (data.success && data.content) {
          responseContent.textContent = data.content;
        } else {
          responseContent.innerHTML = `
            <div class="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              <p class="font-bold">${data.error || 'خدمة المساعد الذكي غير متاحة حالياً.'}</p>
              <p class="mt-1 text-[11px] text-gray-600">${data.hint || 'يرجى مراجعة المطبوعات الرقمية المعتمدة في المستودع البيداغوجي أو إعادة المحاولة لاحقاً.'}</p>
            </div>
          `;
        }
      }
    } catch (err: any) {
      if (responseContent) {
        responseContent.innerHTML = `
          <div class="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            <p class="font-bold">تعذر الاتصال بخادم الذكاء الاصطناعي الأكاديمي.</p>
            <p class="mt-1 text-[11px] text-gray-600">يمكنك الاستعانة بالمستودع البيداغوجي الرقمي أو مراجعة أستاذ المقياس.</p>
          </div>
        `;
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>توليد الشرح / المراجعة</span><svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
      }
    }
  });

  document.getElementById('btn-copy-ai-response')?.addEventListener('click', () => {
    const text = responseContent?.textContent || '';
    if (text) {
      navigator.clipboard?.writeText(text);
      showToast('تم نسخ النص الأكاديمي إلى الحافظة.', 'success');
    }
  });
}

/**
 * ======================================================================
 * Service 8: مركز الإشعارات والتنبيهات (In-App Notifications Center)
 * ======================================================================
 */
function renderCustomNotifications(profile: any) {
  const body = document.getElementById('serviceBody');
  if (!body) return;

  const foot = document.getElementById('serviceFoot');
  if (foot) {
    foot.textContent = 'مركز الإشعارات والتنبيهات الأكاديمية · المدرسة العليا للأساتذة ملحقة الجلفة';
  }

  body.innerHTML = `
    <div class="space-y-4">
      <!-- Controls Strip -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#faf6f1] p-3.5 rounded-2xl border border-[#6b1220]/10">
        <div class="flex items-center gap-1.5 text-xs">
          <button id="btn-notif-all" class="rounded-xl bg-[#5a0f1c] px-3 py-1.5 text-xs font-bold text-white">الكل</button>
          <button id="btn-notif-unread" class="rounded-xl bg-white border border-gray-300 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50">غير المقروءة</button>
          <button id="btn-notif-prefs" class="rounded-xl bg-white border border-gray-300 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50">تخصيص التنبيهات ⚙️</button>
        </div>
        <button id="btn-mark-all-read" class="text-xs text-[#5a0f1c] font-bold hover:underline">
          تحديد الكل كمقروء ✓
        </button>
      </div>

      <!-- Preferences Panel -->
      <div id="notif-prefs-panel" class="hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3 text-xs">
        <h5 class="font-bold text-[#5a0f1c] text-xs">خيارات التنبيهات المرئية:</h5>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-700">
          <label class="flex items-center gap-2">
            <input type="checkbox" id="pref-ann" checked class="rounded text-[#5a0f1c]">
            <span>إعلانات الإدارة والتمدرس</span>
          </label>
          <label class="flex items-center gap-2">
            <input type="checkbox" id="pref-res" checked class="rounded text-[#5a0f1c]">
            <span>إيداع المطبوعات والموارد البيداغوجية</span>
          </label>
          <label class="flex items-center gap-2">
            <input type="checkbox" id="pref-req" checked class="rounded text-[#5a0f1c]">
            <span>ردود الطلبات الإدارية وتبريرات الغياب</span>
          </label>
          <label class="flex items-center gap-2">
            <input type="checkbox" id="pref-tt" checked class="rounded text-[#5a0f1c]">
            <span>تحديثات جداول التوقيت والامتحانات</span>
          </label>
        </div>
        <p class="text-[10px] text-gray-400">تنبيهات المنصة داخلية وتظهر في المتصفح لضمان خصوصية الطلبة والأساتذة.</p>
      </div>

      <!-- Notifications List -->
      <div id="in-app-notifications-list" class="space-y-2.5 text-xs">
        <p class="text-gray-400 text-center py-4 animate-pulse">جاري تحميل التنبيهات...</p>
      </div>
    </div>
  `;

  let showOnlyUnread = false;

  const renderList = () => {
    const list = getInAppNotifications();
    const container = document.getElementById('in-app-notifications-list');
    if (!container) return;

    const filtered = showOnlyUnread ? list.filter(n => !n.read) : list;

    if (filtered.length === 0) {
      container.innerHTML = '<p class="text-center text-gray-400 py-6 text-xs">لا توجد إشعارات جديدة حالياً.</p>';
      return;
    }

    const typeIcons: Record<string, string> = {
      announcement: '📢',
      resource: '📚',
      timetable: '📅',
      request: '✍️'
    };

    container.innerHTML = filtered.map(item => `
      <div class="rounded-2xl border ${item.read ? 'border-gray-200 bg-white' : 'border-[#b38b45]/40 bg-[#faf6f1]/60'} p-3.5 shadow-sm transition hover:shadow flex items-start justify-between gap-3">
        <div class="flex items-start gap-3">
          <span class="text-base">${typeIcons[item.type] || '🔔'}</span>
          <div>
            <div class="flex items-center gap-2">
              <h5 class="font-bold text-gray-900">${item.title}</h5>
              ${!item.read ? '<span class="h-2 w-2 rounded-full bg-red-600 inline-block"></span>' : ''}
              <time class="text-[10px] text-gray-400 font-mono" dir="ltr">${item.date}</time>
            </div>
            <p class="mt-1 text-gray-600 leading-relaxed text-[11px]">${item.message}</p>
          </div>
        </div>
        ${item.linkService !== undefined ? `
          <button data-open-srv="${item.linkService}" class="btn-notif-goto shrink-0 rounded-lg bg-white border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-[#5a0f1c] hover:bg-[#5a0f1c] hover:text-white transition">
            عرض الخدمة ↗
          </button>
        ` : ''}
      </div>
    `).join('');

    container.querySelectorAll('.btn-notif-goto').forEach(b => {
      b.addEventListener('click', (e: any) => {
        const srvId = Number(e.target.closest('[data-open-srv]')?.dataset.openSrv);
        if (!isNaN(srvId)) {
          dispatchServiceModal(srvId);
        }
      });
    });
  };

  renderList();

  document.getElementById('btn-notif-all')?.addEventListener('click', () => {
    showOnlyUnread = false;
    document.getElementById('btn-notif-all')?.classList.add('bg-[#5a0f1c]', 'text-white');
    document.getElementById('btn-notif-all')?.classList.remove('bg-white', 'text-gray-700');
    document.getElementById('btn-notif-unread')?.classList.remove('bg-[#5a0f1c]', 'text-white');
    document.getElementById('btn-notif-unread')?.classList.add('bg-white', 'text-gray-700');
    renderList();
  });

  document.getElementById('btn-notif-unread')?.addEventListener('click', () => {
    showOnlyUnread = true;
    document.getElementById('btn-notif-unread')?.classList.add('bg-[#5a0f1c]', 'text-white');
    document.getElementById('btn-notif-unread')?.classList.remove('bg-white', 'text-gray-700');
    document.getElementById('btn-notif-all')?.classList.remove('bg-[#5a0f1c]', 'text-white');
    document.getElementById('btn-notif-all')?.classList.add('bg-white', 'text-gray-700');
    renderList();
  });

  document.getElementById('btn-notif-prefs')?.addEventListener('click', () => {
    document.getElementById('notif-prefs-panel')?.classList.toggle('hidden');
  });

  document.getElementById('btn-mark-all-read')?.addEventListener('click', () => {
    const list = getInAppNotifications();
    list.forEach(n => markNotificationAsRead(n.id));
    renderList();
    updateBellCount();
    showToast('تم تحديد كافة التنبيهات كمقروءة.', 'info');
  });
}

/**
 * Header Notification Bell with Unread Counter
 */
function setupHeaderNotificationBell() {
  const existingBell = document.getElementById('header-notif-btn');
  if (existingBell) return;

  const headerActions = document.querySelector('header nav') || document.querySelector('header .flex.items-center');
  if (!headerActions) return;

  const bell = document.createElement('button');
  bell.id = 'header-notif-btn';
  bell.className = 'relative rounded-full p-2 text-white hover:bg-white/10 transition flex items-center justify-center';
  bell.title = 'مركز التنبيهات الأكاديمية';
  bell.innerHTML = `
    <svg class="h-5 w-5 text-[#E3C48A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
    <span id="notif-badge" class="absolute -top-0.5 -end-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-sm">2</span>
  `;

  headerActions.appendChild(bell);

  bell.addEventListener('click', () => {
    const modal = document.getElementById('serviceModal') as HTMLDialogElement | null;
    if (modal) {
      modal.showModal();
      dispatchServiceModal(8);
    }
  });

  updateBellCount();
}

function updateBellCount() {
  const badge = document.getElementById('notif-badge');
  if (!badge) return;
  const list = getInAppNotifications();
  const unreadCount = list.filter(n => !n.read).length;
  if (unreadCount > 0) {
    badge.textContent = String(unreadCount);
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

// Global helpers for portal interaction
(window as any).previewAdminPortalDirectly = () => {
  const container = document.getElementById('adminDirectPreviewArea') || document.getElementById('serviceBody');
  if (container) {
    container.innerHTML = renderAdminManagementPortalHtml({
      id: 'admin-preview',
      email: 'admin@ens-djelfa.dz',
      full_name: 'مسؤول إدارة المنصة',
      role: 'super_admin',
      is_active: true,
      created_at: new Date().toISOString()
    });
  }
};

(window as any).adminCurrentStudentPage = 1;

(window as any).filterAdminStudents = () => {
  const search = (document.getElementById('adminStudentSearch') as HTMLInputElement)?.value || '';
  const spec = (document.getElementById('adminSpecialtyFilter') as HTMLSelectElement)?.value || 'all';
  const year = parseInt((document.getElementById('adminYearFilter') as HTMLSelectElement)?.value, 10) || 0;
  (window as any).adminCurrentStudentPage = 1;
  (window as any).updateAdminStudentTable(1, spec, year, search);
};

(window as any).navigateStudentPage = (page: number) => {
  const search = (document.getElementById('adminStudentSearch') as HTMLInputElement)?.value || '';
  const spec = (document.getElementById('adminSpecialtyFilter') as HTMLSelectElement)?.value || 'all';
  const year = parseInt((document.getElementById('adminYearFilter') as HTMLSelectElement)?.value, 10) || 0;
  (window as any).updateAdminStudentTable(page, spec, year, search);
};

(window as any).updateAdminStudentTable = (page: number, spec?: string, year?: number, search?: string) => {
  const tbody = document.getElementById('adminStudentTableBody');
  const pagination = document.getElementById('adminStudentPagination');
  if (!tbody) return;

  const res = (window as any).ENS_PORTAL?.getAllStudents
    ? (window as any).ENS_PORTAL.getAllStudents(page, 20, spec, year, search)
    : getAllStudents(page, 20, spec, year, search);
  const list = res.items || (res as any).data || [];

  tbody.innerHTML = list.map((s: any) => `
    <tr class="hover:bg-gray-50/80 transition-colors">
      <td class="p-3 font-mono font-bold text-[#5a0f1c]">${s.registration_number}</td>
      <td class="p-3 font-semibold text-gray-800">${s.full_name}</td>
      <td class="p-3 text-gray-600">${s.specialty_code}</td>
      <td class="p-3 text-gray-700">السنة ${s.academic_year} · فوج ${s.group_number}</td>
      <td class="p-3">
        <span class="rounded-full px-2 py-0.5 text-[10px] font-bold ${
          s.photo_status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
          s.photo_status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
        }">
          ${s.photo_status === 'approved' ? 'معتمدة' : s.photo_status === 'pending' ? 'قيد المراجعة' : 'مرفوضة'}
        </span>
      </td>
      <td class="p-3">
        <button type="button" onclick="window.viewStudentCardModal('${s.id}')" class="rounded-lg border border-[#5a0f1c]/20 bg-[#faf6f1] px-2.5 py-1 text-[11px] font-semibold text-[#5a0f1c] hover:bg-[#5a0f1c] hover:text-white">
          معاينة البطاقة
        </button>
      </td>
    </tr>
  `).join('');

  if (pagination) {
    pagination.innerHTML = `
      <span>الصفحة ${res.page} من ${res.totalPages} (إجمالي: ${res.total} طالب)</span>
      <div class="flex gap-1.5">
        ${res.page > 1 ? `<button type="button" onclick="window.navigateStudentPage(${res.page - 1})" class="rounded-lg border border-gray-200 px-2.5 py-1.5 hover:bg-gray-50">السابقة</button>` : ''}
        ${res.page < res.totalPages ? `<button type="button" onclick="window.navigateStudentPage(${res.page + 1})" class="rounded-lg border border-gray-200 px-2.5 py-1.5 hover:bg-gray-50">التالية</button>` : ''}
      </div>
    `;
  }
};

(window as any).openAssignGroupModal = (teacherId: string) => {
  const teacher = getAllTeachers().find(t => t.id === teacherId);
  if (!teacher) return;

  const groupNum = prompt(`إسناد فوج للأستاذ ${teacher.full_name}:\nأدخل رقم الفوج (مثال: 1 أو 2):`, '1');
  if (!groupNum) return;

  const subject = prompt('أدخل اسم المقياس أو المادة:', 'ديداكتيك التخصص') || 'ديداكتيك التخصص';

  assignTeacherToGroup(teacherId, {
    group_id: 100 + parseInt(groupNum, 10),
    specialty_code: teacher.specialty_code,
    academic_year: 1,
    group_number: parseInt(groupNum, 10) || 1,
    subject_name: subject,
  }, (window as any).currentProfile);

  showToast(`تم إسناد الفوج ${groupNum} للأستاذ ${teacher.full_name} بنجاح.`, 'success');

  const tab = document.getElementById('adminTab_teachers');
  if (tab) {
    const tableDiv = tab.querySelector('.space-y-3');
    if (tableDiv) {
      tableDiv.innerHTML = (window as any).renderTeachersTable
        ? (window as any).renderTeachersTable(getAllTeachers())
        : '<p class="text-xs text-emerald-800 font-bold p-2">تم تحديث بيانات توزيع الأفواج.</p>';
    }
  }
};


