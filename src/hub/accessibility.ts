// Accessibility and Display Preferences Manager
// ملحقة المدرسة العليا للأساتذة - الجلفة — مركز إمكانية الوصول

export interface AccessibilityPreferences {
  fontScale: number; // e.g. 100, 115, 130
  highContrast: boolean;
  reducedMotion: boolean;
  dyslexicFont: boolean;
  readingLineHeight: boolean;
}

const STORAGE_KEY = 'ens_accessibility_prefs';

const DEFAULT_PREFS: AccessibilityPreferences = {
  fontScale: 100,
  highContrast: false,
  reducedMotion: false,
  dyslexicFont: false,
  readingLineHeight: false,
};

export function getStoredPreferences(): AccessibilityPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePreferences(prefs: AccessibilityPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {}
  applyPreferences(prefs);
}

export function applyPreferences(prefs: AccessibilityPreferences): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // 1. Font scale
  root.style.fontSize = `${prefs.fontScale}%`;

  // 2. High contrast mode
  if (prefs.highContrast) {
    root.classList.add('ens-high-contrast');
  } else {
    root.classList.remove('ens-high-contrast');
  }

  // 3. Reduced motion
  if (prefs.reducedMotion) {
    root.classList.add('ens-reduce-motion');
  } else {
    root.classList.remove('ens-reduce-motion');
  }

  // 4. Reading Line Height
  if (prefs.readingLineHeight) {
    root.classList.add('ens-reading-guide');
  } else {
    root.classList.remove('ens-reading-guide');
  }
}

export function openAccessibilityDrawer(): void {
  let modal = document.getElementById('accessibility-drawer');
  if (!modal) {
    modal = createAccessibilityModal();
    document.body.appendChild(modal);
  }
  const prefs = getStoredPreferences();
  updateModalControls(prefs);
  modal.classList.remove('hidden');
}

