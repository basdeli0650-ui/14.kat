/* 14. KAT — Giriş: PIN belirleme / PIN ile açma / PIN'i unuttum */
(function () {
  'use strict';
  const K = window.Kilit;
  const kutu = document.getElementById('giris-icerik');
  const alt = document.getElementById('giris-alt');
  const i = (a) => `<svg class="ikon" aria-hidden="true"><use href="#i-${a}"/></svg>`;
  const pinAlani = (id, etiket, ipucu) => `<div class="alan"><label class="alan__etiket" for="${id}">${etiket}</label>
    <input id="${id}" class="girdi pin-girdi" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" required>
    ${ipucu ? `<span class="alan__ipucu">${ipucu}</span>` : ''}</div>`;
  const hata = (m) => `<p class="alan__hata" role="alert">${i('uyari')}${m}</p>`;
  const panele = () => location.replace('panel.html');

  function kurulum(m = '') {
    alt.textContent = 'İlk açılış: uygulama için bir PIN belirleyin';
    kutu.innerHTML = `<form class="giris__form" id="f">
      ${pinAlani('p1', 'Yeni PIN', '4–6 rakam')}${pinAlani('p2', 'PIN tekrar', '')}
      ${m ? hata(m) : ''}
      <button class="btn btn-birincil btn-tam" type="submit">${i('kilit')}PIN'i kaydet ve aç</button></form>
      <p class="alan__ipucu" style="margin-top:12px">PIN'i unutursanız kayıtlar yalnızca bir yedek dosyasından geri getirilebilir. Ayarlar'dan düzenli yedek alın.</p>`;
    const f = document.getElementById('f'); document.getElementById('p1').focus();
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const a = f.p1.value, b = f.p2.value;
      if (!K.gecerli(a)) return kurulum('PIN 4–6 rakamdan oluşmalı.');
      if (a !== b) return kurulum('İki PIN aynı değil.');
      f.querySelector('button').disabled = true;
      await K.kur(a); panele();
    });
  }

  function giris(m = '') {
    alt.textContent = 'Devam etmek için PIN girin';
    const bekle = K.beklemeSn();
    kutu.innerHTML = `<form class="giris__form" id="f">
      ${pinAlani('p1', 'PIN', '')}
      ${bekle ? hata(`Çok fazla hatalı deneme. ${bekle} saniye bekleyin.`) : m ? hata(m) : ''}
      <button class="btn btn-birincil btn-tam" type="submit"${bekle ? ' disabled' : ''}>${i('kilit')}Aç</button></form>
      <button class="btn btn-hayalet btn-sm" type="button" id="unuttum" style="margin:12px auto 0;display:flex">PIN'i unuttum</button>`;
    const f = document.getElementById('f'), p = document.getElementById('p1');
    if (bekle) { setTimeout(() => giris(), bekle * 1000); } else p.focus();
    p.addEventListener('input', () => { if (p.value.length === 6) f.requestSubmit(); });
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (K.beklemeSn()) return giris();
      if (!K.gecerli(p.value)) return giris('PIN 4–6 rakamdan oluşur.');
      f.querySelector('button').disabled = true;
      if (await K.dogrula(p.value)) panele(); else giris('PIN yanlış.');
    });
    document.getElementById('unuttum').addEventListener('click', unuttum);
  }

  function unuttum(m = '') {
    alt.textContent = 'PIN sıfırlama';
    kutu.innerHTML = `<div class="uyari uyari-kritik" role="alert">${i('kritik')}<div>
        <div class="uyari__baslik">Bu cihazdaki bütün kayıtlar silinir</div>
        <div class="uyari__metin">PIN bilinmeden kayıtlar açılamaz. Sıfırladıktan sonra yeni PIN belirleyip Ayarlar → “Yedekten geri yükle” ile son yedeğinizi yükleyebilirsiniz.</div></div></div>
      <form class="giris__form" id="f" style="margin-top:16px">
        <div class="alan"><label class="alan__etiket" for="onay">Onaylamak için SİL yazın</label><input id="onay" class="girdi" autocomplete="off" autocapitalize="characters"></div>
        ${typeof m === 'string' && m ? hata(m) : ''}
        <button class="btn btn-tehlike btn-tam" type="submit">Kayıtları sil ve sıfırla</button>
        <button class="btn btn-hayalet btn-tam" type="button" id="vazgec">Vazgeç</button></form>`;
    document.getElementById('vazgec').addEventListener('click', () => giris());
    const f = document.getElementById('f'); document.getElementById('onay').focus();
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      if (f.onay.value.trim().toLocaleUpperCase('tr-TR') !== 'SİL') return unuttum('Onay metni “SİL” olmalı.');
      K.sifirla(); kurulum();
    });
  }

  if (!K.destek()) {
    kutu.innerHTML = hata('Bu tarayıcı güvenli PIN kilidini desteklemiyor. Uygulamayı Chrome ile, https adresinden açın.');
  } else if (!K.kurulu()) kurulum();
  else if (K.oturumVar()) panele();
  else giris();
})();
