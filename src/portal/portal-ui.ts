// High-Fidelity Responsive Arabic RTL UI for ENS Djelfa University Portal
// ملحقة المدرسة العليا للأساتذة - الجلفة
import {
  UserProfile,
  StudentRecord,
  DigitalStudentCard,
  CardStatus,
  TeacherRecord,
} from './types';
import {
  getAllStudents,
  getStudentById,
  getStudentByMatricule,
  saveStudentRecord,
  importStudentsBatch,
  getAllTeachers,
  getTeacherById,
  assignTeacherToGroup,
  getDigitalCardByStudentId,
  getAllStudentCards,
  updateCardPhoto,
  reviewStudentCard,
  getRegistrationApplications,
  submitRegistrationApplication,
  reviewRegistrationApplication,
  getAuditLogs,
  OFFICIAL_SPECIALTIES,
  getSpecialtyName,
} from './portal-store';
import { parseStudentListCsv, validateRegistrationNumber } from './registration-manager';
import { validateStudentPhotoFile, verifyCardByQrHash } from './card-manager';
import { canRecordAttendanceForGroup, canPerformAdminAction } from './authorization';
import { showToast } from '../auth-manager';

/**
 * Render the Digital Student Card HTML
 */
export function renderDigitalStudentCardHtml(card: DigitalStudentCard): string {
  const statusLabels: Record<CardStatus, { text: string; bg: string; textCol: string }> = {
    approved: { text: 'معتمدة وسارية المفعول', bg: 'bg-emerald-100', textCol: 'text-emerald-800' },
    pending: { text: 'قيد مراجعة الصورة والبيانات', bg: 'bg-amber-100', textCol: 'text-amber-800' },
    rejected: { text: 'الصورة مرفوضة — يرجى إعادة الرفع', bg: 'bg-red-100', textCol: 'text-red-800' },
    suspended: { text: 'معلقة مؤقتاً', bg: 'bg-gray-100', textCol: 'text-gray-800' },
  };

  const statusInfo = statusLabels[card.status] || statusLabels.pending;

  return `
    <div class="mx-auto w-full max-w-lg overflow-hidden rounded-3xl border border-[#5a0f1c]/20 bg-white shadow-xl transition-all">
      <!-- Card Academic Header -->
      <div class="bg-gradient-to-l from-[#5a0f1c] via-[#751627] to-[#8c1e32] p-5 text-white">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#E3C48A] bg-white p-1">
              <span class="text-xs font-bold text-[#5a0f1c]">ENS</span>
            </div>
            <div>
              <p class="text-xs font-semibold text-[#E3C48A]">الجمهورية الجزائرية الديمقراطية الشعبية</p>
              <h3 class="text-sm font-bold sm:text-base">ملحقة المدرسة العليا للأساتذة — الجلفة</h3>
              <p class="text-[11px] text-white/80">Affiliée à l'ENS Kouba · Carte d'Étudiant 2026/2027</p>
            </div>
          </div>
          <span class="rounded-full px-2.5 py-1 text-[11px] font-bold ${statusInfo.bg} ${statusInfo.textCol}">
            ${statusInfo.text}
          </span>
        </div>
      </div>

      <!-- Card Body: Photo & Credentials -->
      <div class="p-5">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
          <!-- Photo Container -->
          <div class="relative mx-auto flex h-36 w-32 shrink-0 flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[#5a0f1c]/30 bg-[#faf6f1]">
            ${
              card.photo_url
                ? `<img src="${card.photo_url}" alt="${card.full_name}" class="h-full w-full object-cover">`
                : `<div class="p-3 text-center text-xs text-gray-500">
                     <svg class="mx-auto h-8 w-8 text-gray-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                     </svg>
                     <span>لا توجد صورة</span>
                   </div>`
            }
            <label class="absolute inset-x-0 bottom-0 cursor-pointer bg-black/60 py-1 text-center text-[10px] font-semibold text-white backdrop-blur hover:bg-black/80">
              <span>تغيير الصورة</span>
              <input type="file" accept="image/*" class="sr-only" onchange="window.handleStudentPhotoUpload(this, '${card.student_id}')">
            </label>
          </div>

          <!-- Student Information -->
          <div class="flex-1 space-y-2 text-sm">
            <div>
              <span class="text-xs text-gray-500">الاسم واللقب:</span>
              <p class="text-base font-bold text-[#5a0f1c]">${card.full_name}</p>
            </div>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span class="text-gray-500">رقم التسجيل الرسمي:</span>
                <p dir="ltr" class="font-mono text-sm font-bold text-gray-900">${card.registration_number}</p>
              </div>
              <div>
                <span class="text-gray-500">الفوج والمستوى:</span>
                <p class="font-bold text-gray-800">السنة ${card.academic_year} · فوج ${card.group_number}</p>
              </div>
            </div>
            <div>
              <span class="text-xs text-gray-500">التخصص التكويني:</span>
              <p class="font-semibold text-gray-800">${card.specialty_name}</p>
            </div>
          </div>
        </div>

        ${
          card.rejection_reason && card.status === 'rejected'
            ? `<div class="mt-4 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-800">
                 <strong>سبب رفض الصورة:</strong> ${card.rejection_reason}
               </div>`
            : ''
        }

        <!-- Barcode & QR Verification Section -->
        <div class="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
          <div>
            <span class="text-[10px] font-bold tracking-wider text-gray-400">NUMÉRO CARTE:</span>
            <p dir="ltr" class="font-mono text-xs font-semibold text-gray-600">${card.card_number}</p>
            <p class="text-[10px] text-gray-400">صالحة إلى غاية: ${card.expiry_date}</p>
          </div>

          <button type="button" onclick="window.openQrVerificationModal('${card.qr_code_hash}')" class="flex items-center gap-1.5 rounded-xl border border-[#5a0f1c]/20 bg-[#faf6f1] px-3 py-2 text-xs font-semibold text-[#5a0f1c] hover:bg-[#5a0f1c] hover:text-white transition-colors">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            <span>التحقق من صحة البطاقة (QR)</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Handle student photo upload in browser
 */
(window as any).handleStudentPhotoUpload = (inputEl: HTMLInputElement, studentId: string) => {
  const file = inputEl.files?.[0];
  if (!file) return;

  const val = validateStudentPhotoFile(file);
  if (!val.isValid) {
    showToast(val.error || 'ملف الصورة غير صالح', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target?.result as string;
    const res = updateCardPhoto(studentId, dataUrl);
    if (res.success) {
      showToast('تم رفع الصورة بنجاح وهي قيد مراجعة مصلحة التدريس.', 'success');
      // Refresh current student view
      const cardEl = document.getElementById('studentCardContainer');
      if (cardEl && res.card) {
        cardEl.innerHTML = renderDigitalStudentCardHtml(res.card);
      }
    } else {
      showToast(res.error || 'تعذر حفظ الصورة', 'error');
    }
  };
  reader.readAsDataURL(file);
};

/**
 * Open public QR Verification Modal
 */
(window as any).openQrVerificationModal = (qrHash: string) => {
  const allCards = getAllStudentCards();
  const res = verifyCardByQrHash(qrHash, allCards);

  let modal = document.getElementById('qrVerifyModal') as HTMLDialogElement | null;
  if (!modal) {
    modal = document.createElement('dialog');
    modal.id = 'qrVerifyModal';
    modal.className = 'w-[min(94vw,520px)] rounded-3xl p-0 shadow-2xl backdrop:bg-black/60';
    document.body.appendChild(modal);
  }

  const statusBadge = res.is_valid
    ? `<span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
         <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
         بطاقة معتمدة رسمياً
       </span>`
    : `<span class="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800">
         بطاقة غير صالحة أو معلقة
       </span>`;

  modal.innerHTML = `
    <div class="overflow-hidden rounded-3xl bg-white text-[#2b0f14]">
      <div class="bg-gradient-to-l from-[#5a0f1c] to-[#84263a] p-5 text-white">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-bold">بوابة التحقق الرقمي من بطاقة الطالب</h3>
          <button type="button" onclick="document.getElementById('qrVerifyModal').close()" class="rounded-full border border-white/30 px-2.5 py-1 text-sm hover:bg-white/10">×</button>
        </div>
        <p class="mt-1 text-xs text-white/80">ENS Djelfa Digital Card Verification Service</p>
      </div>

      <div class="space-y-4 p-6 text-sm">
        <div class="text-center">
          <div class="mb-3">${statusBadge}</div>
          <p class="font-semibold text-gray-800">${res.message}</p>
        </div>

        <div class="rounded-2xl border border-gray-100 bg-[#faf6f1] p-4 space-y-2.5 text-xs">
          <div class="flex justify-between border-b border-gray-200/60 pb-1.5">
            <span class="text-gray-500">المؤسسة الجامعية:</span>
            <span class="font-bold text-[#5a0f1c]">${res.institution}</span>
          </div>
          <div class="flex justify-between border-b border-gray-200/60 pb-1.5">
            <span class="text-gray-500">حروف الطالب (حماية للخصوصية):</span>
            <span class="font-bold text-gray-800">${res.student_initials}</span>
          </div>
          <div class="flex justify-between border-b border-gray-200/60 pb-1.5">
            <span class="text-gray-500">رقم التسجيل الرسمي:</span>
            <span dir="ltr" class="font-mono font-bold text-gray-900">${res.registration_number}</span>
          </div>
          <div class="flex justify-between border-b border-gray-200/60 pb-1.5">
            <span class="text-gray-500">التخصص الأكاديمي:</span>
            <span class="font-semibold text-gray-800">${res.specialty_name}</span>
          </div>
          <div class="flex justify-between border-b border-gray-200/60 pb-1.5">
            <span class="text-gray-500">المستوى:</span>
            <span class="font-bold text-gray-800">السنة ${res.academic_year}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">تاريخ الإصدار / الصلاحية:</span>
            <span dir="ltr" class="text-gray-600">${res.issue_date} إلى ${res.expiry_date}</span>
          </div>
        </div>

        <p class="text-center text-[11px] text-gray-500">
          هذا الفحص مشفر ومطابق لقواعد حماية المعطيات الشخصية الصادرة عن وزارة التعليم العالي.
        </p>

        <button type="button" onclick="document.getElementById('qrVerifyModal').close()" class="w-full rounded-xl bg-[#5a0f1c] py-2.5 text-xs font-semibold text-white">
          إغلاق نافذة التحقق
        </button>
      </div>
    </div>
  `;

  modal.showModal();
};

/**
 * Render Administrative Portal (Student Lists, CSV Import, Card Approvals, Audit Logs)
 */
export function renderAdminManagementPortalHtml(adminActor: UserProfile | null): string {
  const studentsResult = getAllStudents(1, 20);
  const applications = getRegistrationApplications();
  const auditLogs = getAuditLogs().slice(0, 15);

  return `
    <div class="space-y-6">
      <!-- Admin Header with Navigation Tabs -->
      <div class="rounded-2xl border border-[#5a0f1c]/15 bg-white p-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 class="text-lg font-bold text-[#5a0f1c]">لوحة الإدارة والتحكم الأكاديمي</h3>
            <p class="text-xs text-gray-600">ملحقة المدرسة العليا للأساتذة — إدارة قوائم الطلبة، البطاقات الرقمية، وسجل الأمان</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="rounded-full bg-[#E3C48A]/30 px-3 py-1 text-xs font-bold text-[#5a0f1c]">
              ${adminActor?.role === 'super_admin' ? 'مسؤول رئيسي (Super Admin)' : 'مسؤول إداري'}
            </span>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
          <button type="button" onclick="window.switchAdminTab('students')" id="adminTabBtn_students" class="admin-tab-btn rounded-xl bg-[#5a0f1c] px-4 py-2 text-xs font-bold text-white">
            قوائم الطلبة والأرقام الرسمية (${studentsResult.total})
          </button>
          <button type="button" onclick="window.switchAdminTab('import')" id="adminTabBtn_import" class="admin-tab-btn rounded-xl bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200">
            استيراد قوائم (CSV/Excel)
          </button>
          <button type="button" onclick="window.switchAdminTab('cards')" id="adminTabBtn_cards" class="admin-tab-btn rounded-xl bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200">
            المصادقة على البطاقات
          </button>
          <button type="button" onclick="window.switchAdminTab('requests')" id="adminTabBtn_requests" class="admin-tab-btn rounded-xl bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200">
            طلبات التسجيل الجديدة (${applications.filter(a => a.status === 'pending').length})
          </button>
          <button type="button" onclick="window.switchAdminTab('teachers')" id="adminTabBtn_teachers" class="admin-tab-btn rounded-xl bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200">
            توزيع الأفواج والأساتذة
          </button>
          <button type="button" onclick="window.switchAdminTab('audit')" id="adminTabBtn_audit" class="admin-tab-btn rounded-xl bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200">
            سجل الرقابة والأمان (Audit Log)
          </button>
        </div>
      </div>

      <!-- Tab Content 1: Student List -->
      <div id="adminTab_students" class="admin-tab-content space-y-4">
        <!-- Search & Filters -->
        <div class="grid gap-3 rounded-2xl bg-white p-4 shadow-sm sm:grid-cols-3">
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">بحث بالاسم أو رقم التسجيل</label>
            <input type="text" id="adminStudentSearch" placeholder="ابحث هنا..." oninput="window.filterAdminStudents()" class="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs">
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">تصفية حسب التخصص</label>
            <select id="adminSpecialtyFilter" onchange="window.filterAdminStudents()" class="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs">
              <option value="all">كل التخصصات (10 تخصصات)</option>
              ${OFFICIAL_SPECIALTIES.map(s => `<option value="${s.code}">${s.name_ar}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">تصفية حسب السنة</label>
            <select id="adminYearFilter" onchange="window.filterAdminStudents()" class="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs">
              <option value="0">كل السنوات</option>
              <option value="1">السنة الأولى</option>
              <option value="2">السنة الثانية</option>
              <option value="3">السنة الثالثة</option>
              <option value="4">السنة الرابعة</option>
              <option value="5">السنة الخامسة</option>
            </select>
          </div>
        </div>

        <!-- Student Table -->
        <div class="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table class="w-full text-start text-xs">
            <thead class="bg-[#faf6f1] text-[#5a0f1c] font-bold">
              <tr>
                <th class="p-3 text-start">رقم التسجيل</th>
                <th class="p-3 text-start">الاسم واللقب</th>
                <th class="p-3 text-start">التخصص</th>
                <th class="p-3 text-start">المستوى / الفوج</th>
                <th class="p-3 text-start">حالة البطاقة</th>
                <th class="p-3 text-start">إجراءات</th>
              </tr>
            </thead>
            <tbody id="adminStudentTableBody" class="divide-y divide-gray-100">
              ${renderStudentTableRows(studentsResult.data)}
            </tbody>
          </table>
        </div>

        <!-- Pagination Controls -->
        <div id="adminStudentPagination" class="flex items-center justify-between text-xs text-gray-600">
          <span>الصفحة 1 من ${studentsResult.totalPages} (إجمالي: ${studentsResult.total} طالب)</span>
          <div class="flex gap-1.5">
            <button type="button" onclick="window.navigateStudentPage(1)" class="rounded-lg border border-gray-200 px-2.5 py-1.5 hover:bg-gray-50">الأولى</button>
            <button type="button" onclick="window.navigateStudentPage(2)" class="rounded-lg border border-gray-200 px-2.5 py-1.5 hover:bg-gray-50">التالية</button>
          </div>
        </div>
      </div>

      <!-- Tab Content 2: CSV Importer -->
      <div id="adminTab_import" class="admin-tab-content hidden space-y-4">
        <div class="rounded-2xl border border-[#5a0f1c]/15 bg-white p-5">
          <h4 class="font-bold text-[#5a0f1c]">استيراد قوائم الطلبة والأرقام الرسمية (CSV / نص مجدول)</h4>
          <p class="mt-1 text-xs text-gray-600">
            يدعم الاستيراد المباشر من ملفات Excel و CSV مع التحقق الآلي من تطابق الأرقام ومنع التكرار.
          </p>

          <div class="mt-4 space-y-3">
            <label class="block text-xs font-semibold text-gray-700">الصق محتوى القائمة هنا (سطر الترويسة مطلوب):</label>
            <textarea id="csvImportText" rows="6" dir="ltr" class="w-full font-mono text-xs rounded-xl border border-gray-200 p-3" placeholder="رقم التسجيل,الاسم الكامل,التخصص,السنة,الفوج,البريد الإلكتروني
2439050001,علي بن محمد بن عيسى,snv_cem,1,1,ali@ens-djelfa.dz
2439050002,خديجة بوعبدلي,info_cem,1,1,khadija@ens-djelfa.dz"></textarea>

            <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div class="flex items-center gap-2 text-xs">
                <span class="font-semibold text-gray-700">معالجة الأرقام المكررة:</span>
                <select id="csvConflictStrategy" class="rounded-lg border border-gray-200 px-2.5 py-1 text-xs">
                  <option value="skip">تخطي السجل المكرر (Skip)</option>
                  <option value="overwrite">تحديث بيانات السجل السابق (Overwrite)</option>
                  <option value="suffix">إضافة لاحقة تمييزية (Suffix)</option>
                </select>
              </div>

              <button type="button" onclick="window.executeCsvImport()" class="rounded-xl bg-[#5a0f1c] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#751627]">
                فحص واستيراد القائمة
              </button>
            </div>

            <div id="csvImportFeedback" class="hidden rounded-xl p-3 text-xs"></div>
          </div>
        </div>
      </div>

      <!-- Tab Content 3: Student Card Approvals -->
      <div id="adminTab_cards" class="admin-tab-content hidden space-y-4">
        <div class="rounded-2xl border border-gray-200 bg-white p-5">
          <h4 class="font-bold text-[#5a0f1c]">المصادقة على بطاقات الطلبة والصور المرفوعة</h4>
          <p class="mt-1 text-xs text-gray-600">راجع صور الطلبة المرفوعة حديثاً للمصادقة عليها أو طلب إعادة الرفع عند عدم مطابقة معايير الصورة الرسمية.</p>

          <div id="adminCardsReviewGrid" class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            ${renderCardsReviewGrid()}
          </div>
        </div>
      </div>

      <!-- Tab Content 4: Registration Requests -->
      <div id="adminTab_requests" class="admin-tab-content hidden space-y-4">
        <div class="rounded-2xl border border-gray-200 bg-white p-5">
          <h4 class="font-bold text-[#5a0f1c]">طلبات تسجيل الطلبة الجدد (حاملي شهادة البكالوريا)</h4>
          <p class="mt-1 text-xs text-gray-600">تحقق من بيانات البكالوريا والشعبة والتخصص المطلوب لإنشاء حساب الطالب وإصدار رقم التسجيل المؤسسي.</p>

          <div id="adminRequestsList" class="mt-4 space-y-3">
            ${renderRegistrationApplications(applications)}
          </div>
        </div>
      </div>

      <!-- Tab Content 5: Teachers & Group Assignments -->
      <div id="adminTab_teachers" class="admin-tab-content hidden space-y-4">
        <div class="rounded-2xl border border-gray-200 bg-white p-5">
          <h4 class="font-bold text-[#5a0f1c]">إدارة الأساتذة وتوزيع الأفواج والمقاييس</h4>
          <p class="mt-1 text-xs text-gray-600">
            توزيع الأفواج يضمن أن الأستاذ لا يمكنه رصد الغيابات إلا للأفواج والمقاييس المسندة إليه رسمياً.
          </p>
          <div class="mt-4 space-y-3">
            ${renderTeachersTable(getAllTeachers())}
          </div>
        </div>
      </div>

      <!-- Tab Content 6: Audit Logs -->
      <div id="adminTab_audit" class="admin-tab-content hidden space-y-4">
        <div class="rounded-2xl border border-gray-200 bg-white p-5">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="font-bold text-[#5a0f1c]">سجل العمليات والرقابة الأكاديمية (Audit Logs)</h4>
              <p class="mt-1 text-xs text-gray-600">توثيق آلي لكل تعديل على أرقام التسجيل، المصادقة على البطاقات، والاستيراد الجماعي.</p>
            </div>
            <span class="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-800">
              التسجيل نشط
            </span>
          </div>

          <div class="mt-4 overflow-x-auto">
            <table class="w-full text-start text-xs">
              <thead class="bg-[#faf6f1] text-[#5a0f1c] font-bold">
                <tr>
                  <th class="p-2.5 text-start">الوقت</th>
                  <th class="p-2.5 text-start">القائم بالعملية</th>
                  <th class="p-2.5 text-start">الإجراء</th>
                  <th class="p-2.5 text-start">الهدف</th>
                  <th class="p-2.5 text-start">التفاصيل</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 font-mono text-[11px]">
                ${auditLogs.map(l => `
                  <tr>
                    <td class="p-2.5 text-gray-500">${new Date(l.created_at).toLocaleTimeString('ar-DZ')}</td>
                    <td class="p-2.5 font-bold text-gray-800">${l.actor_name} (${l.actor_role})</td>
                    <td class="p-2.5"><span class="rounded bg-gray-100 px-1.5 py-0.5 font-bold text-[#5a0f1c]">${l.action}</span></td>
                    <td class="p-2.5 text-gray-600">${l.target_table}:${l.target_id}</td>
                    <td class="p-2.5 text-gray-700">${JSON.stringify(l.details)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderStudentTableRows(students: StudentRecord[]): string {
  return students.map(s => `
    <tr class="hover:bg-gray-50/80 transition-colors">
      <td class="p-3 font-mono font-bold text-[#5a0f1c]">${s.registration_number}</td>
      <td class="p-3 font-semibold text-gray-800">${s.full_name}</td>
      <td class="p-3 text-gray-600">${getSpecialtyName(s.specialty_code)}</td>
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
}

function renderCardsReviewGrid(): string {
  const students = getAllStudents(1, 50).data.filter(s => s.photo_status === 'pending' || s.photo_url);
  if (students.length === 0) {
    return `<p class="col-span-full py-8 text-center text-xs text-gray-500">لا توجد بطاقات بانتظار المراجعة حالياً.</p>`;
  }

  return students.slice(0, 6).map(s => `
    <div class="rounded-2xl border border-gray-200 bg-[#faf6f1] p-4 text-xs space-y-3">
      <div class="flex items-center gap-3">
        <div class="h-16 w-14 shrink-0 overflow-hidden rounded-xl border border-gray-300 bg-white">
          ${s.photo_url ? `<img src="${s.photo_url}" alt="" class="h-full w-full object-cover">` : `<div class="flex h-full items-center justify-center text-[10px] text-gray-400">صورة</div>`}
        </div>
        <div>
          <p class="font-bold text-gray-900">${s.full_name}</p>
          <p dir="ltr" class="font-mono text-gray-600">${s.registration_number}</p>
          <p class="text-[11px] text-gray-500">${getSpecialtyName(s.specialty_code)}</p>
        </div>
      </div>
      <div class="flex gap-2">
        <button type="button" onclick="window.adminReviewCard('${s.id}', true)" class="flex-1 rounded-xl bg-emerald-700 py-2 font-bold text-white hover:bg-emerald-800">
          مصادقة واعتماد
        </button>
        <button type="button" onclick="window.adminReviewCard('${s.id}', false)" class="flex-1 rounded-xl bg-red-700 py-2 font-bold text-white hover:bg-red-800">
          رفض
        </button>
      </div>
    </div>
  `).join('');
}

function renderRegistrationApplications(apps: any[]): string {
  if (apps.length === 0) {
    return `<p class="py-8 text-center text-xs text-gray-500">لا توجد طلبات تسجيل جديدة حالياً.</p>`;
  }

  return apps.map(a => `
    <div class="rounded-2xl border border-gray-200 bg-white p-4 text-xs space-y-2">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-bold text-[#5a0f1c]">${a.full_name}</p>
          <p class="text-gray-500">بكالوريا ${a.bac_year} · شعبة: ${a.high_school_branch || 'علوم'} · رقم البكالوريا: ${a.bac_registration_number}</p>
        </div>
        <span class="rounded-full px-2.5 py-1 text-[10px] font-bold ${a.status === 'pending' ? 'bg-amber-100 text-amber-800' : a.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}">
          ${a.status === 'pending' ? 'قيد التحكيم' : a.status === 'approved' ? 'مقبول ومسجل' : 'مرفوض'}
        </span>
      </div>
      <div class="flex justify-between border-t border-gray-100 pt-2 text-gray-600">
        <span>التخصص المطلوب: <strong>${getSpecialtyName(a.requested_specialty)}</strong></span>
        <span>البريد: ${a.email}</span>
      </div>
      ${a.status === 'pending' ? `
        <div class="flex gap-2 pt-1">
          <button type="button" onclick="window.adminProcessApplication('${a.id}', true)" class="rounded-lg bg-emerald-700 px-4 py-1.5 font-bold text-white hover:bg-emerald-800">
            قبول وتوليد رقم تسجيل رسمي
          </button>
          <button type="button" onclick="window.adminProcessApplication('${a.id}', false)" class="rounded-lg bg-gray-200 px-4 py-1.5 font-semibold text-gray-700 hover:bg-gray-300">
            رفض
          </button>
        </div>
      ` : ''}
    </div>
  `).join('');
}

function renderTeachersTable(teachers: TeacherRecord[]): string {
  return `
    <div class="overflow-x-auto rounded-2xl border border-gray-200">
      <table class="w-full text-start text-xs">
        <thead class="bg-[#faf6f1] text-[#5a0f1c] font-bold">
          <tr>
            <th class="p-3 text-start">الأستاذ</th>
            <th class="p-3 text-start">الرقم الوظيفي</th>
            <th class="p-3 text-start">القسم والرتبة</th>
            <th class="p-3 text-start">الأفواج المسندة</th>
            <th class="p-3 text-start">إجراء</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          ${teachers.map(t => `
            <tr>
              <td class="p-3 font-bold text-gray-900">${t.full_name}</td>
              <td class="p-3 font-mono text-gray-600">${t.employee_number}</td>
              <td class="p-3 text-gray-700">${t.department} · ${t.academic_rank}</td>
              <td class="p-3">
                <div class="flex flex-wrap gap-1">
                  ${t.assigned_groups.map(g => `<span class="rounded bg-[#5a0f1c]/10 px-2 py-0.5 text-[10px] font-semibold text-[#5a0f1c]">فوج ${g.group_number} (${g.subject_name})</span>`).join('')}
                </div>
              </td>
              <td class="p-3">
                <button type="button" onclick="window.openAssignGroupModal('${t.id}')" class="rounded-lg border border-[#5a0f1c]/20 px-2.5 py-1 text-[11px] font-semibold text-[#5a0f1c] hover:bg-[#5a0f1c] hover:text-white">
                  إسناد فوج
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// Window actions
(window as any).switchAdminTab = (tabName: string) => {
  document.querySelectorAll('.admin-tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.admin-tab-btn').forEach(b => {
    b.classList.remove('bg-[#5a0f1c]', 'text-white');
    b.classList.add('bg-gray-100', 'text-gray-700');
  });

  const activeContent = document.getElementById(`adminTab_${tabName}`);
  const activeBtn = document.getElementById(`adminTabBtn_${tabName}`);
  if (activeContent) activeContent.classList.remove('hidden');
  if (activeBtn) {
    activeBtn.classList.remove('bg-gray-100', 'text-gray-700');
    activeBtn.classList.add('bg-[#5a0f1c]', 'text-white');
  }
};

(window as any).executeCsvImport = () => {
  const textEl = document.getElementById('csvImportText') as HTMLTextAreaElement | null;
  const stratEl = document.getElementById('csvConflictStrategy') as HTMLSelectElement | null;
  const feedbackEl = document.getElementById('csvImportFeedback');

  if (!textEl || !textEl.value.trim()) {
    showToast('يرجى لصق بيانات القائمة أولاً', 'error');
    return;
  }

  const parsed = parseStudentListCsv(textEl.value);
  if (parsed.records.length === 0) {
    if (feedbackEl) {
      feedbackEl.className = 'mt-3 rounded-xl bg-red-100 p-3 text-xs text-red-800 border border-red-200 block';
      feedbackEl.innerHTML = `<strong>فشل الاستيراد:</strong> لم يتم العثور على أسطر صالحة. تأكد من وجود ترويسة الأعمدة (رقم التسجيل, الاسم الكامل...).`;
    }
    return;
  }

  const strat = (stratEl?.value as 'skip' | 'overwrite' | 'suffix') || 'skip';
  const res = importStudentsBatch(parsed.records, strat, (window as any).currentProfile);

  if (feedbackEl) {
    feedbackEl.className = 'mt-3 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-900 border border-emerald-200 block';
    feedbackEl.innerHTML = `
      <strong>تمت معالجة القائمة بنجاح!</strong>
      <ul class="mt-1 list-disc list-inside">
        <li>عدد الطلبة المستوردين: <strong>${res.importedCount}</strong></li>
        <li>عدد السجلات المتخطاة (المكررة): <strong>${res.skippedCount}</strong></li>
      </ul>
    `;
  }
  showToast(`تم استيراد ${res.importedCount} طالب بنجاح!`, 'success');
  textEl.value = '';
};

(window as any).viewStudentCardModal = (studentId: string) => {
  const card = getDigitalCardByStudentId(studentId);
  if (!card) return;

  let modal = document.getElementById('adminCardViewModal') as HTMLDialogElement | null;
  if (!modal) {
    modal = document.createElement('dialog');
    modal.id = 'adminCardViewModal';
    modal.className = 'w-[min(94vw,560px)] rounded-3xl p-0 shadow-2xl backdrop:bg-black/60';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="overflow-hidden rounded-3xl bg-[#faf6f1] p-6 text-[#2b0f14]">
      <div class="mb-4 flex items-center justify-between">
        <h4 class="font-bold text-[#5a0f1c]">معاينة بطاقة الطالب الرسمية</h4>
        <button type="button" onclick="document.getElementById('adminCardViewModal').close()" class="rounded-full border border-gray-300 px-2.5 py-1 text-xs">×</button>
      </div>
      <div id="studentCardContainer">
        ${renderDigitalStudentCardHtml(card)}
      </div>
    </div>
  `;
  modal.showModal();
};

(window as any).adminReviewCard = (studentId: string, approved: boolean) => {
  const ok = reviewStudentCard(studentId, approved, approved ? undefined : 'الصورة غير مطابقة للشروط الرسمية', (window as any).currentProfile);
  if (ok) {
    showToast(approved ? 'تمت المصادقة على البطاقة بنجاح' : 'تم رفض الصورة وإشعار الطالب', approved ? 'success' : 'info');
    const grid = document.getElementById('adminCardsReviewGrid');
    if (grid) grid.innerHTML = renderCardsReviewGrid();
  }
};

(window as any).adminProcessApplication = (appId: string, approved: boolean) => {
  const res = reviewRegistrationApplication(appId, approved, undefined, (window as any).currentProfile);
  if (res.success) {
    showToast(approved ? `تم قبول الطالب وإصدار رقم التسجيل: ${res.createdStudent?.registration_number}` : 'تم رفض الطلب', 'success');
    const list = document.getElementById('adminRequestsList');
    if (list) list.innerHTML = renderRegistrationApplications(getRegistrationApplications());
  }
};