function createAccessibilityModal(): HTMLElement {
  const container = document.createElement('div');
  container.id = 'accessibility-drawer';
  container.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 hidden';
  container.dir = 'rtl';

  container.innerHTML = `
    <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5">
      <div class="flex items-center justify-between border-b pb-3 border-gray-100">
        <div class="flex items-center gap-2">
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-[#5a0f1c]/10 text-[#5a0f1c] text-lg">♿</span>
          <div>
            <h4 class="font-bold text-sm text-[#5a0f1c]">تفضيلات العرض وإمكانية الوصول</h4>
            <p class="text-[11px] text-gray-500">تخصيص القراءة، التباين، وسرعة الحركة</p>
          </div>
        </div>
        <button type="button" id="btn-close-access-modal" class="text-2xl text-gray-400 hover:text-black">×</button>
      </div>

      <div class="space-y-4 text-xs">
        <!-- Font Size Scale -->
        <div class="rounded-2xl border border-gray-200 bg-[#faf6f1]/60 p-4 space-y-2">
          <label class="block font-bold text-gray-800">حجم الخط المعروض:</label>
          <div class="flex items-center justify-between gap-2">
            <button id="btn-font-dec" class="rounded-xl border border-gray-300 bg-white px-3.5 py-2 font-bold text-gray-700 hover:bg-gray-100">A- تصغير</button>
            <span id="label-font-scale" class="font-mono font-bold text-sm text-[#5a0f1c]">100%</span>
            <button id="btn-font-inc" class="rounded-xl border border-gray-300 bg-white px-3.5 py-2 font-bold text-gray-700 hover:bg-gray-100">A+ تكبير</button>
          </div>
        </div>

        <!-- High Contrast Mode -->
        <div class="flex items-center justify-between p-3.5 rounded-2xl border border-gray-200 bg-white">
          <div>
            <p class="font-bold text-gray-800">وضع التباين العالي (High Contrast)</p>
            <p class="text-[11px] text-gray-500">تحسين وضوح النصوص للرؤية الضعيفة</p>
          </div>
          <input type="checkbox" id="check-high-contrast" class="h-5 w-5 accent-[#5a0f1c] cursor-pointer" />
        </div>

        <!-- Reduced Motion -->
        <div class="flex items-center justify-between p-3.5 rounded-2xl border border-gray-200 bg-white">
          <div>
            <p class="font-bold text-gray-800">إيقاف المؤثرات الحركية (Reduce Motion)</p>
            <p class="text-[11px] text-gray-500">تعطيل التحريك التلقائي والانتقالات</p>
          </div>
          <input type="checkbox" id="check-reduce-motion" class="h-5 w-5 accent-[#5a0f1c] cursor-pointer" />
        </div>

        <!-- Line Height and Reading Spacing -->
        <div class="flex items-center justify-between p-3.5 rounded-2xl border border-gray-200 bg-white">
          <div>
            <p class="font-bold text-gray-800">تباعد أسطر القراءة المريح</p>
            <p class="text-[11px] text-gray-500">زيادة المسافات بين الأسطر لتسهيل القراءة</p>
          </div>
          <input type="checkbox" id="check-line-height" class="h-5 w-5 accent-[#5a0f1c] cursor-pointer" />
        </div>
      </div>

      <div class="pt-3 border-t border-gray-100 flex items-center justify-between">
        <button id="btn-reset-accessibility" class="text-xs text-gray-500 hover:text-red-700 font-medium">استعادة الإعدادات الافتراضية</button>
        <button id="btn-apply-accessibility" class="rounded-xl bg-[#5a0f1c] px-5 py-2 text-xs font-bold text-white hover:bg-[#741626]">حفظ وإغلاق</button>
      </div>
    </div>
  `;

  // Listeners
  const closeBtn = container.querySelector('#btn-close-access-modal');
  const applyBtn = container.querySelector('#btn-apply-accessibility');
  const resetBtn = container.querySelector('#btn-reset-accessibility');
  const incBtn = container.querySelector('#btn-font-inc');
  const decBtn = container.querySelector('#btn-font-dec');

  closeBtn?.addEventListener('click', () => container.classList.add('hidden'));
  applyBtn?.addEventListener('click', () => container.classList.add('hidden'));

  incBtn?.addEventListener('click', () => {
    const p = getStoredPreferences();
    if (p.fontScale < 140) {
      p.fontScale += 10;
      savePreferences(p);
      updateModalControls(p);
    }
  });

  decBtn?.addEventListener('click', () => {
    const p = getStoredPreferences();
    if (p.fontScale > 85) {
      p.fontScale -= 10;
      savePreferences(p);
      updateModalControls(p);
    }
  });

  const contrastBox = container.querySelector('#check-high-contrast') as HTMLInputElement;
  contrastBox?.addEventListener('change', () => {
    const p = getStoredPreferences();
    p.highContrast = contrastBox.checked;
    savePreferences(p);
  });

  const motionBox = container.querySelector('#check-reduce-motion') as HTMLInputElement;
  motionBox?.addEventListener('change', () => {
    const p = getStoredPreferences();
    p.reducedMotion = motionBox.checked;
    savePreferences(p);
  });

  const lineBox = container.querySelector('#check-line-height') as HTMLInputElement;
  lineBox?.addEventListener('change', () => {
    const p = getStoredPreferences();
    p.readingLineHeight = lineBox.checked;
    savePreferences(p);
  });

  resetBtn?.addEventListener('click', () => {
    savePreferences(DEFAULT_PREFS);
    updateModalControls(DEFAULT_PREFS);
  });

  return container;
}

function updateModalControls(p: AccessibilityPreferences): void {
  const scaleSpan = document.getElementById('label-font-scale');
  const contrastBox = document.getElementById('check-high-contrast') as HTMLInputElement;
  const motionBox = document.getElementById('check-reduce-motion') as HTMLInputElement;
  const lineBox = document.getElementById('check-line-height') as HTMLInputElement;

  if (scaleSpan) scaleSpan.textContent = `${p.fontScale}%`;
  if (contrastBox) contrastBox.checked = p.highContrast;
  if (motionBox) motionBox.checked = p.reducedMotion;
  if (lineBox) lineBox.checked = p.readingLineHeight;
}
