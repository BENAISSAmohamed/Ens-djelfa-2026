// Student Life Portal UI — ملحقة المدرسة العليا للأساتذة - الجلفة
// بوابة الحياة الطلابية والنوادي

import {
  getAllClubs,
  getClubById,
  applyForClubMembership,
  getAllEvents,
  registerForEvent,
  getAllCompetitions,
  submitToCompetition,
  verifyCertificateCode,
  verifyCertificateCodeAsync,
  getExhibitionItems,
  submitExhibitionItem,
  likeExhibitionItem,
  getAllApplications,
  updateApplicationStatus,
} from './store';

export function renderStudentLifePortal(profile: any) {
  const body = document.getElementById('serviceBody');
  const title = document.getElementById('serviceTitle');
  const sub = document.getElementById('serviceSubtitle');
  const foot = document.getElementById('serviceFoot');

  if (title) title.textContent = 'بوابة الحياة الطلابية والنوادي الجامعية';
  if (sub) sub.textContent = 'فضاء الأنشطة العلمية، الثقافية والرياضية، التسجيل في الفعاليات، المعارض الرقمية وشهادات المشاركة.';
  if (foot) foot.textContent = 'ملحقة المدرسة العليا للأساتذة - الجلفة · مصلحة الأنشطة العلمية والثقافية والرياضية';
  if (!body) return;

  const isAdmin = profile?.role === 'admin' || profile?.email?.includes('admin');
  const userMatricule = profile?.registration_number || (profile?.email?.startsWith('2') ? profile.email.split('@')[0] : '2439014285');
  const userName = profile?.full_name || 'طالب المدرسة العليا';

  body.innerHTML = `
    <div class="space-y-5" dir="rtl">
      <!-- Header Banner -->
      <div class="rounded-3xl bg-gradient-to-l from-[#5a0f1c] via-[#741626] to-[#450a14] p-5 sm:p-6 text-white shadow-md">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div class="inline-flex items-center gap-2 rounded-full bg-[#E3C48A]/20 px-3 py-1 text-xs font-semibold text-[#efd8a4]">
              <span>🎓</span> فضاء الإبداع والأنشطة المعتمدة
            </div>
            <h3 class="mt-2 text-xl sm:text-2xl font-bold">بوابة الحياة الطلابية</h3>
            <p class="mt-1 text-xs sm:text-sm text-white/85 leading-relaxed max-w-2xl">
              تنمية المهارات القيادية والبيداغوجية لمتربصي المدارس العليا عبر النوادي العلمية، الفعاليات التنافسية، والشهادات الجامعية المعتمدة.
            </p>
          </div>
          <div class="flex gap-2 self-stretch sm:self-auto shrink-0">
            <button id="btn-verify-cert" class="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#E3C48A] px-4 py-2.5 text-xs font-bold text-[#3b0a13] hover:bg-white transition-colors">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              التحقق من شهادة
            </button>
            <button id="btn-submit-exhibit" class="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
              مشاركة إنجاز
            </button>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="mt-5 flex flex-wrap gap-2 border-t border-white/15 pt-4 text-xs font-medium">
          <button data-sl-tab="clubs" class="sl-tab-btn rounded-xl px-3.5 py-2 bg-white text-[#5a0f1c] font-bold shadow-sm transition-all">النوادي المعتمدة (5)</button>
          <button data-sl-tab="events" class="sl-tab-btn rounded-xl px-3.5 py-2 bg-white/10 text-white/90 hover:bg-white/20 transition-all">الفعاليات والتسجيل</button>
          <button data-sl-tab="competitions" class="sl-tab-btn rounded-xl px-3.5 py-2 bg-white/10 text-white/90 hover:bg-white/20 transition-all">المسابقات والمشاريع</button>
          <button data-sl-tab="exhibition" class="sl-tab-btn rounded-xl px-3.5 py-2 bg-white/10 text-white/90 hover:bg-white/20 transition-all">المعرض الرقمي</button>
          <button data-sl-tab="certificates" class="sl-tab-btn rounded-xl px-3.5 py-2 bg-white/10 text-white/90 hover:bg-white/20 transition-all">شهاداتي الرقمية</button>
          ${isAdmin ? `<button data-sl-tab="approvals" class="sl-tab-btn rounded-xl px-3.5 py-2 bg-amber-400 text-amber-950 font-bold hover:bg-amber-300 transition-all">⚙️ إدارة الموافقات</button>` : ''}
        </div>
      </div>

      <!-- Action Toast Message Container -->
      <div id="sl-feedback-msg" class="hidden rounded-2xl p-4 text-xs"></div>

      <!-- Tab Content 1: CLUBS -->
      <div id="sl-view-clubs" class="sl-view space-y-4">
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div class="flex flex-wrap gap-1.5 text-xs">
            <button data-cat="all" class="club-filter active rounded-lg border border-[#5a0f1c] bg-[#5a0f1c] text-white px-3 py-1.5 font-semibold">جميع النوادي</button>
            <button data-cat="scientific" class="club-filter rounded-lg border border-gray-200 bg-white text-gray-700 px-3 py-1.5 hover:bg-gray-50">علمية</button>
            <button data-cat="cultural" class="club-filter rounded-lg border border-gray-200 bg-white text-gray-700 px-3 py-1.5 hover:bg-gray-50">ثقافية وأدبية</button>
            <button data-cat="sports" class="club-filter rounded-lg border border-gray-200 bg-white text-gray-700 px-3 py-1.5 hover:bg-gray-50">رياضية</button>
            <button data-cat="media" class="club-filter rounded-lg border border-gray-200 bg-white text-gray-700 px-3 py-1.5 hover:bg-gray-50">إعلام وصناعة محتوى</button>
          </div>
          <div class="relative min-w-[200px]">
            <input id="club-search-input" type="search" placeholder="ابحث عن نادي أو نشاط..." class="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs outline-none focus:border-[#5a0f1c]" />
          </div>
        </div>

        <div id="clubs-grid" class="grid gap-4 sm:grid-cols-2">
          ${renderClubsGrid()}
        </div>
      </div>

      <!-- Tab Content 2: EVENTS -->
      <div id="sl-view-events" class="sl-view hidden space-y-4">
        <div class="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 flex items-start gap-3">
          <span class="text-lg">📢</span>
          <div>
            <p class="font-bold">التسجيل وتأكيد الحضور في التظاهرات الأكاديمية</p>
            <p class="mt-0.5 text-amber-800 leading-relaxed">تمنح المنصة تذكرة مشاركة مشفرة مع إمكانية استخراج شهادة مشاركة معتمدة فور اختتام التظاهرة.</p>
          </div>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          ${renderEventsGrid(userName, userMatricule)}
        </div>
      </div>

      <!-- Tab Content 3: COMPETITIONS -->
      <div id="sl-view-competitions" class="sl-view hidden space-y-4">
        <div class="grid gap-4 sm:grid-cols-2">
          ${renderCompetitionsGrid()}
        </div>
      </div>

      <!-- Tab Content 4: DIGITAL EXHIBITION -->
      <div id="sl-view-exhibition" class="sl-view hidden space-y-4">
        <div class="flex items-center justify-between">
          <p class="text-xs text-gray-500">إبداعات وابتكارات طلبة الملحقة في الوسائل التعليمية والبحوث الميدانية:</p>
          <button id="btn-new-achievement" class="rounded-xl bg-[#5a0f1c] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#741626] transition-colors">
            + إضافة مشروع للمعرض
          </button>
        </div>
        <div class="grid gap-4 sm:grid-cols-3">
          ${renderExhibitionGrid()}
        </div>
      </div>

      <!-- Tab Content 5: MY CERTIFICATES -->
      <div id="sl-view-certificates" class="sl-view hidden space-y-4">
        <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h4 class="font-bold text-[#5a0f1c] text-sm flex items-center gap-2">
            <span>🎖️</span> شهادات المشاركة والعضوية المعتمدة
          </h4>
          <p class="text-xs text-gray-500 mt-1">الشهادات الصادرة رسمياً لبيانات التسجيل الحالية: <span class="font-bold text-gray-800">${userMatricule}</span></p>
          
          <div class="mt-4 space-y-3">
            <div class="flex items-center justify-between p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
              <div class="flex items-start gap-3">
                <span class="text-2xl">📜</span>
                <div>
                  <h5 class="text-xs font-bold text-emerald-950">شهادة حضور دورة الوسائط التعليمية الرقمية</h5>
                  <p class="text-[11px] text-emerald-800 mt-0.5">رمز التحقق: <span class="font-mono font-bold">ENSD-2026-08492</span> · تاريخ المنح: 2026-10-15</p>
                </div>
              </div>
              <button onclick="window.dispatchVerifyCode('ENSD-2026-08492')" class="rounded-lg bg-emerald-700 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-800">
                عرض الشهادة
              </button>
            </div>

            <div class="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-gray-50">
              <div class="flex items-start gap-3">
                <span class="text-2xl">🏅</span>
                <div>
                  <h5 class="text-xs font-bold text-gray-900">شهادة العضوية في نادي الخوارزمي للإعلام الآلي</h5>
                  <p class="text-[11px] text-gray-600 mt-0.5">رمز التحقق: <span class="font-mono font-bold">ENSD-2026-07119</span> · سارية للموسم الجامعي 2026–2027</p>
                </div>
              </div>
              <button onclick="window.dispatchVerifyCode('ENSD-2026-07119')" class="rounded-lg bg-[#5a0f1c] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#741626]">
                عرض الشهادة
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab Content 6: ADMIN APPROVALS -->
      ${isAdmin ? `
      <div id="sl-view-approvals" class="sl-view hidden space-y-4">
        <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h4 class="font-bold text-[#5a0f1c] text-sm flex items-center justify-between">
            <span>📋 طلبات العضوية في النوادي الطلابية بانتظار الاعتماد</span>
            <span class="rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-xs font-medium">لوحة الإدارة</span>
          </h4>
          <div class="mt-4 overflow-x-auto">
            <table class="w-full text-right text-xs">
              <thead>
                <tr class="border-b border-gray-200 bg-gray-50 text-gray-600">
                  <th class="p-2.5 font-semibold">الطالب</th>
                  <th class="p-2.5 font-semibold">رقم التسجيل</th>
                  <th class="p-2.5 font-semibold">النادي المراد</th>
                  <th class="p-2.5 font-semibold">تاريخ الطلب</th>
                  <th class="p-2.5 font-semibold">الحالة</th>
                  <th class="p-2.5 font-semibold text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody id="admin-apps-tbody" class="divide-y divide-gray-100">
                ${renderAdminApplicationsRows()}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      ` : ''}

    </div>

    <!-- Modal for Applying to a Club -->
    <div id="modal-club-apply" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4" dir="rtl">
        <div class="flex items-center justify-between border-b pb-3 border-gray-100">
          <h4 id="apply-club-title" class="font-bold text-sm text-[#5a0f1c]">طلب الانضمام إلى النادي</h4>
          <button type="button" id="btn-close-apply-modal" class="text-xl text-gray-400 hover:text-black">×</button>
        </div>
        <form id="form-club-apply" class="space-y-3.5 text-xs">
          <input type="hidden" id="apply-club-id" />
          <div>
            <label class="block font-semibold text-gray-700">اسم الطالب الكامل:</label>
            <input type="text" id="apply-student-name" required value="${userName}" class="mt-1 w-full rounded-xl border border-gray-300 p-2.5 outline-none focus:border-[#5a0f1c]" />
          </div>
          <div>
            <label class="block font-semibold text-gray-700">رقم التسجيل الجامعي:</label>
            <input type="text" id="apply-student-matricule" required value="${userMatricule}" class="mt-1 w-full rounded-xl border border-gray-300 p-2.5 font-mono outline-none focus:border-[#5a0f1c]" />
          </div>
          <div>
            <label class="block font-semibold text-gray-700">دوافع الانضمام والمجال الذي ترغب في الإسهام فيه:</label>
            <textarea id="apply-motivation" required rows="3" placeholder="اشرح مهاراتك أو ما ترغب في تعلمه وتطويره داخل النادي..." class="mt-1 w-full rounded-xl border border-gray-300 p-2.5 outline-none focus:border-[#5a0f1c]"></textarea>
          </div>
          <div class="pt-2 flex gap-2">
            <button type="submit" class="flex-1 rounded-xl bg-[#5a0f1c] py-2.5 text-white font-semibold hover:bg-[#741626] transition-colors">تأكيد إرسال الطلب</button>
            <button type="button" id="btn-cancel-apply" class="rounded-xl border border-gray-300 px-4 py-2.5 text-gray-600 hover:bg-gray-50">إلغاء</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal for Certificate Verification -->
    <div id="modal-cert-verify" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div class="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4" dir="rtl">
        <div class="flex items-center justify-between border-b pb-3 border-gray-100">
          <h4 class="font-bold text-sm text-[#5a0f1c] flex items-center gap-2">
            <span>🛡️</span> المنظومة المركزية للتحقق من الشهادات
          </h4>
          <button type="button" id="btn-close-cert-modal" class="text-xl text-gray-400 hover:text-black">×</button>
        </div>
        <div class="space-y-3 text-xs">
          <p class="text-gray-500">أدخل رمز التحقق المطبوع على الشهادة للتأكد من صحتها في سجلات المدرسة العليا:</p>
          <div class="flex gap-2">
            <input type="text" id="cert-code-input" placeholder="مثال: ENSD-2026-08492" class="flex-1 rounded-xl border border-gray-300 p-2.5 font-mono text-center uppercase font-bold text-gray-800 outline-none focus:border-[#5a0f1c]" />
            <button id="btn-do-verify" class="rounded-xl bg-[#5a0f1c] px-4 py-2.5 text-white font-semibold hover:bg-[#741626]">تحقق الآن</button>
          </div>
          <div id="cert-result-container" class="mt-4"></div>
        </div>
      </div>
    </div>

    <!-- Modal for Submitting New Exhibition Item -->
    <div id="modal-submit-exhibit" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4" dir="rtl">
        <div class="flex items-center justify-between border-b pb-3 border-gray-100">
          <h4 class="font-bold text-sm text-[#5a0f1c]">مشاركة إنجاز في المعرض الرقمي للطلبة</h4>
          <button type="button" id="btn-close-exhibit-modal" class="text-xl text-gray-400 hover:text-black">×</button>
        </div>
        <form id="form-submit-exhibit" class="space-y-3.5 text-xs">
          <div>
            <label class="block font-semibold text-gray-700">عنوان المشروع أو الإنجاز:</label>
            <input type="text" id="ex-title" required placeholder="مثال: وسيلة بيداغوجية لتصريف الأفعال..." class="mt-1 w-full rounded-xl border border-gray-300 p-2.5 outline-none focus:border-[#5a0f1c]" />
          </div>
          <div>
            <label class="block font-semibold text-gray-700">المؤلف / أسماء أعضاء الفريق:</label>
            <input type="text" id="ex-author" required value="${userName}" class="mt-1 w-full rounded-xl border border-gray-300 p-2.5 outline-none focus:border-[#5a0f1c]" />
          </div>
          <div>
            <label class="block font-semibold text-gray-700">التصنيف:</label>
            <select id="ex-category" class="mt-1 w-full rounded-xl border border-gray-300 p-2.5 outline-none focus:border-[#5a0f1c]">
              <option value="pedagogical_tool">وسيلة وتطبيق تعليمي بيداغوجي</option>
              <option value="scientific_poster">ملصق أو بحث علمي محكم</option>
              <option value="digital_project">مشروع برمجي أو رقمي</option>
              <option value="calligraphy">عمل فني أو خط عربي أصيل</option>
            </select>
          </div>
          <div>
            <label class="block font-semibold text-gray-700">ملخص تعريفي وفائدة الإنجاز:</label>
            <textarea id="ex-summary" required rows="3" placeholder="صف فكرة المشروع، المستهدفين، والأثر البيداغوجي..." class="mt-1 w-full rounded-xl border border-gray-300 p-2.5 outline-none focus:border-[#5a0f1c]"></textarea>
          </div>
          <div class="pt-2 flex gap-2">
            <button type="submit" class="flex-1 rounded-xl bg-[#5a0f1c] py-2.5 text-white font-semibold hover:bg-[#741626]">إرسال للمراجعة والاعتماد</button>
            <button type="button" id="btn-cancel-exhibit" class="rounded-xl border border-gray-300 px-4 py-2.5 text-gray-600 hover:bg-gray-50">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Attach interactive tab listeners
  setupTabNavigation();
  setupClubInteractions();
  setupEventInteractions(userMatricule, userName);
  setupCertificateVerification();
  setupExhibitionInteractions();
  if (isAdmin) setupAdminApprovalInteractions(userName);
}

// -------------------------------------------------------------------
// Render Helpers
// -------------------------------------------------------------------

function renderClubsGrid(cat?: string, query?: string): string {
  const clubs = getAllClubs(cat, query);
  if (clubs.length === 0) {
    return `<div class="col-span-full rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-xs text-gray-500">لا توجد نوادي مطابقة لمعايير البحث الحالية.</div>`;
  }

  return clubs.map(club => `
    <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-[#5a0f1c]/30 hover:shadow-md flex flex-col justify-between">
      <div>
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#faf6f1] text-2xl border border-[#6b1220]/10">${club.logo_emoji}</span>
            <div>
              <h4 class="font-bold text-[#5a0f1c] text-sm leading-tight">${club.name_ar}</h4>
              <p class="text-[11px] text-gray-500 mt-0.5">${club.name_fr}</p>
            </div>
          </div>
          <span class="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-800 border border-emerald-200 shrink-0">معتمد</span>
        </div>

        <p class="mt-3 text-xs text-gray-600 leading-relaxed">${club.description}</p>

        <div class="mt-3 space-y-1 rounded-xl bg-[#faf6f1] p-3 text-[11px] text-gray-700">
          <p><span class="font-semibold text-[#5a0f1c]">الأستاذ المشرف:</span> ${club.supervisor_name}</p>
          <p><span class="font-semibold text-[#5a0f1c]">المنسق الطلابي:</span> ${club.student_coordinator}</p>
          <p><span class="font-semibold text-[#5a0f1c]">المقر:</span> ${club.meeting_location}</p>
        </div>
      </div>

      <div class="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
        <span class="text-gray-500 font-medium">الأعضاء: <strong class="text-gray-900">${club.current_members_count}</strong> / ${club.max_capacity}</span>
        <button onclick="window.dispatchOpenClubApply('${club.id}', '${club.name_ar}')" class="rounded-xl bg-[#5a0f1c] px-3.5 py-1.5 font-semibold text-white hover:bg-[#741626] transition-colors">
          طلب الانضمام
        </button>
      </div>
    </div>
  `).join('');
}

function renderEventsGrid(userName: string, userMatricule: string): string {
  const events = getAllEvents();
  return events.map(ev => {
    const isFull = ev.registered_count >= ev.max_capacity;
    return `
      <div class="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm flex flex-col justify-between">
        <div class="bg-gradient-to-l ${ev.banner_color || 'from-[#5a0f1c] to-[#7f1d2d]'} p-4 text-white">
          <div class="flex items-center justify-between text-xs">
            <span class="rounded-full bg-white/20 px-2.5 py-0.5 font-medium">${ev.organizer}</span>
            <span class="font-semibold ${isFull ? 'text-red-300' : 'text-emerald-300'}">${isFull ? 'اكتملت المقاعد' : 'التسجيل مفتوح'}</span>
          </div>
          <h4 class="mt-2 font-bold text-sm leading-snug">${ev.title}</h4>
        </div>
        <div class="p-4 space-y-3 flex-1 flex flex-col justify-between text-xs">
          <p class="text-gray-600 leading-relaxed">${ev.description}</p>
          <div class="space-y-1.5 rounded-xl bg-gray-50 p-3 text-[11px] text-gray-700">
            <p><strong>المكان:</strong> ${ev.location}</p>
            <p><strong>التوقيت:</strong> ${ev.start_date}</p>
            <p><strong>المقاعد المحجوزة:</strong> ${ev.registered_count} من أصل ${ev.max_capacity}</p>
          </div>
          <div class="pt-2 flex items-center justify-between">
            <span class="text-[11px] text-gray-500">${ev.gives_certificate ? '🎖️ شهادة معتمدة' : '📄 مشاركة تدريبية'}</span>
            <button onclick="window.dispatchRegisterEvent('${ev.id}')" ${isFull ? 'disabled' : ''} class="rounded-xl ${isFull ? 'bg-gray-300 cursor-not-allowed text-gray-500' : 'bg-[#5a0f1c] hover:bg-[#741626] text-white'} px-4 py-2 font-semibold transition-colors">
              ${isFull ? 'المقاعد مكتملة' : 'تسجيل وحجز تذكرة'}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderCompetitionsGrid(): string {
  const comps = getAllCompetitions();
  return comps.map(comp => `
    <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3 text-xs">
      <div class="flex items-start justify-between">
        <h4 class="font-bold text-[#5a0f1c] text-sm">${comp.title}</h4>
        <span class="rounded-full bg-amber-100 text-amber-900 font-semibold px-2.5 py-0.5 text-[10px]">آخر أجل: ${comp.deadline}</span>
      </div>
      <p class="text-gray-600 leading-relaxed">${comp.description}</p>
      
      <div class="rounded-xl bg-[#faf6f1] p-3 text-[11px] space-y-1 text-gray-800">
        <p class="font-bold text-[#5a0f1c]">الجوائز والتكريمات:</p>
        <ul class="list-disc list-inside space-y-0.5 text-gray-700">
          ${comp.prizes.map(p => `<li>${p}</li>`).join('')}
        </ul>
      </div>

      <div class="flex items-center justify-between pt-2">
        <span class="text-gray-500">المشاركات المودعة: <strong>${comp.submissions_count}</strong></span>
        <button onclick="alert('تم تفعيل نموذج إيداع المشاركة. يرجى تقديم ملخص المشروع عبر المعرض الرقمي أو الاتصال بنادي التخصص.')" class="rounded-xl bg-[#5a0f1c] px-4 py-2 font-semibold text-white hover:bg-[#741626]">
          إيداع مشروع مشارك
        </button>
      </div>
    </div>
  `).join('');
}

function renderExhibitionGrid(): string {
  const items = getExhibitionItems();
  return items.map(item => `
    <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm flex flex-col justify-between text-xs space-y-2">
      <div>
        <div class="flex items-center justify-between">
          <span class="rounded-full bg-[#faf6f1] text-[#5a0f1c] font-bold px-2 py-0.5 text-[10px] border border-[#5a0f1c]/15">${item.badge || 'إنجاز طلابي'}</span>
          <span class="text-[10px] text-gray-400 font-mono">${item.date_added}</span>
        </div>
        <h5 class="mt-2 font-bold text-gray-900 leading-snug">${item.title}</h5>
        <p class="mt-1 text-[11px] text-gray-500 font-medium">إعداد: ${item.author_name} (${item.specialty_name})</p>
        <p class="mt-2 text-gray-600 leading-relaxed text-[11px]">${item.summary}</p>
      </div>
      <div class="pt-2 border-t border-gray-100 flex items-center justify-between">
        <button onclick="window.dispatchLikeExhibition('${item.id}', this)" class="inline-flex items-center gap-1 text-[11px] text-gray-600 hover:text-red-600 transition-colors">
          <span>❤️</span> <span class="like-cnt font-bold">${item.likes_count}</span> إعجاب
        </button>
        <span class="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md">معتمد رسمياً</span>
      </div>
    </div>
  `).join('');
}

function renderAdminApplicationsRows(): string {
  const apps = getAllApplications();
  if (apps.length === 0) {
    return `<tr><td colspan="6" class="p-4 text-center text-gray-500">لا توجد طلبات انضمام جديدة مسجلة حالياً.</td></tr>`;
  }
  return apps.map(a => `
    <tr class="hover:bg-gray-50">
      <td class="p-2.5 font-medium text-gray-900">${a.student_name}</td>
      <td class="p-2.5 font-mono text-gray-600">${a.registration_number}</td>
      <td class="p-2.5 text-[#5a0f1c] font-semibold">${a.club_name}</td>
      <td class="p-2.5 text-gray-500 font-mono">${a.submitted_at.split('T')[0]}</td>
      <td class="p-2.5">
        <span class="rounded-full px-2 py-0.5 text-[10px] font-bold ${
          a.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
          a.status === 'rejected' ? 'bg-red-100 text-red-800' :
          a.status === 'waitlist' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
        }">${
          a.status === 'approved' ? 'معتمد' :
          a.status === 'rejected' ? 'مرفوض' :
          a.status === 'waitlist' ? 'قائمة انتظار' : 'قيد المراجعة'
        }</span>
      </td>
      <td class="p-2.5 text-center">
        ${a.status === 'pending' || a.status === 'waitlist' ? `
          <div class="inline-flex gap-1">
            <button onclick="window.dispatchAdminAppReview('${a.id}', 'approved')" class="rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700">قبول</button>
            <button onclick="window.dispatchAdminAppReview('${a.id}', 'rejected')" class="rounded-lg bg-red-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-red-700">رفض</button>
          </div>
        ` : `<span class="text-gray-400 text-[10px]">—</span>`}
      </td>
    </tr>
  `).join('');
}

// -------------------------------------------------------------------
// Event Handlers Setup
// -------------------------------------------------------------------

function setupTabNavigation() {
  const tabs = document.querySelectorAll('.sl-tab-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-sl-tab');
      tabs.forEach(t => {
        t.className = 'sl-tab-btn rounded-xl px-3.5 py-2 bg-white/10 text-white/90 hover:bg-white/20 transition-all';
      });
      btn.className = 'sl-tab-btn rounded-xl px-3.5 py-2 bg-white text-[#5a0f1c] font-bold shadow-sm transition-all';

      document.querySelectorAll('.sl-view').forEach(v => v.classList.add('hidden'));
      const activeView = document.getElementById(`sl-view-${target}`);
      if (activeView) activeView.classList.remove('hidden');
    });
  });
}

