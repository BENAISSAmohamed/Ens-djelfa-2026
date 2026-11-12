// Global Search Module — ملحقة المدرسة العليا للأساتذة - الجلفة
// محرك البحث الشامل الموحد (Ctrl+K)

export interface SearchEntry {
  id: string;
  title: string;
  category: 'service' | 'specialty' | 'club' | 'facility' | 'procedure' | 'event';
  categoryLabel: string;
  description: string;
  actionType: 'service' | 'hash' | 'custom';
  actionPayload: any;
}

const GLOBAL_CATALOG: SearchEntry[] = [
  // Services
  { id: 'sv-0', title: 'فضاء الطالب والبطاقة الرقمية', category: 'service', categoryLabel: 'خدمة رقمية', description: 'البطاقة الجامعية المشفرة، كشف النقاط، والغيابات الرسمية', actionType: 'service', actionPayload: 0 },
  { id: 'sv-1', title: 'فضاء الأستاذ ورصد الغيابات', category: 'service', categoryLabel: 'خدمة رقمية', description: 'متابعة الأفواج البيداغوجية، رصد الحضور والغياب، وتصدير القوائم', actionType: 'service', actionPayload: 1 },
  { id: 'sv-2', title: 'الطلبات الإدارية والشهادات المدرسية', category: 'service', categoryLabel: 'خدمة رقمية', description: 'طلب شهادة مدرسية، كشف نقاط، كارت الطالب، أو التظلمات', actionType: 'service', actionPayload: 2 },
  { id: 'sv-3', title: 'المكتبة الرقمية والمستودع البيداغوجي', category: 'service', categoryLabel: 'خدمة رقمية', description: 'كتب ومراجع ودروس المدارس العليا للأساتذة', actionType: 'service', actionPayload: 3 },
  { id: 'sv-4', title: 'رزنامة الامتحانات والتقويم الجامعي', category: 'service', categoryLabel: 'خدمة رقمية', description: 'مواعيد الامتحانات الفصلية والنهائية والعطل الرسمية', actionType: 'service', actionPayload: 4 },
  { id: 'sv-5', title: 'بوابة الحياة الطلابية والنوادي المعتمدة', category: 'service', categoryLabel: 'خدمة رقمية', description: 'النوادي العلمية والثقافية، المعرض الرقمي، وشهادات المشاركة', actionType: 'service', actionPayload: 5 },
  { id: 'sv-6', title: 'حجز المواعيد الإدارية المسبقة', category: 'service', categoryLabel: 'خدمة رقمية', description: 'حجز مقابلة مع مصلحة التمدرس وشؤون الطلبة', actionType: 'service', actionPayload: 6 },
  { id: 'sv-7', title: 'المساعد الأكاديمي الذكي', category: 'service', categoryLabel: 'خدمة رقمية', description: 'إجابات إرشادية حول الدراسة، التسجيلات والمناهج', actionType: 'service', actionPayload: 7 },
  { id: 'sv-8', title: 'مركز الإشعارات والتنبيهات الجامعية', category: 'service', categoryLabel: 'خدمة رقمية', description: 'التنبيهات العاجلة وتخصيص قنوات الإشعار', actionType: 'service', actionPayload: 8 },
  { id: 'sv-9', title: 'الجداول الرسمية لتوقيت الدراسة', category: 'service', categoryLabel: 'خدمة رقمية', description: 'جدول الحصص الأسبوعي لجميع التخصصات والمستويات والأفواج', actionType: 'service', actionPayload: 9 },

  // Specialties
  { id: 'sp-snv', title: 'علوم الطبيعة والحياة (أستاذ التعليم المتوسط / الثانوي)', category: 'specialty', categoryLabel: 'تخصص معتمد', description: 'تكوين بيداغوجي ومخبري متخصص في البيولوجيا والجيولوجيا', actionType: 'hash', actionPayload: 'programs' },
  { id: 'sp-info', title: 'الإعلام الآلي والذكاء الاصطناعي (أستاذ التعليم المتوسط / الثانوي)', category: 'specialty', categoryLabel: 'تخصص معتمد', description: 'البرمجة، الخوارزميات، الأنظمة، وتطبيقات الذكاء الاصطناعي في التعليم', actionType: 'hash', actionPayload: 'programs' },
  { id: 'sp-ar', title: 'اللغة العربية وآدابها (ابتدائي / متوسط / ثانوي)', category: 'specialty', categoryLabel: 'تخصص معتمد', description: 'علوم اللسان، النحو، الصرف، البلاغة، والأدب العربي', actionType: 'hash', actionPayload: 'programs' },
  { id: 'sp-fr', title: 'اللغة الفرنسية (ابتدائي / متوسط)', category: 'specialty', categoryLabel: 'تخصص معتمد', description: 'اللسانيات، الصوتيات، والديداكتيك الحديث لتعليم الفرنسية', actionType: 'hash', actionPayload: 'programs' },
  { id: 'sp-en', title: 'اللغة الإنجليزية (متوسط)', category: 'specialty', categoryLabel: 'تخصص معتمد', description: 'مهارات التواصل، القواعد، الأدب، وطرق تدريس الإنجليزية', actionType: 'hash', actionPayload: 'programs' },
  { id: 'sp-hg', title: 'التاريخ والجغرافيا (متوسط)', category: 'specialty', categoryLabel: 'تخصص معتمد', description: 'تاريخ الجزائر والحضارات، الجغرافيا الطبيعية والبشرية، وعلم الخرائط', actionType: 'hash', actionPayload: 'programs' },
  { id: 'sp-eps', title: 'التربية البدنية والرياضية (متوسط / ثانوي)', category: 'specialty', categoryLabel: 'تخصص معتمد', description: 'علم الحركة، التشريح، التدريب الرياضي، والديداكتيك البدني', actionType: 'hash', actionPayload: 'programs' },

  // Clubs
  { id: 'cl-khw', title: 'نادي الخوارزمي للإعلام الآلي والذكاء الاصطناعي', category: 'club', categoryLabel: 'نادي طلابي', description: 'ورشات البرمجة، الهاكاثونات، وتطوير المنصات البيداغوجية', actionType: 'service', actionPayload: 5 },
  { id: 'cl-hay', title: 'نادي ابن الهيثم للعلوم الطبيعية والبيئة', category: 'club', categoryLabel: 'نادي طلابي', description: 'تجارب مخبرية، خرجات استكشافية، والتوعية البيئية', actionType: 'service', actionPayload: 5 },
  { id: 'cl-fus', title: 'نادي الفصحى للأدب والمناظرات الفكرية', category: 'club', categoryLabel: 'نادي طلابي', description: 'فنون الخطابة، المناظرات الجامعية، وورشات الخط العربي', actionType: 'service', actionPayload: 5 },
  { id: 'cl-spo', title: 'النادي الرياضي الجامعي', category: 'club', categoryLabel: 'نادي طلابي', description: 'دوريات كرة القدم، كرة اليد، ألعاب القوى، والشطرنج', actionType: 'service', actionPayload: 5 },

  // Campus Facilities
  { id: 'fac-ampa', title: 'قاعة المحاضرات الكبرى (أ)', category: 'facility', categoryLabel: 'مرفق جامعي', description: 'المدرج الرئيسي للملتقيات والندوات والمحاضرات المشتركة', actionType: 'hash', actionPayload: 'about' },
  { id: 'fac-ampb', title: 'قاعات المحاضرات (ب، ج، د)', category: 'facility', categoryLabel: 'مرفق جامعي', description: 'مدرجات التدريس النظري للأقسام والتخصصات', actionType: 'hash', actionPayload: 'about' },
  { id: 'fac-lab1', title: 'مخابر الإعلام الآلي (01 و 02)', category: 'facility', categoryLabel: 'مرفق جامعي', description: 'مخابر مجهزة بأحدث الحواسيب والشبكات البيداغوجية', actionType: 'hash', actionPayload: 'about' },
  { id: 'fac-labsnv', title: 'المخابر البيداغوجية لعلوم الطبيعة والحياة', category: 'facility', categoryLabel: 'مرفق جامعي', description: 'مخابر الملاحظة المجهرية والتجارب الكيميائية والفيزيائية', actionType: 'hash', actionPayload: 'about' },
  { id: 'fac-lib', title: 'المكتبة الجامعية المركزية وقاعة المطالعة', category: 'facility', categoryLabel: 'مرفق جامعي', description: 'أرصدة وثائقية وكتب أكاديمية ومراجع بيداغوجية وقاعات للبحث الهادئ', actionType: 'service', actionPayload: 3 },
  { id: 'fac-sport', title: 'القاعة المتعددة الرياضات', category: 'facility', categoryLabel: 'مرفق جامعي', description: 'مرفق رياضي مغطى مخصص لأنشطة طلبة التربية البدنية والنوادي', actionType: 'hash', actionPayload: 'about' },

  // Official Procedures
  { id: 'pr-cert', title: 'إجراء: استخراج شهادة مدرسية أو إفادة تسجيل', category: 'procedure', categoryLabel: 'إجراء إداري', description: 'الطلب الرقمي عبر المنصة والاستلام خلال 24 ساعة من مصلحة التمدرس', actionType: 'service', actionPayload: 2 },
  { id: 'pr-card', title: 'إجراء: استخراج أو تجديد بطاقة الطالب الرقمية', category: 'procedure', categoryLabel: 'إجراء إداري', description: 'تأكيد البيانات الشخصية والصورة وتحميل البطاقة المزودة بـ QR', actionType: 'service', actionPayload: 0 },
  { id: 'pr-appeal', title: 'إجراء: تقديم تظلم أو إعادة تصحيح أوراق الامتحانات', category: 'procedure', categoryLabel: 'إجراء إداري', description: 'إيداع الطلب بعد إعلان النتائج الأولية وفق الآجال الرسمية', actionType: 'service', actionPayload: 2 },
];

