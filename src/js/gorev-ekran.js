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

  let veri, secTarih = null, secVardiya = null, kopyaDurum = '';
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
    return veri.kayitlar[k];
  }
  const personel = () => V.personel();
  const kisaAd = (id) => (personel().find(p => p.id === id) || {}).kisa || '—';

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
              <span class="gr-oda__no">${o.no}</span><span class="gr-oda__y">${YOGUNLUK[o.yogunluk]}</span></button>`).join('') : '<p class="metin-sm metin-soluk">Oda yok</p>'}</div>
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

    const ekSatir = (e) => `<li class="gr-satir${e.bitti ? ' bitti' : ''}">
        <label class="onay"><input type="checkbox" data-ek-bitti="${e.id}"${e.bitti ? ' checked' : ''}> <span>${e.oncelik === 'yuksek' ? '<span class="rozet rozet-kritik">' + i('kritik') + 'Acil</span> ' : ''}${esc(e.metin)}${e.oda ? ` <span class="metin-soluk">· Oda ${e.oda}</span>` : ''}</span></label>
        <span class="gr-satir__sag">${e.bitti ? `<span class="rozet rozet-basari">${i('onay')}${e.saat}</span>` : ''}
          <select class="secim gr-kucuk" data-ek-kisi="${e.id}" aria-label="Sorumlu">${kisi.map(id => `<option value="${id}"${e.kisi === id ? ' selected' : ''}>${esc(kisaAd(id))}</option>`).join('')}</select>
          <button class="btn btn-hayalet btn-ikon btn-sm" type="button" data-ek-sil="${e.id}" aria-label="Görevi sil">${i('kapat', 'ikon-sm')}</button></span>
      </li>`;

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
            ${k.ek.length ? `<ul class="gr-liste">${k.ek.map(ekSatir).join('')}</ul>` : '<p class="metin-sm metin-soluk">Bu vardiya için ek görev yok.</p>'}
            ${ikiKisi ? `<form class="gr-ek-form" data-ek-form>
              <div class="alan" style="grid-column:1/-1"><label class="alan__etiket" for="ek-metin">Yeni görev</label>
                <input id="ek-metin" class="girdi" name="metin" required maxlength="120" placeholder="Örn. Pansuman, taburcu eğitimi"></div>
              <div class="alan"><label class="alan__etiket" for="ek-oda">Oda</label>
                <select id="ek-oda" class="secim" name="oda"><option value="">Yok</option>${veri.odalar.map(o => `<option>${o.no}</option>`).join('')}</select></div>
              <div class="alan"><label class="alan__etiket" for="ek-oncelik">Öncelik</label>
                <select id="ek-oncelik" class="secim" name="oncelik"><option value="normal">Normal</option><option value="yuksek">Acil</option></select></div>
              <button class="btn btn-birincil" type="submit" style="grid-column:1/-1">${i('arti')}Ekle</button>
              <p class="alan__ipucu" style="grid-column:1/-1">Oda seçilirse görev o odanın hemşiresine atanır.</p>
            </form>` : ''}
          </div>
        </div>
      </section>

      <details class="kart gr-ayar">
        <summary class="kart__bas"><span class="kart__baslik">${i('ayar')}Oda durumu ve yoğunluk</span><span class="rozet rozet-notr">${dolu.length}/${veri.odalar.length} dolu</span></summary>
        <div class="tablo-sarici"><table class="tablo">
          <thead><tr><th>Oda</th><th>Durum</th><th>Yoğunluk</th></tr></thead>
          <tbody>${veri.odalar.map((o, n) => `<tr>
            <td><label class="sr-only" for="oda-no-${n}">Oda numarası</label><input id="oda-no-${n}" class="girdi gr-oda-no" data-oda-no="${n}" value="${esc(o.no)}" inputmode="numeric" maxlength="6"></td>
            <td><label class="sr-only" for="oda-d-${n}">Oda ${o.no} durumu</label><select id="oda-d-${n}" class="secim" data-oda-dolu="${n}"><option value="1"${o.dolu ? ' selected' : ''}>Dolu</option><option value="0"${o.dolu ? '' : ' selected'}>Boş</option></select></td>
            <td><label class="sr-only" for="oda-y-${n}">Oda ${o.no} yoğunluğu</label><select id="oda-y-${n}" class="secim" data-oda-y="${n}"${o.dolu ? '' : ' disabled'}>${[1, 2, 3].map(y => `<option value="${y}"${o.yogunluk === y ? ' selected' : ''}>${YOGUNLUK[y]}</option>`).join('')}</select></td>
          </tr>`).join('')}</tbody></table></div>
        <div class="kart__alt metin-xs metin-ikincil">Odalar 5–4 bölünür. Yoğunluk (Hafif 1, Orta 2, Ağır 3) yalnızca 5 odanın hangi tarafa düşeceğini belirler. Değişiklikten sonra “Yeniden böl”e basın.</div>
      </details>
      <p class="metin-xs metin-soluk">Odalar: 1401–1405 ve 1407–1410. Numara veya durum değişirse yukarıdan düzeltebilirsiniz. Veriler bu cihazın tarayıcısında saklanır.</p>`;
  }

  /* Paylaşım metni (WhatsApp vb.) */
  function metin() {
    const k = kayit(), kisi = nobetciler(k);
    const satir = [`14. Kat · ${trTarih(secTarih)} · ${secVardiya === 'G' ? 'Gündüz 08.00–20.00' : 'Gece 20.00–08.00'}`, ''];
    kisi.forEach(id => {
      const odalar = veri.odalar.filter(o => o.dolu && k.oda[o.no] === id).map(o => o.no);
      satir.push(`${kisaAd(id)}: ${odalar.join(', ') || '—'}`);
      const isler = [...rutinlerBuVardiya().filter(r => k.rutin[r.id].kisi === id).map(r => r.ad), ...k.ek.filter(e => e.kisi === id).map(e => e.metin + (e.oda ? ` (${e.oda})` : ''))];
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
    on('[data-ek-bitti]', 'change', c => { const e = k.ek.find(x => x.id === c.dataset.ekBitti); e.bitti = c.checked; e.saat = c.checked ? saatSimdi() : ''; kaydet(); yenile(`[data-ek-bitti="${e.id}"]`); });
    on('[data-ek-kisi]', 'change', s => { k.ek.find(x => x.id === s.dataset.ekKisi).kisi = s.value; kaydet(); yenile(); });
    on('[data-ek-sil]', 'click', b => { k.ek = k.ek.filter(x => x.id !== b.dataset.ekSil); kaydet(); yenile('#ek-metin'); });
    const form = el.querySelector('[data-ek-form]');
    if (form) form.addEventListener('submit', ev => {
      ev.preventDefault();
      const f = new FormData(form), metin_ = String(f.get('metin') || '').trim(); if (!metin_) return;
      const kisi = nobetciler(k), oda = f.get('oda');
      k.ek.push({ id: 'e' + Date.now(), metin: metin_, oda, oncelik: f.get('oncelik'), kisi: (oda && k.oda[oda]) || kisi[0], bitti: false, saat: '' });
      kaydet(); yenile('#ek-metin');
    });
    on('[data-oda-dolu]', 'change', s => { veri.odalar[+s.dataset.odaDolu].dolu = s.value === '1'; kaydet(); yenile(`#${s.id}`); });
    on('[data-oda-y]', 'change', s => { veri.odalar[+s.dataset.odaY].yogunluk = +s.value; kaydet(); yenile(`#${s.id}`); });
    on('[data-oda-no]', 'change', s => {
      const n = +s.dataset.odaNo, eski = veri.odalar[n].no, yeni = s.value.trim();
      if (!yeni || veri.odalar.some((o, j) => j !== n && o.no === yeni)) { s.value = eski; return; }
      veri.odalar[n].no = yeni; if (k.oda[eski]) { k.oda[yeni] = k.oda[eski]; delete k.oda[eski]; }
      kaydet(); yenile(`#${s.id}`);
    });
    el.querySelectorAll('.gr-ayar').forEach(d => { if (sessionAyarAcik) d.open = true; d.addEventListener('toggle', () => { sessionAyarAcik = d.open; }); });

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

  window.GorevEkrani = { ciz, bagla, ozet, vardiyaOzeti };
})();
