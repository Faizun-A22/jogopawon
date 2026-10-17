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

/**
 * Mendaftarkan Web Push Notification ke HP/Browser Pelanggan
 */
export const requestPushPermissionAndSubscribe = async (userPhone?: string): Promise<{ success: boolean; message: string }> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { success: false, message: 'Browser tidak mendukung push notification.' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, message: 'Izin notifikasi ditolak oleh pengguna.' };
    }

    if (!('serviceWorker' in navigator)) {
      return { success: true, message: 'Notifikasi diizinkan (in-app alert mode).' };
    }

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Dapatkan subscription push
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          // Gunakan generic applicationServerKey jika ada, atau daftarkan subscription
        });
      } catch (subErr) {
        console.warn('[PWA Push] PushManager subscribe fallback:', subErr);
      }
    }

    if (subscription) {
      const rawKey = subscription.getKey ? subscription.getKey('p256dh') : null;
      const rawAuth = subscription.getKey ? subscription.getKey('auth') : null;

      const p256dh = rawKey ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(rawKey)))) : '';
      const auth = rawAuth ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(rawAuth)))) : '';

      // Kirim ke server
      const { api } = await import('../services/api');
      await api.subscribePush({
        phone: userPhone,
        endpoint: subscription.endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent,
      });
    }

    return { success: true, message: 'Notifikasi promo & pesanan aktif di HP Anda!' };
  } catch (err: any) {
    console.warn('[PWA Push] Error requesting push permission:', err);
    return { success: false, message: err.message || 'Gagal mengaktifkan notifikasi.' };
  }
};

/**
 * Tampilkan notifikasi lokal di HP/browser (ketika tab aktif atau via Service Worker)
 */
export const displayLocalPushNotification = async (title: string, options?: NotificationOptions) => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await (reg as any).showNotification(title, {
        icon: '/logo.png',
        badge: '/favicon.png',
        vibrate: [200, 100, 200],
        ...options,
      });
    } else {
      new Notification(title, {
        icon: '/logo.png',
        ...options,
      });
    }
  } catch (e) {
    console.warn('[PWA] Error displaying notification:', e);
  }
};
