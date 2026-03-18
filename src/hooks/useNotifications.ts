/**
 * useNotifications — wrapper around @tauri-apps/plugin-notification
 * Falls back silently in browser / non-Tauri environments.
 */

let tauriNotify: ((title: string, body: string) => Promise<void>) | null = null;

// Lazy-load the Tauri plugin so we don't break browser dev mode
async function loadTauriNotify() {
  if (tauriNotify) return tauriNotify;
  try {
    const { isPermissionGranted, requestPermission, sendNotification } =
      await import('@tauri-apps/plugin-notification');
    let granted = await isPermissionGranted();
    if (!granted) {
      const perm = await requestPermission();
      granted = perm === 'granted';
    }
    if (granted) {
      tauriNotify = async (title: string, body: string) => {
        sendNotification({ title, body });
      };
    } else {
      tauriNotify = async () => {}; // permission denied — no-op
    }
  } catch {
    // Not in a Tauri environment or plugin unavailable
    tauriNotify = async () => {};
  }
  return tauriNotify;
}

// Pre-load on import
loadTauriNotify();

export async function notify(title: string, body: string): Promise<void> {
  const fn = await loadTauriNotify();
  fn?.(title, body);
}
