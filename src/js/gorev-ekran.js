/* ==========================================================
   14. KAT — Görev Dağıtımı ekranı
   Her vardiyada dolu odalar nöbetçi 2 hemşireye bölünür,
   rutin işler atanır, ek görevler eklenir. Yalnızca sorumlu hemşire kullanır.
   Veri bu cihazın tarayıcısında saklanır (localStorage).
   ========================================================== */
(function () {
  'use strict';
  const V = window.VardiyaEkrani;
  const ANAHTAR = '14kat.gorev.v1';
  const YOGUNLUK = { 1: 'Hafif', 2: 'Orta', 3: 'Ağır' };
  const GUNLER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

  const TOHUM = {
    surum: 1,
    odalar: ['1401', '1402', '1403', '1404', '1405', '1407', '1408', '1409', '1410'].map(no => ({ no, dolu: true, yogunluk: 2 })),
    rutinler: [
      { id: 'narkotik', ad: 'Narkotik ilaç sayımı', vardiya: 'her' },
      { id: 'sicaklik', ad: 'Dolap sıcaklığı ölçümü', vardiya: 'her' },
      { id: 'crash',    ad: 'Crash card dosyası alımı', vardiya: 'her' }
    ],
    kayitlar: {}
  };

  let veri, secTarih = null, secVardiya = null, kopyaDurum = '', smsSon = null;
  function yukle() {
    try { const s = localStorage.getItem(ANAHTAR); veri = s ? JSON.parse(s) : null; } catch (e) { veri = null; }
    if (!veri || veri.surum !== 1) veri = JSON.parse(JSON.stringify(TOHUM));
    // Geçiş: 1406 yerine 1410 (eski kayıtlarda)
    const eski = veri.odalar.find(o => o.no === '1406');
    if (eski && !veri.odalar.some(o => o.no === '1410')) {
      eski.no = '1410';
      veri.odalar.sort((a, b) => a.no.localeCompare(b.no, 'tr', { numeric: true }));
      Object.values(veri.kayitlar).forEach(k => { k.oda = {}; });
      kaydet();
    }
  }
  function kaydet() { try { localStorage.setItem(ANAHTAR, JSON.stringify(veri)); } catch (e) { /* bellekte devam */ } }

  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const gunEkle = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };
  const trTarih = (s) => { const d = new Date(s + 'T12:00:00'); return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')} ${GUNLER[d.getDay()]}`; };
  const saatSimdi = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`; };
  const esc = (t) => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const i = (a, s = '') => `<svg class="ikon ${s}" aria-hidden="true"><use href="#i-${a}"/></svg>`;

  /* Şu anki vardiya: 08–20 gündüz; 20–24 bugünün gecesi; 00–08 dünün gecesi */
  function simdikiVardiya() {
    const d = new Date(), h = d.getHours();
    if (h >= 8 && h < 20) return [iso(d), 'G'];
    if (h >= 20) return [iso(d), 'N'];
    return [gunEkle(iso(d), -1), 'N'];
  }

  const anahtar = () => `${secTarih}|${secVardiya}`;
  function kayit() {
    const k = anahtar();
    if (!veri.kayitlar[k]) veri.kayitlar[k] = { kisiler: null, oda: {}, rutin: {}, ek: [] };
    // Eski kayıtlarda e.saat tamamlanma saatiydi (ör. "10.05") → bittiSaat
    veri.kayitlar[k].ek.forEach(e => { if (e.saat && e.saat.includes('.')) { e.bittiSaat = e.saat; e.saat = ''; } });
    return veri.kayitlar[k];
  }
  const personel = () => V.personel();
  const kisaAd = (id) => (personel().find(p => p.id === id) || {}).kisa || '—';
  const telefon = (id) => (personel().find(p => p.id === id) || {}).tel || '';
  const dkCikar = (saat, dk) => { const [h, m] = saat.split(':').map(Number); const t = ((h * 60 + m - dk) % 1440 + 1440) % 1440; return `${String(Math.floor(t / 60)).padStart(2, '0')}.${String(t % 60).padStart(2, '0')}`; };
  const smsMetni = (e) => `14. Kat hatırlatma: ${e.oda ? `Oda ${e.oda} - ` : ''}${e.metin}, saat ${e.saat.replace(':', '.')}.`;
  /* Android: sms:+90…?body=…  (iOS ;body= da kabul eder) */
  const smsLink = (tel, metin) => `sms:${tel}?body=${encodeURIComponent(metin)}`;

  /* Nöbetçiler: elle seçilmişse o, yoksa vardiya planından */
  function nobetciler(k) {
    if (Array.isArray(k.kisiler)) return k.kisiler; // elle seçilmiş (veya seçim bekliyor)
    return V.vardiyadakiler(secTarih, secVardiya);
  }

  /* Otomatik bölme: 5–4 (dolu oda sayısına göre yarı yarıya), oda sırası korunur.
     Hangi tarafın fazla oda alacağı yoğunluğa göre seçilir: yük farkı en az olan. */
  function otomatikBol(kisi) {
    const dolu = veri.odalar.filter(o => o.dolu);
    const n = dolu.length, buyuk = Math.ceil(n / 2), kucuk = n - buyuk;
    const yuk = (a) => a.reduce((s, o) => s + o.yogunluk, 0);
    const fark = (k) => Math.abs(yuk(dolu.slice(0, k)) - yuk(dolu.slice(k)));
    const kesim = fark(buyuk) <= fark(kucuk) ? buyuk : kucuk;
    const oda = {};
    dolu.forEach((o, j) => { oda[o.no] = j < kesim ? kisi[0] : kisi[1]; });
    return oda;
  }

  const IZOL = { temas: 'Temas izol.', damlacik: 'Damlacık izol.', solunum: 'Solunum izol.' };
  function isaretler(o) {
    return [o.izolasyon && IZOL[o.izolasyon], o.dusme && 'Düşme', o.basi && 'Bası', o.npo && 'Aç', o.alerji && 'Alerji'].filter(Boolean).join(' · ');
  }

  function rutinlerBuVardiya() { return veri.rutinler.filter(r => r.vardiya === 'her' || r.vardiya === secVardiya); }

  /* Seçili vardiyanın kaydını hazırla: otomatik oda bölme, rutin sorumluları, ölçümden rutin */
  function hazirla() {
    const k = kayit();
    const kisi = nobetciler(k);
    const ikiKisi = kisi.length === 2;
    // Henüz dağıtım yoksa otomatik yap
    if (ikiKisi && !Object.keys(k.oda).length) { k.oda = otomatikBol(kisi); kaydet(); }
    // Rutinlere varsayılan kişi: sırayla
    rutinlerBuVardiya().forEach((r, n) => {
      if (!k.rutin[r.id]) k.rutin[r.id] = { kisi: '', bitti: false, saat: '' };
      if (ikiKisi && !kisi.includes(k.rutin[r.id].kisi)) k.rutin[r.id].kisi = kisi[n % 2];
    });
    // Sıcaklık ölçümü Miat modülünde girildiyse rutini otomatik tamamla
    if (k.rutin.sicaklik && !k.rutin.sicaklik.bitti && window.MiatEkrani) {
      const saat = window.MiatEkrani.olcumTamam(secTarih, secVardiya);
      if (saat) { k.rutin.sicaklik.bitti = true; k.rutin.sicaklik.saat = saat; k.rutin.sicaklik.otomatik = true; kaydet(); }
    }

    return [k, kisi];
  }

  /* ---------- Çizim ---------- */
  function ciz() {
    if (!veri) yukle();
    if (!secTarih) [secTarih, secVardiya] = simdikiVardiya();
    const [k, kisi] = hazirla();
    const ikiKisi = kisi.length === 2;
    const [suTarih, suVardiya] = simdikiVardiya();
    const simdiMi = secTarih === suTarih && secVardiya === suVardiya;

    const dolu = veri.odalar.filter(o => o.dolu);
    const yuk = (id) => dolu.filter(o => k.oda[o.no] === id);
    const atanmamis = dolu.filter(o => !kisi.includes(k.oda[o.no]));
    const acikRutin = rutinlerBuVardiya().filter(r => !k.rutin[r.id].bitti).length;
    const acikEk = k.ek.filter(e => !e.bitti).length;

    const vardiyaAd = secVardiya === 'G' ? 'Gündüz · 08.00–20.00' : 'Gece · 20.00–08.00';

    const kisiSecici = (n) => `<select class="secim" data-nobetci="${n}" aria-label="${n + 1}. nöbetçi">
      <option value="">Seçin</option>${personel().map(p => `<option value="${p.id}"${kisi[n] === p.id ? ' selected' : ''}>${esc(p.ad)}</option>`).join('')}</select>`;

    const kolon = (id, n) => {
      const odalar = yuk(id), puan = odalar.reduce((s, o) => s + o.yogunluk, 0);
      const benim = rutinlerBuVardiya().filter(r => k.rutin[r.id].kisi === id);
      const ekler = k.ek.filter(e => e.kisi === id);
      return `<div class="kart gr-kolon">
        <div class="kart__bas"><h2 class="kart__baslik"><span class="kullanici__avatar" aria-hidden="true">${kisaAd(id).slice(0, 1)}</span>${esc(kisaAd(id))}</h2>
          <span class="rozet rozet-notr">${odalar.length} oda · yük ${puan}</span></div>
        <div class="kart__govde">
          <div class="gr-odalar">${odalar.length ? odalar.map(o => `
            <button class="gr-oda" type="button" data-tasi="${o.no}" data-yogunluk="${o.yogunluk}" aria-label="Oda ${o.no}, ${YOGUNLUK[o.yogunluk]}. Diğer hemşireye taşı">
              <span class="gr-oda__no">${o.no}</span><span class="gr-oda__y">${YOGUNLUK[o.yogunluk]}</span>${isaretler(o) ? `<span class="gr-oda__isaret">${isaretler(o)}</span>` : ''}</button>`).join('') : '<p class="metin-sm metin-soluk">Oda yok</p>'}</div>
          ${benim.length || ekler.length ? `<ul class="gr-mini">${benim.map(r => `<li>${k.rutin[r.id].bitti ? i('onay', 'ikon-sm') : i('saat', 'ikon-sm')}${esc(r.ad)}</li>`).join('')}${ekler.map(e => `<li>${e.bitti ? i('onay', 'ikon-sm') : i('gorev', 'ikon-sm')}${esc(e.metin)}${e.oda ? ` · ${e.oda}` : ''}</li>`).join('')}</ul>` : ''}
        </div></div>`;
    };

    const rutinSatir = (r) => {
      const x = k.rutin[r.id];
      return `<li class="gr-satir${x.bitti ? ' bitti' : ''}">
        <label class="onay"><input type="checkbox" data-rutin-bitti="${r.id}"${x.bitti ? ' checked' : ''}> <span>${esc(r.ad)}</span></label>
        <span class="gr-satir__sag">${x.bitti ? `<span class="rozet rozet-basari">${i('onay')}${x.saat}${x.otomatik ? ' · ölçüm girildi' : ''}</span>` : '<span class="rozet rozet-uyari">' + i('saat') + 'Bekliyor</span>'}
          <select class="secim gr-kucuk" data-rutin-kisi="${r.id}" aria-label="${esc(r.ad)} — sorumlu">${kisi.map(id => `<option value="${id}"${x.kisi === id ? ' selected' : ''}>${esc(kisaAd(id))}</option>`).join('')}</select></span>
      </li>`;
    };

    const ekSatir = (e) => {
      const tel = telefon(e.kisi);
      const sms = e.saat ? (tel
        ? `<a class="btn btn-ikincil btn-sm" href="${smsLink(tel, smsMetni(e))}" data-sms="${e.id}">${i('gonder', 'ikon-sm')}SMS</a>`
        : `<a class="btn btn-hayalet btn-sm" href="#vardiya" title="Personel listesinde numara yok">${i('uyari', 'ikon-sm')}Numara ekle</a>`) : '';
      return `<li class="gr-satir${e.bitti ? ' bitti' : ''}">
        <label class="onay"><input type="checkbox" data-ek-bitti="${e.id}"${e.bitti ? ' checked' : ''}> <span>${e.oncelik === 'yuksek' ? '<span class="rozet rozet-kritik">' + i('kritik') + 'Acil</span> ' : ''}${e.saat ? `<span class="rozet rozet-altin">${i('saat')}${e.saat.replace(':', '.')}</span> ` : ''}${esc(e.metin)}${e.oda ? ` <span class="metin-soluk">· Oda ${e.oda}</span>` : ''}${e.saat && !e.bitti ? `<span class="metin-xs metin-soluk" style="display:block">SMS hatırlatma ${dkCikar(e.saat, e.once || 30)}${e.smsHazir ? ' · mesaj açıldı' : ''}</span>` : ''}</span></label>
        <span class="gr-satir__sag">${e.bitti ? `<span class="rozet rozet-basari">${i('onay')}${e.bittiSaat || ''}</span>` : sms}
          <select class="secim gr-kucuk" data-ek-kisi="${e.id}" aria-label="Sorumlu">${kisi.map(id => `<option value="${id}"${e.kisi === id ? ' selected' : ''}>${esc(kisaAd(id))}</option>`).join('')}</select>
          <button class="btn btn-hayalet btn-ikon btn-sm" type="button" data-ek-sil="${e.id}" aria-label="Görevi sil">${i('kapat', 'ikon-sm')}</button></span>
      </li>`;
    };

    const smsIpucu = smsSon ? (() => { const e = k.ek.find(x => x.id === smsSon); return e ? `<div class="uyari uyari-bilgi" role="status" style="margin-top:12px">${i('bilgi')}<div>
        <div class="uyari__baslik">Mesajı ${dkCikar(e.saat, e.once || 30)}'e zamanlayın</div>
        <div class="uyari__metin">Mesajlar uygulamasında gönder tuşuna basılı tutun (Samsung: + → Mesajı zamanla) ve saati ${dkCikar(e.saat, e.once || 30)} seçin. SMS o saatte kendiliğinden gider.</div></div></div>` : ''; })() : '';

    return `
      <div class="sayfa-bas">
        <div>
          <div class="sayfa-bas__ust">Modül 2 · Oda ve görev paylaşımı</div>
          <h1>Görev Dağıtımı</h1>
          <p class="sayfa-bas__aciklama">${trTarih(secTarih)} · ${vardiyaAd}${simdiMi ? ' · <span class="metin-altin">şu anki vardiya</span>' : ''}</p>
        </div>
        <div class="vrd-eylemler">
          <button class="btn btn-ikincil" type="button" data-eylem="kopyala"${ikiKisi ? '' : ' disabled'}>${i('gonder')}${kopyaDurum || 'Dağıtımı kopyala'}</button>
        </div>
      </div>

      <div class="gr-secim">
        <div class="vrd-hafta-nav" role="group" aria-label="Vardiya seçimi">
          <button class="btn btn-ikincil btn-ikon" type="button" data-eylem="geri" aria-label="Önceki vardiya"><svg class="ikon" aria-hidden="true" style="transform:rotate(180deg)"><use href="#i-sag"/></svg></button>
          <div class="vrd-hafta-nav__orta">
            <div class="sekmeler" role="tablist" aria-label="Vardiya">
              <button class="sekme" role="tab" type="button" data-vardiya="G" aria-selected="${secVardiya === 'G'}">Gündüz</button>
              <button class="sekme" role="tab" type="button" data-vardiya="N" aria-selected="${secVardiya === 'N'}">Gece</button>
            </div>
            ${simdiMi ? '' : '<button class="btn btn-hayalet btn-sm" type="button" data-eylem="simdi">Şu anki vardiya</button>'}
          </div>
          <button class="btn btn-ikincil btn-ikon" type="button" data-eylem="ileri" aria-label="Sonraki vardiya">${i('sag')}</button>
        </div>
      </div>

      ${!ikiKisi ? `<div class="uyari uyari-uyari" role="status">${i('uyari')}<div>
          <div class="uyari__baslik">Vardiya planında bu vardiya için ${kisi.length} kişi var</div>
          <div class="uyari__metin">Odaları bölmek için nöbetçi 2 hemşireyi seçin.</div>
          <div class="form-izgara" style="margin-top:10px">${kisiSecici(0)}${kisiSecici(1)}</div></div></div>` : ''}
      ${ikiKisi && atanmamis.length ? `<div class="uyari uyari-kritik" role="alert">${i('kritik')}<div><div class="uyari__baslik">${atanmamis.length} dolu oda kimseye atanmamış</div>
          <div class="uyari__metin">${atanmamis.map(o => o.no).join(', ')}. “Yeniden böl” ile dağıtın.</div></div></div>` : ''}
      ${ikiKisi && !atanmamis.length && !acikRutin && !acikEk ? `<div class="uyari uyari-basari" role="status">${i('onay')}<div><div class="uyari__baslik">Bu vardiyanın bütün işleri tamam</div><div class="uyari__metin">Odalar paylaştırıldı, rutinler ve ek görevler bitti.</div></div></div>` : ''}

      ${ikiKisi ? `
      <section class="izgara gr-iki" aria-label="Oda paylaşımı">${kolon(kisi[0], 0)}${kolon(kisi[1], 1)}</section>
      <div class="gr-arac">
        <span class="metin-xs metin-soluk">Odaya dokunursanız diğer hemşireye geçer.</span>
        <span style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-ikincil btn-sm" type="button" data-eylem="degistir">${i('ekip', 'ikon-sm')}Tarafları değiştir</button>
          <button class="btn btn-ikincil btn-sm" type="button" data-eylem="bol">${i('asistan', 'ikon-sm')}Yeniden böl</button>
          ${k.kisiler ? '<button class="btn btn-hayalet btn-sm" type="button" data-eylem="plana-don">Vardiya planına dön</button>' : '<button class="btn btn-hayalet btn-sm" type="button" data-eylem="kisi-degis">Nöbetçiyi değiştir</button>'}
        </span>
      </div>` : ''}

      <section class="izgara gr-iki">
        <div class="kart">
          <div class="kart__bas"><h2 class="kart__baslik">${i('saat')}Rutin işler</h2><span class="rozet ${acikRutin ? 'rozet-uyari' : 'rozet-basari'}">${acikRutin ? acikRutin + ' bekliyor' : 'Tamam'}</span></div>
          <div class="kart__govde"><ul class="gr-liste">${rutinlerBuVardiya().map(rutinSatir).join('')}</ul></div>
        </div>
        <div class="kart">
          <div class="kart__bas"><h2 class="kart__baslik">${i('gorev')}Ek görevler</h2><span class="rozet rozet-notr">${acikEk} açık</span></div>
          <div class="kart__govde">
            ${k.ek.length ? `<ul class="gr-liste">${k.ek.slice().sort((a, b) => (a.saat || '99').localeCompare(b.saat || '99')).map(ekSatir).join('')}</ul>` : '<p class="metin-sm metin-soluk">Bu vardiya için ek görev yok.</p>'}
            ${ikiKisi ? `<form class="gr-ek-form" data-ek-form>
              <div class="alan" style="grid-column:1/-1"><label class="alan__etiket" for="ek-metin">Yeni görev</label>
                <input id="ek-metin" class="girdi" name="metin" required maxlength="120" placeholder="Örn. Pansuman, taburcu eğitimi"></div>
              <div class="alan"><label class="alan__etiket" for="ek-oda">Oda</label>
                <select id="ek-oda" class="secim" name="oda"><option value="">Yok</option>${veri.odalar.map(o => `<option>${o.no}</option>`).join('')}</select></div>
              <div class="alan"><label class="alan__etiket" for="ek-oncelik">Öncelik</label>
                <select id="ek-oncelik" class="secim" name="oncelik"><option value="normal">Normal</option><option value="yuksek">Acil</option></select></div>
              <div class="alan"><label class="alan__etiket" for="ek-saat">Randevu saati</label>
                <input id="ek-saat" class="girdi" type="time" name="saat"><span class="alan__ipucu">İsteğe bağlı · SMS için</span></div>
              <div class="alan"><label class="alan__etiket" for="ek-once">SMS ne zaman?</label>
                <select id="ek-once" class="secim" name="once"><option value="15">15 dk önce</option><option value="30" selected>30 dk önce</option><option value="45">45 dk önce</option><option value="60">1 saat önce</option><option value="0">Randevu saatinde</option></select></div>
              <button class="btn btn-birincil" type="submit" style="grid-column:1/-1">${i('arti')}Ekle</button>
              <p class="alan__ipucu" style="grid-column:1/-1">Oda seçilirse görev o odanın hemşiresine atanır. Randevu saati girilirse görevin yanında SMS butonu çıkar.</p>
            </form>` : ''}
            ${smsIpucu}
          </div>
        </div>
      </section>

      <a class="kart gr-odalar-link" href="#odalar">
        <span class="kart__baslik">${i('yatak')}Oda durumu, yoğunluk, izolasyon ve riskler</span>
        <span class="rozet rozet-notr">${dolu.length}/${veri.odalar.length} dolu ${i('sag', 'ikon-sm')}</span>
      </a>
      <p class="metin-xs metin-soluk">Veriler bu cihazın tarayıcısında saklanır.</p>`;
  }

  /* Paylaşım metni (WhatsApp vb.) */
  function metin() {
    const k = kayit(), kisi = nobetciler(k);
    const satir = [`14. Kat · ${trTarih(secTarih)} · ${secVardiya === 'G' ? 'Gündüz 08.00–20.00' : 'Gece 20.00–08.00'}`, ''];
    kisi.forEach(id => {
      const odalar = veri.odalar.filter(o => o.dolu && k.oda[o.no] === id).map(o => o.no);
      satir.push(`${kisaAd(id)}: ${odalar.join(', ') || '—'}`);
      const isler = [...rutinlerBuVardiya().filter(r => k.rutin[r.id].kisi === id).map(r => r.ad), ...k.ek.filter(e => e.kisi === id).map(e => (e.saat ? e.saat.replace(':', '.') + ' ' : '') + e.metin + (e.oda ? ` (${e.oda})` : ''))];
      if (isler.length) satir.push(`  • ${isler.join('\n  • ')}`);
    });
    return satir.join('\n');
  }

  /* ---------- Etkileşim ---------- */
  function yenile(odak) {
    const el = document.getElementById('icerik');
    el.innerHTML = ciz(); bagla(el);
    if (odak) { const o = el.querySelector(odak); if (o) o.focus(); }
  }

  function bagla(el) {
    const k = kayit();
    const on = (sec, olay, fn) => el.querySelectorAll(sec).forEach(x => x.addEventListener(olay, () => fn(x)));

    on('[data-vardiya]', 'click', b => { secVardiya = b.dataset.vardiya; kopyaDurum = ''; yenile(`[data-vardiya="${secVardiya}"]`); });
    on('[data-tasi]', 'click', b => {
      const kisi = nobetciler(k), no = b.dataset.tasi;
      k.oda[no] = k.oda[no] === kisi[0] ? kisi[1] : kisi[0]; kaydet(); yenile(`[data-tasi="${no}"]`);
    });
    on('[data-nobetci]', 'change', s => {
      const sec = [...el.querySelectorAll('[data-nobetci]')].map(x => x.value);
      if (sec[0] && sec[1] && sec[0] !== sec[1]) { k.kisiler = sec; k.oda = {}; k.rutin = {}; kaydet(); yenile(); }
    });
    on('[data-rutin-bitti]', 'change', c => { const r = k.rutin[c.dataset.rutinBitti]; r.bitti = c.checked; r.saat = c.checked ? saatSimdi() : ''; kaydet(); yenile(`[data-rutin-bitti="${c.dataset.rutinBitti}"]`); });
    on('[data-rutin-kisi]', 'change', s => { k.rutin[s.dataset.rutinKisi].kisi = s.value; kaydet(); yenile(`[data-rutin-kisi="${s.dataset.rutinKisi}"]`); });
    on('[data-ek-bitti]', 'change', c => { const e = k.ek.find(x => x.id === c.dataset.ekBitti); e.bitti = c.checked; e.bittiSaat = c.checked ? saatSimdi() : ''; kaydet(); yenile(`[data-ek-bitti="${e.id}"]`); });
    on('[data-ek-kisi]', 'change', s => { k.ek.find(x => x.id === s.dataset.ekKisi).kisi = s.value; kaydet(); yenile(); });
    on('[data-sms]', 'click', a => { const e = k.ek.find(x => x.id === a.dataset.sms); if (e) { e.smsHazir = true; kaydet(); } smsSon = a.dataset.sms; setTimeout(() => yenile(), 300); });
    on('[data-ek-sil]', 'click', b => { k.ek = k.ek.filter(x => x.id !== b.dataset.ekSil); kaydet(); yenile('#ek-metin'); });
    const form = el.querySelector('[data-ek-form]');
    if (form) form.addEventListener('submit', ev => {
      ev.preventDefault();
      const f = new FormData(form), metin_ = String(f.get('metin') || '').trim(); if (!metin_) return;
      const kisi = nobetciler(k), oda = f.get('oda');
      k.ek.push({ id: 'e' + Date.now(), metin: metin_, oda, oncelik: f.get('oncelik'), kisi: (oda && k.oda[oda]) || kisi[0], bitti: false, saat: f.get('saat') || '', once: +f.get('once') });
      kaydet(); yenile('#ek-metin');
    });

    on('[data-eylem]', 'click', b => {
      const e = b.dataset.eylem;
      if (e === 'geri' || e === 'ileri') {
        const ileri = e === 'ileri';
        if (secVardiya === 'G') { secVardiya = 'N'; if (!ileri) secTarih = gunEkle(secTarih, -1); }
        else { secVardiya = 'G'; if (ileri) secTarih = gunEkle(secTarih, 1); }
        kopyaDurum = ''; yenile(`[data-eylem="${e}"]`);
      }
      if (e === 'simdi') { [secTarih, secVardiya] = simdikiVardiya(); kopyaDurum = ''; yenile(); }
      if (e === 'bol') { k.oda = otomatikBol(nobetciler(k)); kaydet(); yenile('[data-eylem="bol"]'); }
      if (e === 'degistir') { const kisi = nobetciler(k); Object.keys(k.oda).forEach(no => { k.oda[no] = k.oda[no] === kisi[0] ? kisi[1] : kisi[0]; }); kaydet(); yenile('[data-eylem="degistir"]'); }
      if (e === 'kisi-degis') { k.kisiler = []; kaydet(); yenile(); }
      if (e === 'plana-don') { k.kisiler = null; k.oda = {}; k.rutin = {}; kaydet(); yenile(); }
      if (e === 'kopyala') {
        const t = metin();
        const bitti = (ok) => { kopyaDurum = ok ? 'Kopyalandı' : 'Kopyalanamadı'; yenile('[data-eylem="kopyala"]'); };
        try { navigator.clipboard.writeText(t).then(() => bitti(true), () => bitti(false)); } catch (x) { bitti(false); }
      }
    });
  }
  let sessionAyarAcik = false;

  /* Panel için özet */
  function ozet() {
    if (!veri) yukle();
    const [t, v] = simdikiVardiya(); const k = veri.kayitlar[`${t}|${v}`];
    const rut = veri.rutinler.filter(r => r.vardiya === 'her' || r.vardiya === v);
    if (!k) return { acik: rut.length, acil: 0 };
    return {
      acik: rut.filter(r => !(k.rutin[r.id] && k.rutin[r.id].bitti)).length + k.ek.filter(e => !e.bitti).length,
      acil: k.ek.filter(e => !e.bitti && e.oncelik === 'yuksek').length
    };
  }

  /* Asistan için: şu anki vardiyanın özeti (kaydı da hazırlar) */
  function vardiyaOzeti() {
    if (!veri) yukle();
    const onceT = secTarih, onceV = secVardiya;
    [secTarih, secVardiya] = simdikiVardiya();
    const [k, kisi] = hazirla();
    const sonuc = {
      tarih: secTarih, vardiya: secVardiya, metin: kisi.length === 2 ? metin() : '',
      kisiler: kisi.map(id => ({ ad: kisaAd(id), odalar: veri.odalar.filter(o => o.dolu && k.oda[o.no] === id).map(o => o.no) })),
      acikIsler: [...rutinlerBuVardiya().filter(r => !k.rutin[r.id].bitti).map(r => ({ metin: r.ad, kisi: kisaAd(k.rutin[r.id].kisi), acil: false })),
                  ...k.ek.filter(e => !e.bitti).map(e => ({ metin: e.metin + (e.oda ? ` (Oda ${e.oda})` : ''), kisi: kisaAd(e.kisi), acil: e.oncelik === 'yuksek' }))],
      bitenIsler: [...rutinlerBuVardiya().filter(r => k.rutin[r.id].bitti).map(r => r.ad), ...k.ek.filter(e => e.bitti).map(e => e.metin)]
    };
    secTarih = onceT; secVardiya = onceV;
    return sonuc;
  }

  /* ---------- Odalar ekranı ve hatırlatıcı için ---------- */
  const bugunIso = () => iso(new Date());
  function simdikiKayit(fn) {
    if (!veri) yukle();
    const onceT = secTarih, onceV = secVardiya;
    [secTarih, secVardiya] = simdikiVardiya();
    try { const [k, kisi] = hazirla(); return fn(k, kisi); } finally { secTarih = onceT; secVardiya = onceV; }
  }
  function odaListesi() { if (!veri) yukle(); return veri.odalar; }
  function sorumlular() { return simdikiKayit((k, kisi) => { const r = {}; veri.odalar.forEach(o => { if (o.dolu && kisi.includes(k.oda[o.no])) r[o.no] = kisaAd(k.oda[o.no]); }); return r; }); }
  function odaGuncelle(no, alanlar) { const o = veri.odalar.find(x => x.no === no); if (o) { Object.assign(o, alanlar); kaydet(); } }
  const TEMIZ = { izolasyon: '', dusme: false, basi: false, npo: false, alerji: false, taburcuPlan: '', not: '' };
  function hareket(no, tur) { (veri.odaHareket = veri.odaHareket || []).push({ no, tur, t: bugunIso(), saat: saatSimdi() }); if (veri.odaHareket.length > 1000) veri.odaHareket.shift(); }
  function odaYatis(no) {
    const o = veri.odalar.find(x => x.no === no); if (!o) return;
    Object.assign(o, TEMIZ, { dolu: true, yatis: bugunIso(), yogunluk: o.yogunluk || 2 }); hareket(no, 'yatis');
    simdikiKayit((k, kisi) => { if (kisi.length === 2) { const say = (id) => veri.odalar.filter(x => x.dolu && x.no !== no && k.oda[x.no] === id).length; k.oda[no] = say(kisi[0]) <= say(kisi[1]) ? kisi[0] : kisi[1]; } });
    kaydet();
  }
  function odaTaburcu(no) {
    const o = veri.odalar.find(x => x.no === no); if (!o) return;
    Object.assign(o, TEMIZ, { dolu: false, yatis: '' }); hareket(no, 'taburcu');
    simdikiKayit((k) => { delete k.oda[no]; }); kaydet();
  }
  function odaNoDegistir(eski, yeni) {
    if (!yeni || veri.odalar.some(o => o.no === yeni)) return false;
    const o = veri.odalar.find(x => x.no === eski); o.no = yeni;
    Object.values(veri.kayitlar).forEach(k => { if (k.oda[eski]) { k.oda[yeni] = k.oda[eski]; delete k.oda[eski]; } });
    kaydet(); return true;
  }
  function bugunHareket() { if (!veri) yukle(); const b = bugunIso(), h = (veri.odaHareket || []).filter(x => x.t === b); return { yatis: h.filter(x => x.tur === 'yatis').length, taburcu: h.filter(x => x.tur === 'taburcu').length }; }
  function odaOzeti() {
    if (!veri) yukle();
    const dolu = veri.odalar.filter(o => o.dolu), b = bugunIso();
    return {
      dolu: dolu.length, toplam: veri.odalar.length,
      izolasyon: dolu.filter(o => o.izolasyon).map(o => `${o.no} (${IZOL[o.izolasyon]})`),
      dusme: dolu.filter(o => o.dusme).map(o => o.no), basi: dolu.filter(o => o.basi).map(o => o.no),
      npo: dolu.filter(o => o.npo).map(o => o.no), alerji: dolu.filter(o => o.alerji).map(o => o.no),
      taburcuBugun: dolu.filter(o => o.taburcuPlan && o.taburcuPlan.slice(0, 10) === b).map(o => `${o.no} ${o.taburcuPlan.slice(11, 16).replace(':', '.')}`),
      ...bugunHareket()
    };
  }
  /* Saatli ek görevler (bugün ve dünün gecesi) → hatırlatıcı */
  function saatliGorevler() {
    if (!veri) yukle();
    const b = bugunIso(), dun = gunEkle(b, -1), sonuc = [];
    [[dun, 'N'], [b, 'G'], [b, 'N']].forEach(([t, v]) => {
      const k = veri.kayitlar[`${t}|${v}`]; if (!k) return;
      k.ek.forEach(e => {
        if (!e.saat || e.bitti || e.saat.includes('.')) return;
        const gun = v === 'N' && e.saat < '08:00' ? gunEkle(t, 1) : t;
        const randevu = new Date(`${gun}T${e.saat}:00`);
        sonuc.push({ id: `g:${t}|${v}:${e.id}`, zaman: new Date(randevu.getTime() - (e.once || 0) * 60000), randevu,
          baslik: `${e.oda ? 'Oda ' + e.oda + ' · ' : ''}${e.metin}`, metin: `Randevu ${e.saat.replace(':', '.')} · ${kisaAd(e.kisi)}`, link: '#gorevler' });
      });
    });
    return sonuc;
  }

  window.GorevEkrani = { ciz, bagla, ozet, vardiyaOzeti, odaListesi, sorumlular, odaGuncelle, odaYatis, odaTaburcu, odaNoDegistir, odaOzeti, saatliGorevler, YOGUNLUK, IZOL };
})();
