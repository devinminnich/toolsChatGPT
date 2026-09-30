const CACHE = "fitness-shell-v2";
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll([
        "./",
        "./icon.svg",
        "./workout-import-template.xlsx",
        "./manifest.webmanifest",
        "./icon-180.png",
        "./icon-192.png",
        "./icon-512.png",
      ]);
      const page = await cache.match("./");
      const html = await page.text();
      const assets = [
        ...html.matchAll(/(?:src|href)="([^"\s]+\/assets\/[^"\s]+)"/g),
      ].map((m) => m[1]);
      await cache.addAll(assets);
    })(),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key.startsWith("fitness-shell-") && key !== CACHE)
          await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  if (
    event.request.method !== "GET" ||
    new URL(event.request.url).origin !== location.origin
  )
    return;
  event.respondWith(
    fetch(event.request).catch(
      async () =>
        (await caches.match(event.request)) ||
        (event.request.mode === "navigate"
          ? await caches.match("./")
          : Response.error()),
    ),
  );
});