function setupClubInteractions() {
  const modal = document.getElementById('modal-club-apply');
  const form = document.getElementById('form-club-apply');
  const closeBtn = document.getElementById('btn-close-apply-modal');
  const cancelBtn = document.getElementById('btn-cancel-apply');

  (window as any).dispatchOpenClubApply = (clubId: string, clubName: string) => {
    const idInput = document.getElementById('apply-club-id') as HTMLInputElement;
    const title = document.getElementById('apply-club-title');
    if (idInput) idInput.value = clubId;
    if (title) title.textContent = `طلب الانضمام إلى: ${clubName}`;
    if (modal) modal.classList.remove('hidden');
  };

  closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'));
  cancelBtn?.addEventListener('click', () => modal?.classList.add('hidden'));

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const clubId = (document.getElementById('apply-club-id') as HTMLInputElement)?.value;
    const name = (document.getElementById('apply-student-name') as HTMLInputElement)?.value;
    const matricule = (document.getElementById('apply-student-matricule') as HTMLInputElement)?.value;
    const motivation = (document.getElementById('apply-motivation') as HTMLTextAreaElement)?.value;

    const club = getClubById(clubId);
    const res = applyForClubMembership({
      club_id: clubId,
      club_name: club ? club.name_ar : 'النادي الجامعي',
      student_id: 'std-' + matricule,
      student_name: name,
      registration_number: matricule,
      specialty_code: 'general',
      academic_year: 1,
      motivation: motivation,
    });

    modal?.classList.add('hidden');
    const toast = document.getElementById('sl-feedback-msg');
    if (toast) {
      toast.classList.remove('hidden');
      if (res.success) {
        toast.className = 'rounded-2xl p-4 text-xs bg-emerald-50 text-emerald-900 border border-emerald-200';
        toast.innerHTML = `<strong>تم إرسال طلب الانضمام بنجاح!</strong> تم إدراج طلبك في قائمة مراجعة المشرف الإداري للنادي وسيتلقى حسابك الإشعار عند الاعتماد.`;
      } else {
        toast.className = 'rounded-2xl p-4 text-xs bg-red-50 text-red-900 border border-red-200';
        toast.innerHTML = `<strong>تنبيه:</strong> ${res.error}`;
      }
      setTimeout(() => toast.classList.add('hidden'), 6000);
    }
  });

  // Filter and search
  const filterBtns = document.querySelectorAll('.club-filter');
  const searchInput = document.getElementById('club-search-input') as HTMLInputElement;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => {
        b.className = 'club-filter rounded-lg border border-gray-200 bg-white text-gray-700 px-3 py-1.5 hover:bg-gray-50';
      });
      btn.className = 'club-filter active rounded-lg border border-[#5a0f1c] bg-[#5a0f1c] text-white px-3 py-1.5 font-semibold';
      const cat = btn.getAttribute('data-cat') || 'all';
      const grid = document.getElementById('clubs-grid');
      if (grid) grid.innerHTML = renderClubsGrid(cat, searchInput?.value);
    });
  });

  searchInput?.addEventListener('input', () => {
    const activeBtn = document.querySelector('.club-filter.active');
    const cat = activeBtn?.getAttribute('data-cat') || 'all';
    const grid = document.getElementById('clubs-grid');
    if (grid) grid.innerHTML = renderClubsGrid(cat, searchInput.value);
  });
}

