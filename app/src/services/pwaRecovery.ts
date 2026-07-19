const APP_CACHE_PREFIX = "shoot-log-";

function appScope() {
  return new URL(import.meta.env.BASE_URL, window.location.origin).href;
}

export async function recoverPwaShell() {
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.filter((registration) => registration.scope === appScope()).map((registration) => registration.unregister()));
  }

  if ("caches" in window) {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith(APP_CACHE_PREFIX)).map((name) => caches.delete(name)));
  }

  window.location.reload();
}
