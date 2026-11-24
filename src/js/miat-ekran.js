/* ==========================================================
   14. KAT — Miat ve Dolap Sıcaklığı
   · Her vardiya sıcaklık/nem ölçümü (aralık dışı → açıklama zorunlu)
   · Ürün miat takibi (30 gün önceden uyarı, son 7 gün kritik)
   · Dolapların aylık miat kontrolü (acil arabası aylık sayım dahil)
   Veri bu cihazın tarayıcısında saklanır (localStorage).
   ========================================================== */
(function () {
  'use strict';
  const ANAHTAR = '14kat.miat.v1';
  const GUNLER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const KRITIK_GUN = 7;

  const TOHUM = {
    surum: 1,
    uyariGun: 30,
    noktalar: [
      { id: 'buzdolabi', ad: 'İlaç buzdolabı', min: 2, max: 8, birim: '°C' },
      { id: 'ilac', ad: 'İlaç dolabı / oda', min: 15, max: 25, birim: '°C' },
      { id: 'serum', ad: 'Serum dolabı', min: 15, max: 25, birim: '°C' },
      { id: 'nem', ad: 'Ortam nemi', min: 30, max: 60, birim: '%' }
    ],
    dolaplar: ['Serum dolabı', 'Malzeme dolabı', 'Tedavi arabası', 'İlaç dolabı', 'İlaç buzdolabı', 'Acil arabası'],
    kontroller: {},
    olcumler: {},
    urunler: [],
    gecmis: []
  };

  let veri, secTarih = null, secVardiya = null, filtreDolap = '', ekleAcik = false, ayarAcik = false;
  function yukle() {
    try { const s = localStorage.getItem(ANAHTAR); veri = s ? JSON.parse(s) : null; } catch (e) { veri = null; }
    if (!veri || veri.surum !== 1) veri = JSON.parse(JSON.stringify(TOHUM));
  }
  function kaydet() { try { localStorage.setItem(ANAHTAR, JSON.stringify(veri)); } catch (e) { /* bellekte devam */ } }

  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const tarih = (s) => new Date(s + 'T12:00:00');
  const gunEkle = (s, n) => { const d = tarih(s); d.setDate(d.getDate() + n); return iso(d); };
  const bugun = () => iso(new Date());
  const gunFark = (a, b) => Math.round((tarih(b) - tarih(a)) / 864e5);
  const trTarih = (s) => s.split('-').reverse().join('.');
  const uzunTarih = (s) => { const d = tarih(s); return `${d.getDate()} ${AYLAR[d.getMonth()]} ${GUNLER[d.getDay()]}`; };
  const saatSimdi = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`; };
  const sayi = (n) => String(n).replace('.', ',');
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const i = (a, s = '') => `<svg class="ikon ${s}" aria-hidden="true"><use href="#i-${a}"/></svg>`;

  function simdikiVardiya() {
    const d = new Date(), h = d.getHours();
    if (h >= 8 && h < 20) return [iso(d), 'G'];
    if (h >= 20) return [iso(d), 'N'];
    return [gunEkle(iso(d), -1), 'N'];
  }
  const anahtar = (t, v) => `${t}|${v}`;
  const disinda = (n, d) => d != null && (d < n.min || d > n.max);

  /* Miat durumu */
  function miatDurum(u) {
    const kalan = gunFark(bugun(), u.skt);
    if (kalan < 0) return ['gecti', `${-kalan} gün geçti`, 'rozet-kritik', 'kritik'];
    if (kalan <= KRITIK_GUN) return ['kritik', kalan === 0 ? 'Bugün doluyor' : `${kalan} gün kaldı`, 'rozet-kritik', 'kritik'];
    if (kalan <= veri.uyariGun) return ['uyari', `${kalan} gün kaldı`, 'rozet-uyari', 'uyari'];
    return ['iyi', `${kalan} gün`, 'rozet-basari', 'onay'];
  }

  /* Son girilen ölçüm (geçmişe doğru 6 vardiya) */
  function sonOlcum(nId) {
    let [t, v] = simdikiVardiya();
    for (let n = 0; n < 6; n++) {
      const o = (veri.olcumler[anahtar(t, v)] || {})[nId];
      if (o && o.deger != null) return { ...o, tarih: t, vardiya: v };
      if (v === 'N') v = 'G'; else { v = 'N'; t = gunEkle(t, -1); }
    }
    return null;
  }

  /* ---------- Çizim ---------- */
  function ciz() {
    if (!veri) yukle();
    if (!secTarih) [secTarih, secVardiya] = simdikiVardiya();
    const [suT, suV] = simdikiVardiya();
    const simdiMi = secTarih === suT && secVardiya === suV;
    const kayit = veri.olcumler[anahtar(secTarih, secVardiya)] || {};
    const girilen = veri.noktalar.filter(n => kayit[n.id] && kayit[n.id].deger != null).length;
    const disi = veri.noktalar.filter(n => kayit[n.id] && disinda(n, kayit[n.id].deger));

    const urunler = veri.urunler.slice().sort((a, b) => a.skt.localeCompare(b.skt));
    const gorunen = urunler.filter(u => !filtreDolap || u.dolap === filtreDolap);
    const gecen = urunler.filter(u => miatDurum(u)[0] === 'gecti');
    const yakin = urunler.filter(u => ['kritik', 'uyari'].includes(miatDurum(u)[0]));
    const geciken = veri.dolaplar.filter(d => !veri.kontroller[d] || gunFark(veri.kontroller[d], bugun()) > 30);

    /* Son 7 gün özeti */
    const vardiyalar = [];
    { let t = suT, v = suV; for (let n = 0; n < 14; n++) { vardiyalar.unshift([t, v]); if (v === 'N') v = 'G'; else { v = 'N'; t = gunEkle(t, -1); } } }

    const olcumSatir = (n) => {
      const o = kayit[n.id] || {};
      const d = o.deger;
      const durum = d == null ? '<span class="rozet rozet-notr">' + i('saat') + 'Girilmedi</span>'
        : disinda(n, d) ? `<span class="rozet rozet-kritik">${i('kritik')}${d < n.min ? 'Düşük' : 'Yüksek'}</span>`
        : `<span class="rozet rozet-basari">${i('onay')}Normal</span>`;
      return `<li class="mt-olcum${d != null && disinda(n, d) ? ' disinda' : ''}">
        <div class="mt-olcum__ad"><strong>${esc(n.ad)}</strong><span class="metin-xs metin-soluk">Aralık ${sayi(n.min)}–${sayi(n.max)} ${n.birim}${o.saat ? ` · ${o.saat}` : ''}</span></div>
        <div class="mt-olcum__girdi">
          <label class="sr-only" for="o-${n.id}">${esc(n.ad)} (${n.birim})</label>
          <input id="o-${n.id}" class="girdi mt-deger" type="text" inputmode="decimal" autocomplete="off" pattern="-?[0-9]+([.,][0-9])?" data-olcum="${n.id}" value="${d == null ? '' : sayi(d)}" placeholder="—">
          <span class="metin-sm metin-ikincil">${n.birim}</span>
        </div>
        <div class="mt-olcum__durum">${durum}</div>
        ${d != null && disinda(n, d) ? `<div class="mt-olcum__aciklama alan">
          <label class="alan__etiket" for="a-${n.id}">Yapılan işlem <span class="metin-xs" style="color:var(--renk-kritik)">(zorunlu)</span></label>
          <input id="a-${n.id}" class="girdi" data-aciklama="${n.id}" value="${esc(o.not || '')}" placeholder="Örn. Kapı kapatıldı, 30 dk sonra tekrar ölçülecek, eczaneye bildirildi" ${o.not ? '' : 'aria-invalid="true"'}>
        </div>` : ''}
      </li>`;
    };

    const ozetHucre = (n, t, v) => {
      const o = (veri.olcumler[anahtar(t, v)] || {})[n.id];
      if (!o || o.deger == null) return `<td class="mt-h bos" title="${trTarih(t)} ${v === 'G' ? 'gündüz' : 'gece'}: girilmedi">·</td>`;
      const dis = disinda(n, o.deger);
      return `<td class="mt-h${dis ? ' dis' : ''}" title="${trTarih(t)} ${v === 'G' ? 'gündüz' : 'gece'}: ${sayi(o.deger)} ${n.birim}">${sayi(o.deger)}${dis ? '<span class="sr-only"> aralık dışı</span>' : ''}</td>`;
    };

    const urunSatir = (u) => {
      const [, metin, cls, ik] = miatDurum(u);
      return `<tr>
        <td data-etiket="Ürün"><strong>${esc(u.ad)}</strong>${u.lot ? `<div class="metin-xs metin-soluk">Lot ${esc(u.lot)}</div>` : ''}</td>
        <td data-etiket="Dolap">${esc(u.dolap)}</td>
        <td data-etiket="Adet" class="sayi">${esc(u.adet)}</td>
        <td data-etiket="Son kullanma" class="rakam">${trTarih(u.skt)}</td>
        <td data-etiket="Kalan"><span class="rozet ${cls}">${i(ik)}${metin}</span></td>
        <td data-etiket="" class="mt-islem"><button class="btn btn-ikincil btn-sm" type="button" data-kaldir="${u.id}|kullanildi">Kullanıldı</button><button class="btn btn-tehlike btn-sm" type="button" data-kaldir="${u.id}|imha">İmha</button></td>
      </tr>`;
    };

    return `
      <div class="sayfa-bas">
        <div>
          <div class="sayfa-bas__ust">Modül 5 · Miat ve sıcaklık</div>
          <h1>Miat ve Dolap Sıcaklığı</h1>
          <p class="sayfa-bas__aciklama">Her vardiya ölçüm · miat uyarısı ${veri.uyariGun} gün önce · dolaplar ayda bir kontrol</p>
        </div>
        <div class="vrd-eylemler"><button class="btn btn-birincil" type="button" data-eylem="ekle" aria-expanded="${ekleAcik}">${i('arti')}Miat kaydı ekle</button></div>
      </div>

      <div class="vrd-uyarilar">
        ${disi.length ? `<div class="uyari uyari-kritik" role="alert">${i('termometre')}<div><div class="uyari__baslik">${disi.map(n => `${esc(n.ad)} ${sayi(kayit[n.id].deger)} ${n.birim}`).join(' · ')}</div><div class="uyari__metin">Aralık dışında. Yapılan işlemi yazın; 30 dakika sonra yeniden ölçüp girin.</div></div></div>` : ''}
        ${simdiMi && girilen < veri.noktalar.length ? `<div class="uyari uyari-uyari" role="status">${i('saat')}<div><div class="uyari__baslik">Bu vardiyanın ölçümü ${girilen ? 'eksik' : 'girilmedi'}</div><div class="uyari__metin">${veri.noktalar.length - girilen} ölçüm bekliyor: ${veri.noktalar.filter(n => !(kayit[n.id] && kayit[n.id].deger != null)).map(n => esc(n.ad)).join(', ')}.</div></div></div>` : ''}
        ${gecen.length ? `<div class="uyari uyari-kritik" role="alert">${i('kritik')}<div><div class="uyari__baslik">${gecen.length} ürünün miadı geçmiş</div><div class="uyari__metin">${gecen.map(u => `${esc(u.ad)} (${esc(u.dolap)})`).join(', ')}. Dolaptan çıkarıp imha edin.</div></div></div>` : ''}
        ${yakin.length ? `<div class="uyari uyari-uyari" role="status">${i('saat')}<div><div class="uyari__baslik">${yakin.length} ürünün miadı ${veri.uyariGun} gün içinde doluyor</div><div class="uyari__metin">${yakin.slice(0, 4).map(u => `${esc(u.ad)} · ${trTarih(u.skt)}`).join(', ')}${yakin.length > 4 ? '…' : ''}</div></div></div>` : ''}
        ${geciken.length ? `<div class="uyari uyari-uyari" role="status">${i('kalender')}<div><div class="uyari__baslik">Aylık kontrol bekleyen dolap: ${geciken.length}</div><div class="uyari__metin">${geciken.map(esc).join(', ')}.</div></div></div>` : ''}
      </div>

      ${ekleAcik ? `
      <form class="kart aj-form" data-urun-form>
        <div class="kart__bas"><h2 class="kart__baslik">${i('saat')}Yeni miat kaydı</h2><button class="btn btn-hayalet btn-ikon btn-sm" type="button" data-eylem="ekle" aria-label="Kapat">${i('kapat', 'ikon-sm')}</button></div>
        <div class="kart__govde form-izgara">
          <div class="alan" style="grid-column:1/-1"><label class="alan__etiket" for="u-ad">Ürün</label><input id="u-ad" class="girdi" name="ad" required maxlength="80" placeholder="Örn. Heparin 5000 IU" list="u-oneri"><datalist id="u-oneri">${[...new Set([...veri.urunler, ...veri.gecmis].map(u => u.ad))].map(a => `<option value="${esc(a)}">`).join('')}</datalist></div>
          <div class="alan"><label class="alan__etiket" for="u-dolap">Dolap</label><select id="u-dolap" class="secim" name="dolap">${veri.dolaplar.map(d => `<option${filtreDolap === d ? ' selected' : ''}>${esc(d)}</option>`).join('')}</select></div>
          <div class="alan"><label class="alan__etiket" for="u-skt">Son kullanma tarihi</label><input id="u-skt" class="girdi" type="date" name="skt" required></div>
          <div class="alan"><label class="alan__etiket" for="u-adet">Adet</label><input id="u-adet" class="girdi" type="number" min="1" inputmode="numeric" name="adet" value="1" required></div>
          <div class="alan"><label class="alan__etiket" for="u-lot">Lot / seri no</label><input id="u-lot" class="girdi" name="lot" maxlength="30" placeholder="İsteğe bağlı"></div>
          <button class="btn btn-birincil" type="submit" style="grid-column:1/-1">${i('arti')}Kaydet</button>
        </div>
      </form>` : ''}

      <section class="kart">
        <div class="kart__bas mt-bas">
          <h2 class="kart__baslik">${i('termometre')}Sıcaklık ve nem</h2>
          <div class="vrd-hafta-nav mt-nav" role="group" aria-label="Vardiya seçimi">
            <button class="btn btn-ikincil btn-ikon btn-sm" type="button" data-vardiya-git="-1" aria-label="Önceki vardiya"><svg class="ikon ikon-sm" aria-hidden="true" style="transform:rotate(180deg)"><use href="#i-sag"/></svg></button>
            <span class="metin-sm"><strong>${uzunTarih(secTarih).split(' ').slice(0, 2).join(' ')}</strong> · ${secVardiya === 'G' ? 'Gündüz' : 'Gece'}${simdiMi ? ' <span class="rozet rozet-altin">Şimdi</span>' : ''}</span>
            <button class="btn btn-ikincil btn-ikon btn-sm" type="button" data-vardiya-git="1" aria-label="Sonraki vardiya"${simdiMi ? ' disabled' : ''}>${i('sag', 'ikon-sm')}</button>
          </div>
        </div>
        <div class="kart__govde">
          <ul class="mt-olcumler">${veri.noktalar.map(olcumSatir).join('')}</ul>
          <p class="alan__ipucu" style="margin-top:8px">Değer girildiğinde saat otomatik kaydedilir. Ondalık için nokta veya virgül kullanılabilir.</p>
        </div>
        <div class="kart__alt">
          <div class="metin-xs metin-soluk" style="margin-bottom:6px">Son 7 gün (G = gündüz, N = gece)</div>
          <div class="tablo-sarici"><table class="mt-ozet">
            <thead><tr><th scope="col"><span class="sr-only">Ölçüm noktası</span></th>${vardiyalar.map(([t, v]) => `<th scope="col" title="${trTarih(t)}">${v === 'G' ? `<span class="mt-gun">${tarih(t).getDate()}</span>` : ''}${v}</th>`).join('')}</tr></thead>
            <tbody>${veri.noktalar.map(n => `<tr><th scope="row">${esc(n.ad)}</th>${vardiyalar.map(([t, v]) => ozetHucre(n, t, v)).join('')}</tr>`).join('')}</tbody>
          </table></div>
        </div>
      </section>

      <section class="kart">
        <div class="kart__bas st-arac">
          <h2 class="kart__baslik">${i('saat')}Miat takibi <span class="rozet rozet-notr">${veri.urunler.length} kayıt</span></h2>
          <div class="st-filtre" role="group" aria-label="Dolap">
            <button class="sekme" type="button" data-dolap="" aria-pressed="${!filtreDolap}">Tümü</button>
            ${veri.dolaplar.map(d => `<button class="sekme" type="button" data-dolap="${esc(d)}" aria-pressed="${filtreDolap === d}">${esc(d)}</button>`).join('')}
          </div>
        </div>
        ${gorunen.length ? `<div class="tablo-sarici"><table class="tablo tablo-mobil mt-tablo">
          <thead><tr><th>Ürün</th><th>Dolap</th><th class="sayi">Adet</th><th>Son kullanma</th><th>Kalan</th><th><span class="sr-only">İşlem</span></th></tr></thead>
          <tbody>${gorunen.map(urunSatir).join('')}</tbody></table></div>`
          : `<div class="bos-durum">${i('saat')}<p>${veri.urunler.length ? 'Bu dolapta miat kaydı yok.' : 'Henüz miat kaydı yok. Miadı yaklaşan ürünleri “Miat kaydı ekle” ile girin.'}</p></div>`}
        ${veri.gecmis.length ? `<div class="kart__alt metin-xs metin-ikincil">Son işlemler: ${veri.gecmis.slice(-3).reverse().map(g => `${esc(g.ad)} — ${g.islem === 'imha' ? 'imha' : 'kullanıldı'} (${trTarih(g.tarih)})`).join(' · ')}</div>` : ''}
      </section>

      <section class="kart">
        <div class="kart__bas"><h2 class="kart__baslik">${i('kalender')}Aylık dolap kontrolü</h2><span class="rozet ${geciken.length ? 'rozet-uyari' : 'rozet-basari'}">${geciken.length ? geciken.length + ' bekliyor' : 'Tamam'}</span></div>
        <div class="kart__govde"><ul class="gr-liste">${veri.dolaplar.map(d => {
          const son = veri.kontroller[d], f = son ? gunFark(son, bugun()) : null;
          const rz = son == null ? `<span class="rozet rozet-uyari">${i('uyari')}Kontrol yapılmadı</span>`
            : f > 30 ? `<span class="rozet rozet-uyari">${i('uyari')}${f} gün önce</span>`
            : `<span class="rozet rozet-basari">${i('onay')}${trTarih(son)}</span>`;
          return `<li class="gr-satir"><span><strong>${esc(d)}</strong>${d === 'Acil arabası' ? '<div class="metin-xs metin-soluk">Aylık malzeme sayımı + miat kontrolü</div>' : '<div class="metin-xs metin-soluk">Miat kontrolü</div>'}</span>
            <span class="gr-satir__sag">${rz}<button class="btn btn-ikincil btn-sm" type="button" data-kontrol="${esc(d)}">${i('onay', 'ikon-sm')}Bugün yapıldı</button></span></li>`;
        }).join('')}</ul>
        <p class="alan__ipucu" style="margin-top:8px">Acil arabası malzeme sayıları Stok modülünde girilir.</p></div>
      </section>

      <details class="kart gr-ayar"${ayarAcik ? ' open' : ''}>
        <summary class="kart__bas"><span class="kart__baslik">${i('ayar')}Aralıklar ve uyarı süresi</span></summary>
        <div class="kart__govde form-izgara">
          ${veri.noktalar.map(n => `<div class="alan"><span class="alan__etiket">${esc(n.ad)} (${n.birim})</span>
            <span style="display:flex;gap:8px;align-items:center"><label class="sr-only" for="min-${n.id}">${esc(n.ad)} en düşük</label><input id="min-${n.id}" class="girdi" type="number" step="0.1" data-aralik="${n.id}|min" value="${n.min}">–<label class="sr-only" for="max-${n.id}">${esc(n.ad)} en yüksek</label><input id="max-${n.id}" class="girdi" type="number" step="0.1" data-aralik="${n.id}|max" value="${n.max}"></span></div>`).join('')}
          <div class="alan"><label class="alan__etiket" for="uyari-gun">Miat uyarısı (gün önce)</label><input id="uyari-gun" class="girdi" type="number" min="1" data-uyari-gun value="${veri.uyariGun}"></div>
        </div>
        <div class="kart__alt metin-xs metin-ikincil">Nem aralığı (%30–60) varsayılan olarak girildi; kurumunuzun değeri farklıysa düzeltin.</div>
      </details>
      <p class="metin-xs metin-soluk">Veriler bu cihazın tarayıcısında saklanır.</p>`;
  }

  /* ---------- Etkileşim ---------- */
  function yenile(odak) {
    const el = document.getElementById('icerik');
    el.innerHTML = ciz(); bagla(el);
    if (odak) { const o = el.querySelector(odak); if (o) o.focus(); }
  }
  const sonrakiOdak = () => { const a = document.activeElement; return a && a !== document.body && a.id ? `#${a.id}` : null; };

  function bagla(el) {
    const on = (s, o, fn) => el.querySelectorAll(s).forEach(x => x.addEventListener(o, ev => fn(x, ev)));
    const kayit = () => (veri.olcumler[anahtar(secTarih, secVardiya)] = veri.olcumler[anahtar(secTarih, secVardiya)] || {});

    on('[data-olcum]', 'change', inp => {
      const n = inp.dataset.olcum, k = kayit();
      const ham = inp.value.replace(',', '.');
      if (ham === '') delete k[n];
      else { const d = Math.round(parseFloat(ham) * 10) / 10; if (isNaN(d)) return; k[n] = { ...(k[n] || {}), deger: d, saat: saatSimdi() }; }
      kaydet(); setTimeout(() => {
        const nok = veri.noktalar.find(x => x.id === n);
        yenile(k[n] && disinda(nok, k[n].deger) && !k[n].not ? `#a-${n}` : sonrakiOdak());
      }, 0);
    });
    on('[data-olcum]', 'keydown', (inp, ev) => {
      if (ev.key !== 'Enter') return; ev.preventDefault();
      const hepsi = [...el.querySelectorAll('[data-olcum]')], s = hepsi[hepsi.indexOf(inp) + 1];
      if (s) s.focus(); else inp.blur();
    });
    on('[data-aciklama]', 'change', inp => { const k = kayit(); k[inp.dataset.aciklama].not = inp.value.trim(); kaydet(); setTimeout(() => yenile(sonrakiOdak()), 0); });
    on('[data-vardiya-git]', 'click', b => {
      const ileri = b.dataset.vardiyaGit === '1';
      if (secVardiya === 'G') { secVardiya = 'N'; if (!ileri) secTarih = gunEkle(secTarih, -1); }
      else { secVardiya = 'G'; if (ileri) secTarih = gunEkle(secTarih, 1); }
      yenile(`[data-vardiya-git="${b.dataset.vardiyaGit}"]`);
    });
    on('[data-dolap]', 'click', b => { filtreDolap = b.dataset.dolap; yenile(`[data-dolap="${b.dataset.dolap}"]`); });
    on('[data-urun-form]', 'submit', (f, ev) => {
      ev.preventDefault(); const d = Object.fromEntries(new FormData(f)); if (!d.ad.trim() || !d.skt) return;
      veri.urunler.push({ id: 'u' + Date.now().toString(36), ad: d.ad.trim(), dolap: d.dolap, adet: Math.max(1, +d.adet || 1), skt: d.skt, lot: d.lot.trim() });
      kaydet(); ekleAcik = false; yenile('[data-eylem="ekle"]');
    });
    on('[data-kaldir]', 'click', b => {
      const [id, islem] = b.dataset.kaldir.split('|'); const u = veri.urunler.find(x => x.id === id);
      veri.urunler = veri.urunler.filter(x => x.id !== id);
      veri.gecmis.push({ ...u, islem, tarih: bugun() }); if (veri.gecmis.length > 200) veri.gecmis.shift();
      kaydet(); yenile();
    });
    on('[data-kontrol]', 'click', b => { veri.kontroller[b.dataset.kontrol] = bugun(); kaydet(); yenile(`[data-kontrol="${b.dataset.kontrol}"]`); });
    on('[data-aralik]', 'change', inp => {
      const [id, alan] = inp.dataset.aralik.split('|'); const v = parseFloat(inp.value.replace(',', '.'));
      if (!isNaN(v)) { veri.noktalar.find(n => n.id === id)[alan] = v; kaydet(); }
      ayarAcik = true; setTimeout(() => yenile(sonrakiOdak()), 0);
    });
    on('[data-uyari-gun]', 'change', inp => { const v = Math.max(1, Math.round(+inp.value || 30)); veri.uyariGun = v; kaydet(); ayarAcik = true; setTimeout(() => yenile(sonrakiOdak()), 0); });
    on('.gr-ayar', 'toggle', d => { ayarAcik = d.open; });
    on('[data-eylem]', 'click', b => { if (b.dataset.eylem === 'ekle') { ekleAcik = !ekleAcik; yenile(ekleAcik ? '#u-ad' : '[data-eylem="ekle"]'); } });
  }

  /* ---------- Diğer modüller için ---------- */
  function olcumTamam(t, v) {
    if (!veri) yukle();
    const k = veri.olcumler[anahtar(t, v)] || {};
    const hepsi = veri.noktalar.every(n => k[n.id] && k[n.id].deger != null);
    const saat = hepsi ? veri.noktalar.map(n => k[n.id].saat).sort().pop() : '';
    return hepsi ? saat : '';
  }
  function ozet() {
    if (!veri) yukle();
    const disi = veri.noktalar.map(n => [n, sonOlcum(n.id)]).filter(([n, o]) => o && disinda(n, o.deger) );
    return {
      sicaklikDisi: disi.map(([n, o]) => ({ ad: n.ad, deger: sayi(o.deger) + ' ' + n.birim, aralik: `${sayi(n.min)}–${sayi(n.max)} ${n.birim}`, saat: o.saat })),
      miatGecen: veri.urunler.filter(u => miatDurum(u)[0] === 'gecti').length,
      miatYakin: veri.urunler.filter(u => ['kritik', 'uyari'].includes(miatDurum(u)[0])).map(u => ({ ad: u.ad, adet: u.adet, skt: trTarih(u.skt), kalan: gunFark(bugun(), u.skt) })),
      kontrolBekleyen: veri.dolaplar.filter(d => !veri.kontroller[d] || gunFark(veri.kontroller[d], bugun()) > 30),
      olcumEksik: (() => { const [t, v] = simdikiVardiya(); return !olcumTamam(t, v); })()
    };
  }

  function fefo() {
    if (!veri) yukle();
    const g = {};
    veri.urunler.slice().sort((a, b) => a.skt.localeCompare(b.skt)).forEach(u => {
      (g[u.dolap] = g[u.dolap] || []).push({ ad: u.ad, adet: u.adet, skt: trTarih(u.skt), kalan: gunFark(bugun(), u.skt), lot: u.lot });
    });
    return g;
  }
  function sonOlcumler() { if (!veri) yukle(); return veri.noktalar.map(n => { const o = sonOlcum(n.id); return { ad: n.ad, deger: o ? sayi(o.deger) + ' ' + n.birim : '—', dis: o ? disinda(n, o.deger) : false }; }); }

  window.MiatEkrani = { ciz, bagla, ozet, olcumTamam, fefo, sonOlcumler };
})();