export function openGlobalSearch(initialQuery?: string): void {
  let modal = document.getElementById('global-search-modal');
  if (!modal) {
    modal = createSearchModal();
    document.body.appendChild(modal);
  }
  const input = modal.querySelector('#global-search-input') as HTMLInputElement;
  modal.classList.remove('hidden');
  if (input) {
    if (initialQuery) input.value = initialQuery;
    input.focus();
    renderSearchResults(input.value);
  }
}

function createSearchModal(): HTMLElement {
  const container = document.createElement('div');
  container.id = 'global-search-modal';
  container.className = 'fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 pt-16 sm:pt-20 hidden';
  container.dir = 'rtl';

  container.innerHTML = `
    <div class="w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[80vh]">
      <!-- Search Input Bar -->
      <div class="flex items-center gap-3 border-b border-gray-200 bg-[#faf6f1] p-4 sm:p-5">
        <svg class="h-5 w-5 text-[#5a0f1c] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <input id="global-search-input" type="search" placeholder="ابحث في المنصة (خدمة، تخصص، نادي، إجراء، مرفق...)" class="flex-1 bg-transparent text-sm sm:text-base outline-none font-medium text-gray-900 placeholder:text-gray-400" />
        <span class="hidden sm:inline-block rounded-lg border border-gray-300 bg-white px-2 py-0.5 text-[11px] font-mono text-gray-500">ESC</span>
        <button id="btn-close-global-search" class="text-2xl leading-none text-gray-400 hover:text-black">×</button>
      </div>

      <!-- Quick Filter Pills -->
      <div class="flex flex-wrap gap-1.5 px-4 sm:px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-xs">
        <button data-search-filter="all" class="search-pill active rounded-lg border border-[#5a0f1c] bg-[#5a0f1c] text-white px-2.5 py-1 font-semibold">الكل</button>
        <button data-search-filter="service" class="search-pill rounded-lg border border-gray-200 bg-white text-gray-600 px-2.5 py-1 hover:bg-gray-100">خدمات</button>
        <button data-search-filter="specialty" class="search-pill rounded-lg border border-gray-200 bg-white text-gray-600 px-2.5 py-1 hover:bg-gray-100">تخصصات</button>
        <button data-search-filter="club" class="search-pill rounded-lg border border-gray-200 bg-white text-gray-600 px-2.5 py-1 hover:bg-gray-100">نوادي</button>
        <button data-search-filter="procedure" class="search-pill rounded-lg border border-gray-200 bg-white text-gray-600 px-2.5 py-1 hover:bg-gray-100">إجراءات</button>
        <button data-search-filter="facility" class="search-pill rounded-lg border border-gray-200 bg-white text-gray-600 px-2.5 py-1 hover:bg-gray-100">مرافق</button>
      </div>

      <!-- Results List -->
      <div id="global-search-results" class="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 divide-y divide-gray-100">
        <!-- Rendered dynamically -->
      </div>

      <!-- Footer Info -->
      <div class="border-t border-gray-100 bg-[#faf6f1]/60 px-5 py-2.5 text-[11px] text-gray-500 flex items-center justify-between">
        <span>ملحقة المدرسة العليا للأساتذة - الجلفة</span>
        <span class="flex items-center gap-1 font-medium text-[#5a0f1c]">
          <span>⚡</span> نتائج فورية ومباشرة
        </span>
      </div>
    </div>
  `;

  // Handlers
  const input = container.querySelector('#global-search-input') as HTMLInputElement;
  const closeBtn = container.querySelector('#btn-close-global-search');
  const pills = container.querySelectorAll('.search-pill');

  closeBtn?.addEventListener('click', () => container.classList.add('hidden'));
  container.addEventListener('click', (e) => {
    if (e.target === container) container.classList.add('hidden');
  });

  input?.addEventListener('input', () => {
    renderSearchResults(input.value);
  });

  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.className = 'search-pill rounded-lg border border-gray-200 bg-white text-gray-600 px-2.5 py-1 hover:bg-gray-100');
      pill.className = 'search-pill active rounded-lg border border-[#5a0f1c] bg-[#5a0f1c] text-white px-2.5 py-1 font-semibold';
      renderSearchResults(input?.value || '');
    });
  });

  return container;
}

