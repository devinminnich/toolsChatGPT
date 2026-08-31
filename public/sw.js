const CACHE_NAME = 'renovation-planner-v3';

function appUrl(path = '') {
  return new URL(path, self.registration.scope).href;
}

const APP_SHELL = [appUrl(), appUrl('index.html'), appUrl('manifest.webmanifest')];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

async function networkAndCache(request) {
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      networkAndCache(request).catch(async () => (
        (await caches.match(request)) || (await caches.match(appUrl('index.html')))
      )),
    );
    return;
  }

  event.respondWith(
    networkAndCache(request).catch(async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      return Response.error();
    }),
  );
});
