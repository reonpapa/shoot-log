import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const base = process.env.VITE_BASE_PATH ?? "/";

function offlineServiceWorker(baseUrl: string): Plugin {
  const withBase = (path: string) => `${baseUrl}${path}`;
  return {
    name: "shoot-log-offline-service-worker",
    apply: "build",
    generateBundle(_options, bundle) {
      const files = [
        baseUrl,
        withBase("index.html"),
        withBase("manifest.webmanifest"),
        withBase("favicon.svg"),
        withBase("apple-touch-icon.png"),
        withBase("pwa-192x192.png"),
        withBase("pwa-512x512.png"),
        withBase("pwa-maskable-512x512.png"),
        ...Object.keys(bundle).map(withBase),
      ];
      const precache = [...new Set(files)];
      const source = `
const CACHE_NAME = "shoot-log-v2.13.0";
const BASE_URL = ${JSON.stringify(baseUrl)};
const PRECACHE = ${JSON.stringify(precache)};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url)))),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name.startsWith("shoot-log-") && name !== CACHE_NAME).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(BASE_URL + "index.html", copy));
        }
        return response;
      }).catch(() => caches.open(CACHE_NAME).then(async (cache) =>
        (await cache.match(BASE_URL + "index.html")) || (await cache.match(BASE_URL)) || Response.error()
      )),
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => cache.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) void cache.put(request, response.clone());
      return response;
    }))),
  );
});
`.trimStart();
      this.emitFile({ type: "asset", fileName: "sw.js", source });
    },
  };
}

export default defineConfig({
  base,
  plugins: [react(), offlineServiceWorker(base)],
});
