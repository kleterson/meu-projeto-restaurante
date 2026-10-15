// Service Worker básico para PWA
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Apenas deixa o fluxo de rede padrão passar
    event.respondWith(fetch(event.request).catch(() => {
        return caches.match(event.request);
    }));
});