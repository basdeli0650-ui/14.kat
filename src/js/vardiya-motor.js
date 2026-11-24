/* ==========================================================
   14. KAT — Vardiya motoru (arayüzden bağımsız, saf fonksiyonlar)
   Kodlar:  G = 08.00-20.00 gündüz   N = 20.00-08.00 gece
            T = tatil   YI = yıllık izin (Yİ)   R = rapor   '' = boş
   ========================================================== */
(function (kok) {
  'use strict';

  const KODLAR = {
    G:  { ad: 'Gündüz',      etiket: 'G',  saat: '08.00-20.00', sure: 12, calisma: true },
    N:  { ad: 'Gece',        etiket: 'N',  saat: '20.00-08.00', sure: 12, calisma: true },
    T:  { ad: 'Tatil',       etiket: 'T',  saat: 'T',  sure: 0, calisma: false },
    YI: { ad: 'Yıllık izin', etiket: 'Yİ', saat: 'Yİ', sure: 0, calisma: false, izin: true },
    R:  { ad: 'Rapor',       etiket: 'R',  saat: 'R',  sure: 0, calisma: false, izin: true }
  };

  const KURAL = {
    gunduzKisi: 2,        // her gündüz vardiyasında
    geceKisi: 2,          // her gece vardiyasında
    maxArdisikGun: 4,     // art arda en fazla çalışma günü
    maxArdisikGece: 2,    // art arda en fazla gece
    haftalikNorm: 45,     // saat; üstü fazla mesai
    izinGunSaati: 7.5     // Yİ ve R günleri haftalık saate bu kadar sayılır
  };

  const calisir = (k) => k === 'G' || k === 'N';

  /* ---------- Kişi izleyici: bir kişinin son günlerdeki durumu ---------- */
  const BOS_IZ = { son: 'T', ardisikGun: 0, ardisikGece: 0, tatil: 2, geceyleBitti: false, gBlok: 0 };

  function ilerle(t, kod) {
    const c = calisir(kod);
    return {
      son: c ? kod : 'T',
      ardisikGun: c ? t.ardisikGun + 1 : 0,
      ardisikGece: kod === 'N' ? t.ardisikGece + 1 : 0,
      tatil: c ? 0 : t.tatil + 1,
      geceyleBitti: c ? kod === 'N' : t.geceyleBitti,
      gBlok: kod === 'G' ? (t.son === 'G' ? t.gBlok + 1 : 1) : 0
    };
  }
  const izle = (dizi) => dizi.reduce(ilerle, { ...BOS_IZ });

  /* Kesin kurallar: bu kod bu kişiye bu gün yazılabilir mi? */
  function uygunMu(t, kod) {
    if (!calisir(kod)) return true;
    if (t.ardisikGun >= KURAL.maxArdisikGun) return false;
    if (kod === 'N' && t.ardisikGece >= KURAL.maxArdisikGece) return false;
    if (kod === 'G' && t.son === 'N') return false; // geceden çıkan gündüze giremez
    return true;
  }

  /* Tercih maliyeti: 2 gündüz → 2 gece → 2 tatil düzenine yakınlık */
  function maliyet(t, kod) {
    if (kod === 'G') {
      if (t.son === 'T' && t.tatil < 2 && t.geceyleBitti) return 4; // geceden sonra tek gün dinlenme
      if (t.son === 'G' && t.gBlok >= 2) return 2;                   // 3. gündüz
      return 0;
    }
    if (kod === 'N') {
      if (t.son === 'T') return 2;                 // tatilden doğrudan geceye
      if (t.son === 'G' && t.gBlok < 2) return 1.5; // tek gündüzden sonra gece
      return 0;
    }
    // tatil
    if (t.son === 'N' && t.ardisikGece < 2) return 2;
    if (t.son === 'G') return 2;
    if (t.son === 'T' && t.tatil >= 2) return 1.5;
    return 0;
  }

  function* kombinasyon(dizi, k, bas = 0, sec = []) {
    if (sec.length === k) { yield sec.slice(); return; }
    for (let i = bas; i <= dizi.length - (k - sec.length); i++) {
      sec.push(dizi[i]); yield* kombinasyon(dizi, k, i + 1, sec); sec.pop();
    }
  }

  /* ---------- Otomatik planlama (ışın araması) ----------
     kisiler:   ['id', ...]
     hafta:     { id: [7 kod] }  — dolu hücreler SABİT kalır, yalnızca '' doldurulur
     gecmis:    { id: [önceki günlerin kodları] }
     fazlaToplam: { id: saat } — önceki haftalardan biriken fazla mesai (adalet için)
  */
  function planla(kisiler, hafta, gecmis = {}, fazlaToplam = {}, genislik = 400) {
    let isinlar = [{
      iz: kisiler.map(id => izle(gecmis[id] || [])),
      kod: kisiler.map(() => []),
      sayi: kisiler.map(() => 0),
      m: 0
    }];

    for (let g = 0; g < 7; g++) {
      const yeni = [];
      for (const d of isinlar) {
        const sabit = kisiler.map(id => (hafta[id] && hafta[id][g]) || '');
        const sabitG = sabit.filter(k => k === 'G').length;
        const sabitN = sabit.filter(k => k === 'N').length;
        const serbest = kisiler.map((_, i) => i).filter(i => !sabit[i]);
        const gerekG = Math.max(0, KURAL.gunduzKisi - sabitG);
        const gerekN = Math.max(0, KURAL.geceKisi - sabitN);
        const uygunG = serbest.filter(i => uygunMu(d.iz[i], 'G'));
        const kG = Math.min(gerekG, uygunG.length);

        for (const gSec of kombinasyon(uygunG, kG)) {
          const uygunN = serbest.filter(i => !gSec.includes(i) && uygunMu(d.iz[i], 'N'));
          const kN = Math.min(gerekN, uygunN.length);
          for (const nSec of kombinasyon(uygunN, kN)) {
            let m = d.m + (gerekG - kG + gerekN - kN) * 1000; // eksik kişi: çok ağır ceza
            const iz = d.iz.slice(), kod = d.kod.map(a => a.slice()), sayi = d.sayi.slice();
            kisiler.forEach((id, i) => {
              const k = sabit[i] || (gSec.includes(i) ? 'G' : nSec.includes(i) ? 'N' : 'T');
              if (!sabit[i]) {
                m += maliyet(iz[i], k);
                if (calisir(k)) m += 1.2 * sayi[i] + 0.04 * (fazlaToplam[id] || 0); // yükü dengele
              }
              if (calisir(k)) sayi[i]++;
              iz[i] = ilerle(iz[i], k);
              kod[i].push(k);
            });
            yeni.push({ iz, kod, sayi, m });
          }
        }
      }
      yeni.sort((a, b) => a.m - b.m);
      isinlar = yeni.slice(0, genislik);
    }
    const en = isinlar[0];
    const sonuc = {};
    kisiler.forEach((id, i) => { sonuc[id] = en.kod[i]; });
    return sonuc;
  }

  /* ---------- Denetim: kural ihlalleri ve eksik vardiyalar ---------- */
  function denetle(kisiler, hafta, gecmis = {}) {
    const ihlal = [];
    kisiler.forEach(id => {
      const once = gecmis[id] || [];
      let t = izle(once);
      (hafta[id] || []).forEach((k, g) => {
        if (calisir(k)) {
          if (t.ardisikGun >= KURAL.maxArdisikGun) ihlal.push({ id, gun: g, tur: 'ardisikGun', mesaj: `${KURAL.maxArdisikGun} günden fazla art arda çalışma (${t.ardisikGun + 1}. gün)` });
          if (k === 'N' && t.ardisikGece >= KURAL.maxArdisikGece) ihlal.push({ id, gun: g, tur: 'ardisikGece', mesaj: `${KURAL.maxArdisikGece} geceden fazla art arda gece (${t.ardisikGece + 1}. gece)` });
          if (k === 'G' && t.son === 'N') ihlal.push({ id, gun: g, tur: 'geceSonrasiGunduz', mesaj: 'Geceden çıktığı gün gündüze yazılmış' });
        }
        t = ilerle(t, k || 'T');
      });
    });
    const eksik = [];
    for (let g = 0; g < 7; g++) {
      const say = (kod) => kisiler.filter(id => hafta[id] && hafta[id][g] === kod).length;
      const bos = kisiler.filter(id => !(hafta[id] && hafta[id][g])).length;
      [['G', KURAL.gunduzKisi], ['N', KURAL.geceKisi]].forEach(([kod, gerek]) => {
        const var_ = say(kod);
        if (var_ < gerek) eksik.push({ gun: g, kod, var: var_, gerek, bos });
      });
    }
    return { ihlal, eksik };
  }

  /* Eksik bir vardiyaya kural bozmadan kim yazılabilir? */
  function adaylar(kisiler, hafta, gecmis, gun, kod) {
    return kisiler.filter(id => {
      const mevcut = (hafta[id] && hafta[id][gun]) || '';
      if (mevcut && mevcut !== 'T') return false; // çalışıyor veya izinli
      const deneme = { ...hafta, [id]: hafta[id].slice() };
      deneme[id][gun] = kod;
      return denetle([id], deneme, gecmis).ihlal.length === 0;
    });
  }

  /* Saat hesabı: vardiya saatleri + izin/rapor günleri (7,5 saat) */
  function saatler(dizi) {
    const d = dizi || [];
    const calisma = d.reduce((t, k) => t + (KODLAR[k] ? KODLAR[k].sure : 0), 0);
    const izin = d.filter(k => KODLAR[k] && KODLAR[k].izin).length * KURAL.izinGunSaati;
    const toplam = calisma + izin;
    return { calisma, izin, toplam, fazla: Math.max(0, toplam - KURAL.haftalikNorm) };
  }

  const motor = { KODLAR, KURAL, calisir, izle, ilerle, uygunMu, planla, denetle, adaylar, saatler };
  if (typeof module !== 'undefined' && module.exports) module.exports = motor;
  else kok.VardiyaMotoru = motor;
})(typeof window !== 'undefined' ? window : globalThis);
