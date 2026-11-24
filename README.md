# 14. Kat

14. kattaki sorumlu hemşirenin servis operasyonlarını yönettiği uygulama.
Bu sürüm **marka kimliği ve arayüz temelidir**: tasarım sistemi, ortak bileşenler,
giriş ekranı ve 6 modülün iskeleti. Ekranlardaki kayıtlar örnek veridir.

## Çalıştırma
Derleme adımı yoktur. `index.html` dosyasını tarayıcıda açın
ya da klasörde basit bir sunucu başlatın:

    python -m http.server 8000   →  http://localhost:8000

## Klasör yapısı
    index.html               Giriş ekranı
    panel.html               Uygulama (sol menü + modüller, #rota ile)
    manifest.webmanifest     Mobil uygulama simgesi / ana ekrana ekle
    public/branding/         Logo dosyaları (orijinal + boyutlar)
    src/styles/tokens.css    TÜM renk, boşluk, yazı değişkenleri
    src/styles/base.css      Temel stiller
    src/styles/components.css Buton, kart, rozet, uyarı, tablo, form, yükleme
    src/styles/layout.css    Menü, üst bar, mobil alt menü, giriş
    src/js/ikonlar.js        İkon seti
    src/js/app.js            Yönlendirme ve modül ekranları

## Logo
`public/branding/logo-14kat-orijinal.png` kullanıcının verdiği orijinal dosyadır, değiştirilmez.
Diğer dosyalar bu dosyanın yalnızca küçültülmüş kopyalarıdır:
favicon.ico (16/32/48), 16–512 px PNG, apple-touch-icon (180), maskable 512.

## Renk kuralları
- Kodda doğrudan HEX yazılmaz; `tokens.css` değişkenleri kullanılır.
- `--renk-mor` (#8B3DFF) **zemin** rengidir (buton, aktif menü).
  Koyu zeminde mor **yazı** için `--renk-mor-metin` (#B28CFF) kullanılır,
  çünkü #8B3DFF metin olarak WCAG AA kontrastını karşılamaz (3.66:1).
- Durum renkleri (kritik/uyarı/başarı) her zaman ikon + metinle birlikte kullanılır.

## Test edilenler
- 375 px (telefon) ve 1440 px (masaüstü) genişlikte bütün ekranlar, yatay taşma yok
- Konsol hatası yok
- Dokunma hedefleri ≥ 36 px (ana kontroller 44 px)
- Metin kontrastları WCAG AA
- Klavye: "İçeriğe geç" bağlantısı, görünür odak halkası, Esc ile mobil menü kapanır

## Modül 1 — Vardiya Planlayıcı
- `src/js/vardiya-motor.js` — kurallar, otomatik planlama, denetim (arayüzden bağımsız; Node'da da çalışır)
- `src/js/vardiya-ekran.js` — haftalık çizelge ekranı, yazdırma formu
- `src/styles/vardiya.css`

Kurallar: her vardiyada 2 kişi (08.00–20.00 / 20.00–08.00) · düzen 2 gündüz → 2 gece → 2 izin ·
art arda en fazla 4 gün ve 2 gece · geceden çıkan aynı gün gündüze yazılmaz · haftalık norm 45 saat; Yİ ve R günleri 7,5 saat sayılır.
Otomatik planlama yalnızca boş hücreleri doldurur; izinler (Yİ, R) ve elle girilenler korunur.
Veriler şimdilik tarayıcıda (localStorage) saklanır. Sorumlu hemşire listeye dahil değildir.

## Modül 2 — Görev Dağıtımı
- `src/js/gorev-ekran.js`, `src/styles/gorev.css`
- Nöbetçi 2 hemşire vardiya planından otomatik gelir (gerekirse elle değiştirilir).
- 9 oda: 1401–1405 ve 1407–1410 (düzenlenebilir). Oda sırası korunarak 5–4 bölünür; 5 odanın hangi tarafa düşeceğini yoğunluk (Hafif 1 · Orta 2 · Ağır 3) belirler. Odaya dokununca diğer hemşireye geçer.
- Rutinler her vardiya: narkotik ilaç sayımı, dolap sıcaklığı ölçümü, crash card dosyası alımı — kişiye atanır, yapıldı saatiyle işaretlenir.
- Ek görevler: oda ve öncelik (Normal/Acil) ile; oda seçilirse o odanın hemşiresine atanır.
- “Dağıtımı kopyala” WhatsApp'a yapıştırılabilir özet metni üretir.

## Modül 3 — Ajanda
- `src/js/ajanda-ekran.js`, `src/styles/ajanda.css`
- Bugünün listesiyle açılır; günler arasında ileri/geri gezilir.
- Etkinlikler: Toplantı / Denetim / Diğer; tek seferlik, her hafta (aynı gün) veya her ay (aynı tarih). Tekrarlı etkinlikte “yalnızca bu gün” veya “bütün tekrarlar” silinebilir. Sonraki 7 gün özeti.
- Yapılacaklar: son tarihli; geciken (kırmızı), bugün/3 gün içinde (turuncu).
- Personel notları: vardiya listesindeki personelle; İzin talebi / Eğitim / Görüşme / Diğer.
- Günün notu: yazdıkça kaydedilir.
- Genel Bakış'taki “Bugünkü ajanda” kartı bu veriden gelir.

## Modül 4 — Stok ve Sarf Malzeme
- `src/js/stok-ekran.js`, `src/styles/stok.css`
- Karma servis için 80 kalemlik başlangıç listesi, 10 kategori (düzenlenebilir; × ile çıkar, “Malzeme ekle”).
- Her kalem: mevcut · alt sınır · haftalık hedef. Durum: Kritik (≤ alt sınır), Azalıyor (< hedefin yarısı), Yeterli, Sayılmadı.
- Hızlı sayım: Enter ile alttaki kaleme geçer. Son sayım tarihi tutulur.
- Haftalık sipariş (varsayılan Pazartesi, değiştirilebilir): öneri = hedef − mevcut; miktarlar düzenlenir,
  liste kopyalanır, “Sipariş verildi” → “Teslim alındı” ile miktarlar mevcuda eklenir.
- Acil arabası kalemleri kritik seviyeye düşerse ayrıca uyarı verilir.

## Modül 5 — Miat ve Dolap Sıcaklığı
- `src/js/miat-ekran.js`, `src/styles/miat.css`
- Her vardiya ölçüm: İlaç buzdolabı 2–8 °C · İlaç dolabı/oda 15–25 °C · Serum dolabı 15–25 °C · Ortam nemi %30–60 (varsayılan; düzenlenebilir).
  Virgüllü giriş kabul edilir; aralık dışı değerde “yapılan işlem” zorunlu. Son 7 günün vardiya vardiya özeti.
- Miat kayıtları: ürün, dolap, adet, son kullanma, lot. 30 gün önceden uyarı, son 7 gün ve geçenler kırmızı; “Kullanıldı / İmha” ile kapatılır.
- Aylık dolap kontrolü: serum dolabı, malzeme dolabı, tedavi arabası, ilaç dolabı, ilaç buzdolabı, acil arabası (aylık sayım).
- Bağlantılar: ölçüm girilince Görev Dağıtımı'ndaki “Dolap sıcaklığı ölçümü” rutini otomatik tamamlanır;
  Stok'ta acil arabası kalemleri aylık sayılır ve haftalık siparişe girmez.
- Genel Bakış'taki istatistikler ve “Dikkat gerektirenler” artık bütün modüllerin gerçek verisinden gelir.

## Modül 6 — Asistan
- `src/js/asistan-ekran.js`, `src/styles/asistan.css`
- Hazır işlemler (cihazda, internetsiz): sabah brifingi (40), devir teslim SBAR özeti (7), görevler → WhatsApp (8),
  tamamlanmayan işler (9), haftalık vardiya taslağı (1), sipariş kontrolü (11), tüketim artışı (12), sayım farkı (15),
  miadı yakın ürünlerde kullanım önceliği (18), sesle not ve hatırlatıcı (39 — Chrome'un Türkçe ses tanıması; internet ister).
- Yapay zekâ ile: resmî yazı (21), hizmet içi eğitim sunumu (31), ilaç bilgisi ve saklama (36), hasta/yakını eğitim metni (38).
  Form doldurulur → ayrıntılı istek metni panoya kopyalanır → Claude'da yapıştırılır. Kişisel/hasta verisi gönderilmez.
- Stok modülü artık sayım değişikliklerini kaydeder (tüketim ve sayım farkı analizi için).

## Android'e kurulum
Uygulama bir web uygulaması (PWA) olarak kurulur:
1. Dosyaları HTTPS ile yayınlanan bir adrese koyun (ör. kurum sunucusu, GitHub Pages, Netlify).
2. Android'de Chrome ile adresi açın → menü (⋮) → **Ana ekrana ekle / Uygulamayı yükle**.
3. 14. Kat simgesiyle açılır; `sw.js` sayesinde internet yokken de çalışır.
Not: Veriler her cihazın kendi tarayıcısında tutulur; cihazlar arası eşitleme sonraki aşamadır.
