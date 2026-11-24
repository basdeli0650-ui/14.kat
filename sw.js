/* 14. KAT — çevrimdışı çalışma için önbellek (service worker)
   Dosya değiştiğinde SURUM'ü artırın. */
const SURUM = '14kat-v7';
const DOSYALAR = [
  "./",
  "index.html",
  "panel.html",
  "manifest.webmanifest",
  "src/styles/tokens.css",
  "src/styles/base.css",
  "src/styles/components.css",
  "src/styles/layout.css",
  "src/styles/vardiya.css",
  "src/styles/gorev.css",
  "src/styles/ajanda.css",
  "src/styles/stok.css",
  "src/styles/miat.css",
  "src/styles/asistan.css",
  "src/styles/odalar.css",
  "src/js/ikonlar.js",
  "src/js/kilit.js",
  "src/js/giris.js",
  "src/js/vardiya-motor.js",
  "src/js/vardiya-ekran.js",
  "src/js/gorev-ekran.js",
  "src/js/odalar-ekran.js",
  "src/js/ajanda-ekran.js",
  "src/js/stok-ekran.js",
  "src/js/miat-ekran.js",
  "src/js/asistan-ekran.js",
  "src/js/ayarlar-ekran.js",
  "src/js/hatirlatici.js",
  "src/js/app.js",
  "public/branding/apple-touch-icon.png",
  "public/branding/bildirim-simge-72.png",
  "public/branding/bildirim-simge-96.png",
  "public/branding/favicon.ico",
  "public/branding/logo-14kat-128.png",
  "public/branding/logo-14kat-16.png",
  "public/branding/logo-14kat-180.png",
  "public/branding/logo-14kat-192.png",
  "public/branding/logo-14kat-256.png",
  "public/branding/logo-14kat-32.png",
  "public/branding/logo-14kat-48.png",
  "public/branding/logo-14kat-512.png",
  "public/branding/logo-14kat-512.webp",
  "public/branding/logo-14kat-64.png",
  "public/branding/logo-14kat-maskable-512.png"
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SURUM).then((c) => c.addAll(DOSYALAR)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== SURUM).map((x) => caches.delete(x)))).then(() => self.clients.claim()));
});
/* Önce ağ, olmazsa önbellek: güncelleme hemen gelir, internet yoksa uygulama yine açılır */
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then((r) => { const kopya = r.clone(); caches.open(SURUM).then((c) => c.put(e.request, kopya)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});

/* Bildirime dokununca uygulamayı öne getir / aç */
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((l) => {
    for (const c of l) { if ('focus' in c) return c.focus(); }
    return self.clients.openWindow('panel.html');
  }));
});
