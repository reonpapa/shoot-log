import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function offlineServiceWorker(): Plugin {
  return {
    name: "shoot-log-offline-service-worker",
    apply: "build",
    generateBundle(_options, bundle) {
      const files = [
        "/",
        "/index.html",
        "/manifest.webmanifest",
        "/favicon.svg",
        "/apple-touch-icon.png",
        "/pwa-192x192.png",
        "/pwa-512x512.png",
        "/pwa-maskable-512x512.png",
        ...Object.keys(bundle).map((fileName) => `/${fileName}`),
      ];
      const precache = [...new Set(files)];
      const source = `
const CACHE_NAME = "shoot-log-v1.3.0";
const PRECACHE = ${JSON.stringify(precache)};

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))))
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
    event.respondWith(caches.match("/index.html").then((cached) => cached || fetch(request)));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    })),
  );
});
`.trimStart();
      this.emitFile({ type: "asset", fileName: "sw.js", source });
    },
  };
}

export default defineConfig({
  plugins: [react(), offlineServiceWorker()],
});
