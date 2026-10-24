// Keeps the Plant Manager app itself quick to open and usable offline. Your data never goes through here:
// it comes from your Plant Manager API (a different site) and the app keeps its own last copy.
const VERSION = 'pm-4caf1919bd';
const SHELL = ['./', 'index.html', 'config.js', 'connect.js', 'connect.css', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('pm-') && k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if(e.request.method !== 'GET' || url.origin !== location.origin) return;   // API calls, photos and fonts go straight to the network
  // Network first so updates show up right away; the saved copy is used offline.
  e.respondWith(
    fetch(e.request).then(res => {
      if(res.ok){ const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});