function setupEventInteractions(userMatricule: string, userName: string) {
  (window as any).dispatchRegisterEvent = (eventId: string) => {
    const res = registerForEvent(eventId, 'std-' + userMatricule, userName, userMatricule);
    const toast = document.getElementById('sl-feedback-msg');
    if (toast) {
      toast.classList.remove('hidden');
      if (res.success) {
        toast.className = 'rounded-2xl p-4 text-xs bg-emerald-50 text-emerald-900 border border-emerald-200';
        toast.innerHTML = `<strong>تم تأكيد تسجيلك في الفعالية بنجاح!</strong> رمز تذكرتك الرسمية: <span class="font-mono font-bold text-emerald-950">${res.ticketCode}</span>. يمكنك إظهار الرمز عند مدخل القاعة.`;
        // re-render events grid
        const evView = document.getElementById('sl-view-events');
        if (evView) {
          const grid = evView.querySelector('.grid');
          if (grid) grid.innerHTML = renderEventsGrid(userName, userMatricule);
        }
      } else {
        toast.className = 'rounded-2xl p-4 text-xs bg-amber-50 text-amber-900 border border-amber-200';
        toast.innerHTML = `<strong>ملاحظة:</strong> ${res.error}`;
      }
      setTimeout(() => toast.classList.add('hidden'), 7000);
    }
  };
}

