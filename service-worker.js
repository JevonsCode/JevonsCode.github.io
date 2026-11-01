// Retires the legacy root Create-React-App Workbox precache without touching scoped app caches (e.g. /jianxiang/).
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('workbox-precache'))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.registration.unregister())
  );
});
