/* ==========================================================
   14. KAT — Ayarlar: yedekle / geri yükle, veriler hakkında
   Bütün veriler bu cihazın tarayıcısında '14kat.' ile başlayan anahtarlarda durur.
   ========================================================== */
(function () {
  'use strict';
  const ON_EK = '14kat.';
  const AYAR = '14kat.ayar.v1';
  let durum = { mesaj: '', tur: '', bekleyen: null, dosyaAd: '' };

  const i = (a, s = '') => `<svg class="ikon ${s}" aria-hidden="true"><use href="#i-${a}"/></svg>`;
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const trTarih = (s) => s.split('-').reverse().join('.');

  function oku(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function yaz(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function anahtarlar() { const a = []; try { for (let n = 0; n < localStorage.length; n++) { const k = localStorage.key(n); if (k && k.startsWith(ON_EK) && k !== AYAR) a.push(k); } } catch (e) { /* */ } return a.sort(); }
  function ayar() { try { return JSON.parse(oku(AYAR)) || {}; } catch (e) { return {}; } }
  function sonYedekGun() { const a = ayar(); if (!a.sonYedek) return null; return Math.round((Date.parse(iso(new Date())) - Date.parse(a.sonYedek)) / 864e5); }

  const MODUL = { '14kat.vardiya.v1': 'Vardiya ve personel', '14kat.gorev.v1': 'Görev dağıtımı', '14kat.ajanda.v1': 'Ajanda', '14kat.stok.v1': 'Stok ve sarf', '14kat.miat.v1': 'Miat ve sıcaklık' };

  function ciz() {
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
        <div class="kart__bas"><h2 class="kart__baslik">${i('bilgi')}Uygulama</h2></div>
        <div class="kart__govde"><ul class="liste metin-sm">
          <li>${i('onay', 'ikon-sm')}<span>14. Kat · sürüm 1.0 · 6 modül</span></li>
          <li>${i('onay', 'ikon-sm')}<span>Veriler sunucuya gönderilmez; yalnızca bu cihazın tarayıcısında saklanır.</span></li>
          <li>${i('onay', 'ikon-sm')}<span>Android: Chrome menüsü → “Ana ekrana ekle” ile uygulama olarak kurulur, internet yokken de açılır.</span></li>
        </ul>
        <div class="vrd-eylemler" style="margin-top:12px"><a class="btn btn-hayalet btn-sm" href="#tasarim">${i('ayar', 'ikon-sm')}Tasarım sistemi</a></div></div>
      </section>`;
  }

  function yenile(odak) { const el = document.getElementById('icerik'); el.innerHTML = ciz(); bagla(el); if (odak) { const o = el.querySelector(odak); if (o) o.focus(); } }

  function bagla(el) {
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
          const temiz = {}; Object.keys(j.veri).forEach(k => { if (k.startsWith(ON_EK) && k !== AYAR) temiz[k] = j.veri[k]; });
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
