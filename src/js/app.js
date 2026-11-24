/* ==========================================================
   14. KAT — Uygulama kabuğu
   Hash tabanlı yönlendirme + 6 modül iskeleti.
   NOT: Ekranlardaki bütün kayıtlar ÖRNEK VERİDİR; gerçek veri bağlantısı
   sonraki aşamada eklenecek.
   ========================================================== */
(function () {
  'use strict';

  const i = (ad, sinif = '') => `<svg class="ikon ${sinif}" aria-hidden="true"><use href="#i-${ad}"/></svg>`;

  const rozet = {
    basari: (t) => `<span class="rozet rozet-basari">${i('onay')}${t}</span>`,
    uyari:  (t) => `<span class="rozet rozet-uyari">${i('uyari')}${t}</span>`,
    kritik: (t) => `<span class="rozet rozet-kritik">${i('kritik')}${t}</span>`,
    bilgi:  (t) => `<span class="rozet rozet-bilgi">${i('bilgi')}${t}</span>`,
    altin:  (t) => `<span class="rozet rozet-altin">${t}</span>`,
    notr:   (t) => `<span class="rozet rozet-notr">${t}</span>`
  };

  const uyariKutu = (tur, ikon, baslik, metin) => `
    <div class="uyari uyari-${tur}" role="${tur === 'kritik' ? 'alert' : 'status'}">
      ${i(ikon)}
      <div><div class="uyari__baslik">${baslik}</div><div class="uyari__metin">${metin}</div></div>
    </div>`;

  const sayfaBas = (ust, baslik, aciklama, eylem = '') => `
    <div class="sayfa-bas">
      <div>
        <div class="sayfa-bas__ust">${ust}</div>
        <h1>${baslik}</h1>
        <p class="sayfa-bas__aciklama">${aciklama}</p>
      </div>
      ${eylem}
    </div>`;

  const ornekNotu = `<p class="metin-xs metin-soluk">Bu ekrandaki kayıtlar tasarım önizlemesi için örnek veridir.</p>`;

  /* Genel bakış için bütün modüllerden uyarılar: [tür, ikon, başlık, metin] */
  const kac = (t) => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function dikkat() {
    const u = [];
    if (!window.VardiyaEkrani.personel().length) u.push(['bilgi', 'ekip', 'Ekibinizi ekleyin', 'Vardiya Planlayıcı ekranından hemşireleri ekleyin; diğer modüller bu listeyi kullanır.']);
    const m = window.MiatEkrani.ozet(), st = window.StokEkrani.ozet(), vr = window.VardiyaEkrani.ozet();
    m.sicaklikDisi.forEach(x => u.push(['kritik', 'termometre', `${kac(x.ad)} ${x.deger}`, `İzin verilen aralık ${x.aralik}. Ölçüm ${x.saat}.`]));
    vr.eksik.forEach(x => u.push(['kritik', 'vardiya', `${x.gun} ${x.vardiya}: ${x.var}/2 kişi`, 'Vardiya planında eksik personel var.']));
    if (m.miatGecen) u.push(['kritik', 'kritik', `${m.miatGecen} ürünün miadı geçmiş`, 'Dolaptan çıkarıp imha edin.']);
    if (st.acilKritik.length) u.push(['kritik', 'stok', 'Acil arabası malzemesi kritik', st.acilKritik.map(kac).join(', ')]);
    const yakin = m.miatYakin.filter(x => x.kalan <= 7);
    if (yakin.length) u.push(['uyari', 'saat', `${yakin.length} ürünün miadı 7 gün içinde doluyor`, yakin.slice(0, 3).map(x => `${kac(x.ad)} (${x.adet})`).join(', ')]);
    if (st.kritik - st.acilKritik.length > 0) u.push(['uyari', 'stok', `${st.kritik - st.acilKritik.length} malzeme alt sınırda`, 'Stok modülünden sipariş listesine bakın.']);
    if (st.acilSayimGecikti) u.push(['uyari', 'stok', 'Acil arabası aylık sayımı bekliyor', st.acilSayimGecikti]);
    if (m.kontrolBekleyen.length) u.push(['uyari', 'kalender', `Aylık dolap kontrolü bekleyen: ${m.kontrolBekleyen.length}`, m.kontrolBekleyen.map(kac).join(', ')]);
    if (m.olcumEksik) u.push(['uyari', 'termometre', 'Bu vardiyanın sıcaklık ölçümü eksik', 'Miat ve Sıcaklık ekranından girin.']);
    const yg = window.AyarlarEkrani.sonYedekGun();
    if (window.AyarlarEkrani.veriVar() && (yg == null || yg > 7)) u.push(['uyari', 'kilit', yg == null ? 'Henüz yedek alınmadı' : `Son yedek ${yg} gün önce`, 'Ayarlar → “Yedek dosyası indir”. Kayıtlar yalnızca bu cihazda.']);
    return u.slice(0, 7);
  }

  window.Kat14 = { dikkat };

  /* ---------------- Modüller ---------------- */
  const moduller = {
    panel: {
      baslik: 'Genel Bakış', ikon: 'panel',
      ciz: () => `
        ${sayfaBas('14. Kat · Servis', 'Günaydın, Sorumlu Hemşire', 'Bugün 24 Kasım Salı · Gündüz vardiyası', `<a class="btn btn-altin" href="#asistan">${i('asistan')}Sabah brifingi</a>`)}
        <section class="izgara izgara-4" aria-label="Günün özeti">
          ${(() => { const d = new Date(), t = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; const g = window.VardiyaEkrani.vardiyadakiler(t, 'G').length, n = window.VardiyaEkrani.vardiyadakiler(t, 'N').length; return `<a class="kart istatistik" href="#vardiya" style="text-decoration:none;color:inherit"><div class="istatistik__etiket">${i('ekip')}Bugün vardiyada</div><div class="istatistik__deger"${g + n < 4 ? ' style="color:var(--renk-kritik)"' : ''}>${g + n}<span class="metin-soluk" style="font-size:1rem">/4</span></div><div class="istatistik__not">${g} gündüz · ${n} gece</div></a>`; })()}
          <a class="kart istatistik" href="#gorevler" style="text-decoration:none;color:inherit"><div class="istatistik__etiket">${i('gorev')}Açık görev</div><div class="istatistik__deger">${window.GorevEkrani.ozet().acik}</div><div class="istatistik__not">Şu anki vardiya · ${window.GorevEkrani.ozet().acil} acil</div></a>
          ${(() => { const st = window.StokEkrani.ozet(); return `<a class="kart istatistik" href="#stok" style="text-decoration:none;color:inherit"><div class="istatistik__etiket">${i('stok')}Kritik stok</div><div class="istatistik__deger${st.kritik ? '' : ' metin-altin'}"${st.kritik ? ' style="color:var(--renk-kritik)"' : ''}>${st.kritik}</div><div class="istatistik__not">${st.sayilmadi === st.toplam ? 'İlk sayım yapılmadı' : `${st.azaliyor} kalem azalıyor`}</div></a>`; })()}
          ${(() => { const m = window.MiatEkrani.ozet(); return `<a class="kart istatistik" href="#miat" style="text-decoration:none;color:inherit"><div class="istatistik__etiket">${i('termometre')}Sıcaklık uyarısı</div><div class="istatistik__deger"${m.sicaklikDisi.length ? ' style="color:var(--renk-kritik)"' : ''}>${m.sicaklikDisi.length}</div><div class="istatistik__not">${m.olcumEksik ? 'Bu vardiyanın ölçümü eksik' : 'Bu vardiya ölçüldü'}</div></a>`; })()}
        </section>
        <section class="izgara izgara-2-1">
          <div class="kart">
            ${(() => { const u = dikkat(); return `<div class="kart__bas"><h2 class="kart__baslik">${i('uyari')}Dikkat gerektirenler</h2>${u.length ? rozet.kritik(u.length + ' kayıt') : rozet.basari('Temiz')}</div>
            <div class="kart__govde" style="display:flex;flex-direction:column;gap:12px">
              ${u.length ? u.map(x => uyariKutu(x[0], x[1], x[2], x[3])).join('') : '<p class="metin-sm metin-soluk">Şu an dikkat gerektiren bir durum yok.</p>'}
            </div>`; })()}
          </div>
          ${(() => { const aj = window.AjandaEkrani.ozet(); return `<div class="kart">
            <div class="kart__bas"><h2 class="kart__baslik">${i('ajanda')}Bugünkü ajanda</h2><a href="#ajanda" class="btn btn-hayalet btn-sm">Tümü</a></div>
            <div class="kart__govde">
              ${aj.etkinlikler.length ? `<ul class="liste">${aj.etkinlikler.map(e => `<li><span class="rakam metin-altin" style="min-width:56px">${e.saat ? e.saat.replace(':', '.') : 'Gün boyu'}</span><span>${e.baslik.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))}</span></li>`).join('')}</ul>`
                : '<p class="metin-sm metin-soluk">Bugün için etkinlik yok.</p>'}
              <p class="metin-xs ${aj.geciken ? '' : 'metin-soluk'}" style="margin-top:12px${aj.geciken ? ';color:var(--renk-kritik)' : ''}">${aj.acik} açık iş${aj.geciken ? ` · ${aj.geciken} gecikti` : ''}</p>
            </div>
          </div>`; })()}
        </section>`
    },

    vardiya: {
      baslik: 'Vardiya Planlayıcı', ikon: 'vardiya',
      ciz: () => window.VardiyaEkrani.ciz(),
      bagla: (el) => window.VardiyaEkrani.bagla(el)
    },

    gorevler: {
      baslik: 'Görev Dağıtımı', ikon: 'gorev',
      ciz: () => window.GorevEkrani.ciz(),
      bagla: (el) => window.GorevEkrani.bagla(el)
    },

    ajanda: {
      baslik: 'Ajanda', ikon: 'ajanda',
      ciz: () => window.AjandaEkrani.ciz(),
      bagla: (el) => window.AjandaEkrani.bagla(el)
    },

    stok: {
      baslik: 'Stok ve Sarf Malzeme', ikon: 'stok',
      ciz: () => window.StokEkrani.ciz(),
      bagla: (el) => window.StokEkrani.bagla(el)
    },

    miat: {
      baslik: 'Miat ve Sıcaklık', ikon: 'termometre',
      ciz: () => window.MiatEkrani.ciz(),
      bagla: (el) => window.MiatEkrani.bagla(el)
    },

    asistan: {
      baslik: 'Asistan', ikon: 'asistan',
      ciz: () => window.AsistanEkrani.ciz(),
      bagla: (el) => window.AsistanEkrani.bagla(el)
    },

    ayarlar: {
      baslik: 'Ayarlar', ikon: 'ayar',
      ciz: () => window.AyarlarEkrani.ciz(),
      bagla: (el) => window.AyarlarEkrani.bagla(el)
    },

    tasarim: {
      baslik: 'Tasarım Sistemi', ikon: 'ayar',
      ciz: () => {
        const renk = (ad, v, hex, koyu) => `<div class="kart" style="overflow:hidden"><div style="height:72px;background:var(${v});${koyu ? 'border-bottom:1px solid var(--renk-kenar)' : ''}"></div><div style="padding:12px"><div class="metin-sm"><strong>${ad}</strong></div><div class="metin-xs metin-ikincil rakam">${hex} · ${v}</div></div></div>`;
        return `
        ${sayfaBas('Geliştirici', 'Tasarım Sistemi', 'Bütün modüllerde kullanılan ortak renkler ve bileşenler')}
        <section class="kart"><div class="kart__bas"><h2 class="kart__baslik">${i('ayar')}Renk paleti</h2></div>
          <div class="kart__govde izgara izgara-4">
            ${renk('Ana arka plan', '--renk-arka-plan', '#09090B', 1)}${renk('Kart ve panel', '--renk-kart', '#17131F', 1)}
            ${renk('Premium mor', '--renk-mor', '#8B3DFF')}${renk('Koyu mor', '--renk-mor-koyu', '#5B21B6')}
            ${renk('Altın sarısı', '--renk-altin', '#F5C542')}${renk('Parlak altın', '--renk-altin-parlak', '#FFD966')}
            ${renk('Ana metin', '--renk-metin', '#F8F8FA')}${renk('İkincil metin', '--renk-metin-ikincil', '#B9B4C5')}
            ${renk('Mor metin (erişilebilir)', '--renk-mor-metin', '#B28CFF')}${renk('Başarı', '--renk-basari', '#4ADE80')}
            ${renk('Uyarı', '--renk-uyari', '#FB923C')}${renk('Kritik', '--renk-kritik', '#F87171')}
          </div></section>
        <section class="kart"><div class="kart__bas"><h2 class="kart__baslik">${i('ayar')}Butonlar ve rozetler</h2></div>
          <div class="kart__govde" style="display:flex;flex-direction:column;gap:16px">
            <div style="display:flex;flex-wrap:wrap;gap:8px">
              <button class="btn btn-birincil">Birincil</button><button class="btn btn-altin">Altın</button>
              <button class="btn btn-ikincil">İkincil</button><button class="btn btn-hayalet">Hayalet</button>
              <button class="btn btn-tehlike">Sil</button><button class="btn btn-birincil" disabled>Pasif</button>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:8px">${rozet.basari('Normal')}${rozet.uyari('Azalıyor')}${rozet.kritik('Kritik')}${rozet.bilgi('Bilgi')}${rozet.altin('Premium')}${rozet.notr('Nötr')}</div>
          </div></section>
        <section class="kart"><div class="kart__bas"><h2 class="kart__baslik">${i('ayar')}Uyarılar</h2></div>
          <div class="kart__govde" style="display:flex;flex-direction:column;gap:12px">
            ${uyariKutu('kritik', 'kritik', 'Kritik', 'Hemen müdahale gerektiren durum.')}
            ${uyariKutu('uyari', 'uyari', 'Uyarı', 'Yakında dikkat gerektirecek durum.')}
            ${uyariKutu('basari', 'onay', 'Başarılı', 'İşlem tamamlandı.')}
            ${uyariKutu('bilgi', 'bilgi', 'Bilgi', 'Genel bilgilendirme.')}
          </div></section>
        <section class="kart"><div class="kart__bas"><h2 class="kart__baslik">${i('ayar')}Form alanları</h2></div>
          <div class="kart__govde form-izgara">
            <div class="alan"><label class="alan__etiket" for="f1">Personel adı</label><input id="f1" class="girdi" placeholder="Ad Soyad"><span class="alan__ipucu">Tam adı yazın</span></div>
            <div class="alan"><label class="alan__etiket" for="f2">Vardiya</label><select id="f2" class="secim"><option>Sabah</option><option>Akşam</option><option>Gece</option></select></div>
            <div class="alan"><label class="alan__etiket" for="f3">Sıcaklık (°C)</label><input id="f3" class="girdi" value="9,4" aria-invalid="true" aria-describedby="f3h"><span id="f3h" class="alan__hata">${i('uyari', 'ikon-sm')}2–8 °C aralığı dışında</span></div>
            <label class="onay"><input type="checkbox" checked> Eczaneye bildir</label>
          </div></section>`;
      }
    }
  };

  /* ---------------- Menü yapısı ---------------- */
  const menu = [
    { grup: 'Genel', ogeler: [['panel', 'Genel Bakış']] },
    { grup: 'Modüller', ogeler: [
      ['vardiya', 'Vardiya Planlayıcı', () => window.VardiyaEkrani.ozet().eksik.length], ['gorevler', 'Görev Dağıtımı', () => window.GorevEkrani.ozet().acik], ['ajanda', 'Ajanda'],
      ['stok', 'Stok ve Sarf', () => window.StokEkrani.ozet().kritik], ['miat', 'Miat ve Sıcaklık', () => { const m = window.MiatEkrani.ozet(); return m.sicaklikDisi.length + m.miatGecen + m.miatYakin.filter(u => u.kalan <= 7).length; }], ['asistan', 'Asistan']
    ]},
    { grup: 'Sistem', ogeler: [['ayarlar', 'Ayarlar', () => { const g = window.AyarlarEkrani.sonYedekGun(); return window.AyarlarEkrani.veriVar() && (g == null || g > 7) ? 1 : 0; }]] }
  ];
  const altNav = [['panel', 'Panel'], ['vardiya', 'Vardiya'], ['gorevler', 'Görevler'], ['stok', 'Stok'], ['asistan', 'Asistan']];

  function menuyuCiz() {
    document.getElementById('menu-icerik').innerHTML = menu.map(g => `
      <div class="menu__grup-baslik">${g.grup}</div>
      <ul class="menu__liste">${g.ogeler.map(([id, ad, s]) => { const sayi = typeof s === 'function' ? s() : s; return `
        <li><a class="menu__link" href="#${id}" data-rota="${id}">${i(moduller[id].ikon)}<span>${ad}</span>${sayi ? `<span class="menu__sayac" aria-label="${sayi} uyarı">${sayi}</span>` : ''}</a></li>`; }).join('')}
      </ul>`).join('');
    document.getElementById('alt-nav').innerHTML = altNav.map(([id, ad]) =>
      `<a href="#${id}" data-rota="${id}">${i(moduller[id].ikon)}<span>${ad}</span></a>`).join('');
  }

  function git() {
    const rota = (location.hash || '#panel').slice(1);
    const m = moduller[rota] || moduller.panel;
    const anahtar = moduller[rota] ? rota : 'panel';
    document.querySelectorAll('.yazdir-kopya').forEach(x => x.remove());
    menuyuCiz();
    const icerik = document.getElementById('icerik');
    icerik.innerHTML = m.ciz();
    document.getElementById('ust-baslik').textContent = m.baslik;
    const sa = new Date().getHours(), vr = document.getElementById('vardiya-rozet');
    if (vr) vr.textContent = sa >= 8 && sa < 20 ? 'Gündüz vardiyası' : 'Gece vardiyası';
    document.title = `${m.baslik} · 14. Kat`;
    document.querySelectorAll('[data-rota]').forEach(a => {
      if (a.dataset.rota === anahtar) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    menuKapat();
    window.scrollTo(0, 0);
    if (m.bagla) m.bagla(icerik);
    // Sekme bileşeni
    icerik.querySelectorAll('[role="tablist"]').forEach(tl => tl.addEventListener('click', e => {
      const s = e.target.closest('[role="tab"]'); if (!s) return;
      tl.querySelectorAll('[role="tab"]').forEach(x => x.setAttribute('aria-selected', x === s));
    }));
  }

  /* ---------------- Mobil menü ---------------- */
  const menuEl = () => document.getElementById('menu');
  const perde = () => document.getElementById('perde');
  const acBtn = () => document.getElementById('menu-ac');
  function menuAc() { menuEl().classList.add('acik'); perde().hidden = false; acBtn().setAttribute('aria-expanded', 'true'); menuEl().querySelector('a')?.focus(); }
  function menuKapat() { menuEl().classList.remove('acik'); perde().hidden = true; acBtn().setAttribute('aria-expanded', 'false'); }

  document.addEventListener('DOMContentLoaded', () => {
    git();
    window.addEventListener('hashchange', git);
    acBtn().addEventListener('click', menuAc);
    perde().addEventListener('click', menuKapat);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') menuKapat(); });
    // Açılış ekranı
    const y = document.getElementById('yukleme');
    if (y) setTimeout(() => y.classList.add('gizli'), 500);
  });
})();
