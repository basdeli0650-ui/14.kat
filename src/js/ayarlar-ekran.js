/* ==========================================================
   14. KAT — Ayarlar: yedekle / geri yükle, veriler hakkında
   Bütün veriler bu cihazın tarayıcısında '14kat.' ile başlayan anahtarlarda durur.
   ========================================================== */
(function () {
  'use strict';
  const ON_EK = '14kat.';
  const AYAR = '14kat.ayar.v1';
  const HARIC = [AYAR, '14kat.pin.v1', '14kat.pinDeneme', '14kat.hatirlatma.v1', '14kat.push.v1']; // yedeğe girmez, geri yüklemede silinmez
  let durum = { mesaj: '', tur: '', bekleyen: null, dosyaAd: '' }, pinMesaj = null, denemeMesaj = '';
  let pushMesaj = '', pushKopya = false, pushDurum = null; // null: bilinmiyor, 'yok', 'kapali', 'acik'

  /* ---------- Vardiya bildirimi (Web Push) ---------- */
  const PUSH = '14kat.push.v1';
  const b64url = (b) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const depo = () => { const h = location.hostname, y = location.pathname.split('/').filter(Boolean)[0]; return h.endsWith('.github.io') && y ? { sahip: h.split('.')[0], ad: y } : null; };
  function pushAyar() { try { return JSON.parse(localStorage.getItem(PUSH)); } catch (e) { return null; } }
  async function pushKontrol() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !(window.crypto && crypto.subtle)) return 'yok';
    try {
      const r = await navigator.serviceWorker.getRegistration(); if (!r) return 'yok';
      const sub = await r.pushManager.getSubscription(), a = pushAyar();
      return sub && a && a.abonelik && a.abonelik.endpoint === sub.endpoint ? 'acik' : 'kapali';
    } catch (e) { return 'yok'; }
  }
  async function pushEtkinlestir() {
    const izin = await Notification.requestPermission();
    if (izin !== 'granted') throw new Error('Bildirim izni verilmedi.');
    const r = await navigator.serviceWorker.ready;
    const eski = await r.pushManager.getSubscription(); if (eski) await eski.unsubscribe();
    const anahtar = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']);
    const acik = await crypto.subtle.exportKey('raw', anahtar.publicKey);
    const ozel = (await crypto.subtle.exportKey('jwk', anahtar.privateKey)).d;
    const sub = await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: new Uint8Array(acik) });
    const j = sub.toJSON();
    localStorage.setItem(PUSH, JSON.stringify({ abonelik: { endpoint: j.endpoint, keys: j.keys }, vapid: { acik: b64url(acik), ozel } }));
  }
  function pushKarti() {
    const a = pushAyar(), d = depo();
    const gizliLink = d ? `https://github.com/${d.sahip}/${d.ad}/settings/secrets/actions/new` : 'GitHub → depo → Settings → Secrets and variables → Actions → New repository secret';
    const isLink = d ? `https://github.com/${d.sahip}/${d.ad}/actions/workflows/vardiya-bildirimi.yml` : 'GitHub → depo → Actions → Vardiya bildirimi';
    const lnk = (u, t) => u.startsWith('http') ? `<a href="${u}" target="_blank" rel="noopener">${t} ↗</a>` : esc(u);
    let govde;
    if (pushDurum === null) govde = '<p class="metin-sm metin-soluk">Kontrol ediliyor…</p>';
    else if (pushDurum === 'yok') govde = `<p class="metin-sm metin-ikincil">Bu tarayıcı veya mod arka plan bildirimini desteklemiyor. Uygulamayı Chrome'dan “Uygulamayı yükle” ile kurup ana ekrandan açın.</p>`;
    else if (pushDurum === 'kapali') govde = `<p class="metin-sm metin-ikincil">Her gün <strong>06.00</strong>'da bugünün, <strong>16.00</strong>'da bu gecenin ve yarın gündüzün ekibi bildirim olarak gelir; uygulama kapalıyken de. İsimler sunucuya gönderilmez, telefondaki listeden okunur.</p>
        <div class="vrd-eylemler" style="margin-top:12px"><button class="btn btn-birincil btn-sm" type="button" data-push-ac>${i('zil', 'ikon-sm')}Etkinleştir</button></div>`;
    else govde = `
        <ol class="ps-adim">
          <li><span>Anahtarı kopyalayın.</span>
            <button class="btn ${pushKopya ? 'btn-ikincil' : 'btn-birincil'} btn-sm" type="button" data-push-kopya>${i('gonder', 'ikon-sm')}${pushKopya ? 'Kopyalandı' : 'Anahtarı kopyala'}</button></li>
          <li><span>${lnk(gizliLink, 'GitHub gizli anahtar sayfası')} açılır. <strong>Name</strong>: <code>PUSH_AYAR</code> · <strong>Secret</strong>: yapıştırın · <strong>Add secret</strong>.</span></li>
          <li><span>Denemek için ${lnk(isLink, 'Vardiya bildirimi')} sayfasında <strong>Run workflow</strong> → <strong>Run workflow</strong>. 1–2 dakika içinde bildirim gelir.</span></li>
        </ol>
        <div class="vrd-eylemler" style="margin-top:12px">
          <button class="btn btn-ikincil btn-sm" type="button" data-push-dene="sabah">Telefonda dene: 06.00</button>
          <button class="btn btn-ikincil btn-sm" type="button" data-push-dene="aksam">Telefonda dene: 16.00</button>
          <button class="btn btn-hayalet btn-sm" type="button" data-push-ac>Anahtarı yenile</button>
        </div>
        <p class="alan__ipucu" style="margin-top:8px">Anahtar yalnızca bu telefona bildirim göndermeye yarar; kimseyle paylaşmayın. “Anahtarı yenile” derseniz GitHub'daki <code>PUSH_AYAR</code>'ı da güncelleyin.</p>`;
    return `<section class="kart">
      <div class="kart__bas"><h2 class="kart__baslik">${i('vardiya')}Vardiya bildirimleri · 06.00 / 16.00</h2>
        <span class="rozet ${pushDurum === 'acik' ? 'rozet-basari' : 'rozet-notr'}">${pushDurum === 'acik' ? 'Telefon hazır' : 'Kapalı'}</span></div>
      <div class="kart__govde">${govde}${pushMesaj ? `<p class="alan__hata" role="alert" style="margin-top:8px">${i('uyari', 'ikon-sm')}${esc(pushMesaj)}</p>` : ''}</div>
    </section>`;
  }

  const i = (a, s = '') => `<svg class="ikon ${s}" aria-hidden="true"><use href="#i-${a}"/></svg>`;
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const trTarih = (s) => s.split('-').reverse().join('.');

  function oku(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function yaz(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function anahtarlar() { const a = []; try { for (let n = 0; n < localStorage.length; n++) { const k = localStorage.key(n); if (k && k.startsWith(ON_EK) && !HARIC.includes(k)) a.push(k); } } catch (e) { /* */ } return a.sort(); }
  function ayar() { try { return JSON.parse(oku(AYAR)) || {}; } catch (e) { return {}; } }
  function sonYedekGun() { const a = ayar(); if (!a.sonYedek) return null; return Math.round((Date.parse(iso(new Date())) - Date.parse(a.sonYedek)) / 864e5); }

  const MODUL = { '14kat.vardiya.v1': 'Vardiya ve personel', '14kat.gorev.v1': 'Görev dağıtımı', '14kat.ajanda.v1': 'Ajanda', '14kat.stok.v1': 'Stok ve sarf', '14kat.miat.v1': 'Miat ve sıcaklık' };

  function ciz() {
    const standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
    const kurulumIpucu = standalone ? '' : `<div class="uyari uyari-bilgi" style="margin-top:12px">${i('bilgi')}<div><div class="uyari__baslik">Uygulama tarayıcı içinde açık</div>
      <div class="uyari__metin">Telefonun bildirim listesinde “14. Kat” olarak görünmesi için Chrome ile açıp menü (⋮) → <strong>Uygulamayı yükle</strong> deyin (“Ana ekrana ekle” yalnızca kısayol oluşturur). Sonra ana ekrandaki 14. Kat simgesinden açıp buradan izin verin.</div></div></div>`;
    const bd = window.Hatirlatici ? window.Hatirlatici.bildirimDurumu() : 'yok';
    const k = anahtarlar(), gun = sonYedekGun(), boyut = k.reduce((t, x) => t + (oku(x) || '').length, 0);
    const b = durum.bekleyen;
    return `
      <div class="sayfa-bas"><div><div class="sayfa-bas__ust">Sistem</div><h1>Ayarlar</h1>
        <p class="sayfa-bas__aciklama">Yedekleme ve uygulama verileri</p></div></div>

      ${durum.mesaj ? `<div class="uyari uyari-${durum.tur}" role="status">${i(durum.tur === 'basari' ? 'onay' : durum.tur === 'kritik' ? 'kritik' : 'bilgi')}<div><div class="uyari__metin">${esc(durum.mesaj)}</div></div></div>` : ''}

      <section class="kart">
        <div class="kart__bas"><h2 class="kart__baslik">${i('kilit')}Yedekleme</h2>
          <span class="rozet ${gun == null ? 'rozet-uyari' : gun > 7 ? 'rozet-uyari' : 'rozet-basari'}">${gun == null ? 'Henüz yedek alınmadı' : gun === 0 ? 'Bugün yedeklendi' : `${gun} gün önce`}</span></div>
        <div class="kart__govde">
          <p class="metin-sm metin-ikincil">Bütün kayıtlar yalnızca bu cihazdadır. Telefon değişirse veya tarayıcı verisi silinirse kaybolur. Haftada bir yedek dosyası indirip güvenli bir yerde saklayın (ör. kendi e-postanıza veya Drive'a). Dosya hemşire isimlerini içerir; paylaşmayın.</p>
          <div class="vrd-eylemler" style="margin-top:16px">
            <button class="btn btn-birincil" type="button" data-yedekle>${i('stok')}Yedek dosyası indir</button>
            <label class="btn btn-ikincil" for="yedek-dosya">${i('arti')}Yedekten geri yükle</label>
            <input id="yedek-dosya" class="sr-only" type="file" accept="application/json,.json" data-geri>
          </div>
          ${b ? `<div class="uyari uyari-uyari" role="alertdialog" aria-label="Geri yükleme onayı" style="margin-top:16px">${i('uyari')}<div>
              <div class="uyari__baslik">${esc(durum.dosyaAd)} · ${b.tarih ? trTarih(b.tarih) : 'tarih yok'} tarihli yedek</div>
              <div class="uyari__metin">İçerik: ${Object.keys(b.veri).map(x => MODUL[x] || x).join(', ')}. Bu cihazdaki mevcut kayıtların yerine geçecek.</div>
              <div class="vrd-adaylar"><button class="btn btn-tehlike btn-sm" type="button" data-geri-evet>Evet, geri yükle</button><button class="btn btn-hayalet btn-sm" type="button" data-geri-hayir>Vazgeç</button></div>
            </div></div>` : ''}
        </div>
        <div class="kart__alt metin-xs metin-ikincil">Bu cihazda ${k.length} modül verisi · yaklaşık ${Math.max(1, Math.round(boyut / 1024))} KB</div>
      </section>

      <section class="kart">
        <div class="kart__bas"><h2 class="kart__baslik">${i('kilit')}PIN kilidi</h2>
          <button class="btn btn-ikincil btn-sm" type="button" data-kilitle>${i('kilit', 'ikon-sm')}Şimdi kilitle</button></div>
        <div class="kart__govde">
          <p class="metin-sm metin-ikincil">Uygulama her açılışta ve 10 dakikadan uzun arka planda kaldığında PIN ister.</p>
          <form class="form-izgara" data-pin-form style="margin-top:12px">
            ${['eski|Mevcut PIN', 'yeni|Yeni PIN', 'yeni2|Yeni PIN tekrar'].map(x => { const [ad, et] = x.split('|'); return `<div class="alan"><label class="alan__etiket" for="pin-${ad}">${et}</label><input id="pin-${ad}" name="${ad}" class="girdi pin-girdi" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off"></div>`; }).join('')}
            <button class="btn btn-ikincil" type="submit" style="align-self:end">PIN'i değiştir</button>
          </form>
          ${pinMesaj ? `<p class="${pinMesaj[0] === 'ok' ? 'alan__ipucu' : 'alan__hata'}" role="status" style="margin-top:8px">${pinMesaj[0] === 'ok' ? '' : i('uyari', 'ikon-sm')}${esc(pinMesaj[1])}</p>` : ''}
        </div>
      </section>

      ${pushKarti()}

      <section class="kart">
        <div class="kart__bas"><h2 class="kart__baslik">${i('zil')}Hatırlatmalar</h2>
          <span class="rozet ${bd === 'granted' ? 'rozet-basari' : 'rozet-notr'}">${bd === 'granted' ? 'Bildirim açık' : bd === 'denied' ? 'Bildirim engelli' : bd === 'yok' ? 'Desteklenmiyor' : 'Bildirim kapalı'}</span></div>
        <div class="kart__govde">
          <p class="metin-sm metin-ikincil">Uygulama açıkken saatli görevler (SMS zamanında) ve ajandadaki saatli etkinlikler (15 dk önce) ekranda uyarı ve titreşimle hatırlatılır. Bildirim izni verirseniz uygulama arka plandayken de telefon bildirimi gelir.</p>
          ${bd === 'default' ? `<div class="vrd-eylemler" style="margin-top:12px"><button class="btn btn-ikincil btn-sm" type="button" data-bildirim>${i('zil', 'ikon-sm')}Bildirimlere izin ver</button></div>` : ''}
          ${bd === 'granted' ? `<div class="vrd-eylemler" style="margin-top:12px"><button class="btn btn-ikincil btn-sm" type="button" data-deneme>${i('zil', 'ikon-sm')}Deneme bildirimi gönder</button>${denemeMesaj ? `<span class="metin-sm ${denemeMesaj === 'ok' ? 'metin-ikincil' : ''}" ${denemeMesaj === 'ok' ? '' : 'style="color:var(--renk-kritik)"'}>${denemeMesaj === 'ok' ? 'Gönderildi — bildirim çubuğuna bakın.' : esc(denemeMesaj)}</span>` : ''}</div>` : ''}
          ${bd === 'denied' ? '<p class="alan__ipucu" style="margin-top:8px">İzin engellenmiş. Açmak için: telefon Ayarlar → Uygulamalar → 14. Kat (veya Chrome) → Bildirimler → İzin ver.</p>' : ''}
          ${kurulumIpucu}
          <p class="alan__ipucu" style="margin-top:8px">Uygulama tamamen kapalıyken hatırlatma için SMS'i Mesajlar'da zamanlayın.</p>
        </div>
      </section>

      <section class="kart">
        <div class="kart__bas"><h2 class="kart__baslik">${i('bilgi')}Uygulama</h2></div>
        <div class="kart__govde"><ul class="liste metin-sm">
          <li>${i('onay', 'ikon-sm')}<span>14. Kat · sürüm 1.0 · <span id="surum-bilgi">yükleniyor…</span></span></li>
          <li>${i('onay', 'ikon-sm')}<span>Veriler sunucuya gönderilmez; yalnızca bu cihazın tarayıcısında saklanır.</span></li>
          <li>${i('onay', 'ikon-sm')}<span>Android: Chrome menüsü → “Ana ekrana ekle” ile uygulama olarak kurulur, internet yokken de açılır.</span></li>
        </ul>
        <div class="vrd-eylemler" style="margin-top:12px"><button class="btn btn-ikincil btn-sm" type="button" data-guncelle>${i('saat', 'ikon-sm')}Güncellemeyi kontrol et</button><a class="btn btn-hayalet btn-sm" href="#tasarim">${i('ayar', 'ikon-sm')}Tasarım sistemi</a></div></div>
      </section>`;
  }

  function yenile(odak) { const el = document.getElementById('icerik'); el.innerHTML = ciz(); bagla(el); if (odak) { const o = el.querySelector(odak); if (o) o.focus(); } }

  function bagla(el) {
    if (pushDurum === null) pushKontrol().then(d => { pushDurum = d; if (location.hash === '#ayarlar') yenile(); });
    const pa = el.querySelectorAll('[data-push-ac]');
    pa.forEach(b => b.addEventListener('click', async () => {
      b.disabled = true; pushMesaj = '';
      try { await pushEtkinlestir(); pushDurum = 'acik'; pushKopya = false; } catch (e) { pushMesaj = e.message || 'Etkinleştirilemedi.'; }
      yenile('[data-push-kopya]');
    }));
    const pk = el.querySelector('[data-push-kopya]');
    if (pk) pk.addEventListener('click', () => {
      const t = localStorage.getItem(PUSH) || '';
      const bitti = (ok) => { pushKopya = ok; pushMesaj = ok ? '' : 'Kopyalanamadı.'; yenile('[data-push-kopya]'); };
      try { navigator.clipboard.writeText(t).then(() => bitti(true), () => bitti(false)); } catch (e) { bitti(false); }
    });
    el.querySelectorAll('[data-push-dene]').forEach(b => b.addEventListener('click', async () => {
      try { window.VardiyaEkrani.aynala(); const r = await navigator.serviceWorker.ready; setTimeout(() => r.active.postMessage({ tur: 'vardiya-deneme', zaman: b.dataset.pushDene }), 300); } catch (e) { pushMesaj = 'Deneme bildirimi gösterilemedi.'; yenile(); }
    }));
    const sb = el.querySelector('#surum-bilgi');
    if (sb) { try { caches.keys().then(k => { const v = k.filter(x => /^14kat-v\d+$/.test(x)).sort((a, b) => parseInt(a.slice(7)) - parseInt(b.slice(7))).pop(); sb.textContent = v ? 'önbellek ' + v.replace('14kat-', '') : 'önbellek yok (tarayıcı modu)'; }).catch(() => { sb.textContent = '—'; }); } catch (e) { sb.textContent = '—'; } }
    const gb = el.querySelector('[data-guncelle]');
    if (gb) gb.addEventListener('click', async () => {
      gb.disabled = true; gb.lastChild.textContent = 'Kontrol ediliyor…';
      try { const r = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); if (r) await r.update(); } catch (e) { /* */ }
      setTimeout(() => location.reload(), 1500);
    });
    const db = el.querySelector('[data-deneme]');
    if (db) db.addEventListener('click', async () => { denemeMesaj = await window.Hatirlatici.deneme(); yenile('[data-deneme]'); });
    const bb = el.querySelector('[data-bildirim]');
    if (bb) bb.addEventListener('click', async () => { await window.Hatirlatici.bildirimIzni(); yenile(); });
    const kb = el.querySelector('[data-kilitle]');
    if (kb && window.Kilit) kb.addEventListener('click', () => window.Kilit.kilitle());
    const pf = el.querySelector('[data-pin-form]');
    if (pf && window.Kilit) pf.addEventListener('submit', async (e) => {
      e.preventDefault();
      const K = window.Kilit, f = pf;
      if (K.beklemeSn()) pinMesaj = ['hata', `Çok fazla hatalı deneme. ${K.beklemeSn()} saniye bekleyin.`];
      else if (!K.gecerli(f.yeni.value)) pinMesaj = ['hata', 'Yeni PIN 4–6 rakamdan oluşmalı.'];
      else if (f.yeni.value !== f.yeni2.value) pinMesaj = ['hata', 'Yeni PIN tekrarı aynı değil.'];
      else pinMesaj = (await K.degistir(f.eski.value, f.yeni.value)) ? ['ok', 'PIN değiştirildi.'] : ['hata', 'Mevcut PIN yanlış.'];
      yenile('[data-pin-form] button');
    });
    const yb = el.querySelector('[data-yedekle]');
    if (yb) yb.addEventListener('click', () => {
      const veri = {}; anahtarlar().forEach(k => { try { veri[k] = JSON.parse(oku(k)); } catch (e) { /* bozuk kayıt atlanır */ } });
      const bugun = iso(new Date());
      const blob = new Blob([JSON.stringify({ uygulama: '14. Kat', surum: 1, tarih: bugun, veri }, null, 1)], { type: 'application/json' });
      try {
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `14kat-yedek-${bugun}.json`;
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        const ay = ayar(); ay.sonYedek = bugun; yaz(AYAR, JSON.stringify(ay));
        durum = { mesaj: `Yedek dosyası indirildi: 14kat-yedek-${bugun}.json`, tur: 'basari', bekleyen: null };
      } catch (e) { durum = { mesaj: 'Dosya indirilemedi. Uygulamayı telefona kurulu hâliyle (Chrome) açıp tekrar deneyin.', tur: 'kritik', bekleyen: null }; }
      yenile('[data-yedekle]');
    });
    const gd = el.querySelector('[data-geri]');
    if (gd) gd.addEventListener('change', () => {
      const f = gd.files && gd.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const j = JSON.parse(r.result);
          if (j.uygulama !== '14. Kat' || !j.veri || typeof j.veri !== 'object') throw new Error('biçim');
          const temiz = {}; Object.keys(j.veri).forEach(k => { if (k.startsWith(ON_EK) && !HARIC.includes(k)) temiz[k] = j.veri[k]; });
          if (!Object.keys(temiz).length) throw new Error('boş');
          durum = { mesaj: '', tur: '', bekleyen: { tarih: j.tarih, veri: temiz }, dosyaAd: f.name };
          yenile('[data-geri-hayir]');
        } catch (e) { durum = { mesaj: 'Bu dosya bir 14. Kat yedeği değil veya bozuk.', tur: 'kritik', bekleyen: null }; yenile(); }
      };
      r.readAsText(f);
    });
    const ev = el.querySelector('[data-geri-evet]');
    if (ev) ev.addEventListener('click', () => {
      const b = durum.bekleyen; let ok = true;
      anahtarlar().forEach(k => { try { localStorage.removeItem(k); } catch (e) { ok = false; } });
      Object.entries(b.veri).forEach(([k, v]) => { if (!yaz(k, JSON.stringify(v))) ok = false; });
      if (ok) { sessionStorage && (() => { try { sessionStorage.setItem('14kat.geriYuklendi', '1'); } catch (e) { /* */ } })(); location.reload(); }
      else { durum = { mesaj: 'Geri yükleme tamamlanamadı (depolama alanı). Tarayıcı ayarlarını kontrol edin.', tur: 'kritik', bekleyen: null }; yenile(); }
    });
    const eh = el.querySelector('[data-geri-hayir]');
    if (eh) eh.addEventListener('click', () => { durum = { mesaj: '', tur: '', bekleyen: null }; yenile(); });
    try { if (sessionStorage.getItem('14kat.geriYuklendi')) { sessionStorage.removeItem('14kat.geriYuklendi'); durum = { mesaj: 'Yedek geri yüklendi.', tur: 'basari', bekleyen: null }; yenile(); } } catch (e) { /* */ }
  }

  window.AyarlarEkrani = { ciz, bagla, sonYedekGun, veriVar: () => anahtarlar().length > 0 };
})();
