// JogoPawon Mart — PWA Utilities & Service Worker Registration

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const installListeners = new Set<(canInstall: boolean) => void>();

export const isStandaloneMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
};

export const isIos = (): boolean => {
  if (typeof window === 'undefined') return false;
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
};

export const initPwa = () => {
  if (typeof window === 'undefined') return;

  // 1. Register Service Worker in production or localhost
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered with scope:', registration.scope);

          // Check for SW updates
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[PWA] New version available! Can skip waiting.');
                }
              };
            }
          };
        })
        .catch((error) => {
          console.warn('[PWA] Service Worker registration failed:', error);
        });
    });
  }

  // 2. Capture beforeinstallprompt for Android/Chrome/Edge/Desktop
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    installListeners.forEach((listener) => listener(true));
  });

  // 3. Listen for appinstalled
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App successfully installed to homescreen!');
    deferredPrompt = null;
    installListeners.forEach((listener) => listener(false));
  });
};

export const getDeferredPrompt = () => deferredPrompt;

export const subscribeInstallPrompt = (callback: (canInstall: boolean) => void) => {
  installListeners.add(callback);
  // Immediately call with current status
  callback(deferredPrompt !== null);
  return () => {
    installListeners.delete(callback);
  };
};

export const promptInstallApp = async (): Promise<'accepted' | 'dismissed' | 'manual_ios' | 'unsupported'> => {
  if (isStandaloneMode()) {
    return 'accepted';
  }

  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    installListeners.forEach((listener) => listener(false));
    return outcome;
  }

  if (isIos()) {
    return 'manual_ios';
  }

  return 'unsupported';
};
