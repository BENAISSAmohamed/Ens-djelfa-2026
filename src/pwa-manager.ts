/**
 * Progressive Web App (PWA) Manager for ENS Djelfa
 */

let deferredPrompt: any = null;
let isInstalled = false;

export function initPWA() {
  // Check if already in standalone mode
  if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
    isInstalled = true;
  }

  // Handle beforeinstallprompt (Android, Chrome, Edge)
  window.addEventListener('beforeinstallprompt', (e: any) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallButtons();
  });

  window.addEventListener('appinstalled', () => {
    isInstalled = true;
    deferredPrompt = null;
    hideInstallButtons();
    (window as any).ENS_SUPABASE?.showToast?.('تم تثبيت تطبيق ENS Djelfa بنجاح على هاتفك!', 'success');
  });

  // Offline / Online connectivity indicator
  window.addEventListener('offline', () => {
    showOfflineBanner(true);
  });
  window.addEventListener('online', () => {
    showOfflineBanner(false);
  });

  if (!navigator.onLine) {
    showOfflineBanner(true);
  }

  // Mount install UI in header and mobile
  setupInstallUI();
}

export async function promptInstall(): Promise<boolean> {
  // If iOS device
  const isIOS = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
  if (isIOS) {
    showIOSGuide();
    return true;
  }

  if (!deferredPrompt) {
    showToastNotice('التطبيق جاهز للتثبيت من قائمة متصفحك (أضف إلى الشاشة الرئيسية).');
    return false;
  }

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    isInstalled = true;
    deferredPrompt = null;
    hideInstallButtons();
    return true;
  }
  return false;
}

function setupInstallUI() {
  // Add install button to desktop header if not installed
  if (isInstalled) return;

  const linksNav = document.getElementById('links');
  if (linksNav && !document.getElementById('pwa-install-header-btn')) {
    const installBtn = document.createElement('button');
    installBtn.id = 'pwa-install-header-btn';
    installBtn.className = 'hidden xl:inline-flex items-center gap-1.5 rounded-full border border-[#E3C48A]/40 bg-[#5a0f1c]/80 px-3 py-1.5 text-xs font-semibold text-[#E3C48A] hover:bg-[#5a0f1c] hover:text-white transition-all';
    installBtn.innerHTML = `
      <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
      <span>تثبيت التطبيق</span>
    `;
    installBtn.onclick = () => promptInstall();
    linksNav.parentElement?.insertBefore(installBtn, linksNav.nextSibling);
  }

  // Add install button to mobile nav
  const mlinks = document.getElementById('mlinks');
  if (mlinks && !document.getElementById('pwa-install-mobile-btn')) {
    const mInstallBtn = document.createElement('button');
    mInstallBtn.id = 'pwa-install-mobile-btn';
    mInstallBtn.className = 'mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-[#E3C48A]/30 bg-[#5a0f1c]/90 p-2.5 text-xs font-bold text-[#E3C48A]';
    mInstallBtn.innerHTML = `
      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
      <span>تثبيت تطبيق ENS Djelfa على هاتفك</span>
    `;
    mInstallBtn.onclick = () => promptInstall();
    mlinks.appendChild(mInstallBtn);
  }
}

function showInstallButtons() {
  const b1 = document.getElementById('pwa-install-header-btn');
  const b2 = document.getElementById('pwa-install-mobile-btn');
  if (b1) b1.classList.remove('hidden');
  if (b2) b2.classList.remove('hidden');
}

function hideInstallButtons() {
  const b1 = document.getElementById('pwa-install-header-btn');
  const b2 = document.getElementById('pwa-install-mobile-btn');
  if (b1) b1.style.display = 'none';
  if (b2) b2.style.display = 'none';
}

function showOfflineBanner(isOffline: boolean) {
  let banner = document.getElementById('offline-banner');
  if (isOffline) {
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'offline-banner';
      banner.className = 'fixed top-16 inset-x-4 sm:inset-x-auto sm:end-6 z-50 rounded-2xl bg-amber-900/95 border border-amber-500/50 p-3 text-xs text-amber-100 shadow-2xl backdrop-blur flex items-center gap-2';
      banner.innerHTML = `
        <span class="h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0"></span>
        <span>أنت غير متصل بالإنترنت حالياً — الموقع يعمل بالوضع المحلي المحفوظ.</span>
      `;
      document.body.appendChild(banner);
    }
    banner.style.display = 'flex';
  } else if (banner) {
    banner.style.display = 'none';
  }
}

function showIOSGuide() {
  let modal = document.getElementById('ios-pwa-modal') as HTMLDialogElement | null;
  if (!modal) {
    modal = document.createElement('dialog');
    modal.id = 'ios-pwa-modal';
    modal.className = 'w-[min(90vw,360px)] rounded-3xl p-0 shadow-2xl backdrop:bg-black/60';
    modal.innerHTML = `
      <div class="rounded-3xl bg-white p-6 text-[#2b0f14] text-start">
        <div class="flex items-center justify-between">
          <h4 class="font-bold text-[#5a0f1c] text-base">تثبيت التطبيق على iPhone / iPad</h4>
          <button onclick="document.getElementById('ios-pwa-modal').close()" class="text-gray-400 hover:text-black text-xl">×</button>
        </div>
        <p class="mt-3 text-xs text-gray-600 leading-relaxed">
          1. اضغط على زر <strong>المشاركة (Share)</strong> في شريط متصفح Safari.<br>
          2. مرر للأسفل واضغط على <strong>"إضافة إلى الشاشة الرئيسية (Add to Home Screen)"</strong>.
        </p>
        <button onclick="document.getElementById('ios-pwa-modal').close()" class="mt-4 w-full rounded-xl bg-[#5a0f1c] py-2.5 text-xs font-semibold text-white">
          حسناً، فهمت
        </button>
      </div>
    `;
    document.body.appendChild(modal);
  }
  modal.showModal();
}

function showToastNotice(msg: string) {
  (window as any).ENS_SUPABASE?.showToast?.(msg, 'info');
}
