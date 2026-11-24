/* ==========================================================
   14. KAT — Uygulama içi hatırlatıcı
   Uygulama açıkken: saatli ek görevler (SMS zamanında) ve ajandadaki
   saatli etkinlikler (15 dk önce) için ekranda uyarı + titreşim.
   Uygulama arka plandaysa ve izin verildiyse telefon bildirimi.
   ========================================================== */
(function () {
  'use strict';
  const ANAHTAR = '14kat.hatirlatma.v1';
  const AJANDA_DK = 15;
  const GEC_KALMA_DK = 60; // bu kadar geçmiş hatırlatmalar artık gösterilmez
  let kuyruk = [];

  const i = (a, s = '') => `<svg class="ikon ${s}" aria-hidden="true"><use href="#i-${a}"/></svg>`;
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function durum() { try { return JSON.parse(localStorage.getItem(ANAHTAR)) || {}; } catch (e) { return {}; } }
  function durumYaz(d) {
    const sinir = Date.now() - 2 * 864e5; // 2 günden eski kayıtları temizle
    Object.keys(d).forEach(k => { if ((d[k].t || 0) < sinir) delete d[k]; });
    try { localStorage.setItem(ANAHTAR, JSON.stringify(d)); } catch (e) { /* */ }
  }

  function adaylar() {
    const liste = [];
    try { liste.push(...window.GorevEkrani.saatliGorevler()); } catch (e) { /* */ }
    try {
      const d = new Date(), b = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      window.AjandaEkrani.ozet().etkinlikler.filter(e => e.saat).forEach(e => {
        const z = new Date(`${b}T${e.saat}:00`);
        liste.push({ id: `a:${b}:${e.id}`, zaman: new Date(z.getTime() - AJANDA_DK * 60000), randevu: z, baslik: e.baslik, metin: `Ajanda · ${e.saat.replace(':', '.')}${e.yer ? ' · ' + e.yer : ''}`, link: '#ajanda' });
      });
    } catch (e) { /* */ }
    return liste;
  }

  function kontrol() {
    const simdi = Date.now(), d = durum();
    adaylar().forEach(h => {
      const kayit = d[h.id];
      const zaman = kayit && kayit.ertele ? kayit.ertele : h.zaman.getTime();
      if (kayit && kayit.goruldu) return;
      if (zaman > simdi || simdi - zaman > GEC_KALMA_DK * 60000) return;
      if (kuyruk.some(x => x.id === h.id)) return;
      kuyruk.push(h); goster(h);
    });
  }

  function kalanMetin(h) {
    const dk = Math.round((h.randevu.getTime() - Date.now()) / 60000);
    return dk > 0 ? `${dk} dk sonra` : dk === 0 ? 'şimdi' : `${-dk} dk önce başladı`;
  }

  function kutuHazirla() {
    let k = document.getElementById('hatirlatmalar');
    if (!k) { k = document.createElement('div'); k.id = 'hatirlatmalar'; k.className = 'ht-kutu'; k.setAttribute('aria-live', 'assertive'); document.body.appendChild(k); }
    return k;
  }

  function goster(h) {
    const k = kutuHazirla();
    const el = document.createElement('div');
    el.className = 'ht-kart'; el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-label', 'Hatırlatma');
    el.innerHTML = `<div class="ht-ust">${i('zil')}<div><div class="ht-baslik">${esc(h.baslik)}</div><div class="ht-metin">${esc(h.metin)} · ${kalanMetin(h)}</div></div></div>
      <div class="ht-eylem"><button class="btn btn-birincil btn-sm" type="button" data-ht="tamam">Tamam</button>
        <button class="btn btn-ikincil btn-sm" type="button" data-ht="ertele">5 dk ertele</button>
        <a class="btn btn-hayalet btn-sm" href="${h.link}" data-ht="ac">Aç</a></div>`;
    k.appendChild(el);
    el.querySelector('[data-ht="tamam"]').focus();
    const kapat = (ertele) => {
      const d = durum();
      d[h.id] = ertele ? { ertele: Date.now() + 5 * 60000, t: Date.now() } : { goruldu: true, t: Date.now() };
      durumYaz(d); kuyruk = kuyruk.filter(x => x.id !== h.id); el.remove();
    };
    el.querySelector('[data-ht="tamam"]').addEventListener('click', () => kapat(false));
    el.querySelector('[data-ht="ertele"]').addEventListener('click', () => kapat(true));
    el.querySelector('[data-ht="ac"]').addEventListener('click', () => kapat(false));
    try { if (navigator.vibrate) navigator.vibrate([250, 120, 250, 120, 250]); } catch (e) { /* */ }
    if (document.hidden) bildirim(h);
  }

  function bildirim(h) {
    try {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      const sec = { body: `${h.metin} · ${kalanMetin(h)}`, icon: 'public/branding/logo-14kat-192.png', badge: 'public/branding/logo-14kat-64.png', tag: h.id, vibrate: [250, 120, 250] };
      if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.ready.then(r => r.showNotification(h.baslik, sec));
      else new Notification(h.baslik, sec);
    } catch (e) { /* bildirim yoksa ekrandaki uyarı yeterli */ }
  }

  const Hatirlatici = {
    baslat() { kontrol(); setInterval(kontrol, 20000); document.addEventListener('visibilitychange', () => { if (!document.hidden) kontrol(); }); window.addEventListener('hashchange', kontrol); },
    kontrol,
    bildirimDurumu() { return !('Notification' in window) ? 'yok' : Notification.permission; },
    async bildirimIzni() { try { return await Notification.requestPermission(); } catch (e) { return 'yok'; } }
  };
  window.Hatirlatici = Hatirlatici;
})();
