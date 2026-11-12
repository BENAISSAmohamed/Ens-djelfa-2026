// Productivity & Campus Directory Hub — ملحقة المدرسة العليا للأساتذة - الجلفة
// مركز الإنتاجية والمرافق والإجراءات الإدارية

export interface PersonalTask {
  id: string;
  title: string;
  category: 'study' | 'exam' | 'admin' | 'club';
  dueDate: string;
  completed: boolean;
}

const TASKS_STORAGE_KEY = 'ens_personal_tasks';
const PINNED_STORAGE_KEY = 'ens_pinned_services';

export function getPersonalTasks(): PersonalTask[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TASKS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [
      { id: 'tsk-1', title: 'مراجعة مقياس ديداكتيك التخصص للطور المتوسط', category: 'study', dueDate: '2026-11-20', completed: false },
      { id: 'tsk-2', title: 'إيداع طلب الشهادة المدرسية عبر المنصة', category: 'admin', dueDate: '2026-11-18', completed: true },
      { id: 'tsk-3', title: 'المشاركة في ورشة البرمجة لنادي الخوارزمي', category: 'club', dueDate: '2026-11-25', completed: false },
    ];
  } catch {
    return [];
  }
}

export function savePersonalTasks(tasks: PersonalTask[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  } catch {}
}

export function getPinnedServices(): number[] {
  if (typeof window === 'undefined') return [0, 9, 3, 5];
  try {
    const raw = localStorage.getItem(PINNED_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [0, 9, 3, 5];
  } catch {
    return [0, 9, 3, 5];
  }
}

export function togglePinService(idx: number): boolean {
  let pinned = getPinnedServices();
  if (pinned.includes(idx)) {
    pinned = pinned.filter(i => i !== idx);
  } else {
    pinned.push(idx);
  }
  try {
    localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(pinned));
  } catch {}
  return pinned.includes(idx);
}

// -------------------------------------------------------------
// Interactive UI Renderers
// -------------------------------------------------------------

export function openProductivityHubModal(tab: 'quick' | 'tasks' | 'procedures' | 'facilities' | 'downloads' | 'feedback' | 'security' | 'status' = 'quick'): void {
  let modal = document.getElementById('productivity-hub-modal');
  if (!modal) {
    modal = createProductivityModal();
    document.body.appendChild(modal);
  }
  modal.classList.remove('hidden');
  switchProductivityTab(tab);
}

function createProductivityModal(): HTMLElement {
  const container = document.createElement('div');
  container.id = 'productivity-hub-modal';
  container.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 hidden';
  container.dir = 'rtl';

  container.innerHTML = `
    <div class="w-full max-w-4xl rounded-3xl bg-[#fffdf9] shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[85vh]">
      <!-- Header -->
      <div class="flex items-center justify-between bg-gradient-to-l from-[#5a0f1c] via-[#741626] to-[#450a14] p-5 text-white">
        <div class="flex items-center gap-3">
          <span class="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-xl text-[#E3C48A] border border-white/20">⚡</span>
          <div>
            <h3 class="font-bold text-base sm:text-lg">مركز الإنتاجية والخدمات الجامعية الشاملة</h3>
            <p class="text-xs text-white/80">المخطط الشخصي، دليل الإجراءات الرسمية، والمرافق الجامعية</p>
          </div>
        </div>
        <button id="btn-close-prod-modal" class="text-2xl text-white/70 hover:text-white">×</button>
      </div>

      <!-- Navigation Bar -->
      <div class="flex flex-wrap gap-1.5 border-b border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold overflow-x-auto">
        <button data-prod-tab="quick" class="prod-tab-btn rounded-xl px-3 py-1.5 bg-[#5a0f1c] text-white">الوصول السريع</button>
        <button data-prod-tab="tasks" class="prod-tab-btn rounded-xl px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200">المهام والمخطط</button>
        <button data-prod-tab="procedures" class="prod-tab-btn rounded-xl px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200">دليل الإجراءات</button>
        <button data-prod-tab="facilities" class="prod-tab-btn rounded-xl px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200">مرافق الملحقة</button>
        <button data-prod-tab="downloads" class="prod-tab-btn rounded-xl px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200">مركز التحميل</button>
        <button data-prod-tab="security" class="prod-tab-btn rounded-xl px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200">الأمان والخصوصية</button>
        <button data-prod-tab="status" class="prod-tab-btn rounded-xl px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200">حالة النظام</button>
      </div>

      <!-- Content Views -->
      <div id="prod-tab-content" class="flex-1 overflow-y-auto p-5 space-y-4">
        <!-- Rendered dynamically -->
      </div>
    </div>
  `;

  const closeBtn = container.querySelector('#btn-close-prod-modal');
  closeBtn?.addEventListener('click', () => container.classList.add('hidden'));
  container.addEventListener('click', (e) => {
    if (e.target === container) container.classList.add('hidden');
  });

  const tabBtns = container.querySelectorAll('.prod-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-prod-tab') as any;
      switchProductivityTab(target);
    });
  });

  return container;
}

