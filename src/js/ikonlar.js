/* 14. KAT — İkon seti (tek renk, çizgi stili, 24x24)
   Kullanım: <svg class="ikon" aria-hidden="true"><use href="#i-panel"/></svg> */
(function () {
  const ikonlar = {
    panel: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    vardiya: '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><path d="M7.5 13.5h3M13.5 13.5h3M7.5 17h3"/>',
    gorev: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 2.5h6v3H9z"/><path d="m9 13 2 2 4-4"/>',
    ajanda: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v16H6.5A1.5 1.5 0 0 0 5 20.5z"/><path d="M5 20.5A1.5 1.5 0 0 0 6.5 22H19v-3"/><path d="M9 8h6M9 11.5h4"/>',
    stok: '<path d="m3.5 7.5 8.5-4.5 8.5 4.5v9L12 21l-8.5-4.5z"/><path d="m3.5 7.5 8.5 4.5 8.5-4.5M12 12v9"/>',
    termometre: '<path d="M14 14.8V5a2 2 0 1 0-4 0v9.8a4 4 0 1 0 4 0z"/><path d="M12 9v7"/>',
    asistan: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><path d="m12 8 1.3 2.7L16 12l-2.7 1.3L12 16l-1.3-2.7L8 12l2.7-1.3z"/><path d="M18.5 5.5 17 7M7 17l-1.5 1.5"/>',
    uyari: '<path d="M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4.5M12 17h.01"/>',
    kritik: '<path d="M7.9 2.5h8.2l5.4 5.4v8.2l-5.4 5.4H7.9l-5.4-5.4V7.9z"/><path d="M12 7.5v5.5M12 16.5h.01"/>',
    onay: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.7 2.7L16 10"/>',
    bilgi: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5h.01"/>',
    menu: '<path d="M4 6.5h16M4 12h16M4 17.5h16"/>',
    kapat: '<path d="M6 6l12 12M18 6 6 18"/>',
    cikis: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 16.5 5.5 12 10 7.5M5.5 12H15"/>',
    zil: '<path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    arti: '<path d="M12 5v14M5 12h14"/>',
    ara: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
    kisi: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
    ekip: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 20a6.5 6.5 0 0 0-3-5.5"/>',
    saat: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    gonder: '<path d="M21 3 10.5 13.5M21 3l-6.5 18-4-7.5-7.5-4z"/>',
    ayar: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    kilit: '<rect x="4.5" y="10.5" width="15" height="10.5" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
    kalender: '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
    sag: '<path d="m9 6 6 6-6 6"/>',
    yatak: '<path d="M3 18V7M21 18v-5a3 3 0 0 0-3-3h-7v6"/><path d="M3 15h18"/><circle cx="7" cy="11" r="2"/>'
  };
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" style="display:none">' +
    Object.entries(ikonlar).map(([ad, yol]) => `<symbol id="i-${ad}" viewBox="0 0 24 24">${yol}</symbol>`).join('') +
    '</svg>';
  document.body.insertAdjacentHTML('afterbegin', svg);
})();