function renderSearchResults(query: string): void {
  const container = document.getElementById('global-search-results');
  if (!container) return;

  const activePill = document.querySelector('.search-pill.active');
  const filterCat = activePill?.getAttribute('data-search-filter') || 'all';

  const q = query.trim().toLowerCase();
  const hits = GLOBAL_CATALOG.filter(entry => {
    if (filterCat !== 'all' && entry.category !== filterCat) return false;
    if (!q) return true; // show all when empty
    return entry.title.toLowerCase().includes(q) || entry.description.toLowerCase().includes(q);
  });

  if (hits.length === 0) {
    container.innerHTML = `
      <div class="py-12 text-center text-xs text-gray-500">
        <p class="text-xl">🔍</p>
        <p class="mt-2 font-bold text-gray-700">لم يتم العثور على نتائج مطابقة لـ "${query}"</p>
        <p class="text-gray-400 mt-1">جرّب استخدام كلمات عامة مثل: "إعلام آلي"، "شهادة"، "نادي"، "توقيت"...</p>
      </div>
    `;
    return;
  }

  container.innerHTML = hits.map(hit => `
    <div onclick="window.dispatchGlobalSearchResult('${hit.id}')" class="p-3 rounded-2xl hover:bg-[#faf6f1] transition-colors cursor-pointer flex items-start justify-between gap-3 group">
      <div>
        <div class="flex items-center gap-2">
          <span class="rounded-md px-2 py-0.5 text-[10px] font-bold ${
            hit.category === 'service' ? 'bg-[#5a0f1c]/10 text-[#5a0f1c]' :
            hit.category === 'specialty' ? 'bg-amber-100 text-amber-900' :
            hit.category === 'club' ? 'bg-emerald-100 text-emerald-900' :
            hit.category === 'procedure' ? 'bg-blue-100 text-blue-900' : 'bg-gray-200 text-gray-800'
          }">${hit.categoryLabel}</span>
          <h5 class="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-[#5a0f1c] transition-colors">${hit.title}</h5>
        </div>
        <p class="mt-1 text-xs text-gray-500 leading-relaxed">${hit.description}</p>
      </div>
      <span class="text-gray-400 group-hover:text-[#5a0f1c] font-bold text-sm shrink-0 self-center">←</span>
    </div>
  `).join('');
}

// Global dispatcher when user clicks a search result
(window as any).dispatchGlobalSearchResult = (entryId: string) => {
  const modal = document.getElementById('global-search-modal');
  if (modal) modal.classList.add('hidden');

  const entry = GLOBAL_CATALOG.find(e => e.id === entryId);
  if (!entry) return;

  if (entry.actionType === 'service') {
    if (typeof (window as any).openService === 'function') {
      (window as any).openService(entry.actionPayload);
    }
  } else if (entry.actionType === 'hash') {
    const el = document.getElementById(entry.actionPayload);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    else window.location.hash = '#' + entry.actionPayload;
  }
};

// Setup keyboard shortcut listener (Ctrl+K or Cmd+K or /)
export function initGlobalSearchShortcut(): void {
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openGlobalSearch();
    } else if (e.key === 'Escape') {
      const modal = document.getElementById('global-search-modal');
      if (modal && !modal.classList.contains('hidden')) {
        modal.classList.add('hidden');
      }
    }
  });
}
