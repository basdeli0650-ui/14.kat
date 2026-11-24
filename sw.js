/* 14. KAT — çevrimdışı çalışma için önbellek (service worker)
   Dosya değiştiğinde SURUM'ü artırın. */
const SURUM = '14kat-v9';
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
  e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => /^14kat-v\d+$/.test(x) && x !== SURUM).map((x) => caches.delete(x)))).then(() => self.clients.claim()));
});
/* Önce ağ, olmazsa önbellek: güncelleme hemen gelir, internet yoksa uygulama yine açılır */
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-store' }).then((r) => { const kopya = r.clone(); caches.open(SURUM).then((c) => c.put(e.request, kopya)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});

/* ---------- Vardiya bildirimi (06.00 / 16.00) ----------
   Sunucudan yalnızca {tur:'vardiya', zaman:'sabah'|'aksam'} gelir; isimler telefondaki kayıttan okunur. */
const VERI = '14kat-veri';
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function kimler(v, tarih, kod) {
  const d = new Date(tarih + 'T12:00:00'), gun = (d.getDay() + 6) % 7;
  const pzt = new Date(d); pzt.setDate(d.getDate() - gun);
  const h = (v.haftalar || {})[iso(pzt)] || {};
  return (v.personel || []).filter((p) => (h[p.id] || [])[gun] === kod).map((p) => { const s = p.ad.split(' '); return s.length > 1 ? `${s[0]} ${s[s.length - 1][0]}.` : s[0]; });
}
async function vardiyaBildirimi(zaman) {
  let v = null;
  try { const r = await caches.match('veri/vardiya.json', { cacheName: VERI }); if (r) v = await r.json(); } catch (e) { /* */ }
  const bugun = new Date(), yarin = new Date(); yarin.setDate(bugun.getDate() + 1);
  const liste = (a) => a.length ? a.join(', ') : 'planlanmamış';
  let baslik, metin;
  if (!v || !(v.personel || []).length) { baslik = '14. Kat · Vardiya'; metin = 'Vardiya planı bu cihazda bulunamadı. Uygulamayı açıp kontrol edin.'; }
  else if (zaman === 'aksam') {
    baslik = 'Bu gecenin vardiyası';
    metin = `Gece 20.00–08.00: ${liste(kimler(v, iso(bugun), 'N'))}\nYarın gündüz: ${liste(kimler(v, iso(yarin), 'G'))}`;
  } else {
    baslik = 'Bugünün vardiyası';
    metin = `Gündüz 08.00–20.00: ${liste(kimler(v, iso(bugun), 'G'))}\nGece 20.00–08.00: ${liste(kimler(v, iso(bugun), 'N'))}`;
  }
  return self.registration.showNotification(baslik, {
    body: metin, icon: 'public/branding/logo-14kat-192.png', badge: 'public/branding/bildirim-simge-96.png',
    tag: 'vardiya-' + zaman, renotify: true, vibrate: [200, 100, 200], data: { url: 'panel.html#vardiya' }
  });
}
self.addEventListener('push', (e) => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { /* */ }
  const zaman = d.zaman || (new Date().getHours() < 12 ? 'sabah' : 'aksam');
  e.waitUntil(vardiyaBildirimi(zaman));
});
self.addEventListener('message', (e) => {
  if (e.data && e.data.tur === 'vardiya-deneme') e.waitUntil(vardiyaBildirimi(e.data.zaman || 'sabah'));
});

/* Bildirime dokununca uygulamayı öne getir / aç */
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || 'panel.html';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((l) => {
    for (const c of l) { if ('focus' in c) { if ('navigate' in c && url.includes('#')) c.navigate(url).catch(() => {}); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
