/* ==========================================================
   14. KAT — Stok ve Sarf Malzeme
   Haftalık sipariş · karma servis başlangıç listesi (düzenlenebilir)
   Mevcut / alt sınır / haftalık hedef → durum ve sipariş önerisi.
   Veri bu cihazın tarayıcısında saklanır (localStorage).
   ========================================================== */
(function () {
  'use strict';
  const ANAHTAR = '14kat.stok.v1';
  const GUNLER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

  /* Karma servis başlangıç listesi: [kategori, [[ad, birim, kritik?], ...]] */
  const LISTE = [
    ['Damar yolu', [['IV kanül 18G', 'adet'], ['IV kanül 20G', 'adet'], ['IV kanül 22G', 'adet'], ['IV kanül 24G', 'adet'], ['Serum seti', 'adet'], ['Perfüzyon seti', 'adet'], ['Kan transfüzyon seti', 'adet', 1], ['Üç yollu musluk', 'adet'], ['Uzatma hattı', 'adet'], ['Kanül tespit örtüsü', 'adet'], ['Turnike', 'adet']]],
    ['Enjektör ve iğne', [['Enjektör 2 ml', 'adet'], ['Enjektör 5 ml', 'adet'], ['Enjektör 10 ml', 'adet'], ['Enjektör 20 ml', 'adet'], ['Enjektör 50 ml', 'adet'], ['İnsülin enjektörü', 'adet'], ['Uç iğne', 'adet'], ['Kesici-delici atık kutusu', 'adet']]],
    ['Kan alma', [['Hemogram tüpü', 'adet'], ['Biyokimya tüpü', 'adet'], ['Koagülasyon tüpü', 'adet'], ['Kan alma iğnesi', 'adet'], ['Holder', 'adet'], ['Kan kültürü şişesi', 'adet'], ['İdrar kabı', 'adet']]],
    ['Sıvılar', [['Serum fizyolojik 100 ml', 'adet'], ['Serum fizyolojik 250 ml', 'adet'], ['Serum fizyolojik 500 ml', 'adet'], ['Serum fizyolojik 1000 ml', 'adet'], ['%5 Dekstroz 500 ml', 'adet'], ['Ringer laktat 500 ml', 'adet'], ['Isolyte S 500 ml', 'adet']]],
    ['Pansuman', [['Steril gazlı bez', 'paket'], ['Sargı bezi', 'adet'], ['Flaster', 'rulo'], ['Hazır yara örtüsü', 'adet'], ['Steril pansuman seti', 'adet'], ['Batikon', 'şişe'], ['Klorheksidin solüsyon', 'şişe'], ['Dikiş alma seti', 'adet'], ['Alkollü swap', 'adet'], ['Pamuk', 'paket']]],
    ['Sonda ve drenaj', [['Foley sonda 14 Fr', 'adet'], ['Foley sonda 16 Fr', 'adet'], ['Foley sonda 18 Fr', 'adet'], ['İdrar torbası', 'adet'], ['Nazogastrik sonda', 'adet'], ['Aspirasyon sondası', 'adet'], ['Dren torbası', 'adet']]],
    ['Solunum', [['Oksijen maskesi', 'adet'], ['Nazal kanül', 'adet'], ['Nebülizatör maskesi', 'adet'], ['Aspirasyon hortumu', 'adet']]],
    ['Koruyucu ekipman', [['Muayene eldiveni S', 'kutu'], ['Muayene eldiveni M', 'kutu'], ['Muayene eldiveni L', 'kutu'], ['Steril eldiven 6,5', 'çift'], ['Steril eldiven 7', 'çift'], ['Steril eldiven 7,5', 'çift'], ['Steril eldiven 8', 'çift'], ['Cerrahi maske', 'kutu'], ['N95 maske', 'adet'], ['Tek kullanımlık önlük', 'adet'], ['Bone', 'paket'], ['El antiseptiği', 'şişe']]],
    ['Hasta bakımı', [['Hasta altı bezi', 'paket'], ['Alt açma seti', 'adet'], ['Islak mendil', 'paket'], ['EKG elektrodu', 'paket'], ['Termometre kılıfı', 'kutu'], ['Ördek', 'adet'], ['Sürgü', 'adet']]],
    ['Acil arabası', [['Entübasyon tüpü 7', 'adet', 1], ['Entübasyon tüpü 7,5', 'adet', 1], ['Entübasyon tüpü 8', 'adet', 1], ['Laringoskop pili', 'adet', 1], ['Ambu', 'adet', 1], ['Defibrilatör pedi', 'çift', 1], ['Airway (orofaringeal)', 'set', 1]]]
  ];

  function tohum() {
    let n = 0;
    const kalemler = [];
    LISTE.forEach(([kat, liste]) => liste.forEach(([ad, birim, kritik]) => kalemler.push({ id: 's' + (++n), ad, kategori: kat, birim, kritik: !!kritik, mevcut: null, min: null, hedef: null, sayim: '' })));
    return { surum: 1, siparisGunu: 1, kalemler, siparisler: [], hareketler: [] };
  }

  let acikKalem = null;
  const GRUPLAR = [['sarf', 'Sarf malzeme'], ['ilac', 'İlaçlar'], ['serum', 'Serumlar'], ['acil', 'Acil arabası']];
  const anaGrup = (k) => k.kategori === 'Acil arabası' ? 'acil' : k.kategori === 'İlaç' ? 'ilac' : k.kategori === 'Sıvılar' ? 'serum' : 'sarf';
  let veri, filtre = { grup: 'sarf', kat: '', ara: '', sadeceEksik: false }, siparisAcik = false, siparisTaslak = null, silSor = null, kopyaDurum = '', ekleAcik = false;
  function yukle() {
    try { const s = localStorage.getItem(ANAHTAR); veri = s ? JSON.parse(s) : null; } catch (e) { veri = null; }
    if (!veri || veri.surum !== 1) veri = tohum();
    if (!veri.hareketler) veri.hareketler = [];
  }
  function hareket(k, tur, once, sonra) {
    veri.hareketler.push({ id: k.id, t: bugun(), tur, once, sonra });
    if (veri.hareketler.length > 3000) veri.hareketler.splice(0, veri.hareketler.length - 3000);
  }
  function kaydet() { try { localStorage.setItem(ANAHTAR, JSON.stringify(veri)); } catch (e) { /* bellekte devam */ } }

  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const bugun = () => iso(new Date());
  const tarih = (s) => new Date(s + 'T12:00:00');
  const uzunTarih = (s) => { const d = tarih(s); return `${d.getDate()} ${AYLAR[d.getMonth()]} ${GUNLER[d.getDay()]}`; };
  const gunFark = (a, b) => Math.round((tarih(b) - tarih(a)) / 864e5);
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const i = (a, s = '') => `<svg class="ikon ${s}" aria-hidden="true"><use href="#i-${a}"/></svg>`;
  const kategoriler = () => [...new Set(veri.kalemler.map(k => k.kategori))];

  /* Durum: sayilmadi · kritik (≤ alt sınır) · azaliyor (< hedefin yarısı) · yeterli */
  function durum(k) {
    if (k.mevcut == null) return 'sayilmadi';
    if (k.min != null && k.mevcut <= k.min) return 'kritik';
    const hedef = k.hedef != null ? k.hedef : (k.min != null ? k.min * 2 : null);
    if (hedef != null && k.mevcut < hedef / 2) return 'azaliyor';
    return 'yeterli';
  }
  const DURUM = {
    sayilmadi: ['rozet-notr', 'bilgi', 'Sayılmadı'],
    kritik: ['rozet-kritik', 'kritik', 'Kritik'],
    azaliyor: ['rozet-uyari', 'uyari', 'Azalıyor'],
    yeterli: ['rozet-basari', 'onay', 'Yeterli']
  };
  const rozet = (d) => `<span class="rozet ${DURUM[d][0]}">${i(DURUM[d][1])}${DURUM[d][2]}</span>`;

  /* Haftalık sipariş önerisi: hedefe tamamla (hedef yoksa alt sınırın 2 katı) */
  const aylik = (k) => k.kategori === 'Acil arabası'; // aylık sayılır, haftalık siparişe girmez
  function acilSayimDurumu() {
    const acil = veri.kalemler.filter(aylik); if (!acil.length) return '';
    const tarihler = acil.map(k => k.sayim).filter(Boolean).sort();
    if (tarihler.length < acil.length) return `${acil.length - tarihler.length} kalem hiç sayılmadı.`;
    const f = gunFark(tarihler[0], bugun());
    return f > 30 ? `Son sayım ${f} gün önce.` : '';
  }
  function oneri(k) {
    if (k.mevcut == null || aylik(k)) return 0;
    const hedef = k.hedef != null ? k.hedef : (k.min != null ? k.min * 2 : null);
    return hedef == null ? 0 : Math.max(0, hedef - k.mevcut);
  }

  function sonrakiSiparis() {
    const d = new Date(); const fark = (veri.siparisGunu - d.getDay() + 7) % 7;
    d.setDate(d.getDate() + fark); return [iso(d), fark];
  }
  const bekleyen = () => veri.siparisler.find(s => s.durum === 'verildi');

  /* ---------- Çizim ---------- */
  function ciz() {
    if (!veri) yukle();
    const say = { kritik: 0, azaliyor: 0, sayilmadi: 0, yeterli: 0 };
    veri.kalemler.forEach(k => say[durum(k)]++);
    const [sipTarih, sipFark] = sonrakiSiparis();
    const bek = bekleyen();
    const ara = filtre.ara.toLocaleLowerCase('tr');
    // Arama yapılırken bütün listede ara; değilse seçili ana grup (ve alt grup)
    const liste = veri.kalemler.filter(k =>
      (ara ? (k.ad.toLocaleLowerCase('tr').includes(ara) || (k.kod || '').toLocaleLowerCase('tr').includes(ara))
           : (anaGrup(k) === filtre.grup && (!filtre.kat || k.kategori === filtre.kat))) &&
      (!filtre.sadeceEksik || ['kritik', 'azaliyor'].includes(durum(k))));
    const grupSay = (g) => { const l = veri.kalemler.filter(k => anaGrup(k) === g); return [l.length, l.filter(k => durum(k) === 'kritik').length]; };
    const altGruplar = [...new Set(veri.kalemler.filter(k => anaGrup(k) === filtre.grup).map(k => k.kategori))];
    const kritikAcil = veri.kalemler.filter(k => k.kritik && durum(k) === 'kritik');

    const sayiGir = (k, alan, etiket) => `<label class="sr-only" for="${alan}-${k.id}">${esc(k.ad)} — ${etiket}</label>
      <input id="${alan}-${k.id}" class="girdi st-sayi" type="number" inputmode="numeric" min="0" step="1" data-alan="${alan}" data-id="${k.id}" value="${k[alan] == null ? '' : k[alan]}" placeholder="—">`;

    const satirlar = liste.map(k => {
      const d = durum(k);
      const hedef = k.hedef != null ? k.hedef : (k.min != null ? k.min * 2 : null);
      const oran = k.mevcut == null || !hedef ? 0 : Math.min(100, Math.round(k.mevcut / hedef * 100));
      const acik = acikKalem === k.id;
      return `<tr class="${acik ? 'acik' : ''}">
        <td data-etiket="Malzeme"><button class="st-ad" type="button" data-ac-kalem="${k.id}" aria-expanded="${acik}"><strong>${esc(k.ad)}</strong>${k.kritik && filtre.grup !== 'acil' || (k.kritik && ara) ? ' <span class="rozet rozet-kritik st-acil">Acil arabası</span>' : ''}
          <span class="metin-xs metin-soluk">${ara ? esc(k.kategori) + ' · ' : ''}${esc(k.birim)}${k.kod ? ' · ' + esc(k.kod) : ''}${aylik(k) ? ' · aylık sayım' : ''}${k.sayim ? ` · ${gunFark(k.sayim, bugun()) === 0 ? 'bugün sayıldı' : gunFark(k.sayim, bugun()) + ' gün önce sayıldı'}` : ''}${k.min != null ? ` · alt sınır ${k.min}` : ''}</span></button></td>
        <td data-etiket="Mevcut" class="sayi">${sayiGir(k, 'mevcut', 'mevcut')}</td>
        <td data-etiket="Alt sınır" class="sayi">${sayiGir(k, 'min', 'alt sınır')}</td>
        <td data-etiket="Haftalık hedef" class="sayi">${sayiGir(k, 'hedef', 'haftalık hedef')}</td>
        <td data-etiket="Seviye" class="st-seviye">${k.mevcut == null || !hedef ? '<span class="metin-xs metin-soluk">—</span>' : `<div class="ilerleme" role="img" aria-label="Hedefin yüzde ${oran}'i"><div class="ilerleme__dolu ${d === 'kritik' ? 'kritik' : d === 'azaliyor' ? 'uyari' : 'altin'}" style="width:${oran}%"></div></div>`}</td>
        <td data-etiket="Durum">${rozet(d)}</td>
        <td data-etiket="" class="st-sil">${silSor === k.id
          ? `<span class="vrd-onay"><button class="btn btn-tehlike btn-sm" type="button" data-sil-evet="${k.id}">Sil</button><button class="btn btn-hayalet btn-sm" type="button" data-sil-hayir>Vazgeç</button></span>`
          : `<button class="btn btn-hayalet btn-ikon btn-sm" type="button" data-sil="${k.id}" aria-label="${esc(k.ad)} listeden çıkar">${i('kapat', 'ikon-sm')}</button>`}</td>
      </tr>`;
    }).join('');

    const taslak = siparisAcik ? (siparisTaslak || (siparisTaslak = Object.fromEntries(veri.kalemler.filter(k => oneri(k) > 0).map(k => [k.id, oneri(k)])))) : null;

    return `
      <div class="sayfa-bas">
        <div>
          <div class="sayfa-bas__ust">Modül 4 · Haftalık sipariş</div>
          <h1>Stok ve Sarf Malzeme</h1>
          <p class="sayfa-bas__aciklama">${veri.kalemler.length} kalem · Sonraki sipariş: <span class="metin-altin">${uzunTarih(sipTarih)}${sipFark === 0 ? ' (bugün)' : ` (${sipFark} gün)`}</span></p>
        </div>
        <div class="vrd-eylemler">
          <button class="btn btn-altin" type="button" data-eylem="siparis" aria-expanded="${siparisAcik}">${i('gonder')}Sipariş listesi</button>
        </div>
      </div>

      <section class="izgara izgara-4" aria-label="Stok özeti">
        <button class="kart istatistik st-ozet" type="button" data-durum-filtre="eksik" aria-pressed="${filtre.sadeceEksik}"><span class="istatistik__etiket">${i('kritik')}Kritik</span><span class="istatistik__deger" style="color:var(--renk-kritik)">${say.kritik}</span><span class="istatistik__not">Alt sınırda veya altında</span></button>
        <button class="kart istatistik st-ozet" type="button" data-durum-filtre="eksik" aria-pressed="${filtre.sadeceEksik}"><span class="istatistik__etiket">${i('uyari')}Azalıyor</span><span class="istatistik__deger" style="color:var(--renk-uyari)">${say.azaliyor}</span><span class="istatistik__not">Hedefin yarısının altında</span></button>
        <div class="kart istatistik"><span class="istatistik__etiket">${i('onay')}Yeterli</span><span class="istatistik__deger">${say.yeterli}</span><span class="istatistik__not">${veri.kalemler.length} kalemden</span></div>
        <div class="kart istatistik"><span class="istatistik__etiket">${i('bilgi')}Sayılmadı</span><span class="istatistik__deger metin-soluk">${say.sayilmadi}</span><span class="istatistik__not">Mevcut girilmemiş</span></div>
      </section>

      ${kritikAcil.length ? `<div class="uyari uyari-kritik" role="alert">${i('kritik')}<div><div class="uyari__baslik">Acil arabası malzemesi kritik seviyede</div><div class="uyari__metin">${kritikAcil.length} kalem: ${kritikAcil.slice(0, 3).map(k => esc(k.ad)).join(', ')}${kritikAcil.length > 3 ? ` ve ${kritikAcil.length - 3} kalem daha` : ''}. Haftalık siparişi beklemeden tamamlayın.</div>
        ${filtre.grup !== 'acil' || filtre.ara ? '<div class="vrd-adaylar"><button class="btn btn-ikincil btn-sm" type="button" data-grup="acil">Acil arabasını aç</button></div>' : ''}</div></div>` : ''}
      ${bek ? `<div class="uyari uyari-bilgi" role="status">${i('stok')}<div><div class="uyari__baslik">${uzunTarih(bek.tarih)} siparişi teslim bekliyor</div>
        <div class="uyari__metin">${bek.kalemler.length} kalem. Teslim alındığında miktarlar mevcuda eklenir.</div>
        <div class="vrd-adaylar"><button class="btn btn-birincil btn-sm" type="button" data-eylem="teslim">${i('onay', 'ikon-sm')}Teslim alındı</button><button class="btn btn-hayalet btn-sm" type="button" data-eylem="siparis-iptal">Siparişi iptal et</button></div></div></div>` : ''}
      ${acilSayimDurumu() && say.sayilmadi !== veri.kalemler.length ? `<div class="uyari uyari-uyari" role="status">${i('kalender')}<div><div class="uyari__baslik">Acil arabası aylık sayımı bekliyor</div><div class="uyari__metin">${acilSayimDurumu()} Sayımı “Acil arabası” sekmesinden girin.</div></div></div>` : ''}
      ${say.sayilmadi === veri.kalemler.length ? `<div class="uyari uyari-bilgi" role="status">${i('bilgi')}<div><div class="uyari__baslik">İlk sayımı yapın</div><div class="uyari__metin">Her kalem için mevcut miktarı, alt sınırı ve haftalık hedefi girin. Kullanmadığınız kalemleri × ile çıkarın. Sipariş önerisi hedefe tamamlayacak şekilde hesaplanır.</div></div></div>` : ''}

      ${siparisAcik ? `
      <section class="kart kart-premium" aria-label="Sipariş listesi">
        <div class="kart__bas"><h2 class="kart__baslik">${i('gonder')}Haftalık sipariş listesi</h2>
          <button class="btn btn-hayalet btn-ikon btn-sm" type="button" data-eylem="siparis" aria-label="Kapat">${i('kapat', 'ikon-sm')}</button></div>
        <div class="kart__govde">
          ${Object.keys(taslak).length ? `<ul class="st-siparis">${Object.entries(taslak).map(([id, m]) => { const k = veri.kalemler.find(x => x.id === id); return k ? `<li>
              <span class="st-siparis__ad">${esc(k.ad)} ${rozet(durum(k))}</span>
              <span class="st-siparis__m"><label class="sr-only" for="sp-${id}">${esc(k.ad)} sipariş miktarı</label><input id="sp-${id}" class="girdi st-sayi" type="number" min="0" inputmode="numeric" data-sp="${id}" value="${m}"> <span class="metin-xs metin-soluk">${esc(k.birim)}</span>
              <button class="btn btn-hayalet btn-ikon btn-sm" type="button" data-sp-cikar="${id}" aria-label="${esc(k.ad)} siparişten çıkar">${i('kapat', 'ikon-sm')}</button></span></li>` : ''; }).join('')}</ul>`
            : '<p class="metin-sm metin-soluk">Önerilecek kalem yok. Mevcut, alt sınır ve haftalık hedef girilmiş kalemlerde hedefin altında kalanlar burada listelenir.</p>'}
        </div>
        ${Object.keys(taslak).length ? `<div class="kart__alt vrd-alt">
          <span class="metin-xs metin-ikincil">${Object.keys(taslak).length} kalem · öneri = haftalık hedef − mevcut · acil arabası aylık sayıldığı için dahil değil</span>
          <span class="vrd-eylemler">
            <button class="btn btn-ikincil btn-sm" type="button" data-eylem="kopyala">${i('gonder', 'ikon-sm')}${kopyaDurum || 'Listeyi kopyala'}</button>
            ${bek ? '' : `<button class="btn btn-birincil btn-sm" type="button" data-eylem="verildi">${i('onay', 'ikon-sm')}Sipariş verildi</button>`}
          </span></div>` : ''}
      </section>` : ''}

      <div class="kart">
        <div class="kart__bas st-arac">
          <div class="st-gruplar" role="tablist" aria-label="Ana grup">
            ${GRUPLAR.map(([g, ad]) => { const [n, kr] = grupSay(g); return `<button class="st-grup" role="tab" type="button" data-grup="${g}" aria-selected="${!ara && filtre.grup === g}">
              <span class="st-grup__ad">${ad}</span><span class="st-grup__say">${n} kalem${kr ? ` · <span class="st-grup__kritik">${kr} kritik</span>` : ''}</span></button>`; }).join('')}
          </div>
          ${!ara && altGruplar.length > 1 ? `<div class="st-filtre" role="group" aria-label="Alt grup">
            <button class="sekme" type="button" data-kat="" aria-pressed="${!filtre.kat}">Tümü</button>
            ${altGruplar.map(c => `<button class="sekme" type="button" data-kat="${esc(c)}" aria-pressed="${filtre.kat === c}">${esc(c)} <span class="metin-soluk">${veri.kalemler.filter(k => k.kategori === c).length}</span></button>`).join('')}
          </div>` : ''}
          <div class="st-arama">
            <label class="sr-only" for="st-ara">Malzeme ara</label>
            <input id="st-ara" class="girdi" type="search" placeholder="Malzeme adı veya kodu ara" value="${esc(filtre.ara)}">
            <label class="onay"><input type="checkbox" data-eksik${filtre.sadeceEksik ? ' checked' : ''}> Yalnızca eksikler</label>
          </div>
        </div>
        <div class="tablo-sarici">
          <table class="tablo tablo-mobil st-tablo">
            <thead><tr><th>Malzeme</th><th class="sayi">Mevcut</th><th class="sayi">Alt sınır</th><th class="sayi">Haftalık hedef</th><th>Seviye</th><th>Durum</th><th><span class="sr-only">Sil</span></th></tr></thead>
            <tbody>${satirlar || `<tr><td colspan="7"><p class="metin-sm metin-soluk" style="padding:12px 0">Bu filtreye uyan malzeme yok.</p></td></tr>`}</tbody>
          </table>
        </div>
        <div class="kart__alt">
          ${ekleAcik ? `<form class="st-ekle" data-ekle-form>
            <div class="alan"><label class="alan__etiket" for="y-ad">Malzeme adı</label><input id="y-ad" class="girdi" name="ad" required maxlength="60"></div>
            <div class="alan"><label class="alan__etiket" for="y-kat">Kategori</label><select id="y-kat" class="secim" name="kategori">${kategoriler().map(c => `<option${(filtre.kat ? filtre.kat === c : veri.kalemler.some(k => k.kategori === c && anaGrup(k) === filtre.grup)) ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
            <div class="alan"><label class="alan__etiket" for="y-birim">Birim</label><select id="y-birim" class="secim" name="birim">${['adet', 'paket', 'kutu', 'şişe', 'rulo', 'çift', 'set'].map(b => `<option>${b}</option>`).join('')}</select></div>
            <label class="onay"><input type="checkbox" name="kritik"> Acil arabası</label>
            <span class="vrd-eylemler"><button class="btn btn-birincil btn-sm" type="submit">${i('arti', 'ikon-sm')}Ekle</button><button class="btn btn-hayalet btn-sm" type="button" data-eylem="ekle">Vazgeç</button></span>
          </form>` : `<div class="vrd-alt"><button class="btn btn-ikincil btn-sm" type="button" data-eylem="ekle">${i('arti', 'ikon-sm')}Malzeme ekle</button>
            <label class="metin-xs metin-ikincil st-gun">Sipariş günü
              <select class="secim gr-kucuk" data-siparis-gunu>${[1, 2, 3, 4, 5, 6, 0].map(g => `<option value="${g}"${veri.siparisGunu === g ? ' selected' : ''}>${GUNLER[g]}</option>`).join('')}</select></label></div>`}
        </div>
      </div>
      <p class="metin-xs metin-soluk">Başlangıç listesi karma servis için önerilmiştir; gerçek listenize göre düzenleyin. Veriler bu cihazın tarayıcısında saklanır.</p>`;
  }

  function siparisMetni() {
    const satir = [`14. Kat · Haftalık malzeme siparişi · ${uzunTarih(bugun())}`, ''];
    let kat = '';
    veri.kalemler.filter(k => siparisTaslak[k.id] > 0).forEach(k => {
      if (k.kategori !== kat) { kat = k.kategori; satir.push(`${kat}:`); }
      satir.push(`  • ${k.ad} — ${siparisTaslak[k.id]} ${k.birim}`);
    });
    return satir.join('\n');
  }

  /* ---------- Etkileşim ---------- */
  function yenile(odak) {
    const el = document.getElementById('icerik');
    el.innerHTML = ciz(); bagla(el);
    if (odak) { const o = el.querySelector(odak); if (o) { o.focus(); if (o.select && o.type !== 'search') try { o.select(); } catch (e) { /* */ } } }
  }
  function bagla(el) {
    const on = (s, o, fn) => el.querySelectorAll(s).forEach(x => x.addEventListener(o, ev => fn(x, ev)));
    on('[data-alan]', 'change', inp => {
      const k = veri.kalemler.find(x => x.id === inp.dataset.id), alan = inp.dataset.alan;
      const v = inp.value === '' ? null : Math.max(0, Math.round(+inp.value));
      if (alan === 'mevcut' && k.mevcut != null && v != null && v !== k.mevcut) hareket(k, 'sayim', k.mevcut, v);
      k[alan] = v; if (alan === 'mevcut') k.sayim = v == null ? '' : bugun();
      kaydet();
      // Odak nereye geçtiyse (Tab / dokunma) yeniden çizimden sonra orada kalsın
      setTimeout(() => { const a = document.activeElement; yenile(a && a !== document.body && a.id ? `#${a.id}` : null); }, 0);
    });
    // Enter ile alttaki satırın aynı alanına geç (hızlı sayım)
    on('[data-alan]', 'keydown', (inp, ev) => {
      if (ev.key !== 'Enter') return; ev.preventDefault();
      const hepsi = [...el.querySelectorAll(`[data-alan="${inp.dataset.alan}"]`)], j = hepsi.indexOf(inp);
      const sonraki = hepsi[j + 1];
      if (sonraki) sonraki.focus(); else inp.blur();
    });
    on('[data-kat]', 'click', b => { filtre.kat = b.dataset.kat; yenile(`[data-kat="${b.dataset.kat}"]`); });
    on('[data-grup]', 'click', b => { filtre.grup = b.dataset.grup; filtre.kat = ''; filtre.ara = ''; acikKalem = null; yenile(`[data-grup="${b.dataset.grup}"]`); });
    on('[data-ac-kalem]', 'click', b => { acikKalem = acikKalem === b.dataset.acKalem ? null : b.dataset.acKalem; silSor = null; yenile(acikKalem ? `#min-${acikKalem}` : `[data-ac-kalem="${b.dataset.acKalem}"]`); });
    on('#st-ara', 'input', inp => { filtre.ara = inp.value; const pos = inp.selectionStart; yenile('#st-ara'); const y = document.getElementById('st-ara'); if (y) y.setSelectionRange(pos, pos); });
    on('[data-eksik]', 'change', c => { filtre.sadeceEksik = c.checked; yenile('[data-eksik]'); });
    on('[data-durum-filtre]', 'click', () => { filtre.sadeceEksik = !filtre.sadeceEksik; yenile(); });
    on('[data-sil]', 'click', b => { silSor = b.dataset.sil; yenile('[data-sil-hayir]'); });
    on('[data-sil-hayir]', 'click', () => { silSor = null; yenile(); });
    on('[data-sil-evet]', 'click', b => { veri.kalemler = veri.kalemler.filter(k => k.id !== b.dataset.silEvet); silSor = null; kaydet(); yenile(); });
    on('[data-siparis-gunu]', 'change', s => { veri.siparisGunu = +s.value; kaydet(); yenile('[data-siparis-gunu]'); });
    on('[data-sp]', 'change', inp => { siparisTaslak[inp.dataset.sp] = Math.max(0, Math.round(+inp.value || 0)); kopyaDurum = ''; });
    on('[data-sp-cikar]', 'click', b => { delete siparisTaslak[b.dataset.spCikar]; kopyaDurum = ''; yenile(); });
    on('[data-ekle-form]', 'submit', (f, ev) => {
      ev.preventDefault(); const d = Object.fromEntries(new FormData(f)); if (!d.ad.trim()) return;
      const id = 's' + Date.now().toString(36);
      veri.kalemler.push({ id, ad: d.ad.trim(), kategori: d.kategori, birim: d.birim, kritik: !!d.kritik, mevcut: null, min: null, hedef: null, sayim: '' });
      // kategorisine göre sırala (kategori sırası korunur)
      const sira = kategoriler(); veri.kalemler.sort((a, b) => sira.indexOf(a.kategori) - sira.indexOf(b.kategori));
      kaydet(); ekleAcik = false; filtre.grup = anaGrup({ kategori: d.kategori }); filtre.kat = filtre.grup === 'sarf' ? d.kategori : ''; yenile(`#mevcut-${id}`);
    });
    on('[data-eylem]', 'click', b => {
      const e = b.dataset.eylem;
      if (e === 'siparis') { siparisAcik = !siparisAcik; siparisTaslak = null; kopyaDurum = ''; yenile('[data-eylem="siparis"]'); }
      if (e === 'ekle') { ekleAcik = !ekleAcik; yenile(ekleAcik ? '#y-ad' : '[data-eylem="ekle"]'); }
      if (e === 'kopyala') {
        el.querySelectorAll('[data-sp]').forEach(inp => { siparisTaslak[inp.dataset.sp] = Math.max(0, Math.round(+inp.value || 0)); });
        const bitti = (ok) => { kopyaDurum = ok ? 'Kopyalandı' : 'Kopyalanamadı'; yenile('[data-eylem="kopyala"]'); };
        try { navigator.clipboard.writeText(siparisMetni()).then(() => bitti(true), () => bitti(false)); } catch (x) { bitti(false); }
      }
      if (e === 'verildi') {
        el.querySelectorAll('[data-sp]').forEach(inp => { siparisTaslak[inp.dataset.sp] = Math.max(0, Math.round(+inp.value || 0)); });
        veri.siparisler.push({ tarih: bugun(), durum: 'verildi', kalemler: Object.entries(siparisTaslak).filter(([, m]) => m > 0).map(([id, m]) => ({ id, m })) });
        kaydet(); siparisAcik = false; siparisTaslak = null; yenile();
      }
      if (e === 'teslim') {
        const s = bekleyen();
        s.kalemler.forEach(({ id, m }) => { const k = veri.kalemler.find(x => x.id === id); if (k) { hareket(k, 'teslim', k.mevcut || 0, (k.mevcut || 0) + m); k.mevcut = (k.mevcut || 0) + m; k.sayim = bugun(); } });
        s.durum = 'teslim'; s.teslim = bugun(); kaydet(); yenile();
      }
      if (e === 'siparis-iptal') { const s = bekleyen(); s.durum = 'iptal'; kaydet(); yenile(); }
    });
  }

  function ozet() {
    if (!veri) yukle();
    const say = { kritik: 0, azaliyor: 0, sayilmadi: 0 };
    veri.kalemler.forEach(k => { const d = durum(k); if (d in say) say[d]++; });
    return { ...say, toplam: veri.kalemler.length, acilKritik: veri.kalemler.filter(k => k.kritik && durum(k) === 'kritik').map(k => k.ad), acilSayimGecikti: veri.kalemler.every(k => k.mevcut == null) ? '' : acilSayimDurumu() };
  }

  /* Asistan için analiz */
  function analiz() {
    if (!veri) yukle();
    const b = bugun();
    // Tüketim = sayımlardaki düşüşler. Son 7 gün ile önceki 21 günün haftalık ortalaması.
    const tuketim = (id, basGun, bitGun) => veri.hareketler.filter(h => h.id === id && h.tur === 'sayim' && gunFark(h.t, b) >= basGun && gunFark(h.t, b) < bitGun)
      .reduce((t, h) => t + Math.max(0, h.once - h.sonra), 0);
    const ilkKayit = veri.hareketler.length ? veri.hareketler.map(h => h.t).sort()[0] : null;
    const gecmisGun = ilkKayit ? gunFark(ilkKayit, b) : 0;
    const artis = [], fark = [];
    veri.kalemler.forEach(k => {
      const bu = tuketim(k.id, 0, 7), once = tuketim(k.id, 7, 28), ort = gecmisGun >= 14 ? once / Math.min(3, Math.max(1, (gecmisGun - 7) / 7)) : null;
      if (ort != null && bu >= 3 && bu > ort * 1.5) artis.push({ ad: k.ad, birim: k.birim, bu, ort: Math.round(ort * 10) / 10 });
      veri.hareketler.filter(h => h.id === k.id && h.tur === 'sayim' && gunFark(h.t, b) < 7).forEach(h => {
        const dusus = h.once - h.sonra;
        if (dusus > 0 && ((ort != null && ort > 0 && dusus > ort * 2) || (ort == null && dusus >= h.once * 0.5 && dusus >= 5)))
          fark.push({ ad: k.ad, birim: k.birim, once: h.once, sonra: h.sonra, tarih: h.t, ort: ort == null ? null : Math.round(ort * 10) / 10 });
      });
    });
    const [sipTarih, sipFark] = sonrakiSiparis();
    return {
      gecmisGun, sipTarih: uzunTarih(sipTarih), sipFark,
      sayilmadi: veri.kalemler.filter(k => k.mevcut == null && !aylik(k)).map(k => k.ad),
      eskiSayim: veri.kalemler.filter(k => !aylik(k) && k.sayim && gunFark(k.sayim, b) > 7).map(k => ({ ad: k.ad, gun: gunFark(k.sayim, b) })),
      sinirsiz: veri.kalemler.filter(k => k.mevcut != null && k.min == null && k.hedef == null && !aylik(k)).map(k => k.ad),
      kritik: veri.kalemler.filter(k => durum(k) === 'kritik').map(k => k.ad),
      oneriler: veri.kalemler.filter(k => oneri(k) > 0).map(k => ({ ad: k.ad, miktar: oneri(k), birim: k.birim, durum: DURUM[durum(k)][2] })),
      bekleyenSiparis: !!bekleyen(), artis, fark
    };
  }

  window.StokEkrani = { ciz, bagla, ozet, analiz, siparisGunu: () => { if (!veri) yukle(); return veri.siparisGunu; } };
})();
