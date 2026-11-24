/* ==========================================================
   14. KAT — Sorumlu Hemşire Asistanı
   A) Hazır işlemler: uygulamadaki verilerle bu cihazda çalışır (internet gerekmez)
   B) Yapay zekâ ile: ayrıntılı istek metni hazırlanır, kopyalanıp Claude'a yapıştırılır
   ========================================================== */
(function () {
  'use strict';
  const GUNLER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const CLAUDE = 'https://claude.ai/new';
  const sonuclar = {}; // id → metin
  const formlar = {};  // yapay zekâ formlarının son değerleri
  let kopyalanan = '', ses = { dinliyor: false, metin: '', hata: '', hedef: 'yapilacak', tarih: '' }, tanima = null;

  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const i = (a, s = '') => `<svg class="ikon ${s}" aria-hidden="true"><use href="#i-${a}"/></svg>`;
  const bugunUzun = () => { const d = new Date(); return `${d.getDate()} ${AYLAR[d.getMonth()]} ${GUNLER[d.getDay()]}`; };
  const yaziyaDok = (h) => h.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');

  /* ================= A) Hazır işlemler ================= */
  const HAZIR = [
    { id: 'brifing', no: 40, ikon: 'panel', baslik: 'Sabah servis brifingi', aciklama: 'Vardiya, odalar, uyarılar, ajanda, stok ve sıcaklık tek mesajda.', dugme: 'Brifingi hazırla', calis: brifing },
    { id: 'sbar', no: 7, ikon: 'ekip', baslik: 'Devir teslim (SBAR) özeti', aciklama: 'Servis düzeyinde durum, yapılanlar, uyarılar ve devredilen işler.', dugme: 'Özeti hazırla', calis: sbar },
    { id: 'whatsapp', no: 8, ikon: 'gonder', baslik: 'Görev listesi → WhatsApp', aciklama: 'Şu anki vardiyanın oda paylaşımı ve görevleri, yapıştırmaya hazır.', dugme: 'Mesajı hazırla', calis: whatsapp },
    { id: 'acik', no: 9, ikon: 'zil', baslik: 'Tamamlanmayan işler', aciklama: 'Vardiyada bekleyen rutinler, ek görevler ve ajandadaki geciken işler.', dugme: 'Listele', calis: acikIsler },
    { id: 'vardiya', no: 1, ikon: 'vardiya', baslik: 'Haftalık vardiya taslağı', aciklama: 'Gelecek haftayı kurallara göre planlar; dolu hücrelere dokunmaz.', dugme: 'Taslağı oluştur', calis: vardiyaTaslak, link: ['#vardiya', 'Vardiya planında aç'] },
    { id: 'siparis', no: 11, ikon: 'stok', baslik: 'Haftalık sipariş kontrolü', aciklama: 'Sayılmayan, eski sayımlı, sınırı girilmemiş kalemler ve öneri listesi.', dugme: 'Kontrol et', calis: siparisKontrol, link: ['#stok', 'Stok ekranına git'] },
    { id: 'tuketim', no: 12, ikon: 'uyari', baslik: 'Tüketim artışı', aciklama: 'Son 7 günün tüketimi önceki haftaların ortalamasından belirgin fazla olanlar.', dugme: 'İncele', calis: tuketimArtisi },
    { id: 'fark', no: 15, ikon: 'kritik', baslik: 'Sayım farkı açıklaması', aciklama: 'Olağandışı düşüşleri bulur, olası nedenler için kontrol listesi verir.', dugme: 'İncele', calis: sayimFarki },
    { id: 'fefo', no: 18, ikon: 'saat', baslik: 'Miadı yakın ürünlerde kullanım önceliği', aciklama: 'Dolap dolap “önce bunu kullan” listesi (ilk miadı dolan ilk kullanılır).', dugme: 'Listeyi çıkar', calis: fefo }
  ];

  function brifing() {
    const g = window.GorevEkrani.vardiyaOzeti(), d = new Date(), t = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const V = window.VardiyaEkrani, ad = (id) => (V.personel().find(p => p.id === id) || {}).kisa;
    const gun = V.vardiyadakiler(t, 'G').map(ad), gece = V.vardiyadakiler(t, 'N').map(ad);
    const dik = window.Kat14.dikkat().map(x => '• ' + yaziyaDok(x[2]));
    const aj = window.AjandaEkrani.ozet(), st = window.StokEkrani.analiz(), olc = window.MiatEkrani.sonOlcumler();
    const satir = [`14. Kat · Servis brifingi · ${bugunUzun()}`, '',
      `Gündüz: ${gun.join(', ') || '—'}   Gece: ${gece.join(', ') || '—'}`,
      ...(g.kisiler.length === 2 ? [`Odalar (${g.vardiya === 'G' ? 'gündüz' : 'gece'}): ${g.kisiler.map(k => `${k.ad} ${k.odalar.join(', ')}`).join(' · ')}`] : []),
      '', 'Dikkat:', ...(dik.length ? dik : ['• Önemli uyarı yok']),
      '', 'Bugün:', ...(aj.etkinlikler.length ? aj.etkinlikler.map(e => `• ${e.saat ? e.saat.replace(':', '.') + ' ' : ''}${e.baslik}`) : ['• Planlı toplantı/denetim yok']),
      ...(aj.geciken ? [`• ${aj.geciken} geciken iş var`] : []),
      '', `Stok: ${st.kritik.length ? `${st.kritik.length} kalem kritik (${st.kritik.slice(0, 3).join(', ')}${st.kritik.length > 3 ? '…' : ''})` : 'kritik kalem yok'} · sonraki sipariş ${st.sipTarih}`,
      `Sıcaklık: ${olc.map(o => `${o.ad} ${o.deger}${o.dis ? ' (!)' : ''}`).join(' · ')}`];
    return satir.join('\n');
  }

  function sbar() {
    const g = window.GorevEkrani.vardiyaOzeti(), dik = window.Kat14.dikkat(), aj = window.AjandaEkrani.acikIsler().filter(x => x.gecikti || x.bugun);
    const olc = window.MiatEkrani.sonOlcumler();
    return [
      `14. Kat · Devir teslim · ${bugunUzun()} ${g.vardiya === 'G' ? 'gündüz → gece' : 'gece → gündüz'}`, '',
      'S — Durum',
      `• Nöbetçiler: ${g.kisiler.map(k => `${k.ad} (${k.odalar.join(', ') || 'oda yok'})`).join(' · ') || 'belirlenmedi'}`,
      '', 'B — Vardiyada yapılanlar',
      ...(g.bitenIsler.length ? g.bitenIsler.map(x => `• ${x}`) : ['• Kayıtlı tamamlanan iş yok']),
      '', 'A — Değerlendirme',
      ...(dik.length ? dik.map(x => `• ${yaziyaDok(x[2])}`) : ['• Servis düzeyinde uyarı yok']),
      `• Sıcaklık: ${olc.map(o => `${o.ad} ${o.deger}${o.dis ? ' (aralık dışı)' : ''}`).join(', ')}`,
      '', 'R — Devredilenler',
      ...(g.acikIsler.length ? g.acikIsler.map(x => `• ${x.acil ? '[ACİL] ' : ''}${x.metin} — ${x.kisi}`) : ['• Devredilen açık iş yok']),
      ...aj.map(x => `• ${x.metin}${x.gecikti ? ' (gecikti)' : ' (bugün)'}`),
      '', 'Not: Hasta bazlı klinik bilgiler bu özete eklenmez; devirde ayrıca aktarın.'
    ].join('\n');
  }

  function whatsapp() {
    const g = window.GorevEkrani.vardiyaOzeti();
    return g.metin || 'Bu vardiya için 2 nöbetçi belirlenmemiş. Önce Görev Dağıtımı ekranından nöbetçileri seçin.';
  }

  function acikIsler() {
    const g = window.GorevEkrani.vardiyaOzeti(), aj = window.AjandaEkrani.acikIsler();
    const satir = [`Tamamlanmayan işler · ${bugunUzun()} ${g.vardiya === 'G' ? 'gündüz' : 'gece'}`, '', 'Vardiya:'];
    satir.push(...(g.acikIsler.length ? g.acikIsler.map(x => `• ${x.acil ? '[ACİL] ' : ''}${x.metin} — ${x.kisi}`) : ['• Hepsi tamam']));
    const gec = aj.filter(x => x.gecikti), bug = aj.filter(x => x.bugun), dig = aj.filter(x => !x.gecikti && !x.bugun);
    satir.push('', 'Ajanda:');
    if (!aj.length) satir.push('• Açık iş yok');
    gec.forEach(x => satir.push(`• ${x.metin} (gecikti)`));
    bug.forEach(x => satir.push(`• ${x.metin} (bugün)`));
    if (dig.length) satir.push(`• ${dig.length} iş daha (son tarihi ileride veya yok)`);
    return satir.join('\n');
  }

  function vardiyaTaslak() {
    const r = window.VardiyaEkrani.gelecekHaftaTaslagi();
    const g = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
    return [`Vardiya taslağı · ${r.aralik}`, r.yeniPlanlandi ? 'Boş hücreler kurallara göre dolduruldu ve kaydedildi.' : 'Bu hafta zaten dolu; mevcut plan gösteriliyor.', '',
      `${'Ad'.padEnd(11)}${g.map(x => x.padEnd(4)).join('')}Saat`,
      ...r.satirlar.map(s => `${s.ad.padEnd(11)}${s.kodlar.map(k => k.padEnd(4)).join('')}${String(s.saat).replace('.', ',')}`),
      '', r.eksik || r.ihlal ? `Dikkat: ${r.eksik} eksik vardiya, ${r.ihlal} kural ihlali — Vardiya ekranında kontrol edin.` : 'Her gün 2 gündüz + 2 gece dolu, kural ihlali yok.'].join('\n');
  }

  function siparisKontrol() {
    const a = window.StokEkrani.analiz();
    const s = [`Haftalık sipariş kontrolü · sipariş günü ${a.sipTarih}${a.sipFark === 0 ? ' (bugün)' : ` (${a.sipFark} gün sonra)`}`, ''];
    if (a.bekleyenSiparis) s.push('• Önceki sipariş henüz teslim alınmadı olarak görünüyor.');
    if (a.sayilmadi.length) s.push(`• ${a.sayilmadi.length} kalem hiç sayılmadı${a.sayilmadi.length <= 5 ? ': ' + a.sayilmadi.join(', ') : ''}.`);
    if (a.eskiSayim.length) s.push(`• Sayımı 7 günden eski: ${a.eskiSayim.slice(0, 6).map(x => `${x.ad} (${x.gun} gün)`).join(', ')}${a.eskiSayim.length > 6 ? '…' : ''}`);
    if (a.sinirsiz.length) s.push(`• Alt sınır/hedef girilmemiş (öneri hesaplanamaz): ${a.sinirsiz.slice(0, 6).join(', ')}${a.sinirsiz.length > 6 ? '…' : ''}`);
    s.push('', a.oneriler.length ? `Önerilen sipariş (${a.oneriler.length} kalem):` : 'Önerilecek kalem yok.');
    a.oneriler.forEach(o => s.push(`• ${o.ad} — ${o.miktar} ${o.birim}${o.durum === 'Kritik' ? ' (kritik)' : ''}`));
    return s.join('\n');
  }

  function tuketimArtisi() {
    const a = window.StokEkrani.analiz();
    if (a.gecmisGun < 14) return `Karşılaştırma için en az 2 haftalık sayım geçmişi gerekiyor (şu an ${a.gecmisGun} gün). Sayımları düzenli girdikçe bu analiz çalışmaya başlar.`;
    if (!a.artis.length) return 'Son 7 günde belirgin tüketim artışı yok (eşik: önceki haftaların ortalamasının 1,5 katı).';
    return ['Son 7 günde tüketimi artan kalemler:', '', ...a.artis.map(x => `• ${x.ad}: ${x.bu} ${x.birim} (haftalık ortalama ${String(x.ort).replace('.', ',')})`),
      '', 'Kontrol edin: hasta sayısı/yoğunluk artışı, başka servise verilen, israf veya kayıt hatası.'].join('\n');
  }

  function sayimFarki() {
    const a = window.StokEkrani.analiz();
    if (!a.fark.length) return 'Son 7 günde olağandışı sayım düşüşü yok.';
    return ['Olağandışı düşüşler (son 7 gün):', '',
      ...a.fark.map(x => `• ${x.ad}: ${x.once} → ${x.sonra} ${x.birim} (${x.tarih.split('-').reverse().join('.')})${x.ort != null ? ` · haftalık ortalama ${String(x.ort).replace('.', ',')}` : ''}`),
      '', 'Olası nedenler — sırayla kontrol edin:',
      '1. Sayım veya giriş hatası (yanlış satıra yazma, birim karışıklığı: kutu/adet)',
      '2. Başka servise ödünç / acil durumda kullanım',
      '3. Miat nedeniyle imha veya eczaneye iade',
      '4. Teslim alınan siparişin sisteme girilmemesi',
      '5. Gerçek tüketim artışı (hasta yoğunluğu)',
      '', 'Açıklama yazısı gerekiyorsa “Resmî yazı” bölümünü kullanabilirsiniz.'].join('\n');
  }

  function fefo() {
    const g = window.MiatEkrani.fefo(), dolaplar = Object.keys(g);
    if (!dolaplar.length) return 'Miat kaydı yok. Miat ve Sıcaklık ekranından ürün ekleyin.';
    const s = ['Kullanım önceliği (ilk miadı dolan ilk kullanılır):'];
    dolaplar.forEach(d => {
      s.push('', `${d}:`);
      g[d].forEach((u, n) => s.push(`${n + 1}. ${u.ad} × ${u.adet} — ${u.skt} (${u.kalan < 0 ? `${-u.kalan} gün geçti → kullanmayın, imha` : `${u.kalan} gün`})${u.lot ? ` · lot ${u.lot}` : ''}`));
    });
    return s.join('\n');
  }

  /* ================= B) Yapay zekâ ile ================= */
  const KURAL = 'Kurallar: Türkçe yaz. Hasta adı, TC kimlik no veya kişisel sağlık verisi ekleme. Emin olmadığın bilgiyi uydurma; belirsizse belirt.';
  const YZ = [
    { id: 'yazi', no: 21, ikon: 'ajanda', baslik: 'Resmî yazı / dilekçe taslağı', alanlar: [
        ['kime', 'Kime', 'secim', ['Hemşirelik Hizmetleri Müdürlüğü', 'Başhekimlik', 'Hastane Müdürlüğü', 'Eczane', 'Satın alma birimi', 'Teknik servis', 'Enfeksiyon kontrol komitesi', 'Kalite birimi']],
        ['konu', 'Konu', 'metin', 'Örn. 14. kat ilaç buzdolabı arızası'],
        ['ayrinti', 'Ne anlatılsın?', 'uzun', 'Tarihler, sayılar, talep ettiğiniz şey…']],
      istek: (f) => `Bir hastanenin 14. kat servisinin sorumlu hemşiresiyim. "${f.kime}" makamına resmî yazı (dilekçe formatında) taslağı hazırla.\nKonu: ${f.konu}\nAyrıntılar: ${f.ayrinti}\n\nBiçim: Türk kamu/hastane yazışma üslubu; sayı ve tarih alanları, konu satırı, hitap, kısa ve net gövde (durum → gerekçe → talep), "Gereğini bilgilerinize arz ederim.", imza bloğu: "Sorumlu Hemşire, 14. Kat". Uzunluk en fazla 1 sayfa.\n${KURAL}` },
    { id: 'egitim', no: 31, ikon: 'ekip', baslik: 'Hizmet içi eğitim sunumu', alanlar: [
        ['konu', 'Eğitim konusu', 'metin', 'Örn. Düşme riskinin önlenmesi'],
        ['sure', 'Süre', 'secim', ['15 dakika', '30 dakika', '45 dakika', '60 dakika']],
        ['kitle', 'Katılımcılar', 'secim', ['Servis hemşireleri', 'Yeni başlayan hemşireler', 'Hasta bakım personeli', 'Karma ekip']]],
      istek: (f) => `Hastanede 14. kat (karma servis) için hizmet içi eğitim sunumu hazırla.\nKonu: ${f.konu}\nSüre: ${f.sure}\nKatılımcılar: ${f.kitle}\n\nİstenen: (1) öğrenim hedefleri, (2) slayt slayt başlık + 3-5 madde + konuşmacı notu, (3) vaka örneği, (4) 5 soruluk değerlendirme testi ve cevap anahtarı, (5) yararlanılan güncel kaynaklar (kılavuz adı, yıl). Bilgileri güncel hemşirelik kılavuzlarına dayandır.\n${KURAL}` },
    { id: 'ilac', no: 36, ikon: 'bilgi', baslik: 'İlaç bilgisi ve saklama koşulu', uyari: 'Bilgi amaçlıdır; doz ve tedavi kararı hekime, hazırlama/geçimsizlik sorularında son karar eczacıya aittir. Prospektüsü esas alın.', alanlar: [
        ['ilac', 'İlaç adı (etken madde veya ticari ad)', 'metin', 'Örn. Pantoprazol 40 mg flakon'],
        ['soru', 'Ne öğrenmek istiyorsunuz?', 'secim', ['Saklama koşulu ve açıldıktan sonraki dayanıklılık', 'Sulandırma / seyreltme ve uygulama hızı', 'Hemşirelik izlem noktaları ve yan etkiler', 'Genel bilgi (endikasyon, grup)']],
        ['ek', 'Ek ayrıntı', 'uzun', 'İsteğe bağlı']],
      istek: (f) => `Sorumlu hemşireyim. İlaç: ${f.ilac}\nSoru: ${f.soru}${f.ek ? '\nEk: ' + f.ek : ''}\n\nKısa ve maddeler halinde yanıtla. Her bilginin kaynağını belirt (Türkiye'deki kısa ürün bilgisi/KÜB-KT, üretici prospektüsü veya tanınmış ilaç başvuru kaynağı). Ürüne/firmaya göre değişebilecek noktaları açıkça işaretle ve "prospektüs ile doğrulayın" notu ekle. Doz önerisi verme.\n${KURAL}` },
    { id: 'hasta', no: 38, ikon: 'kisi', baslik: 'Hasta / yakını eğitim metni', alanlar: [
        ['konu', 'Konu', 'metin', 'Örn. Evde insülin uygulaması, taburculuk sonrası yara bakımı'],
        ['kime', 'Kime', 'secim', ['Hasta', 'Hasta yakını', 'Hasta ve yakını']],
        ['bicim', 'Biçim', 'secim', ['Tek sayfalık broşür', 'Kısa madde listesi', 'Soru-cevap']]],
      istek: (f) => `Hastanemizin 14. kat servisinden taburcu olan/yatan ${f.kime.toLocaleLowerCase('tr')} için eğitim metni hazırla.\nKonu: ${f.konu}\nBiçim: ${f.bicim}\n\nSade Türkçe (ortaokul okuma düzeyi), kısa cümleler, tıbbi terimleri açıkla. Bölümler: ne yapmalı, ne yapmamalı, hangi belirtide hastaneye başvurmalı (acil belirtiler ayrı kutuda). Sonuna "Sorularınız için servis hemşirenize danışın" notu ekle. Hekimin bireysel önerilerinin önceliğini belirt.\n${KURAL}` }
  ];

  /* ================= Çizim ================= */
  function ciz() {
    const hazirKart = (h) => `
      <article class="kart as-kart">
        <div class="kart__bas"><h3 class="kart__baslik">${i(h.ikon)}${h.baslik}</h3><span class="rozet rozet-notr">${h.no}</span></div>
        <div class="kart__govde">
          <p class="metin-sm metin-ikincil">${h.aciklama}</p>
          <div class="vrd-eylemler" style="margin-top:12px">
            <button class="btn btn-ikincil btn-sm" type="button" data-hazir="${h.id}">${i('asistan', 'ikon-sm')}${h.dugme}</button>
            ${h.link ? `<a class="btn btn-hayalet btn-sm" href="${h.link[0]}">${h.link[1]}</a>` : ''}
          </div>
          ${sonuclar[h.id] != null ? `<div class="as-sonuc">
            <pre class="as-metin${h.id === 'vardiya' ? ' as-mono' : ''}" id="sonuc-${h.id}" tabindex="0" aria-label="${h.baslik} sonucu">${esc(sonuclar[h.id])}</pre>
            <button class="btn btn-ikincil btn-sm" type="button" data-kopyala="${h.id}">${i('gonder', 'ikon-sm')}${kopyalanan === h.id ? 'Kopyalandı' : 'Kopyala'}</button>
          </div>` : ''}
        </div>
      </article>`;

    const alan = (yz, [ad, etiket, tur, ek]) => {
      const id = `yz-${yz.id}-${ad}`, deger = (formlar[yz.id] || {})[ad] || '';
      if (tur === 'secim') return `<div class="alan"><label class="alan__etiket" for="${id}">${etiket}</label><select id="${id}" class="secim" data-yz="${yz.id}" data-alan="${ad}">${ek.map(o => `<option${o === deger ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`;
      if (tur === 'uzun') return `<div class="alan" style="grid-column:1/-1"><label class="alan__etiket" for="${id}">${etiket}</label><textarea id="${id}" class="metin-alani" rows="3" data-yz="${yz.id}" data-alan="${ad}" placeholder="${esc(ek)}">${esc(deger)}</textarea></div>`;
      return `<div class="alan" style="grid-column:1/-1"><label class="alan__etiket" for="${id}">${etiket}</label><input id="${id}" class="girdi" data-yz="${yz.id}" data-alan="${ad}" placeholder="${esc(ek)}" value="${esc(deger)}"></div>`;
    };
    const yzKart = (y) => `
      <form class="kart as-kart" data-yz-form="${y.id}">
        <div class="kart__bas"><h3 class="kart__baslik">${i(y.ikon)}${y.baslik}</h3><span class="rozet rozet-altin">${y.no}</span></div>
        <div class="kart__govde">
          ${y.uyari ? `<div class="uyari uyari-bilgi" style="margin-bottom:12px">${i('bilgi')}<div><div class="uyari__metin">${y.uyari}</div></div></div>` : ''}
          <div class="form-izgara">${y.alanlar.map(a => alan(y, a)).join('')}</div>
          <p class="alan__hata" id="hata-${y.id}" role="alert" hidden>${i('uyari', 'ikon-sm')}Önce ilk alanı doldurun.</p>
          <div class="vrd-eylemler" style="margin-top:12px">
            <button class="btn btn-birincil btn-sm" type="submit">${i('gonder', 'ikon-sm')}${kopyalanan === 'yz-' + y.id ? 'İstek kopyalandı' : 'İsteği kopyala'}</button>
            <a class="btn btn-ikincil btn-sm" href="${CLAUDE}" target="_blank" rel="noopener">Claude'u aç ↗</a>
          </div>
          ${kopyalanan === 'yz-' + y.id ? '<p class="alan__ipucu" style="margin-top:8px">Claude\'u açın ve mesaj kutusuna yapıştırın (uzun basın → Yapıştır).</p>' : ''}
        </div>
      </form>`;

    const Tanima = window.SpeechRecognition || window.webkitSpeechRecognition;
    const sesKart = `
      <article class="kart as-kart as-ses">
        <div class="kart__bas"><h3 class="kart__baslik">${i('zil')}Sesle not ve hatırlatıcı</h3><span class="rozet rozet-notr">39</span></div>
        <div class="kart__govde">
          ${Tanima ? `
          <div class="as-ses__ust">
            <button class="btn ${ses.dinliyor ? 'btn-tehlike' : 'btn-birincil'} as-mik" type="button" data-ses aria-pressed="${ses.dinliyor}">
              ${ses.dinliyor ? '<span class="as-nokta" aria-hidden="true"></span>Dinliyorum — durdur' : '<svg class="ikon" aria-hidden="true" viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>Konuşarak not al'}
            </button>
            <span class="metin-xs metin-soluk">Türkçe konuşun; bitince durdurun.</span>
          </div>` : `<div class="uyari uyari-bilgi">${i('bilgi')}<div><div class="uyari__metin">Bu tarayıcı sesle yazmayı desteklemiyor. Android'de Chrome ile açın veya klavyedeki mikrofon tuşunu kullanın.</div></div></div>`}
          ${ses.hata ? `<p class="alan__hata" role="alert" style="margin-top:8px">${i('uyari', 'ikon-sm')}${esc(ses.hata)}</p>` : ''}
          <div class="alan" style="margin-top:12px"><label class="alan__etiket" for="ses-metin">Not</label>
            <textarea id="ses-metin" class="metin-alani" rows="3" placeholder="Örn. Yarın 10'da eczaneyi ara">${esc(ses.metin)}</textarea></div>
          <div class="form-izgara" style="margin-top:12px">
            <div class="alan"><label class="alan__etiket" for="ses-hedef">Nereye kaydedilsin?</label>
              <select id="ses-hedef" class="secim"><option value="yapilacak"${ses.hedef === 'yapilacak' ? ' selected' : ''}>Ajanda · yapılacak iş</option><option value="not"${ses.hedef === 'not' ? ' selected' : ''}>Ajanda · günün notu</option></select></div>
            <div class="alan"><label class="alan__etiket" for="ses-tarih">Hatırlatma günü</label><input id="ses-tarih" class="girdi" type="date" value="${ses.tarih}"${ses.hedef === 'not' ? ' disabled' : ''}></div>
          </div>
          <p class="alan__hata" id="ses-bos" role="alert" hidden>${i('uyari', 'ikon-sm')}Önce bir not yazın veya söyleyin.</p>
          <div class="vrd-eylemler" style="margin-top:12px"><button class="btn btn-ikincil btn-sm" type="button" data-ses-kaydet>${i('onay', 'ikon-sm')}Kaydet</button>
            ${ses.kaydedildi ? `<span class="rozet rozet-basari">${i('onay')}Ajandaya eklendi</span> <a class="metin-sm" href="#ajanda">Ajandada gör</a>` : ''}</div>
          <p class="alan__ipucu" style="margin-top:8px">Hatırlatma günü gelen işler Ajanda'da ve Genel Bakış'ta “bugün” olarak görünür. Telefon bildirimi, uygulama telefona kurulduktan sonraki aşamada eklenecek.</p>
        </div>
      </article>`;

    return `
      <div class="sayfa-bas">
        <div>
          <div class="sayfa-bas__ust">Modül 6 · Sorumlu hemşire asistanı</div>
          <h1>Asistan</h1>
          <p class="sayfa-bas__aciklama">Seçtiğiniz 14 konu · ${bugunUzun()}</p>
        </div>
      </div>

      <h2 class="as-bolum">${i('panel')}Hazır işlemler <span class="metin-xs metin-soluk">— uygulamadaki verilerle, bu cihazda çalışır</span></h2>
      <section class="as-izgara">${HAZIR.map(hazirKart).join('')}${sesKart}</section>

      <h2 class="as-bolum">${i('asistan')}Yapay zekâ ile <span class="metin-xs metin-soluk">— istek metni hazırlanır, Claude'a yapıştırılır</span></h2>
      <div class="uyari uyari-uyari" role="note">${i('kilit')}<div><div class="uyari__baslik">Kişisel veri göndermeyin</div><div class="uyari__metin">Hasta adı, TC kimlik numarası ve hastaya ait sağlık bilgisi yazmayın. İstek metinleri bunu ayrıca hatırlatır. Kurumunuzun yapay zekâ kullanım kuralları geçerlidir.</div></div></div>
      <section class="as-izgara">${YZ.map(yzKart).join('')}</section>`;
  }

  /* ================= Etkileşim ================= */
  function yenile(odak) {
    const el = document.getElementById('icerik');
    el.innerHTML = ciz(); bagla(el);
    if (odak) { const o = el.querySelector(odak); if (o) o.focus(); }
  }
  function kopyala(metin, anahtar, odak) {
    const bitti = (ok) => { kopyalanan = ok ? anahtar : ''; yenile(odak); };
    try { navigator.clipboard.writeText(metin).then(() => bitti(true), () => bitti(false)); } catch (e) { bitti(false); }
  }

  function bagla(el) {
    const on = (s, o, fn) => el.querySelectorAll(s).forEach(x => x.addEventListener(o, ev => fn(x, ev)));
    on('[data-hazir]', 'click', b => {
      const h = HAZIR.find(x => x.id === b.dataset.hazir);
      try { sonuclar[h.id] = h.calis(); } catch (e) { sonuclar[h.id] = 'Bu işlem şu an hazırlanamadı. İlgili modülde veri girildiğinden emin olun.'; }
      kopyalanan = ''; yenile(`#sonuc-${h.id}`);
    });
    on('[data-kopyala]', 'click', b => kopyala(sonuclar[b.dataset.kopyala], b.dataset.kopyala, `[data-kopyala="${b.dataset.kopyala}"]`));
    on('[data-yz]', 'input', f => { (formlar[f.dataset.yz] = formlar[f.dataset.yz] || {})[f.dataset.alan] = f.value; const h = document.getElementById('hata-' + f.dataset.yz); if (h) h.hidden = true; });
    on('[data-yz]', 'change', f => { (formlar[f.dataset.yz] = formlar[f.dataset.yz] || {})[f.dataset.alan] = f.value; });
    on('[data-yz-form]', 'submit', (form, ev) => {
      ev.preventDefault();
      const y = YZ.find(x => x.id === form.dataset.yzForm), f = {};
      y.alanlar.forEach(([ad, , tur, ek]) => { const v = form.querySelector(`[data-alan="${ad}"]`).value.trim(); f[ad] = v || (tur === 'secim' ? ek[0] : ''); });
      const ilk = y.alanlar.find(a => a[2] !== 'secim');
      if (ilk && !f[ilk[0]]) { const h = document.getElementById('hata-' + y.id); h.hidden = false; form.querySelector(`[data-alan="${ilk[0]}"]`).focus(); return; }
      formlar[y.id] = f;
      kopyala(y.istek(f), 'yz-' + y.id, `[data-yz-form="${y.id}"] button[type=submit]`);
    });

    /* Ses */
    const metinAlan = el.querySelector('#ses-metin');
    if (metinAlan) metinAlan.addEventListener('input', () => { ses.metin = metinAlan.value; ses.kaydedildi = false; const b = document.getElementById('ses-bos'); if (b) b.hidden = true; });
    on('#ses-hedef', 'change', s => { ses.hedef = s.value; yenile('#ses-hedef'); });
    on('#ses-tarih', 'change', s => { ses.tarih = s.value; });
    on('[data-ses]', 'click', () => {
      const Tanima = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (ses.dinliyor && tanima) { tanima.stop(); return; }
      ses.hata = ''; ses.kaydedildi = false;
      try {
        tanima = new Tanima(); tanima.lang = 'tr-TR'; tanima.interimResults = true; tanima.continuous = true;
        const bas = ses.metin ? ses.metin + ' ' : '';
        tanima.onresult = (e) => {
          let t = ''; for (let n = 0; n < e.results.length; n++) t += e.results[n][0].transcript;
          ses.metin = bas + t; const a = document.getElementById('ses-metin'); if (a) a.value = ses.metin;
        };
        tanima.onerror = (e) => { ses.hata = e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'Mikrofon izni verilmedi. Tarayıcı ayarlarından izin verin.' : e.error === 'network' ? 'Sesle yazma için internet bağlantısı gerekiyor.' : 'Ses alınamadı, tekrar deneyin.'; };
        tanima.onend = () => { ses.dinliyor = false; tanima = null; if (location.hash === '#asistan') yenile('[data-ses]'); };
        tanima.start(); ses.dinliyor = true; yenile('[data-ses]');
      } catch (e) { ses.hata = 'Sesle yazma başlatılamadı.'; yenile('[data-ses]'); }
    });
    on('[data-ses-kaydet]', 'click', () => {
      const m = (ses.metin || '').trim();
      if (!m) { document.getElementById('ses-bos').hidden = false; el.querySelector('#ses-metin').focus(); return; }
      if (ses.hedef === 'not') window.AjandaEkrani.gunNotunaEkle(m); else window.AjandaEkrani.yapilacakEkle(m, ses.tarih);
      ses.metin = ''; ses.tarih = ''; ses.kaydedildi = true; yenile('[data-ses-kaydet]');
    });
  }

  window.AsistanEkrani = { ciz, bagla };
})();
