/* Shop Board icon set: simple line icons replacing emoji, so the app looks the
   same across every phone instead of relying on the OS's own emoji font.
   Each icon is sized to the surrounding text via 1em width/height. */
(function () {
  "use strict";
  const wrap = (body, color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color || 'currentColor'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-0.15em;display:inline-block;" aria-hidden="true">${body}</svg>`;

  /* Trade-site color coding, one solid color per icon for quick recognition. */
  window.ShopIcon = {
    today: wrap('<circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2.5M12 19v2.5M4.5 12H2M22 12h-2.5M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"/>', '#F2B705'),
    jobs: wrap('<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="M8.5 11h7M8.5 15h7M8.5 19h4"/>', '#E65100'),
    photos: wrap('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7l1.3-2.3A1 1 0 0 1 10.2 4h3.6a1 1 0 0 1 .9.7L16 7"/><circle cx="12" cy="13.5" r="3.2"/>', '#1976D2'),
    money: wrap('<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9v.01M18 15v.01"/>', '#2E7D32'),
    clients: wrap('<circle cx="8.5" cy="8" r="3"/><path d="M3 20c0-3 2.5-5.5 5.5-5.5S14 17 14 20"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.2c2.6.4 4.5 2.6 4.5 5.3"/>', '#B36A3C'),
    notes: wrap('<path d="M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M15 3v4h4"/><path d="M8 12.5h8M8 16h5"/>', '#78909C'),
    receipt: wrap('<path d="M6 2.5h12v18.3l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3V2.5Z"/><path d="M8.5 7h7M8.5 10.5h7M8.5 14h4.5"/>', '#2E7D32'),
    settings: wrap('<circle cx="12" cy="12" r="3.2"/><path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M17.6 6.4l-1.5 1.5M7.9 16.1l-1.5 1.5M17.6 17.6l-1.5-1.5M7.9 7.9 6.4 6.4"/>'),

    crown: wrap('<path d="M3 18h18M4 18l-1-9 4.5 3L12 6l4.5 6L21 9l-1 9"/>', '#F2B705'),
    hammer: wrap('<path d="M14.5 6.5l3-3 3.5 3.5-3 3"/><path d="M12.5 8.5l3.5 3.5L5 23l-3-3Z"/><path d="M11 9.5l3-3"/>', '#78909C'),
    map: wrap('<path d="M9 4.5 4 6.5v13l5-2m0-13 6 2m-6-2v13m6-11 5-2v13l-5 2m0-13v13"/>', '#1976D2'),
    pin: wrap('<path d="M12 21s7-7.2 7-12a7 7 0 0 0-14 0c0 4.8 7 12 7 12Z"/><circle cx="12" cy="9" r="2.4"/>', '#D32F2F'),
    call: wrap('<path d="M5 4h3.5l1.5 4-2 1.5a12 12 0 0 0 6.5 6.5l1.5-2 4 1.5V19a2 2 0 0 1-2.2 2A16 16 0 0 1 3 5.2 2 2 0 0 1 5 4Z"/>', '#2E7D32'),
    text: wrap('<path d="M4 5h16v11H9l-4 3.5V16H4Z"/>', '#1976D2'),
    mail: wrap('<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>', '#78909C'),
    folder: wrap('<path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h4.5l2 2.5H19a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18Z"/>', '#E65100'),
    edit: wrap('<path d="M4 20h4l11-11-4-4L4 16Z"/><path d="M14 6l4 4"/>', '#E65100'),
    check: wrap('<path d="M4.5 12.5l5 5 10-11"/>', '#2E7D32'),
    lock: wrap('<rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>', '#C62828'),
    document: wrap('<path d="M6 2.5h8l4 4v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-18a1 1 0 0 1 1-1Z"/><path d="M14 2.5v4h4"/>', '#78909C'),
    warning: wrap('<path d="M12 3.5 2.5 20h19Z"/><path d="M12 10v4"/><path d="M12 17v.01"/>', '#F2B705'),
    trash: wrap('<path d="M5 7h14M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2M6.5 7l1 13a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4l1-13"/>', '#C62828'),
    trashWhite: wrap('<path d="M5 7h14M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2M6.5 7l1 13a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4l1-13"/>', '#FFFFFF'),
    receiptWhite: wrap('<path d="M6 2.5h12v18.3l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3V2.5Z"/><path d="M8.5 7h7M8.5 10.5h7M8.5 14h4.5"/>', '#FFFFFF'),
    send: wrap('<path d="M21 3 3 10.5l7.2 2.3L18 4Zm0 0-7.8 8.8L13 20Z"/>', '#1976D2'),
    sun: wrap('<circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2.5M12 19v2.5M4.5 12H2M22 12h-2.5M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"/>', '#F2B705'),
    moon: wrap('<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/>', '#3949AB'),
    device: wrap('<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/>', '#78909C'),
  };
})();