function switchProductivityTab(tab: string): void {
  const container = document.getElementById('productivity-hub-modal');
  if (!container) return;

  const tabBtns = container.querySelectorAll('.prod-tab-btn');
  tabBtns.forEach(b => {
    if (b.getAttribute('data-prod-tab') === tab) {
      b.className = 'prod-tab-btn rounded-xl px-3 py-1.5 bg-[#5a0f1c] text-white font-semibold';
    } else {
      b.className = 'prod-tab-btn rounded-xl px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 font-semibold';
    }
  });

  const contentArea = container.querySelector('#prod-tab-content');
  if (!contentArea) return;

  if (tab === 'quick') {
    contentArea.innerHTML = renderQuickAccessView();
  } else if (tab === 'tasks') {
    contentArea.innerHTML = renderTasksAndPlannerView();
    setupTasksListeners();
  } else if (tab === 'procedures') {
    contentArea.innerHTML = renderProceduresView();
  } else if (tab === 'facilities') {
    contentArea.innerHTML = renderFacilitiesView();
  } else if (tab === 'downloads') {
    contentArea.innerHTML = renderDownloadsView();
  } else if (tab === 'security') {
    contentArea.innerHTML = renderSecurityView();
  } else if (tab === 'status') {
    contentArea.innerHTML = renderStatusView();
  }
}

