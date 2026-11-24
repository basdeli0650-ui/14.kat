/* ==========================================================
   14. KAT — Vardiya Planlayıcı ekranı
   Veri bu cihazın tarayıcısında saklanır (localStorage).
   ========================================================== */
(function () {
  'use strict';
  const M = window.VardiyaMotoru;
  const ANAHTAR = '14kat.vardiya.v1';
  const GUNLER = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
  const GUN_KISA = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

  /* ---------- Başlangıç verisi: 23–29 Kasım 2026 kağıt çizelgesi ---------- */
  /* Başlangıç: boş. Personel ve çizelge uygulama içinden girilir, yalnızca bu cihazda saklanır
     (kodda gerçek isim tutulmaz). */
  const TOHUM = { surum: 1, personel: [], haftalar: {} };

  /* ---------- Saklama ---------- */
  let veri;
  function yukle() {
    try { const s = localStorage.getItem(ANAHTAR); veri = s ? JSON.parse(s) : null; } catch (e) { veri = null; }
    if (!veri || veri.surum !== 1) veri = JSON.parse(JSON.stringify(TOHUM));
  }
  function kaydet() { try { localStorage.setItem(ANAHTAR, JSON.stringify(veri)); } catch (e) { /* saklama yoksa bellekte devam */ } aynala(); }
  /* Bildirim için: personel + son 3 / gelecek 3 hafta, yalnızca bu cihazın önbelleğine */
  function aynala() {
    try {
      if (!('caches' in window) || !veri) return;
      const pzt = pazartesi(bugunIso()), haftalar = {};
      for (let n = -3; n <= 3; n++) { const k = gunEkle(pzt, n * 7); if (veri.haftalar[k]) haftalar[k] = veri.haftalar[k]; }
      const govde = JSON.stringify({ personel: veri.personel.map(p => ({ id: p.id, ad: p.ad })), haftalar });
      caches.open('14kat-veri').then(c => c.put('veri/vardiya.json', new Response(govde, { headers: { 'Content-Type': 'application/json' } }))).catch(() => {});
    } catch (e) { /* */ }
  }

  /* ---------- Tarih yardımcıları (YYYY-AA-GG, haftanın pazartesisi) ---------- */
  const gunEkle = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const bugunIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const pazartesi = (iso) => { const d = new Date(iso + 'T00:00:00Z'); return gunEkle(iso, -((d.getUTCDay() + 6) % 7)); };
  const trTarih = (iso) => iso.split('-').reverse().join('.');
  const kisaTarih = (iso) => { const [, a, g] = iso.split('-'); return `${+g}.${a}`; };
  const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const aralik = (pzt) => {
    const paz = gunEkle(pzt, 6); const [y1, a1, g1] = pzt.split('-').map(Number); const [y2, a2, g2] = paz.split('-').map(Number);
    return a1 === a2 ? `${g1}–${g2} ${AYLAR[a2 - 1]} ${y2}` : `${g1} ${AYLAR[a1 - 1]} – ${g2} ${AYLAR[a2 - 1]} ${y2}`;
  };

  let aktif = null;          // görüntülenen haftanın pazartesisi
  let temizleOnay = false;
  let personelAcik = false, silSor = null, telHata = '';

  const kisiler = () => veri.personel.map(p => p.id);
  const ad = (id) => (veri.personel.find(p => p.id === id) || {}).ad || id;
  const kisaAd = (id) => { const p = ad(id).split(' '); return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : p[0]; };

  function hafta(pzt) {
    const h = veri.haftalar[pzt] || {};
    const sonuc = {};
    kisiler().forEach(id => { sonuc[id] = (h[id] || Array(7).fill('')).slice(); });
    return sonuc;
  }
  function gecmis(pzt) { // önceki 2 hafta
    const g = {};
    const h2 = hafta(gunEkle(pzt, -14)), h1 = hafta(gunEkle(pzt, -7));
    kisiler().forEach(id => { g[id] = [...h2[id], ...h1[id]].map(k => k || 'T'); });
    return g;
  }
  function birikmisFazla(pzt) { // bu hafta dahil, kayıtlı bütün haftalar
    const t = {}; kisiler().forEach(id => { t[id] = 0; });
    Object.keys(veri.haftalar).filter(k => k <= pzt).forEach(k => {
      const h = hafta(k); kisiler().forEach(id => { t[id] += M.saatler(h[id]).fazla; });
    });
    return t;
  }

  const sa = (n) => n.toLocaleString('tr-TR', { maximumFractionDigits: 1 });
  const i = (a, s = '') => `<svg class="ikon ${s}" aria-hidden="true"><use href="#i-${a}"/></svg>`;

  /* ---------- Personel kartı ---------- */
  function personelKarti(zorunlu) {
    const acik = zorunlu || personelAcik;
    return `<details class="kart gr-ayar vrd-personel"${acik ? ' open' : ''}>
      <summary class="kart__bas"><span class="kart__baslik">${i('ekip')}Personel listesi</span><span class="rozet rozet-notr">${veri.personel.length} kişi</span></summary>
      <div class="kart__govde">
        ${veri.personel.length ? `<ul class="gr-liste">${veri.personel.map(p => `<li class="gr-satir">
          <label class="sr-only" for="ad-${p.id}">Ad soyad</label>
          <input id="ad-${p.id}" class="girdi" style="flex:2 1 160px" data-ad="${p.id}" value="${esc(p.ad)}" maxlength="40">
          <label class="sr-only" for="tel-${p.id}">${esc(p.ad)} cep telefonu</label>
          <input id="tel-${p.id}" class="girdi" style="flex:1 1 140px" type="tel" inputmode="tel" data-tel="${p.id}" value="${esc(telGoster(p.tel))}" placeholder="05xx xxx xx xx" autocomplete="off">
          <span class="gr-satir__sag">${silSor === p.id
            ? `<button class="btn btn-tehlike btn-sm" type="button" data-sil-evet="${p.id}">Listeden çıkar</button><button class="btn btn-hayalet btn-sm" type="button" data-sil-hayir>Vazgeç</button>`
            : `<button class="btn btn-hayalet btn-ikon btn-sm" type="button" data-sil="${p.id}" aria-label="${esc(p.ad)} listeden çıkar">${i('kapat', 'ikon-sm')}</button>`}</span></li>`).join('')}</ul>` : ''}
        <form class="vrd-ekle" data-personel-form>
          <div class="alan" style="flex:2 1 200px"><label class="alan__etiket" for="yeni-ad">Hemşire ekle</label><input id="yeni-ad" class="girdi" name="ad" required maxlength="40" placeholder="Ad Soyad" autocomplete="off"></div>
          <div class="alan" style="flex:1 1 150px"><label class="alan__etiket" for="yeni-tel">Cep telefonu</label><input id="yeni-tel" class="girdi" name="tel" type="tel" inputmode="tel" placeholder="05xx xxx xx xx" autocomplete="off"></div>
          <button class="btn btn-birincil" type="submit">${i('arti')}Ekle</button>
        </form>
        ${telHata ? `<p class="alan__hata" role="alert" style="margin-top:8px">${i('uyari', 'ikon-sm')}${telHata}</p>` : ''}
        <p class="alan__ipucu" style="margin-top:8px">Sorumlu hemşire listeye eklenmez. İsim ve numaralar yalnızca bu cihazda saklanır; numara SMS hatırlatmaları için kullanılır.</p>
      </div>
    </details>`;
  }
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* Telefon: 05xx…, 5xx…, 905xx…, +905xx… → +905xxxxxxxxx; geçersizse '' */
  function telDuzelt(t) {
    const r = String(t || '').replace(/\D/g, '');
    const m = r.match(/^(?:90|0)?(5\d{9})$/);
    return m ? '+90' + m[1] : '';
  }
  const telGoster = (t) => t ? `0${t.slice(3, 6)} ${t.slice(6, 9)} ${t.slice(9, 11)} ${t.slice(11)}` : '';

  /* ---------- Çizim ---------- */
  function ciz() {
    if (!veri) yukle();
    if (!aktif) aktif = pazartesi(bugunIso());
    if (!veri.personel.length) return `
      <div class="sayfa-bas"><div><div class="sayfa-bas__ust">Modül 1 · Haftalık çalışma listesi</div><h1>Vardiya Planlayıcı</h1>
        <p class="sayfa-bas__aciklama">Başlamak için ekibinizi ekleyin.</p></div></div>
      <div class="uyari uyari-bilgi" role="status">${i('bilgi')}<div><div class="uyari__baslik">Önce ekibinizi ekleyin</div>
        <div class="uyari__metin">Vardiyada çalışan hemşireleri tek tek ekleyin. Sonra bu haftanın çizelgesini girebilir veya “Haftayı planla” ile otomatik oluşturabilirsiniz.</div></div></div>
      ${personelKarti(true)}`;
    const K = kisiler(), h = hafta(aktif), gc = gecmis(aktif);
    const d = M.denetle(K, h, gc);
    const bosVar = K.some(id => h[id].some(k => !k));
    const tumBos = K.every(id => h[id].every(k => !k));
    const onceki = gunEkle(aktif, -7);
    const oncekiBos = K.every(id => hafta(onceki)[id].every(k => !k));
    const toplamFazla = birikmisFazla(aktif);
    const bugun = bugunIso();
    const gunTarih = (g) => gunEkle(aktif, g);

    /* Uyarılar */
    const uyarilar = [];
    d.eksik.filter(e => e.bos === 0 || !bosVar).forEach(e => {
      const ad_ = e.kod === 'G' ? 'gündüz (08.00–20.00)' : 'gece (20.00–08.00)';
      const aday = M.adaylar(K, h, gc, e.gun, e.kod);
      const gecmisGun = gunTarih(e.gun) < bugun;
      uyarilar.push(`
        <div class="uyari uyari-kritik" role="alert">${i('kritik')}
          <div>
            <div class="uyari__baslik">${GUNLER[e.gun]} ${kisaTarih(gunTarih(e.gun))} ${ad_}: ${e.var}/${e.gerek} kişi</div>
            <div class="uyari__metin">${gecmisGun ? 'Geçmiş gün — kayıt için gösteriliyor.' :
              aday.length ? 'Kural bozmadan yazılabilecek kişiler — ya da kalan günleri yeniden planlayın:' : 'Tek değişiklikle kapatılamıyor (art arda gün/gece kuralları). Kalan günleri yeniden planlayın; izinler korunur.'}</div>
            ${!gecmisGun ? `<div class="vrd-adaylar">${aday.map(id => `<button class="btn btn-ikincil btn-sm" type="button" data-ata="${id}|${e.gun}|${e.kod}">${i('arti', 'ikon-sm')}${kisaAd(id)}</button>`).join('')}
              <button class="btn btn-birincil btn-sm" type="button" data-yeniden="${e.gun}">${i('asistan', 'ikon-sm')}${GUN_KISA[e.gun]} gününden itibaren yeniden planla</button></div>` : ''}
          </div>
        </div>`);
    });
    d.ihlal.forEach(x => uyarilar.push(`
      <div class="uyari uyari-uyari" role="status">${i('uyari')}
        <div><div class="uyari__baslik">${ad(x.id)} · ${GUNLER[x.gun]} ${kisaTarih(gunTarih(x.gun))}</div><div class="uyari__metin">${x.mesaj}</div></div>
      </div>`));
    if (!uyarilar.length && !bosVar) uyarilar.push(`
      <div class="uyari uyari-basari" role="status">${i('onay')}
        <div><div class="uyari__baslik">Plan kurallara uygun</div><div class="uyari__metin">Her gün 2 gündüz + 2 gece dolu. Art arda gün, gece ve dinlenme kurallarında ihlal yok.</div></div>
      </div>`);
    if (bosVar) uyarilar.unshift(`
      <div class="uyari uyari-bilgi" role="status">${i('bilgi')}
        <div><div class="uyari__baslik">${tumBos ? 'Bu hafta henüz planlanmadı' : 'Boş hücreler var'}</div>
        <div class="uyari__metin">${tumBos && oncekiBos ? 'Önceki hafta da boş; plan sıfırdan kurulur.' : '“Haftayı planla” boş hücreleri önceki haftanın devamı olarak doldurur. Dolu hücreler ve izinler değişmez.'}</div></div>
      </div>`);

    /* Hücre seçimi */
    const secenekler = (sec) => [['', '—'], ['G', 'G · 08–20'], ['N', 'N · 20–08'], ['T', 'T · Tatil'], ['YI', 'Yİ · Yıllık izin'], ['R', 'R · Rapor']]
      .map(([v, t]) => `<option value="${v}"${v === sec ? ' selected' : ''}>${t}</option>`).join('');

    const ihlalHucre = new Set(d.ihlal.map(x => `${x.id}|${x.gun}`));
    const satirlar = K.map(id => {
      const s = M.saatler(h[id]);
      return `<tr>
        <th scope="row" class="vrd-ad"><span class="vrd-ad__tam">${esc(ad(id))}</span><span class="vrd-ad__kisa">${esc(kisaAd(id))}</span></th>
        ${h[id].map((k, g) => `<td class="vrd-hucre-td${gunTarih(g) === bugun ? ' vrd-bugun' : ''}">
          <label class="sr-only" for="h-${id}-${g}">${ad(id)}, ${GUNLER[g]}</label>
          <div class="vrd-hucre" data-kod="${k}"${ihlalHucre.has(`${id}|${g}`) ? ' data-ihlal="1"' : ''}>
            <span aria-hidden="true">${k ? M.KODLAR[k].etiket : '—'}</span>
            <select id="h-${id}-${g}" class="vrd-sec" data-id="${id}" data-gun="${g}"${ihlalHucre.has(`${id}|${g}`) ? ' aria-invalid="true"' : ''}>${secenekler(k)}</select>
          </div>
        </td>`).join('')}
        <td class="sayi rakam"${s.izin ? ` title="${sa(s.calisma)} vardiya + ${sa(s.izin)} izin/rapor"` : ''}>${sa(s.toplam)}${s.izin ? '<span class="vrd-izin-not">izin dahil</span>' : ''}</td>
        <td class="sayi rakam">${s.fazla ? `<span class="metin-altin">${sa(s.fazla)}</span>` : '0'}</td>
        <td class="sayi rakam">${sa(toplamFazla[id])}</td>
      </tr>`;
    }).join('');

    const sayimSatir = (kod, etiket) => `<tr class="vrd-sayim"><th scope="row">${etiket}</th>${GUNLER.map((_, g) => {
      const n = K.filter(id => h[id][g] === kod).length;
      const ok = n >= (kod === 'G' ? M.KURAL.gunduzKisi : M.KURAL.geceKisi);
      return `<td><span class="vrd-sayi ${ok ? 'tamam' : 'eksik'}">${ok ? i('onay', 'ikon-sm') : i('kritik', 'ikon-sm')}${n}/2<span class="sr-only">${ok ? ' tamam' : ' eksik'}</span></span></td>`;
    }).join('')}<td colspan="3"></td></tr>`;

    return `
      <div class="sayfa-bas">
        <div>
          <div class="sayfa-bas__ust">Modül 1 · Haftalık çalışma listesi</div>
          <h1>Vardiya Planlayıcı</h1>
          <p class="sayfa-bas__aciklama">${aralik(aktif)} · ${K.length} hemşire · 12 saatlik vardiya</p>
        </div>
        <div class="vrd-eylemler">
          <button class="btn btn-birincil" type="button" data-eylem="planla"${bosVar ? '' : ' disabled'}>${i('asistan')}Haftayı planla</button>
          <button class="btn btn-ikincil" type="button" data-eylem="yazdir">${i('gorev')}Yazdır</button>
        </div>
      </div>

      <div class="vrd-hafta-nav" role="group" aria-label="Hafta seçimi">
        <button class="btn btn-ikincil btn-ikon" type="button" data-eylem="onceki" aria-label="Önceki hafta"><svg class="ikon" aria-hidden="true" style="transform:rotate(180deg)"><use href="#i-sag"/></svg></button>
        <div class="vrd-hafta-nav__orta"><strong>${aralik(aktif)}</strong>${pazartesi(bugun) === aktif ? '<span class="rozet rozet-altin">Bu hafta</span>' : `<button class="btn btn-hayalet btn-sm" type="button" data-eylem="buhafta">Bu haftaya dön</button>`}</div>
        <button class="btn btn-ikincil btn-ikon" type="button" data-eylem="sonraki" aria-label="Sonraki hafta">${i('sag')}</button>
      </div>

      <div class="vrd-uyarilar">${uyarilar.join('')}</div>

      <div class="kart">
        <div class="tablo-sarici">
          <table class="tablo vrd-tablo">
            <thead><tr>
              <th scope="col" class="vrd-ad">Adı soyadı</th>
              ${GUNLER.map((g, n) => `<th scope="col"${gunTarih(n) === bugun ? ' class="vrd-bugun"' : ''}><span class="vrd-gun-ad">${GUN_KISA[n]}</span><span class="vrd-gun-tarih">${kisaTarih(gunTarih(n))}</span></th>`).join('')}
              <th scope="col" class="sayi" title="Toplam çalışma saati">Saat</th>
              <th scope="col" class="sayi" title="Fazla mesai, bu hafta">F.M. hafta</th>
              <th scope="col" class="sayi" title="Fazla mesai, toplam">F.M. toplam</th>
            </tr></thead>
            <tbody>${satirlar}${sayimSatir('G', 'Gündüz')}${sayimSatir('N', 'Gece')}</tbody>
          </table>
        </div>
        <div class="kart__alt vrd-alt">
          <div class="vrd-lejant">
            <span class="vrd-kod" data-kod="G">G</span> 08.00–20.00
            <span class="vrd-kod" data-kod="N">N</span> 20.00–08.00
            <span class="vrd-kod" data-kod="T">T</span> Tatil
            <span class="vrd-kod" data-kod="YI">Yİ</span> Yıllık izin
            <span class="vrd-kod" data-kod="R">R</span> Rapor
          </div>
          ${gunEkle(aktif, 6) < bugun ? '<span class="metin-xs metin-soluk">Geçmiş hafta</span>' : temizleOnay
            ? `<div class="vrd-onay" role="alertdialog" aria-label="Temizleme onayı"><span class="metin-sm">${aktif <= bugun && bugun <= gunEkle(aktif, 6) ? 'Bugünden itibaren' : 'Bu haftanın'} G, N ve T hücreleri silinsin mi? İzinler kalır.</span>
                 <button class="btn btn-tehlike btn-sm" type="button" data-eylem="temizle-evet">Evet, temizle</button>
                 <button class="btn btn-hayalet btn-sm" type="button" data-eylem="temizle-hayir">Vazgeç</button></div>`
            : `<button class="btn btn-hayalet btn-sm" type="button" data-eylem="temizle">Haftayı temizle</button>`}
        </div>
      </div>

      <section class="kart">
        <div class="kart__bas"><h2 class="kart__baslik">${i('bilgi')}Planlama kuralları</h2></div>
        <div class="kart__govde">
          <ul class="liste metin-sm">
            <li>${i('onay', 'ikon-sm')}<span>Her gündüz ve her gece vardiyasında <strong>2 kişi</strong></span></li>
            <li>${i('onay', 'ikon-sm')}<span>Düzen: <strong>2 gündüz → 2 gece → 2 izin</strong> (izin isteğine göre esner)</span></li>
            <li>${i('onay', 'ikon-sm')}<span>Art arda en fazla <strong>4 gün</strong> çalışma, en fazla <strong>2 gece</strong></span></li>
            <li>${i('onay', 'ikon-sm')}<span>Geceden çıkan kişi aynı gün gündüze yazılmaz</span></li>
            <li>${i('onay', 'ikon-sm')}<span>Haftalık normal süre <strong>45 saat</strong>; yıllık izin ve rapor günü <strong>7,5 saat</strong> sayılır; üstü fazla mesai olur ve kişiler arasında dengelenir</span></li>
          </ul>
        </div>
      </section>
      ${personelKarti(false)}
      <p class="metin-xs metin-soluk">Veriler bu cihazın tarayıcısında saklanır. Düzenli yedek almak için Ayarlar'a bakın.</p>

      ${yazdirFormu(h, toplamFazla)}`;
  }

  /* ---------- Kağıt formla aynı düzende yazdırma ---------- */
  function yazdirFormu(h, toplamFazla) {
    const K = kisiler();
    return `<section class="yazdir-formu" aria-hidden="true">
      <div class="yf-bas"><span>HAFTALIK ÇALIŞMA LİSTESİ</span><span>14. KAT</span></div>
      <table class="yf-tablo">
        <thead>
          <tr><th rowspan="2">ADI SOYADI</th>${GUNLER.map((_, g) => `<th>${trTarih(gunEkle(aktif, g))}</th>`).join('')}
            <th rowspan="2">Toplam Çalışma Saati</th><th colspan="2">Fazla Mesai</th><th rowspan="2">Personel İmza</th></tr>
          <tr>${GUNLER.map(g => `<th>${g.toLocaleUpperCase('tr-TR')}</th>`).join('')}<th>Bu Hafta</th><th>Toplam</th></tr>
        </thead>
        <tbody>${K.map((id, n) => { const s = M.saatler(h[id]); return `<tr><td class="yf-ad">${n + 1}. ${ad(id).toLocaleUpperCase('tr-TR')}</td>
          ${h[id].map(k => `<td>${k ? M.KODLAR[k].saat : ''}</td>`).join('')}
          <td>${sa(s.toplam)}</td><td>${sa(s.fazla)}</td><td>${sa(toplamFazla[id])}</td><td></td></tr>`; }).join('')}</tbody>
      </table>
    </section>`;
  }

  /* ---------- Etkileşim ---------- */
  function yenile(odakSecici) {
    const el = document.getElementById('icerik');
    el.innerHTML = ciz();
    bagla(el);
    if (odakSecici) { const o = el.querySelector(odakSecici); if (o) o.focus(); }
  }
  function yaz(id, g, kod) {
    if (!veri.haftalar[aktif]) veri.haftalar[aktif] = hafta(aktif);
    if (!veri.haftalar[aktif][id]) veri.haftalar[aktif][id] = Array(7).fill('');
    veri.haftalar[aktif][id][g] = kod;
    kaydet();
  }

  function bagla(el) {
    el.querySelectorAll('.vrd-personel').forEach(d => d.addEventListener('toggle', () => { personelAcik = d.open; }));
    const pf = el.querySelector('[data-personel-form]');
    if (pf) pf.addEventListener('submit', ev => {
      ev.preventDefault(); const a = pf.querySelector('[name=ad]').value.trim().replace(/\s+/g, ' '); if (!a) return;
      const ham = pf.querySelector('[name=tel]').value.trim(), tel = telDuzelt(ham);
      if (ham && !tel) { telHata = 'Cep numarası 05xx xxx xx xx biçiminde olmalı.'; personelAcik = true; yenile('#yeni-tel'); const y = document.getElementById('yeni-ad'); if (y) y.value = a; const t = document.getElementById('yeni-tel'); if (t) t.value = ham; return; }
      telHata = ''; veri.personel.push({ id: 'p' + Date.now().toString(36), ad: a, tel }); personelAcik = true; kaydet(); yenile('#yeni-ad');
    });
    el.querySelectorAll('[data-ad]').forEach(inp => inp.addEventListener('change', () => {
      const a = inp.value.trim().replace(/\s+/g, ' '); const p = veri.personel.find(x => x.id === inp.dataset.ad);
      if (a && p) { p.ad = a; kaydet(); } personelAcik = true; setTimeout(() => { const f = document.activeElement; yenile(f && f.id ? '#' + f.id : null); }, 0);
    }));
    el.querySelectorAll('[data-tel]').forEach(inp => inp.addEventListener('change', () => {
      const p = veri.personel.find(x => x.id === inp.dataset.tel), ham = inp.value.trim(), tel = telDuzelt(ham);
      if (ham && !tel) telHata = `${esc(p.ad)}: cep numarası 05xx xxx xx xx biçiminde olmalı.`;
      else { telHata = ''; p.tel = tel; kaydet(); }
      personelAcik = true; setTimeout(() => { const f = document.activeElement; yenile(f && f.id ? '#' + f.id : `#${inp.id}`); }, 0);
    }));
    el.querySelectorAll('[data-sil]').forEach(b => b.addEventListener('click', () => { silSor = b.dataset.sil; personelAcik = true; yenile('[data-sil-hayir]'); }));
    el.querySelectorAll('[data-sil-hayir]').forEach(b => b.addEventListener('click', () => { silSor = null; yenile(); }));
    el.querySelectorAll('[data-sil-evet]').forEach(b => b.addEventListener('click', () => { veri.personel = veri.personel.filter(p => p.id !== b.dataset.silEvet); silSor = null; kaydet(); yenile('#yeni-ad'); }));
    document.querySelectorAll('.yazdir-kopya').forEach(x => x.remove());
    const form = el.querySelector('.yazdir-formu');
    if (form) { const k = form.cloneNode(true); k.classList.add('yazdir-kopya'); document.body.appendChild(k); }
    el.querySelectorAll('.vrd-sec').forEach(s => s.addEventListener('change', () => {
      yaz(s.dataset.id, +s.dataset.gun, s.value);
      yenile(`#h-${s.dataset.id}-${s.dataset.gun}`);
    }));
    el.querySelectorAll('[data-ata]').forEach(b => b.addEventListener('click', () => {
      const [id, g, kod] = b.dataset.ata.split('|'); yaz(id, +g, kod); yenile(`#h-${id}-${g}`);
    }));
    el.querySelectorAll('[data-yeniden]').forEach(b => b.addEventListener('click', () => {
      const bas = Math.max(+b.dataset.yeniden, 0), bugun = bugunIso();
      const h = hafta(aktif);
      kisiler().forEach(id => { h[id] = h[id].map((k, g) => (g >= bas && gunEkle(aktif, g) >= bugun && !(M.KODLAR[k] || {}).izin) ? '' : k); });
      veri.haftalar[aktif] = M.planla(kisiler(), h, gecmis(aktif), birikmisFazla(gunEkle(aktif, -7)));
      kaydet(); yenile('[data-eylem="yazdir"]');
    }));
    el.querySelectorAll('[data-eylem]').forEach(b => b.addEventListener('click', () => {
      const e = b.dataset.eylem;
      if (e === 'onceki') { aktif = gunEkle(aktif, -7); temizleOnay = false; yenile(); }
      if (e === 'sonraki') { aktif = gunEkle(aktif, 7); temizleOnay = false; yenile(); }
      if (e === 'buhafta') { aktif = pazartesi(bugunIso()); temizleOnay = false; yenile(); }
      if (e === 'planla') {
        const sonuc = M.planla(kisiler(), hafta(aktif), gecmis(aktif), birikmisFazla(gunEkle(aktif, -7)));
        veri.haftalar[aktif] = sonuc; kaydet(); yenile('[data-eylem="yazdir"]');
      }
      if (e === 'yazdir') { try { window.print(); } catch (x) { /* yazdırma engelliyse */ } }
      if (e === 'temizle') { temizleOnay = true; yenile('[data-eylem="temizle-hayir"]'); }
      if (e === 'temizle-hayir') { temizleOnay = false; yenile('[data-eylem="temizle"]'); }
      if (e === 'temizle-evet') {
        const h = hafta(aktif), bugun = bugunIso();
        kisiler().forEach(id => h[id] = h[id].map((k, g) => (gunEkle(aktif, g) >= bugun && !(M.KODLAR[k] || {}).izin) ? '' : k));
        veri.haftalar[aktif] = h; kaydet(); temizleOnay = false; yenile('[data-eylem="planla"]');
      }
    }));
  }

  /* Diğer modüller için: belirli gün ve vardiyada çalışanlar */
  function vardiyadakiler(iso, kod) {
    if (!veri) yukle();
    const pzt = pazartesi(iso), g = Math.round((Date.parse(iso) - Date.parse(pzt)) / 864e5);
    const h = hafta(pzt);
    return kisiler().filter(id => h[id][g] === kod);
  }
  function personel() { if (!veri) yukle(); return veri.personel.map(p => ({ ...p, kisa: kisaAd(p.id) })); }

  /* Genel bakış: bugünden itibaren bu haftanın eksik vardiyaları */
  function ozet() {
    if (!veri) yukle();
    const b = bugunIso(), pzt = pazartesi(b);
    if (!veri.personel.length) return { eksik: [], ihlal: 0 };
    const d = M.denetle(kisiler(), hafta(pzt), gecmis(pzt));
    return {
      eksik: d.eksik.filter(e => gunEkle(pzt, e.gun) >= b && e.bos === 0).map(e => ({ gun: `${GUNLER[e.gun]} ${kisaTarih(gunEkle(pzt, e.gun))}`, vardiya: e.kod === 'G' ? 'gündüz' : 'gecesi', var: e.var })),
      ihlal: d.ihlal.length
    };
  }

  /* Asistan için: gelecek haftanın taslağı (boşsa planlar ve kaydeder) */
  function gelecekHaftaTaslagi() {
    if (!veri) yukle();
    const pzt = gunEkle(pazartesi(bugunIso()), 7), K = kisiler();
    let h = hafta(pzt); const bos = K.some(id => h[id].some(k => !k));
    if (bos) { h = M.planla(K, h, gecmis(pzt), birikmisFazla(gunEkle(pzt, -7))); veri.haftalar[pzt] = h; kaydet(); }
    const d = M.denetle(K, h, gecmis(pzt));
    return {
      aralik: aralik(pzt), yeniPlanlandi: bos, ihlal: d.ihlal.length, eksik: d.eksik.length,
      satirlar: K.map(id => ({ ad: kisaAd(id), kodlar: h[id].map(k => (M.KODLAR[k] || {}).etiket || '—'), saat: M.saatler(h[id]).toplam }))
    };
  }

  window.VardiyaEkrani = { aynala: () => { if (!veri) yukle(); aynala(); }, ciz, bagla, vardiyadakiler, personel, ozet, gelecekHaftaTaslagi, goster: (pzt) => { aktif = pzt; } };
})();
