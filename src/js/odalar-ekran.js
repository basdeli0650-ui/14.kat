/* ==========================================================
   14. KAT — Oda doluluk paneli
   Oda bazlı durum: dolu/boş, yatış günü, planlı taburcu, izolasyon, riskler.
   Hasta adı tutulmaz. Veri Görev Dağıtımı'nın oda listesiyle ortaktır.
   ========================================================== */
(function () {
  'use strict';
  const G = () => window.GorevEkrani;
  let acikOda = null, onay = null, noAcik = false;

  const i = (a, s = '') => `<svg class="ikon ${s}" aria-hidden="true"><use href="#i-${a}"/></svg>`;
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const bugun = () => iso(new Date());
  const gunFark = (a, b) => Math.round((Date.parse(b + 'T12:00:00') - Date.parse(a + 'T12:00:00')) / 864e5);
  const tarihSaat = (s) => { const [t, h] = s.split('T'); const [, a, g] = t.split('-'); return `${+g}.${a}${h ? ' ' + h.replace(':', '.') : ''}`; };
  const RISK = [['dusme', 'Düşme riski', 'uyari'], ['basi', 'Bası yarası riski', 'uyari'], ['npo', 'Aç (NPO)', 'bilgi'], ['alerji', 'Alerji var', 'kritik']];

  function odaKart(o, sorumlu) {
    const b = bugun(), acik = acikOda === o.no;
    const taburcuBugun = o.dolu && o.taburcuPlan && o.taburcuPlan.slice(0, 10) === b;
    const durum = !o.dolu ? `<span class="rozet rozet-notr">Boş</span>`
      : taburcuBugun ? `<span class="rozet rozet-altin">${i('saat')}Bugün taburcu ${o.taburcuPlan.slice(11, 16).replace(':', '.')}</span>`
      : `<span class="rozet rozet-basari">${i('onay')}Dolu</span>`;
    const isaret = o.dolu ? [
      o.izolasyon && `<span class="rozet rozet-kritik">${i('kritik')}${G().IZOL[o.izolasyon]}</span>`,
      ...RISK.filter(([k]) => o[k]).map(([, ad, tur]) => `<span class="rozet rozet-${tur}">${i(tur === 'kritik' ? 'kritik' : tur === 'uyari' ? 'uyari' : 'bilgi')}${ad}</span>`)
    ].filter(Boolean).join('') : '';

    return `<article class="kart od-kart${o.dolu ? '' : ' bos'}${acik ? ' acik' : ''}">
      <button class="od-kart__bas" type="button" data-oda="${o.no}" aria-expanded="${acik}" aria-controls="od-${o.no}">
        <span class="od-no">${esc(o.no)}</span>
        <span class="od-ozet">${durum}
          ${o.dolu ? `<span class="metin-xs metin-ikincil">${o.yatis ? `${gunFark(o.yatis, b) + 1}. gün` : 'Yatışta'} · ${G().YOGUNLUK[o.yogunluk || 2]}${sorumlu ? ` · ${esc(sorumlu)}` : ''}</span>` : '<span class="metin-xs metin-soluk">Yatışa hazır</span>'}
        </span>
        ${i('sag', 'od-ok')}
      </button>
      ${isaret ? `<div class="od-isaretler">${isaret}</div>` : ''}
      ${o.dolu && o.not && !acik ? `<p class="metin-xs metin-ikincil od-not">${esc(o.not)}</p>` : ''}
      ${acik ? `<div class="od-duzen" id="od-${o.no}">${o.dolu ? `
        <div class="form-izgara">
          <div class="alan"><label class="alan__etiket" for="y-${o.no}">Bakım yoğunluğu</label>
            <select id="y-${o.no}" class="secim" data-alan="yogunluk">${[1, 2, 3].map(y => `<option value="${y}"${(o.yogunluk || 2) === y ? ' selected' : ''}>${G().YOGUNLUK[y]}</option>`).join('')}</select></div>
          <div class="alan"><label class="alan__etiket" for="iz-${o.no}">İzolasyon</label>
            <select id="iz-${o.no}" class="secim" data-alan="izolasyon"><option value="">Yok</option>${Object.entries(G().IZOL).map(([k, v]) => `<option value="${k}"${o.izolasyon === k ? ' selected' : ''}>${v.replace(' izol.', '')}</option>`).join('')}</select></div>
          <div class="alan"><label class="alan__etiket" for="yt-${o.no}">Yatış tarihi</label>
            <input id="yt-${o.no}" class="girdi" type="date" data-alan="yatis" value="${o.yatis || ''}" max="${bugun()}"></div>
          <div class="alan"><label class="alan__etiket" for="tp-${o.no}">Planlı taburcu</label>
            <input id="tp-${o.no}" class="girdi" type="datetime-local" data-alan="taburcuPlan" value="${o.taburcuPlan || ''}"></div>
        </div>
        <fieldset class="od-riskler"><legend class="alan__etiket">İşaretler</legend>
          ${RISK.map(([k, ad]) => `<label class="onay"><input id="r-${k}-${o.no}" type="checkbox" data-alan="${k}"${o[k] ? ' checked' : ''}> ${ad}</label>`).join('')}
        </fieldset>
        <div class="alan"><label class="alan__etiket" for="n-${o.no}">Kısa not</label>
          <input id="n-${o.no}" class="girdi" data-alan="not" maxlength="80" value="${esc(o.not || '')}" placeholder="Örn. Sabah açlık kan şekeri takibi">
          <span class="alan__ipucu">Hasta adı yazmayın.</span></div>
        <div class="vrd-eylemler" style="margin-top:12px">
          ${onay === o.no
            ? `<span class="metin-sm">Oda ${esc(o.no)} taburcu edilsin mi? İşaretler temizlenir.</span><button class="btn btn-tehlike btn-sm" type="button" data-taburcu-evet="${o.no}">Evet, taburcu</button><button class="btn btn-hayalet btn-sm" type="button" data-taburcu-hayir>Vazgeç</button>`
            : `<button class="btn btn-ikincil btn-sm" type="button" data-taburcu="${o.no}">${i('cikis', 'ikon-sm')}Taburcu et</button>`}
        </div>` : `
        <p class="metin-sm metin-ikincil">Oda boş. Yeni hasta yatışında “Yatış al”a basın; oda şu anki vardiyada daha az odası olan hemşireye atanır.</p>
        <div class="vrd-eylemler" style="margin-top:12px"><button class="btn btn-birincil btn-sm" type="button" data-yatis="${o.no}">${i('arti', 'ikon-sm')}Yatış al</button></div>`}
      </div>` : ''}
    </article>`;
  }

  function ciz() {
    const odalar = G().odaListesi(), oz = G().odaOzeti(), sor = G().sorumlular();
    return `
      <div class="sayfa-bas"><div><div class="sayfa-bas__ust">Servis durumu</div><h1>Odalar</h1>
        <p class="sayfa-bas__aciklama">${oz.dolu}/${oz.toplam} dolu · bugün ${oz.yatis} yatış, ${oz.taburcu} taburcu</p></div></div>

      <section class="izgara izgara-4" aria-label="Oda özeti">
        <div class="kart istatistik"><span class="istatistik__etiket">${i('yatak')}Doluluk</span><span class="istatistik__deger">${oz.dolu}<span class="metin-soluk" style="font-size:1rem">/${oz.toplam}</span></span><span class="istatistik__not">${oz.toplam - oz.dolu} boş oda</span></div>
        <div class="kart istatistik"><span class="istatistik__etiket">${i('saat')}Bugün taburcu</span><span class="istatistik__deger metin-altin">${oz.taburcuBugun.length}</span><span class="istatistik__not">${oz.taburcuBugun.join(', ') || 'Planlı taburcu yok'}</span></div>
        <div class="kart istatistik"><span class="istatistik__etiket">${i('kritik')}İzolasyon</span><span class="istatistik__deger"${oz.izolasyon.length ? ' style="color:var(--renk-kritik)"' : ''}>${oz.izolasyon.length}</span><span class="istatistik__not">${oz.izolasyon.map(x => x.split(' ')[0]).join(', ') || 'Yok'}</span></div>
        <div class="kart istatistik"><span class="istatistik__etiket">${i('uyari')}Düşme riski</span><span class="istatistik__deger"${oz.dusme.length ? ' style="color:var(--renk-uyari)"' : ''}>${oz.dusme.length}</span><span class="istatistik__not">${oz.dusme.join(', ') || 'Yok'}</span></div>
      </section>

      <section class="od-izgara" aria-label="Odalar">${odalar.map(o => odaKart(o, sor[o.no])).join('')}</section>

      <details class="kart gr-ayar"${noAcik ? ' open' : ''}>
        <summary class="kart__bas"><span class="kart__baslik">${i('ayar')}Oda numaraları</span></summary>
        <div class="kart__govde form-izgara">${odalar.map((o, n) => `<div class="alan"><label class="alan__etiket" for="no-${n}">${n + 1}. oda</label><input id="no-${n}" class="girdi" data-no="${esc(o.no)}" value="${esc(o.no)}" inputmode="numeric" maxlength="6"></div>`).join('')}</div>
      </details>
      <p class="metin-xs metin-soluk">Oda kayıtlarında hasta adı tutulmaz. Veriler bu cihazda saklanır.</p>`;
  }

  function yenile(odak) { const el = document.getElementById('icerik'); el.innerHTML = ciz(); bagla(el); if (odak && odak !== '#') { const o = el.querySelector(odak); if (o) o.focus(); } }
  const sonrakiOdak = () => { const a = document.activeElement; return a && a !== document.body && a.id ? `#${a.id}` : null; };

  function bagla(el) {
    const on = (s, o, fn) => el.querySelectorAll(s).forEach(x => x.addEventListener(o, ev => fn(x, ev)));
    on('[data-oda]', 'click', b => { acikOda = acikOda === b.dataset.oda ? null : b.dataset.oda; onay = null; yenile(`[data-oda="${b.dataset.oda}"]`); });
    on('.od-duzen [data-alan]', 'change', f => {
      const v = f.type === 'checkbox' ? f.checked : f.dataset.alan === 'yogunluk' ? +f.value : f.value.trim();
      G().odaGuncelle(acikOda, { [f.dataset.alan]: v });
      setTimeout(() => yenile(sonrakiOdak() || (f.id ? `#${f.id}` : null)), 0);
    });
    on('[data-yatis]', 'click', b => { G().odaYatis(b.dataset.yatis); yenile(`#y-${b.dataset.yatis}`); });
    on('[data-taburcu]', 'click', b => { onay = b.dataset.taburcu; yenile('[data-taburcu-hayir]'); });
    on('[data-taburcu-hayir]', 'click', () => { onay = null; yenile(); });
    on('[data-taburcu-evet]', 'click', b => { G().odaTaburcu(b.dataset.taburcuEvet); onay = null; yenile(`[data-oda="${b.dataset.taburcuEvet}"]`); });
    on('[data-no]', 'change', f => { if (!G().odaNoDegistir(f.dataset.no, f.value.trim())) f.value = f.dataset.no; noAcik = true; setTimeout(() => yenile(sonrakiOdak()), 0); });
    on('.gr-ayar', 'toggle', d => { noAcik = d.open; });
  }

  window.OdalarEkrani = { ciz, bagla };
})();
