/**
 * sw.js — Service Worker untuk CatatUang PWA
 *
 * Strategi: Cache-first untuk aset statis, Network-first untuk navigasi.
 * Semua data ada di localStorage (tidak perlu sinkronisasi server).
 */

const CACHE_NAME   = 'catat-uang-v1';
const CORE_ASSETS  = [
  '/',
  '/index.html',
  '/manifest.json',
  '/js/app.js',
  '/js/analytics.js',
  '/js/budget.js',
  '/js/charts.js',
  '/js/darkmode.js',
  '/js/exportimport.js',
  '/js/insights.js',
  '/js/recurring.js',
  '/js/savings.js',
  '/js/schema.js',
  '/js/storage.js',
  '/js/toast.js',
  '/js/transactions.js',
  '/js/ui.js',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js',
];

// ── Install: pre-cache core assets ────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: bersihkan cache lama ────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: cache-first untuk aset, network-first untuk navigasi ───────────────
self.addEventListener('fetch', event => {
  const { request } = event;

  // Hanya handle GET
  if (request.method !== 'GET') return;

  // Navigasi HTML: network-first agar selalu fresh, fallback ke cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Aset lain: cache-first
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});
