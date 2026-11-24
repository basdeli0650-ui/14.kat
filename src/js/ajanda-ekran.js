/* ==========================================================
   14. KAT — Sorumlu Hemşire Ajandası
   Bugünün listesi: etkinlikler (tekrarlı), yapılacaklar, personel notları, günün notu.
   Veri bu cihazın tarayıcısında saklanır (localStorage).
   ========================================================== */
(function () {
  'use strict';
  const ANAHTAR = '14kat.ajanda.v1';
  const GUNLER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const TURLER = { toplanti: ['Toplantı', 'rozet-bilgi'], denetim: ['Denetim', 'rozet-altin'], diger: ['Diğer', 'rozet-notr'] };
  const TEKRAR = { yok: 'Tek seferlik', haftalik: 'Her hafta', aylik: 'Her ay' };
  const NOT_TUR = { izin: 'İzin talebi', egitim: 'Eğitim', gorusme: 'Görüşme', diger: 'Diğer' };

  let veri, sec = null, acik = { etkinlik: false, not: false }, silSor = null;
  function yukle() {
    try { const s = localStorage.getItem(ANAHTAR); veri = s ? JSON.parse(s) : null; } catch (e) { veri = null; }
    if (!veri || veri.surum !== 1) veri = { surum: 1, etkinlikler: [], yapilacaklar: [], personelNotlari: [], gunNotlari: {} };
  }
  function kaydet() { try { localStorage.setItem(ANAHTAR, JSON.stringify(veri)); } catch (e) { /* bellekte devam */ } }

  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const tarih = (s) => new Date(s + 'T12:00:00');
  const gunEkle = (s, n) => { const d = tarih(s); d.setDate(d.getDate() + n); return iso(d); };
  const bugun = () => iso(new Date());
  const uzunTarih = (s) => { const d = tarih(s); return `${d.getDate()} ${AYLAR[d.getMonth()]} ${GUNLER[d.getDay()]}`; };
  const kisaTarih = (s) => { const d = tarih(s); return `${d.getDate()} ${AYLAR[d.getMonth()].slice(0, 3)}`; };
  const gunFark = (a, b) => Math.round((tarih(b) - tarih(a)) / 864e5);
  const esc = (t) => String(t || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const yeniId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const i = (a, s = '') => `<svg class="ikon ${s}" aria-hidden="true"><use href="#i-${a}"/></svg>`;
  const personel = () => (window.VardiyaEkrani ? window.VardiyaEkrani.personel() : []);
  const kisiAd = (id) => (personel().find(p => p.id === id) || {}).ad || '—';

  /* Bir etkinlik verilen günde var mı? (tekrar kuralları) */
  function gunde(e, g) {
    if (g < e.tarih || (e.atla || []).includes(g)) return false;
    if (e.tekrar === 'yok') return e.tarih === g;
    if (e.tekrar === 'haftalik') return gunFark(e.tarih, g) % 7 === 0;
    if (e.tekrar === 'aylik') return tarih(e.tarih).getDate() === tarih(g).getDate();
    return false;
  }
  const gununEtkinlikleri = (g) => veri.etkinlikler.filter(e => gunde(e, g)).sort((a, b) => (a.saat || '99').localeCompare(b.saat || '99'));

  /* ---------- Çizim ---------- */
  function ciz() {
    if (!veri) yukle();
    if (!sec) sec = bugun();
    const b = bugun(), bugunMu = sec === b;
    const etk = gununEtkinlikleri(sec);
    const sonraki = [];
    for (let n = 1; n <= 7; n++) { const g = gunEkle(sec, n); gununEtkinlikleri(g).forEach(e => sonraki.push([g, e])); }

    const acikIs = veri.yapilacaklar.filter(y => !y.bitti).sort((x, y) => (x.son || '9999').localeCompare(y.son || '9999'));
    const bitenIs = veri.yapilacaklar.filter(y => y.bitti && y.bittiTarih === sec);
    const geciken = acikIs.filter(y => y.son && y.son < b).length;
    const notlar = veri.personelNotlari.slice().sort((x, y) => y.tarih.localeCompare(x.tarih));
    const gununNotlari = notlar.filter(n => n.tarih === sec);
    const digerNotlar = notlar.filter(n => n.tarih !== sec).slice(0, 6);

    const etkSatir = (e) => `
      <li class="aj-etk">
        <span class="aj-etk__saat rakam">${e.saat ? e.saat.replace(':', '.') : 'Gün boyu'}</span>
        <div class="aj-etk__govde">
          <strong>${esc(e.baslik)}</strong>
          <div class="aj-etk__alt">
            <span class="rozet ${TURLER[e.tur][1]}">${TURLER[e.tur][0]}</span>
            ${e.tekrar !== 'yok' ? `<span class="rozet rozet-notr">${i('saat')}${TEKRAR[e.tekrar]}</span>` : ''}
            ${e.yer ? `<span class="metin-xs metin-ikincil">${esc(e.yer)}</span>` : ''}
          </div>
          ${silSor === e.id ? `<div class="vrd-onay aj-sil" role="alertdialog" aria-label="Silme onayı">
              ${e.tekrar !== 'yok' ? `<button class="btn btn-tehlike btn-sm" type="button" data-etk-sil-bir="${e.id}">Yalnızca bu gün</button>
                <button class="btn btn-tehlike btn-sm" type="button" data-etk-sil-hep="${e.id}">Bütün tekrarlar</button>`
              : `<button class="btn btn-tehlike btn-sm" type="button" data-etk-sil-hep="${e.id}">Evet, sil</button>`}
              <button class="btn btn-hayalet btn-sm" type="button" data-etk-sil-iptal>Vazgeç</button></div>` : ''}
        </div>
        ${silSor === e.id ? '' : `<button class="btn btn-hayalet btn-ikon btn-sm" type="button" data-etk-sil="${e.id}" aria-label="${esc(e.baslik)} sil">${i('kapat', 'ikon-sm')}</button>`}
      </li>`;

    const isDurum = (y) => {
      if (!y.son) return '';
      const f = gunFark(b, y.son);
      if (f < 0) return `<span class="rozet rozet-kritik">${i('kritik')}${-f} gün gecikti</span>`;
      if (f === 0) return `<span class="rozet rozet-uyari">${i('saat')}Bugün</span>`;
      if (f <= 3) return `<span class="rozet rozet-uyari">${i('saat')}${f} gün kaldı</span>`;
      return `<span class="rozet rozet-notr">${kisaTarih(y.son)}</span>`;
    };
    const isSatir = (y) => `
      <li class="gr-satir${y.bitti ? ' bitti' : ''}">
        <label class="onay"><input type="checkbox" data-is="${y.id}"${y.bitti ? ' checked' : ''}> <span>${esc(y.metin)}</span></label>
        <span class="gr-satir__sag">${y.bitti ? `<span class="rozet rozet-basari">${i('onay')}Yapıldı</span>` : isDurum(y)}
          <button class="btn btn-hayalet btn-ikon btn-sm" type="button" data-is-sil="${y.id}" aria-label="Sil">${i('kapat', 'ikon-sm')}</button></span>
      </li>`;

    const notSatir = (n) => `
      <li class="aj-not">
        <div class="aj-not__bas"><strong>${esc(kisiAd(n.kisi))}</strong><span class="rozet rozet-notr">${NOT_TUR[n.tur]}</span><span class="metin-xs metin-soluk">${kisaTarih(n.tarih)}</span>
          <button class="btn btn-hayalet btn-ikon btn-sm" type="button" data-not-sil="${n.id}" aria-label="Notu sil" style="margin-left:auto">${i('kapat', 'ikon-sm')}</button></div>
        <p class="metin-sm metin-ikincil">${esc(n.metin)}</p>
        ${n.tur === 'izin' ? '<a class="metin-xs" href="#vardiya">Vardiya planında gör</a>' : ''}
      </li>`;

    return `
      <div class="sayfa-bas">
        <div>
          <div class="sayfa-bas__ust">Modül 3 · Sorumlu hemşire ajandası</div>
          <h1>${bugunMu ? 'Bugün' : uzunTarih(sec).split(' ').slice(0, 2).join(' ')}</h1>
          <p class="sayfa-bas__aciklama">${uzunTarih(sec)} · ${etk.length} etkinlik · ${acikIs.length} açık iş${geciken ? ` · <span style="color:var(--renk-kritik)">${geciken} geciken</span>` : ''}</p>
        </div>
        <div class="vrd-eylemler">
          <button class="btn btn-birincil" type="button" data-ac="etkinlik" aria-expanded="${acik.etkinlik}">${i('arti')}Etkinlik ekle</button>
        </div>
      </div>

      <div class="vrd-hafta-nav" role="group" aria-label="Gün seçimi">
        <button class="btn btn-ikincil btn-ikon" type="button" data-gun="-1" aria-label="Önceki gün"><svg class="ikon" aria-hidden="true" style="transform:rotate(180deg)"><use href="#i-sag"/></svg></button>
        <div class="vrd-hafta-nav__orta"><strong>${uzunTarih(sec)}</strong>${bugunMu ? '<span class="rozet rozet-altin">Bugün</span>' : '<button class="btn btn-hayalet btn-sm" type="button" data-gun="0">Bugüne dön</button>'}</div>
        <button class="btn btn-ikincil btn-ikon" type="button" data-gun="1" aria-label="Sonraki gün">${i('sag')}</button>
      </div>

      ${acik.etkinlik ? `
      <form class="kart aj-form" data-etk-form>
        <div class="kart__bas"><h2 class="kart__baslik">${i('kalender')}Yeni etkinlik</h2>
          <button class="btn btn-hayalet btn-ikon btn-sm" type="button" data-ac="etkinlik" aria-label="Formu kapat">${i('kapat', 'ikon-sm')}</button></div>
        <div class="kart__govde form-izgara">
          <div class="alan" style="grid-column:1/-1"><label class="alan__etiket" for="e-baslik">Başlık</label><input id="e-baslik" class="girdi" name="baslik" required maxlength="100" placeholder="Örn. Hemşirelik hizmetleri toplantısı"></div>
          <div class="alan"><label class="alan__etiket" for="e-tur">Tür</label><select id="e-tur" class="secim" name="tur">${Object.entries(TURLER).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('')}</select></div>
          <div class="alan"><label class="alan__etiket" for="e-tarih">Tarih</label><input id="e-tarih" class="girdi" type="date" name="tarih" value="${sec}" required></div>
          <div class="alan"><label class="alan__etiket" for="e-saat">Saat</label><input id="e-saat" class="girdi" type="time" name="saat"><span class="alan__ipucu">Boş bırakılırsa gün boyu</span></div>
          <div class="alan"><label class="alan__etiket" for="e-tekrar">Tekrar</label><select id="e-tekrar" class="secim" name="tekrar">${Object.entries(TEKRAR).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select><span class="alan__ipucu">Her hafta aynı gün / her ay aynı tarih</span></div>
          <div class="alan"><label class="alan__etiket" for="e-yer">Yer</label><input id="e-yer" class="girdi" name="yer" maxlength="60" placeholder="İsteğe bağlı"></div>
          <button class="btn btn-birincil" type="submit" style="grid-column:1/-1">${i('arti')}Kaydet</button>
        </div>
      </form>` : ''}

      <section class="izgara izgara-2-1">
        <div class="kart">
          <div class="kart__bas"><h2 class="kart__baslik">${i('kalender')}Etkinlikler</h2><span class="rozet rozet-notr">${etk.length}</span></div>
          <div class="kart__govde">
            ${etk.length ? `<ul class="aj-liste">${etk.map(etkSatir).join('')}</ul>`
              : `<div class="bos-durum" style="padding:24px 8px">${i('kalender')}<p>${bugunMu ? 'Bugün' : 'Bu gün'} için toplantı veya denetim yok.</p></div>`}
          </div>
          <div class="kart__alt">
            <div class="metin-xs metin-soluk" style="margin-bottom:6px">Sonraki 7 gün</div>
            ${sonraki.length ? `<ul class="aj-sonraki">${sonraki.slice(0, 6).map(([g, e]) => `<li><span class="rakam metin-altin">${kisaTarih(g)}</span><span>${e.saat ? e.saat.replace(':', '.') + ' · ' : ''}${esc(e.baslik)}</span></li>`).join('')}</ul>`
              : '<p class="metin-sm metin-soluk">Planlanmış etkinlik yok.</p>'}
          </div>
        </div>

        <div class="kart">
          <div class="kart__bas"><h2 class="kart__baslik">${i('ajanda')}Günün notu</h2><span class="metin-xs metin-soluk" id="not-durum" aria-live="polite"></span></div>
          <div class="kart__govde">
            <label class="sr-only" for="gun-notu">${uzunTarih(sec)} notu</label>
            <textarea id="gun-notu" class="metin-alani" rows="7" placeholder="Bugün aklında tutman gerekenler…">${esc(veri.gunNotlari[sec] || '')}</textarea>
            <p class="alan__ipucu" style="margin-top:6px">Yazdıkça kaydedilir.</p>
          </div>
        </div>
      </section>

      <section class="izgara izgara-2">
        <div class="kart">
          <div class="kart__bas"><h2 class="kart__baslik">${i('gorev')}Yapılacaklar</h2><span class="rozet ${geciken ? 'rozet-kritik' : 'rozet-notr'}">${acikIs.length} açık</span></div>
          <div class="kart__govde">
            ${acikIs.length || bitenIs.length ? `<ul class="gr-liste">${acikIs.map(isSatir).join('')}${bitenIs.map(isSatir).join('')}</ul>` : '<p class="metin-sm metin-soluk">Açık iş yok.</p>'}
            <form class="aj-is-form" data-is-form>
              <div class="alan"><label class="alan__etiket" for="is-metin">Yeni iş</label><input id="is-metin" class="girdi" name="metin" required maxlength="120" placeholder="Örn. Eczane siparişini onayla"></div>
              <div class="alan"><label class="alan__etiket" for="is-son">Son tarih</label><input id="is-son" class="girdi" type="date" name="son"></div>
              <button class="btn btn-ikincil" type="submit">${i('arti')}Ekle</button>
            </form>
          </div>
        </div>

        <div class="kart">
          <div class="kart__bas"><h2 class="kart__baslik">${i('ekip')}Personel notları</h2>
            <button class="btn btn-hayalet btn-sm" type="button" data-ac="not" aria-expanded="${acik.not}">${i('arti', 'ikon-sm')}Not ekle</button></div>
          <div class="kart__govde">
            ${acik.not ? `<form class="form-izgara aj-not-form" data-not-form>
              <div class="alan"><label class="alan__etiket" for="n-kisi">Personel</label><select id="n-kisi" class="secim" name="kisi" required>${personel().map(p => `<option value="${p.id}">${esc(p.ad)}</option>`).join('')}</select></div>
              <div class="alan"><label class="alan__etiket" for="n-tur">Tür</label><select id="n-tur" class="secim" name="tur">${Object.entries(NOT_TUR).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
              <div class="alan"><label class="alan__etiket" for="n-tarih">Tarih</label><input id="n-tarih" class="girdi" type="date" name="tarih" value="${sec}" required></div>
              <div class="alan" style="grid-column:1/-1"><label class="alan__etiket" for="n-metin">Not</label><textarea id="n-metin" class="metin-alani" name="metin" required maxlength="400" rows="3" placeholder="Örn. 8–9 Aralık yıllık izin istedi"></textarea></div>
              <button class="btn btn-birincil" type="submit" style="grid-column:1/-1">Kaydet</button>
            </form>` : ''}
            ${gununNotlari.length ? `<div class="metin-xs metin-altin" style="margin:4px 0 8px">${uzunTarih(sec)}</div><ul class="aj-notlar">${gununNotlari.map(notSatir).join('')}</ul>` : ''}
            ${digerNotlar.length ? `<div class="metin-xs metin-soluk" style="margin:12px 0 8px">Son notlar</div><ul class="aj-notlar">${digerNotlar.map(notSatir).join('')}</ul>` : ''}
            ${!notlar.length && !acik.not ? '<p class="metin-sm metin-soluk">Henüz personel notu yok. İzin talebi, eğitim veya görüşme notu ekleyebilirsiniz.</p>' : ''}
          </div>
        </div>
      </section>
      <p class="metin-xs metin-soluk">Veriler bu cihazın tarayıcısında saklanır.</p>`;
  }

  /* ---------- Etkileşim ---------- */
  function yenile(odak) {
    const el = document.getElementById('icerik');
    el.innerHTML = ciz(); bagla(el);
    if (odak) { const o = el.querySelector(odak); if (o) o.focus(); }
  }
  let notZaman;
  function bagla(el) {
    const on = (s, o, fn) => el.querySelectorAll(s).forEach(x => x.addEventListener(o, ev => fn(x, ev)));
    on('[data-gun]', 'click', b => { const n = +b.dataset.gun; sec = n === 0 ? bugun() : gunEkle(sec, n); silSor = null; yenile(n === 0 ? null : `[data-gun="${n}"]`); });
    on('[data-ac]', 'click', b => { const k = b.dataset.ac; acik[k] = !acik[k]; yenile(acik[k] ? (k === 'etkinlik' ? '#e-baslik' : '#n-kisi') : `[data-ac="${k}"]`); });

    const formAl = (f) => Object.fromEntries(new FormData(f));
    on('[data-etk-form]', 'submit', (f, ev) => {
      ev.preventDefault(); const d = formAl(f); if (!d.baslik.trim()) return;
      veri.etkinlikler.push({ id: yeniId(), baslik: d.baslik.trim(), tur: d.tur, tarih: d.tarih, saat: d.saat, tekrar: d.tekrar, yer: d.yer.trim(), atla: [] });
      kaydet(); acik.etkinlik = false; sec = d.tarih; yenile('[data-ac="etkinlik"]');
    });
    on('[data-etk-sil]', 'click', b => { silSor = b.dataset.etkSil; yenile('[data-etk-sil-iptal]'); });
    on('[data-etk-sil-iptal]', 'click', () => { silSor = null; yenile(); });
    on('[data-etk-sil-bir]', 'click', b => { const e = veri.etkinlikler.find(x => x.id === b.dataset.etkSilBir); e.atla = [...(e.atla || []), sec]; silSor = null; kaydet(); yenile(); });
    on('[data-etk-sil-hep]', 'click', b => { veri.etkinlikler = veri.etkinlikler.filter(x => x.id !== b.dataset.etkSilHep); silSor = null; kaydet(); yenile(); });

    on('[data-is-form]', 'submit', (f, ev) => {
      ev.preventDefault(); const d = formAl(f); if (!d.metin.trim()) return;
      veri.yapilacaklar.push({ id: yeniId(), metin: d.metin.trim(), son: d.son, bitti: false, bittiTarih: '' });
      kaydet(); yenile('#is-metin');
    });
    on('[data-is]', 'change', c => { const y = veri.yapilacaklar.find(x => x.id === c.dataset.is); y.bitti = c.checked; y.bittiTarih = c.checked ? sec : ''; kaydet(); yenile(`[data-is="${y.id}"]`); });
    on('[data-is-sil]', 'click', b => { veri.yapilacaklar = veri.yapilacaklar.filter(x => x.id !== b.dataset.isSil); kaydet(); yenile('#is-metin'); });

    on('[data-not-form]', 'submit', (f, ev) => {
      ev.preventDefault(); const d = formAl(f); if (!d.metin.trim()) return;
      veri.personelNotlari.push({ id: yeniId(), kisi: d.kisi, tur: d.tur, tarih: d.tarih, metin: d.metin.trim() });
      kaydet(); acik.not = false; yenile('[data-ac="not"]');
    });
    on('[data-not-sil]', 'click', b => { veri.personelNotlari = veri.personelNotlari.filter(x => x.id !== b.dataset.notSil); kaydet(); yenile(); });

    on('#gun-notu', 'input', t => {
      clearTimeout(notZaman);
      notZaman = setTimeout(() => {
        const v = t.value.trim(); if (v) veri.gunNotlari[sec] = t.value; else delete veri.gunNotlari[sec];
        kaydet(); const d = document.getElementById('not-durum'); if (d) d.textContent = 'Kaydedildi';
      }, 400);
    });
  }

  /* Panel için: bugünün etkinlikleri ve geciken işler */
  function ozet() {
    if (!veri) yukle();
    const b = bugun();
    return {
      etkinlikler: gununEtkinlikleri(b),
      geciken: veri.yapilacaklar.filter(y => !y.bitti && y.son && y.son < b).length,
      acik: veri.yapilacaklar.filter(y => !y.bitti).length
    };
  }

  function yapilacakEkle(metin, son) { if (!veri) yukle(); veri.yapilacaklar.push({ id: yeniId(), metin, son: son || '', bitti: false, bittiTarih: '' }); kaydet(); }
  function gunNotunaEkle(metin) { if (!veri) yukle(); const b = bugun(); veri.gunNotlari[b] = (veri.gunNotlari[b] ? veri.gunNotlari[b] + '\n' : '') + metin; kaydet(); }
  function acikIsler() { if (!veri) yukle(); const b = bugun(); return veri.yapilacaklar.filter(y => !y.bitti).map(y => ({ metin: y.metin, son: y.son, gecikti: !!(y.son && y.son < b), bugun: y.son === b })); }

  window.AjandaEkrani = { ciz, bagla, ozet, yapilacakEkle, gunNotunaEkle, acikIsler };
})();