function setupCertificateVerification() {
  const modal = document.getElementById('modal-cert-verify');
  const openBtn = document.getElementById('btn-verify-cert');
  const closeBtn = document.getElementById('btn-close-cert-modal');
  const doVerifyBtn = document.getElementById('btn-do-verify');
  const codeInput = document.getElementById('cert-code-input') as HTMLInputElement;
  const resultContainer = document.getElementById('cert-result-container');

  openBtn?.addEventListener('click', () => modal?.classList.remove('hidden'));
  closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'));

  const checkCode = async (code: string) => {
    if (resultContainer) {
      resultContainer.innerHTML = '<p class="text-xs text-gray-500 animate-pulse">جاري التحقق من صحة الشهادة والرمز المعتمد في السجل الرقمي...</p>';
    }
    const cert = await verifyCertificateCodeAsync(code);
    if (!resultContainer) return;
    if (cert) {
      resultContainer.innerHTML = `
        <div class="rounded-2xl border-2 border-emerald-500 bg-emerald-50/70 p-4 text-xs space-y-2">
          <div class="flex items-center justify-between text-emerald-800 font-bold">
            <span class="flex items-center gap-1.5"><svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg> شهادة أصلية معتمدة رسمياً</span>
            <span class="font-mono">${cert.verification_code}</span>
          </div>
          <div class="space-y-1 text-gray-800 pt-1 border-t border-emerald-200">
            <p><strong>الممنوحة له:</strong> ${cert.recipient_name}</p>
            <p><strong>رقم التسجيل:</strong> ${cert.registration_number}</p>
            <p><strong>النشاط أو التكوين:</strong> ${cert.event_or_activity_title}</p>
            <p><strong>تاريخ الإصدار:</strong> ${cert.issue_date}</p>
            <p><strong>الجهة المصدرة:</strong> ${cert.issuer_authority}</p>
          </div>
        </div>
      `;
    } else {
      resultContainer.innerHTML = `
        <div class="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-900">
          <strong>الشهادة غير مطابقة:</strong> لم يتم العثور على شهادة مسجلة برمز التحقق المدخل (${code}). يرجى التحقق من صحة الأحرف والأرقام.
        </div>
      `;
    }
  };

  doVerifyBtn?.addEventListener('click', () => {
    const code = codeInput?.value || '';
    if (code.trim()) checkCode(code);
  });

  (window as any).dispatchVerifyCode = (code: string) => {
    if (modal) modal.classList.remove('hidden');
    if (codeInput) codeInput.value = code;
    checkCode(code);
  };
}

