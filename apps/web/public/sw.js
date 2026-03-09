// Minimal service worker — no caching.
// Exists only to satisfy browser PWA install requirements (Chrome/Safari A2HS).

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
// No fetch handler — all requests go to network as normal.
