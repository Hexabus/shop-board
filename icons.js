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
    receipt: wrap('<path d="M6 2.5h12v18.3l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3V2.5Z"/><path d="M8.5 7h7M8.5 10.5h7M8.5 14h4.5"/>'),
    settings: wrap('<circle cx="12" cy="12" r="3.2"/><path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M17.6 6.4l-1.5 1.5M7.9 16.1l-1.5 1.5M17.6 17.6l-1.5-1.5M7.9 7.9 6.4 6.4"/>'),
  };
})();