function setupExhibitionInteractions() {
  const modal = document.getElementById('modal-submit-exhibit');
  const openBtn = document.getElementById('btn-submit-exhibit');
  const openBtn2 = document.getElementById('btn-new-achievement');
  const closeBtn = document.getElementById('btn-close-exhibit-modal');
  const cancelBtn = document.getElementById('btn-cancel-exhibit');
  const form = document.getElementById('form-submit-exhibit');

  openBtn?.addEventListener('click', () => modal?.classList.remove('hidden'));
  openBtn2?.addEventListener('click', () => modal?.classList.remove('hidden'));
  closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'));
  cancelBtn?.addEventListener('click', () => modal?.classList.add('hidden'));

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = (document.getElementById('ex-title') as HTMLInputElement)?.value;
    const author = (document.getElementById('ex-author') as HTMLInputElement)?.value;
    const cat = (document.getElementById('ex-category') as HTMLSelectElement)?.value as any;
    const summary = (document.getElementById('ex-summary') as HTMLTextAreaElement)?.value;

    submitExhibitionItem({
      title,
      author_name: author,
      registration_number: '2439XXXXXX',
      specialty_name: 'طالب بالمدرسة العليا',
      category: cat,
      summary,
    });

    modal?.classList.add('hidden');
    const toast = document.getElementById('sl-feedback-msg');
    if (toast) {
      toast.classList.remove('hidden');
      toast.className = 'rounded-2xl p-4 text-xs bg-emerald-50 text-emerald-900 border border-emerald-200';
      toast.innerHTML = `<strong>تم استلام عملك بنجاح!</strong> تم إدراج المشروع في قائمة المعاينة الإدارية وسيظهر في المعرض الرقمي العام فور اعتماده من لجنة الأنشطة.`;
      setTimeout(() => toast.classList.add('hidden'), 7000);
    }
  });

  (window as any).dispatchLikeExhibition = (id: string, btn: HTMLElement) => {
    const newCnt = likeExhibitionItem(id);
    const cntSpan = btn.querySelector('.like-cnt');
    if (cntSpan) cntSpan.textContent = String(newCnt);
    btn.classList.add('text-red-600');
  };
}

function setupAdminApprovalInteractions(adminName: string) {
  (window as any).dispatchAdminAppReview = (appId: string, status: 'approved' | 'rejected') => {
    updateApplicationStatus(appId, status, adminName, 'تمت المراجعة من الإدارة الأكاديمية');
    const tbody = document.getElementById('admin-apps-tbody');
    if (tbody) tbody.innerHTML = renderAdminApplicationsRows();
    const toast = document.getElementById('sl-feedback-msg');
    if (toast) {
      toast.classList.remove('hidden');
      toast.className = 'rounded-2xl p-4 text-xs bg-emerald-50 text-emerald-900 border border-emerald-200';
      toast.innerHTML = `تم تحديث حالة الطلب إلى: <strong>${status === 'approved' ? 'معتمد' : 'مرفوض'}</strong> بنجاح.`;
      setTimeout(() => toast.classList.add('hidden'), 5000);
    }
  };
}