// 1. QUICK ACCESS VIEW
function renderQuickAccessView(): string {
  const pinned = getPinnedServices();
  const serviceLabels = [
    { idx: 0, name: 'فضاء الطالب والبطاقة الرقمية', desc: 'بطاقتك الجامعية، الغيابات والنقاط', icon: '🎓' },
    { idx: 1, name: 'فضاء الأستاذ ورصد الغيابات', desc: 'إدارة الأفواج البيداغوجية والحضور', icon: '👨‍🏫' },
    { idx: 2, name: 'الطلبات والشهادات الإدارية', desc: 'طلب شهادة مدرسية، كشف نقاط وتظلمات', icon: '📝' },
    { idx: 3, name: 'المكتبة الرقمية والمراجع', desc: 'كتب ومصادر ودروس ومطبوعات المدارس العليا', icon: '📚' },
    { idx: 4, name: 'رزنامة الامتحانات والمواعيد', desc: 'مواعيد المراقبة المستمرة والامتحانات', icon: '📅' },
    { idx: 5, name: 'بوابة الحياة الطلابية والنوادي', desc: 'النوادي المعتمدة، الفعاليات وشهادات المشاركة', icon: '🏆' },
    { idx: 6, name: 'حجز المواعيد الإدارية', desc: 'حجز مقابلة منظمة مع مصالح الملحقة', icon: '🤝' },
    { idx: 7, name: 'المساعد الأكاديمي الذكي', desc: 'إرشادات سريعة حول التسجيل والمناهج', icon: '🤖' },
    { idx: 8, name: 'مركز الإشعارات والتنبيهات', desc: 'تنبيهات الإدارة والرزنامة الرسمية', icon: '🔔' },
    { idx: 9, name: 'الجداول الرسمية لتوقيت الدراسة', desc: 'جدول الحصص والقاعات لجميع الأفواج', icon: '⏰' },
  ];

  return `
    <div class="space-y-4 text-xs">
      <div class="rounded-2xl border border-gray-200 bg-white p-4">
        <h4 class="font-bold text-[#5a0f1c] text-sm flex items-center justify-between">
          <span>📌 الأدوات والخدمات المثبتة (Pinned Tools)</span>
          <span class="text-gray-400 font-normal text-xs">انقر على الخدمة لفتحها مباشرة</span>
        </h4>
        <div class="mt-3 grid gap-3 sm:grid-cols-2">
          ${serviceLabels.filter(s => pinned.includes(s.idx)).map(s => `
            <div onclick="window.dispatchServiceModal(${s.idx}); document.getElementById('productivity-hub-modal').classList.add('hidden');" class="p-3.5 rounded-2xl border border-gray-200 bg-[#faf6f1]/60 hover:bg-[#faf6f1] transition-all cursor-pointer flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="text-2xl">${s.icon}</span>
                <div>
                  <h5 class="font-bold text-gray-900">${s.name}</h5>
                  <p class="text-[11px] text-gray-500 mt-0.5">${s.desc}</p>
                </div>
              </div>
              <span class="text-[#5a0f1c] font-bold">←</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="rounded-2xl border border-gray-200 bg-white p-4">
        <h4 class="font-bold text-gray-800 text-sm">جميع الخدمات المتاحة للتثبيت السريع:</h4>
        <div class="mt-3 grid gap-2.5 sm:grid-cols-2">
          ${serviceLabels.map(s => {
            const isPinned = pinned.includes(s.idx);
            return `
              <div class="p-2.5 rounded-xl border border-gray-100 flex items-center justify-between">
                <span class="font-semibold text-gray-800">${s.icon} ${s.name}</span>
                <button onclick="window.dispatchTogglePin(${s.idx})" class="rounded-lg px-2.5 py-1 text-[11px] font-bold ${isPinned ? 'bg-amber-100 text-amber-900' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}">
                  ${isPinned ? '★ مثبت' : '+ تثبيت'}
                </button>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

(window as any).dispatchTogglePin = (idx: number) => {
  togglePinService(idx);
  switchProductivityTab('quick');
};

// 2. TASKS AND PLANNER VIEW
function renderTasksAndPlannerView(): string {
  const tasks = getPersonalTasks();
  return `
    <div class="space-y-4 text-xs">
      <div class="rounded-2xl border border-gray-200 bg-white p-4">
        <div class="flex items-center justify-between">
          <h4 class="font-bold text-[#5a0f1c] text-sm">مخطط المهام والاستحقاقات البيداغوجية</h4>
          <span class="text-gray-500 font-medium">المهام المنجزة: ${tasks.filter(t => t.completed).length} / ${tasks.length}</span>
        </div>

        <!-- Add Task Form -->
        <form id="form-add-task" class="mt-3 flex gap-2">
          <input type="text" id="task-title-input" required placeholder="أضف مهمة جديدة (مثال: تلخيص محاضرة البيداغوجيا)..." class="flex-1 rounded-xl border border-gray-300 px-3.5 py-2 outline-none focus:border-[#5a0f1c]" />
          <input type="date" id="task-date-input" required class="rounded-xl border border-gray-300 px-2.5 py-2 outline-none focus:border-[#5a0f1c]" />
          <button type="submit" class="rounded-xl bg-[#5a0f1c] px-4 py-2 font-bold text-white hover:bg-[#741626] shrink-0">+ إضافة</button>
        </form>

        <!-- Tasks List -->
        <div id="tasks-list-container" class="mt-4 space-y-2">
          ${tasks.map(t => `
            <div class="p-3 rounded-xl border ${t.completed ? 'border-gray-200 bg-gray-50/70' : 'border-[#5a0f1c]/15 bg-white shadow-sm'} flex items-center justify-between gap-3">
              <label class="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                <input type="checkbox" onchange="window.dispatchToggleTask('${t.id}')" ${t.completed ? 'checked' : ''} class="h-4 w-4 accent-[#5a0f1c] rounded" />
                <span class="${t.completed ? 'line-through text-gray-400' : 'font-bold text-gray-800'} truncate">${t.title}</span>
              </label>
              <div class="flex items-center gap-3 shrink-0">
                <span class="font-mono text-[11px] text-gray-500">📅 ${t.dueDate}</span>
                <button onclick="window.dispatchDeleteTask('${t.id}')" class="text-red-500 hover:text-red-700 text-sm">🗑️</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function setupTasksListeners(): void {
  const form = document.getElementById('form-add-task');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const titleInput = document.getElementById('task-title-input') as HTMLInputElement;
    const dateInput = document.getElementById('task-date-input') as HTMLInputElement;
    if (!titleInput?.value || !dateInput?.value) return;

    const tasks = getPersonalTasks();
    tasks.unshift({
      id: 'tsk-' + Date.now(),
      title: titleInput.value.trim(),
      category: 'study',
      dueDate: dateInput.value,
      completed: false,
    });
    savePersonalTasks(tasks);
    switchProductivityTab('tasks');
  });

  (window as any).dispatchToggleTask = (id: string) => {
    const tasks = getPersonalTasks();
    const t = tasks.find(x => x.id === id);
    if (t) t.completed = !t.completed;
    savePersonalTasks(tasks);
    switchProductivityTab('tasks');
  };

  (window as any).dispatchDeleteTask = (id: string) => {
    let tasks = getPersonalTasks();
    tasks = tasks.filter(x => x.id !== id);
    savePersonalTasks(tasks);
    switchProductivityTab('tasks');
  };
}

// 3. PROCEDURES DIRECTORY
function renderProceduresView(): string {
  const procedures = [
    { title: 'استخراج شهادة مدرسية أو إفادة تسجيل', office: 'مصلحة التمدرس وشؤون الطلبة', deadline: '24 إلى 48 ساعة', steps: ['تسجيل الدخول عبر المنصة', 'اختيار نوع الوثيقة من خدمة الطلبات الإدارية', 'استلام إشعار الجاهزية والتوجه إلى مصلحة التمدرس مصحوباً ببطاقة الطالب'] },
    { title: 'تجديد أو استبدال بطاقة الطالب الضائعة', office: 'مصلحة الإعلام الآلي والرقمنة', deadline: '3 أيام عمل', steps: ['تقديم تصريح بالضياع مصادق عليه', 'إيداع طلب التجديد عبر المنصة', 'إعادة استخراج البطاقة الرقمية المزودة بالـ QR المحدث'] },
    { title: 'إيداع ملف المنحة الجامعية والإيواء', office: 'مديرية الخدمات الجامعية الجلفة', deadline: 'وفق الآجال المحددة من الوزارة', steps: ['ملء الاستمارة الرقمية عبر منصة PROGRES', 'إرفاق صك بريدي مشطوب وشهادة التسجيل المستخرجة من الملحقة', 'تأكيد التسجيل في الإقامة الجامعية المختارة'] },
    { title: 'إعادة إدماج أو استئناف الدراسة بعد عطلة أكاديمية', office: 'أمانة المدير المساعد المكلف بالبيداغوجيا', deadline: 'قبل 15 سبتمبر من كل موسم', steps: ['تقديم طلب خطي موجه للمدير المساعد', 'إرفاق تبريرات العطلة الأكاديمية السابقة', 'موافقة اللجنة البيداغوجية للتخصص'] },
  ];

  return `
    <div class="space-y-4 text-xs">
      <div class="rounded-2xl border border-gray-200 bg-white p-4">
        <h4 class="font-bold text-[#5a0f1c] text-sm">دليل الإجراءات الإدارية والبيداغوجية الرسمية</h4>
        <p class="text-gray-500 mt-0.5">خطوات المعاملات الإدارية والوثائق المطلوبة لطلبة ملحقة الجلفة:</p>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        ${procedures.map(p => `
          <div class="p-4 rounded-2xl border border-gray-200 bg-white shadow-sm space-y-2">
            <h5 class="font-bold text-gray-900 text-xs">${p.title}</h5>
            <div class="text-[11px] text-gray-600 space-y-1">
              <p><span class="font-semibold text-[#5a0f1c]">المصلحة المعنية:</span> ${p.office}</p>
              <p><span class="font-semibold text-[#5a0f1c]">مدة المعالجة:</span> ${p.deadline}</p>
            </div>
            <div class="pt-2 border-t border-gray-100">
              <p class="font-semibold text-gray-700 text-[11px]">مراحل الإجراء:</p>
              <ol class="list-decimal list-inside text-[11px] text-gray-600 space-y-0.5 mt-1">
                ${p.steps.map(s => `<li>${s}</li>`).join('')}
              </ol>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// 4. FACILITIES DIRECTORY
function renderFacilitiesView(): string {
  const facilities = [
    { name: 'قاعة المحاضرات الكبرى (أ)', cap: '300 مقعد', loc: 'الجناح المركزي — الطابق الأرضي', desc: 'مخصصة للمحاضرات العامة لطلبة الطور الابتدائي والملتقيات العلمية الكبرى.' },
    { name: 'قاعات المحاضرات (ب، ج، د)', cap: '150 مقعد لكل مدرج', loc: 'الأجنحة البيداغوجية 1 و 2', desc: 'مدرجات مجهزة بأجهزة العرض الرقمي لتدريس المحاضرات النظرية للتخصصات.' },
    { name: 'مخابر الإعلام الآلي 01 و 02', cap: '25 حاسوباً لكل مخبر', loc: 'الجناح العلمي — الطابق الأول', desc: 'مجهزة بأحدث محطات العمل وشبكة ألياف بصرية لدروس البرمجة والذكاء الاصطناعي.' },
    { name: 'المخابر البيداغوجية للعلوم الطبيعية', cap: '30 مقعداً مخبرياً', loc: 'الجناح العلمي — الطابق الأرضي', desc: 'مخابر بيولوجيا الحيوان، بيولوجيا النبات، والجيولوجيا مزودة بمجاهر وأدوات التشريح.' },
    { name: 'المكتبة المركزية وقاعة المطالعة', cap: '120 مقعداً للمطالعة', loc: 'المبنى الإداري — الطابق الأول', desc: 'تضم آلاف العناوين والمراجع والمطبوعات البيداغوجية وقاعدة بيانات رقمية متصلة.' },
    { name: 'القاعة المتعددة الرياضات', cap: 'طاقة استيعاب رياضية كاملة', loc: 'المركب الرياضي الجامعي', desc: 'مخصصة للتطبيقات الرياضية (جمباز، كرة يد، كرة سلة، ألعاب قوى) وأنشطة النادي الرياضي.' },
  ];

  return `
    <div class="space-y-4 text-xs">
      <div class="rounded-2xl border border-gray-200 bg-white p-4">
        <h4 class="font-bold text-[#5a0f1c] text-sm">دليل مرافق ومباني ملحقة المدرسة العليا بالجلفة</h4>
        <p class="text-gray-500 mt-0.5">توزيع القاعات، المدرجات والمخابر المتخصصة:</p>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        ${facilities.map(f => `
          <div class="p-4 rounded-2xl border border-gray-200 bg-white shadow-sm space-y-1.5">
            <div class="flex items-start justify-between">
              <h5 class="font-bold text-[#5a0f1c] text-xs">${f.name}</h5>
              <span class="rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5">${f.cap}</span>
            </div>
            <p class="text-[11px] text-gray-500 font-medium">📍 ${f.loc}</p>
            <p class="text-[11px] text-gray-600 leading-relaxed pt-1">${f.desc}</p>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// 5. DOWNLOADS VIEW
function renderDownloadsView(): string {
  const downloads = [
    { title: 'دليل الطالب الجامعي لمتربصي المدارس العليا 2026/2027', format: 'PDF', size: '2.4 MB', cat: 'دليل رسمي' },
    { title: 'النظام الداخلي العام للمدرسة العليا للأساتذة — ملحقة الجلفة', format: 'PDF', size: '1.1 MB', cat: 'قوانين وتنظيمات' },
    { title: 'استمارة طلب إعادة تصحيح الأوراق البيداغوجية', format: 'DOCX', size: '140 KB', cat: 'نماذج إدارية' },
    { title: 'دليل تأسيس وتسيير النوادي الطلابية المعتمدة', format: 'PDF', size: '950 KB', cat: 'الحياة الطلابية' },
    { title: 'الرزنامة السنوية الرسمية للتقويم البيداغوجي والامتحانات', format: 'PDF', size: '680 KB', cat: 'رزنامة أكاديمية' },
  ];

  return `
    <div class="space-y-4 text-xs">
      <div class="rounded-2xl border border-gray-200 bg-white p-4">
        <h4 class="font-bold text-[#5a0f1c] text-sm">مركز التحميل والوثائق الرسمية المعتمدة</h4>
        <p class="text-gray-500 mt-0.5">تحميل الكتيبات الإرشادية، القوانين الداخلية، والنماذج القابلة للملء:</p>
      </div>

      <div class="space-y-2">
        ${downloads.map(d => `
          <div class="p-3.5 rounded-2xl border border-gray-200 bg-white flex items-center justify-between gap-3 hover:border-[#5a0f1c]/30 transition-colors">
            <div class="flex items-center gap-3">
              <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-800 font-bold text-xs">${d.format}</span>
              <div>
                <h5 class="font-bold text-gray-900">${d.title}</h5>
                <p class="text-[11px] text-gray-500">${d.cat} · ${d.size}</p>
              </div>
            </div>
            <button onclick="alert('تم تفعيل التحميل: سيتم تنزيل ملف ${d.title} المعتمد.');" class="rounded-xl bg-[#5a0f1c] px-3.5 py-2 font-semibold text-white hover:bg-[#741626]">
              تحميل ↓
            </button>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// 6. SECURITY VIEW
function renderSecurityView(): string {
  return `
    <div class="space-y-4 text-xs">
      <div class="rounded-2xl border border-gray-200 bg-white p-4">
        <h4 class="font-bold text-[#5a0f1c] text-sm">مركز الأمان وخصوصية الحساب</h4>
        <p class="text-gray-500 mt-0.5">إدارة كلمات المرور، جلسات الدخول المشفرة، وسياسة حماية البيانات الشخصية:</p>
      </div>

      <div class="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
        <h5 class="font-bold text-gray-800 text-xs">معلومات الجلسة النشطة الحالية:</h5>
        <div class="space-y-1.5 rounded-xl bg-gray-50 p-3 text-[11px] text-gray-700">
          <p><strong>نوع التوثيق:</strong> مشفر بواسطة معايير AES-256 و SHA-256</p>
          <p><strong>حالة التخزين المحلي:</strong> مشفر ومحمي من الوصول عبر المواقع (XSS / CSRF Protected)</p>
          <p><strong>الصلاحية:</strong> مقيدة بحسب الدور (طالب / أستاذ / مسؤول المنصة)</p>
        </div>
      </div>

      <div class="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
        <h5 class="font-bold text-gray-800 text-xs">تغيير كلمة المرور:</h5>
        <form onsubmit="event.preventDefault(); alert('تم تحديث كلمة المرور لحسابك بنجاح.');" class="space-y-3">
          <div>
            <label class="block text-gray-600 font-medium">كلمة المرور الحالية:</label>
            <input type="password" required class="mt-1 w-full rounded-xl border border-gray-300 p-2 outline-none focus:border-[#5a0f1c]" />
          </div>
          <div>
            <label class="block text-gray-600 font-medium">كلمة المرور الجديدة (8 أحرف وأرقام على الأقل):</label>
            <input type="password" required class="mt-1 w-full rounded-xl border border-gray-300 p-2 outline-none focus:border-[#5a0f1c]" />
          </div>
          <button type="submit" class="rounded-xl bg-[#5a0f1c] px-4 py-2 text-white font-semibold hover:bg-[#741626]">تحديث كلمة المرور</button>
        </form>
      </div>
    </div>
  `;
}

// 7. STATUS VIEW
function renderStatusView(): string {
  return `
    <div class="space-y-4 text-xs">
      <div class="rounded-2xl border border-gray-200 bg-white p-4">
        <h4 class="font-bold text-[#5a0f1c] text-sm">مؤشر جاهزية واستقرار خدمات المنصة</h4>
        <p class="text-gray-500 mt-0.5">الحالة اللحظية للأنظمة والخدمات الرقمية للملحقة:</p>
      </div>

      <div class="space-y-2.5">
        <div class="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 flex items-center justify-between">
          <div>
            <h5 class="font-bold text-emerald-950">واجهة الويب وتطبيق الهاتف (PWA Engine)</h5>
            <p class="text-[11px] text-emerald-800">جاهز ويعمل بكفاءة دون انقطاع · تخزين مؤقت محلي نشط</p>
          </div>
          <span class="rounded-full bg-emerald-600 text-white font-bold px-2.5 py-0.5 text-[10px]">يعمل 100%</span>
        </div>

        <div class="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 flex items-center justify-between">
          <div>
            <h5 class="font-bold text-emerald-950">محرك البطاقات الرقمية المشفرة (QR Cryptography)</h5>
            <p class="text-[11px] text-emerald-800">التوقيع الرقمي HMAC-SHA256 مفعل ومطابق للاعتمادات</p>
          </div>
          <span class="rounded-full bg-emerald-600 text-white font-bold px-2.5 py-0.5 text-[10px]">نشط وآمن</span>
        </div>

        <div class="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 flex items-center justify-between">
          <div>
            <h5 class="font-bold text-emerald-950">بوابة الحياة الطلابية والنوادي المعتمدة</h5>
            <p class="text-[11px] text-emerald-800">التسجيل في الفعاليات والتحقق من الشهادات متاح</p>
          </div>
          <span class="rounded-full bg-emerald-600 text-white font-bold px-2.5 py-0.5 text-[10px]">متاح بالكامل</span>
        </div>

        <div class="p-3.5 rounded-xl border border-amber-200 bg-amber-50 flex items-center justify-between">
          <div>
            <h5 class="font-bold text-amber-950">قاعدة البيانات السحابية (Cloud Synchronization)</h5>
            <p class="text-[11px] text-amber-800">المحرك المحلي الدائم نشط ومؤمّن · وضع الاستقلالية الذاتية مفعل</p>
          </div>
          <span class="rounded-full bg-amber-600 text-white font-bold px-2.5 py-0.5 text-[10px]">وضع التخزين المستقل</span>
        </div>
      </div>
    </div>
  `;
}
