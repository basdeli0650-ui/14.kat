/* ==========================================================
   14. KAT — PIN kilidi
   PIN cihazda yalnızca PBKDF2 (SHA-256, 150.000 tur, rastgele tuz) özeti olarak saklanır.
   Oturum sekme/uygulama kapanınca biter; 10 dakikadan uzun arka planda kalınca kilitlenir.
   ========================================================== */
(function () {
  'use strict';
  const PIN = '14kat.pin.v1';
  const OTURUM = '14kat.oturum';
  const ARKA = '14kat.arkaPlan';
  const DENEME = '14kat.pinDeneme';
  const TUR = 150000;
  const KILIT_DK = 10;

  const hex = (b) => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
  const bayt = (h) => new Uint8Array(h.match(/../g).map(x => parseInt(x, 16)));
  const oku = (k, depo = localStorage) => { try { return depo.getItem(k); } catch (e) { return null; } };
  const yaz = (k, v, depo = localStorage) => { try { depo.setItem(k, v); } catch (e) { /* */ } };
  const sil = (k, depo = localStorage) => { try { depo.removeItem(k); } catch (e) { /* */ } };

  async function ozet(pin, tuz) {
    const anahtar = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
    return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: tuz, iterations: TUR }, anahtar, 256));
  }
  const gecerli = (pin) => /^\d{4,6}$/.test(pin);

  const Kilit = {
    destek: () => !!(window.crypto && crypto.subtle),
    kurulu: () => !!oku(PIN),
    gecerli,
    async kur(pin) {
      if (!gecerli(pin)) throw new Error('gecersiz');
      const tuz = crypto.getRandomValues(new Uint8Array(16));
      yaz(PIN, JSON.stringify({ tuz: hex(tuz), ozet: await ozet(pin, tuz), tur: TUR }));
      sil(DENEME); this.oturumAc();
    },
    /* Yanlış denemelerde artan bekleme: 5. hatadan sonra 30 sn, sonra katlanarak */
    beklemeSn() {
      const d = JSON.parse(oku(DENEME) || '{"n":0,"t":0}');
      if (d.n < 5) return 0;
      const sure = 30 * Math.pow(2, Math.min(d.n - 5, 5)) * 1000;
      return Math.max(0, Math.ceil((d.t + sure - Date.now()) / 1000));
    },
    async dogrula(pin) {
      const k = JSON.parse(oku(PIN) || 'null'); if (!k) return false;
      const ok = (await ozet(pin, bayt(k.tuz))) === k.ozet;
      if (ok) { sil(DENEME); this.oturumAc(); }
      else { const d = JSON.parse(oku(DENEME) || '{"n":0,"t":0}'); yaz(DENEME, JSON.stringify({ n: d.n + 1, t: Date.now() })); }
      return ok;
    },
    async degistir(eski, yeni) {
      if (!(await this.dogrula(eski))) return false;
      await this.kur(yeni); return true;
    },
    oturumAc() { yaz(OTURUM, String(Date.now()), sessionStorage); sil(ARKA, sessionStorage); },
    oturumVar() { return !!oku(OTURUM, sessionStorage); },
    kilitle() { sil(OTURUM, sessionStorage); location.replace('index.html'); },
    /* PIN unutulursa: kilit ve bütün kayıtlar silinir (veriler yalnızca cihazda olduğu için) */
    sifirla() {
      const sz = []; try { for (let n = 0; n < localStorage.length; n++) { const k = localStorage.key(n); if (k && k.startsWith('14kat.')) sz.push(k); } } catch (e) { /* */ }
      sz.forEach(k => sil(k)); sil(OTURUM, sessionStorage);
    },
    /* Panelde: arka planda uzun kalınca kilitle */
    izle() {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) yaz(ARKA, String(Date.now()), sessionStorage);
        else {
          const t = +oku(ARKA, sessionStorage) || 0; sil(ARKA, sessionStorage);
          if (t && Date.now() - t > KILIT_DK * 60000 && this.kurulu()) this.kilitle();
        }
      });
    }
  };
  window.Kilit = Kilit;
})();
