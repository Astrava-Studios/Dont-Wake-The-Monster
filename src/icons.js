// Flat SVG icon set (24x24, currentColor) in the spirit of Kenney's white UI glyphs — replaces all emoji.
const S = 'fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';

function gear() { // 8 teeth generated mathematically
  const pts = []; const n = 8;
  for (let i = 0; i < n * 4; i++) {
    const a = (i / (n * 4)) * Math.PI * 2 - Math.PI / 2, r = (i % 4 < 2) ? 10.5 : 7.8;
    pts.push(`${(12 + Math.cos(a) * r).toFixed(2)},${(12 + Math.sin(a) * r).toFixed(2)}`);
  }
  return `<path fill-rule="evenodd" d="M${pts.join('L')}Z M12 8.6a3.4 3.4 0 1 0 0 6.8a3.4 3.4 0 1 0 0-6.8Z"/>`;
}
function rays(cx, cy, r0, r1, n, start = 0) {
  let d = ''; for (let i = 0; i < n; i++) { const a = start + (i / n) * Math.PI * 2; d += `M${(cx + Math.cos(a) * r0).toFixed(1)} ${(cy + Math.sin(a) * r0).toFixed(1)}L${(cx + Math.cos(a) * r1).toFixed(1)} ${(cy + Math.sin(a) * r1).toFixed(1)}`; }
  return `<path ${S} d="${d}"/>`;
}

const P = {
  gear: gear(),
  play: '<path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.7l-12-7.5A1 1 0 0 0 7 4.5z"/>',
  pause: '<rect x="5.5" y="4" width="4.5" height="16" rx="1.2"/><rect x="14" y="4" width="4.5" height="16" rx="1.2"/>',
  retry: `<path ${S} d="M19 12a7 7 0 1 1-2.4-5.3"/><path d="M20.5 3.5v6h-6z"/>`,
  home: '<path d="M12 3 2.5 11.5H5V20a1 1 0 0 0 1 1h4.5v-6h3v6H18a1 1 0 0 0 1-1v-8.5h2.5z"/>',
  check: `<path ${S} stroke-width="3" d="m4.5 12.5 5 5 10-11"/>`,
  checks: `<path ${S} d="m2 13 4 4 8-9M10 16l1 1 8-9"/>`,
  up: '<path d="M12 4.5 20.5 17.5h-17z"/>',
  down: '<path d="M12 19.5 3.5 6.5h17z"/>',
  heart: '<path d="M12 20.5S3.5 15.3 3.5 9.6A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8.5 2.6c0 5.7-8.5 10.9-8.5 10.9z"/>',
  cross: `<path ${S} stroke-width="3" d="M6 6l12 12M18 6 6 18"/>`,
  moon: '<path d="M14.5 2.5a9.5 9.5 0 1 0 7 15.5A8 8 0 0 1 14.5 2.5z"/>',
  sun: `<circle cx="12" cy="12" r="4.5"/>${rays(12, 12, 7.5, 10.5, 8)}`,
  sunrise: `<path d="M5.5 17a6.5 6.5 0 0 1 13 0z"/>${rays(12, 17, 8.5, 11, 5, Math.PI)}<path ${S} d="M2.5 20.5h19"/>`,
  note: '<path d="M9 17.5a3.5 3.5 0 1 1-2-3.2V5.2a1 1 0 0 1 .8-1l10-2A1 1 0 0 1 19 3.2v11.3a3.5 3.5 0 1 1-2-3.2V7.4l-8 1.6z"/>',
  speaker: `<path d="M3.5 9h4l5.2-4.2a.8.8 0 0 1 1.3.6v13.2a.8.8 0 0 1-1.3.6L7.5 15h-4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1z"/><path ${S} d="M17 9a4.2 4.2 0 0 1 0 6M19.5 6.2a8 8 0 0 1 0 11.6"/>`,
  cart: `<path ${S} d="M2.5 4h2.6l2.3 10.5h10.3l2.3-7.5H6.2"/><circle cx="9" cy="19" r="1.9"/><circle cx="17" cy="19" r="1.9"/>`,
  help: `<path ${S} stroke-width="2.8" d="M8.8 8.8a3.3 3.3 0 1 1 4.9 2.9c-1.1.6-1.7 1.4-1.7 2.6v.4"/><circle cx="12" cy="19" r="1.6"/>`,
  bag: '<path d="M8.5 3h7l-2 3.6c3.6 1.4 6.5 5 6.5 8.8 0 3.5-3 5.6-8 5.6s-8-2.1-8-5.6c0-3.8 2.9-7.4 6.5-8.8z"/><path fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1.8" stroke-linecap="round" d="M9 7.2h6"/>',
  bolt: '<path d="M13.5 2 4.5 13.5h6.5L9.8 22l9.7-12h-6.6z"/>',
  jar: '<path d="M8 3h8v2.2l-1 .8c3 1.6 5 4.6 5 8 0 4.6-3.6 7-8 7s-8-2.4-8-7c0-3.4 2-6.4 5-8l-1-.8z"/>',
  bank: '<path d="M12 2.5 2.5 7.5v2h19v-2z"/><path d="M4.5 11h3v7h-3zM10.5 11h3v7h-3zM16.5 11h3v7h-3zM2.5 19.5h19V22h-19z"/>',
  trophy: '<path d="M7 3h10v2h3.5v2.5c0 3-2 5-4.8 5.4A5.5 5.5 0 0 1 13 15.7V18h3v3H8v-3h3v-2.3a5.5 5.5 0 0 1-2.7-2.8C5.5 12.5 3.5 10.5 3.5 7.5V5H7zm10 4.1v3.4c1-.4 1.6-1.4 1.6-2.7v-.7zM7 7.1H5.4v.7c0 1.3.6 2.3 1.6 2.7z"/>',
  eye: '<path fill-rule="evenodd" d="M12 5c5 0 8.6 3.6 10 7-1.4 3.4-5 7-10 7S3.4 15.4 2 12c1.4-3.4 5-7 10-7zm0 3.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6z"/><circle cx="12" cy="12" r="1.8"/>',
  hide: `<path ${S} d="M3 12c1.6-3.4 5-6.5 9-6.5s7.4 3.1 9 6.5c-1.6 3.4-5 6.5-9 6.5S4.6 15.4 3 12z"/><path ${S} stroke-width="3" d="M4 20 20 4"/>`,
  shh: `<path ${S} d="M3.5 11c2 3 5 4.5 8.5 4.5s6.5-1.5 8.5-4.5M6 14.5l-1.6 2.3M12 15.5v2.8M18 14.5l1.6 2.3"/>`,
  shout: `<path d="M3 9.5h3.5L15 4.5v15l-8.5-5H3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1z"/><path ${S} d="M18 8.5l2.5-1.5M18.5 12h3M18 15.5l2.5 1.5"/>`,
  ear: `<path ${S} d="M7 9a5 5 0 1 1 9.4 2.4c-.9 1.5-2.4 2.3-2.4 4.1A3.5 3.5 0 0 1 7.5 17"/><path ${S} d="M10 9.5a2 2 0 1 1 3.4 1.4"/>`,
  zzz: '<path d="M3 11h6v1.6L5.6 17H9v2H3v-1.6L6.4 13H3zM11 4h8v2l-5 6.5h5v2.5h-8v-2l5-6.5h-5z"/>',
  fast: '<path d="M3 5.5v13l8.5-6.5zM12 5.5v13l8.5-6.5z"/>',
  door: '<path fill-rule="evenodd" d="M5 21V4a1.5 1.5 0 0 1 1.5-1.5h11A1.5 1.5 0 0 1 19 4v17h2v1.5H3V21zm10.2-10.5a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6z"/>',
  paw: '<ellipse cx="6" cy="10" rx="2.1" ry="2.7"/><ellipse cx="10" cy="6" rx="2.1" ry="2.7"/><ellipse cx="14.5" cy="6" rx="2.1" ry="2.7"/><ellipse cx="18.5" cy="10" rx="2.1" ry="2.7"/><path d="M12.2 11.5c2.6 0 6 3.6 6 6.4 0 2-1.6 2.6-3 2.6-1.3 0-2-.7-3-.7s-1.7.7-3 .7c-1.4 0-3-.6-3-2.6 0-2.8 3.4-6.4 6-6.4z"/>',
  warn: '<path fill-rule="evenodd" d="M10.3 3.5a2 2 0 0 1 3.4 0l8.6 15a2 2 0 0 1-1.7 3H3.4a2 2 0 0 1-1.7-3zM10.8 9v5.5h2.4V9zm1.2 7.2a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8z"/>',
  feather: `<path d="M20.5 3.5C13 3.5 6.5 8 6 16l1.5 1.5c8-.5 13-7 13-14z"/><path ${S} d="M3 21 13 11"/>`,
  dizzy: `<path ${S} d="M12 12a2 2 0 1 1 2-2 4 4 0 1 1-4-4 6 6 0 1 1-6 6"/>`,
  bed: '<path d="M2.5 6h2v6h17V20h-2v-2.5h-15V20h-2zM6 9.5a2.2 2.2 0 1 1 4.4 0A2.2 2.2 0 0 1 6 9.5zM11.5 8h6a3.5 3.5 0 0 1 3.5 3.5H11.5z"/>',
  run: '<circle cx="14.5" cy="4.5" r="2.3"/><path d="M10 8.2 14 7.5c.8-.1 1.5.3 1.8 1l1.4 3.3 2.8.8-.6 2-3.6-1-1-2.2-1.3 3.2 2.8 2.6V22h-2.2v-4l-2.6-2.3-1.6 3.6-4.6 1-.5-2.1 3.6-.8L12 11l-1.5.3-1.8 2.6-1.8-1.2 2.2-3.3z"/>',
  // loot items (UI)
  i_book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v16H6.5a1.5 1.5 0 0 0 0 3H20v1H6.5A2.5 2.5 0 0 1 4 19.5z"/><path fill="rgba(0,0,0,.25)" d="M8 6h9v2H8z"/>',
  i_candle: '<path d="M12 1.5c1.6 1.8 2.5 3.2 2.5 4.4a2.5 2.5 0 0 1-5 0c0-1.2.9-2.6 2.5-4.4z"/><rect x="10" y="9" width="4" height="8" rx="1"/><path d="M6 17h12l-2 3H8z"/><rect x="9" y="20" width="6" height="2.5" rx="1"/>',
  i_bottle: '<path d="M10 2h4v2h-.5v3.2c2.6 1 4 3.2 4 6V20a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-6.8c0-2.8 1.4-5 4-6V4H10z"/><path fill="rgba(0,0,0,.25)" d="M7.5 13h9v4h-9z"/>',
  i_vase: '<path d="M8.5 2h7v1.5l-1 1c3.6 2.3 5 5.3 5 8.5 0 4.8-3.4 9-7.5 9S4.5 17.8 4.5 13c0-3.2 1.4-6.2 5-8.5l-1-1z"/><path fill="none" stroke="rgba(0,0,0,.28)" stroke-width="1.6" d="M6 11.5h12M6.5 16h11"/>',
  i_painting: '<path fill-rule="evenodd" d="M2 4h20v16H2zm3 3v10h14V7z"/><path d="M6 16l4-5 3 3.5 2-2 3 3.5z"/><circle cx="16" cy="9.5" r="1.4"/>',
  i_watch: '<path fill-rule="evenodd" d="M12 5.5a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm0 2.4a5.6 5.6 0 1 0 0 11.2 5.6 5.6 0 0 0 0-11.2z"/><path d="M10.5 1.5h3v2.8h-3zM11 9.5h2v4.2l2.6 1.6-1 1.7L11 14.7z"/>',
  i_gem: '<path d="M6.5 3h11l4 5.5L12 21 2.5 8.5z"/><path fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1.4" stroke-linejoin="round" d="M2.5 8.5h19M9 3 7.5 8.5 12 21l4.5-12.5L15 3"/>',
  i_chest: '<path d="M3 10h18v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM4.5 4h15A2.5 2.5 0 0 1 22 6.5V9H2V6.5A2.5 2.5 0 0 1 4.5 4z"/><rect x="10" y="8" width="4" height="5" rx="1" fill="rgba(0,0,0,.3)"/>',
  i_crown: '<path d="M3 18 2 7l5.5 4.5L12 4l4.5 7.5L22 7l-1 11z"/><rect x="3" y="19" width="18" height="2.5" rx="1"/>',
  hand: '<path d="M9 11V4.5a1.5 1.5 0 0 1 3 0V10h.5V3.5a1.5 1.5 0 0 1 3 0V10h.5V5a1.5 1.5 0 0 1 3 0v8.5c0 4.7-3 8-7.5 8-3.2 0-5-1.6-6.6-4.3L3.2 13a1.5 1.5 0 0 1 2.5-1.6L9 15z"/>',
  stall: '<path d="M2 3h20l-1.5 6a2.5 2.5 0 0 1-4.7.3 2.6 2.6 0 0 1-4.8 0 2.6 2.6 0 0 1-4.8 0A2.5 2.5 0 0 1 3.5 9z"/><path d="M4 12h2v8h4v-5h4v5h4v-8h2v10H4z"/>',
  tree: '<circle cx="12" cy="4.5" r="2.8"/><circle cx="5" cy="19" r="2.8"/><circle cx="19" cy="19" r="2.8"/><circle cx="12" cy="13" r="2.4"/><path fill="none" stroke="currentColor" stroke-width="2.2" d="M12 7v3.5M10.4 14.8 6.6 17M13.6 14.8 17.4 17"/>',
  lock: '<path fill-rule="evenodd" d="M7 10V7.5a5 5 0 0 1 10 0V10h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm2.4 0h5.2V7.5a2.6 2.6 0 0 0-5.2 0z"/>',
  // modifiers
  plank: '<rect x="2" y="8" width="20" height="8" rx="1.5"/><circle cx="5" cy="12" r="1.1" fill="rgba(0,0,0,.35)"/><circle cx="19" cy="12" r="1.1" fill="rgba(0,0,0,.35)"/><path fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1.4" stroke-linecap="round" d="M9 9.5l2 2-1 1.5 2 1.5"/>',
  sparkle: '<path d="M12 1.5c.6 5 2.5 7.6 8.5 8.5-6 .9-7.9 3.5-8.5 8.5-.6-5-2.5-7.6-8.5-8.5 6-.9 7.9-3.5 8.5-8.5zM19 15.5c.3 2.2 1.1 3 3.5 3.5-2.4.5-3.2 1.3-3.5 3.5-.3-2.2-1.1-3-3.5-3.5 2.4-.5 3.2-1.3 3.5-3.5z"/>',
  candle: '<path d="M12 1.5c1.8 2 2.8 3.6 2.8 5a2.8 2.8 0 0 1-5.6 0c0-1.4 1-3 2.8-5z"/><rect x="8.5" y="10.5" width="7" height="10" rx="1.2"/><rect x="5.5" y="20" width="13" height="2.5" rx="1"/>',
  duck: '<path d="M9.5 4a4 4 0 0 1 4 4c0 .8-.2 1.5-.6 2.1 4.6-.4 8.1 1.4 8.1 4.9 0 3.5-3.7 5.5-9 5.5-5.4 0-9-2-9-5.5 0-2.1 1.3-3.6 3.6-4.4A4 4 0 0 1 9.5 4z"/><path d="M13 7l4-.3c.4 0 .5.5.2.7L13 9z"/><circle cx="10" cy="7.2" r="1" fill="rgba(0,0,0,.45)"/>',
  clover: '<circle cx="8.3" cy="8.3" r="3.8"/><circle cx="15.7" cy="8.3" r="3.8"/><circle cx="8.3" cy="15.7" r="3.8"/><circle cx="15.7" cy="15.7" r="3.8"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M14 14l6 7.5"/>',
  swirl: `<path ${S} d="M3 8c3-3 6 3 9 0s6 3 9 0M3 16c3-3 6 3 9 0s6 3 9 0"/>`,
  gem: '<path d="M6.5 3h11l4 5.5L12 21 2.5 8.5z"/><path fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1.4" stroke-linejoin="round" d="M2.5 8.5h19M9 3 7.5 8.5 12 21l4.5-12.5L15 3"/>',
  // shop
  sock: '<path d="M8 2h7v9.5l3.6 3.4a3.6 3.6 0 0 1-5 5.2L8.7 15.6A2.5 2.5 0 0 1 8 13.8z"/><path fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1.6" d="M8 5h7"/>',
  weight: '<path fill-rule="evenodd" d="M8.5 6a3.5 3.5 0 0 1 7 0v.6A7.5 7.5 0 1 1 8.5 6.6zm2.3 0v-.1a1.2 1.2 0 1 1 2.4.1z"/>',
  shoe: '<path d="M2.5 9.5 6 6l3.5 3.5 2-2c2.5 2.5 6 3.5 9 4V16h-18zM2.5 17.5h18V20h-18z"/>',
  zoom: '<path fill-rule="evenodd" d="M10.5 3a7.5 7.5 0 0 1 6 12l5 5-1.8 1.8-5-5A7.5 7.5 0 1 1 10.5 3zm0 2.6a4.9 4.9 0 1 0 0 9.8 4.9 4.9 0 0 0 0-9.8z"/>',
  vibrate: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M3.5 8v8M20.5 8v8"/>',
  globe: '<path fill-rule="evenodd" d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm-1.4 2.2A8 8 0 0 0 4.1 11h3.4c.1-2.6.7-5 1.6-6.8zm2.8 0c.9 1.8 1.5 4.2 1.6 6.8h3.4a8 8 0 0 0-5-6.8zM12 4.3c-.9 1.3-1.9 3.8-2 6.7h4c-.1-2.9-1.1-5.4-2-6.7zM4.1 13a8 8 0 0 0 6.5 6.8c-.9-1.8-1.5-4.2-1.6-6.8zm5.9 0c.1 2.9 1.1 5.4 2 6.7.9-1.3 1.9-3.8 2-6.7zm6.5 0c-.1 2.6-.7 5-1.6 6.8a8 8 0 0 0 5-6.8z"/>',
  sparkles: '<path d="M10 3c.5 4.2 2.2 6.4 7 7-4.8.6-6.5 2.8-7 7-.5-4.2-2.2-6.4-7-7 4.8-.6 6.5-2.8 7-7zM18 14c.3 2 1 2.8 3 3-2 .2-2.7 1-3 3-.3-2-1-2.8-3-3 2-.2 2.7-1 3-3z"/>',
  // cursed items
  i_ticker: '<path fill-rule="evenodd" d="M5 9a7 7 0 0 1 14 0v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1zm7-3a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z"/><path d="M11.2 7.5h1.6v3.2l2.2 1.4-.8 1.3-3-1.9z"/>',
  i_orb: '<circle cx="12" cy="10" r="7"/><path d="M6 19.5h12l-1.5 2.5h-9z"/><circle cx="9.5" cy="7.5" r="1.8" fill="rgba(255,255,255,.45)"/>',
  i_statue: '<circle cx="12" cy="5.5" r="3.3"/><path d="M7.5 10.5h9c1 3 1 6-.5 8.5h-8c-1.5-2.5-1.5-5.5-.5-8.5z"/><rect x="4.5" y="19.5" width="15" height="3" rx="1"/>',
  // merchant goods
  cloak: '<path d="M8 3h8l1.5 3.5C20 10 21 15 21 21H3c0-6 1-11 3.5-14.5z"/><path fill="rgba(0,0,0,.25)" d="M10 3h4l-2 4z"/>',
  dust: '<path d="M8 6h8l-1 2c2.5 1.3 4 3.6 4 6.3 0 4-3.2 7.2-7 7.2s-7-3.2-7-7.2C5 11.6 6.5 9.3 9 8z"/><circle cx="6" cy="3.5" r="1.3"/><circle cx="12" cy="2.5" r="1"/><circle cx="17.5" cy="3.5" r="1.3"/>',
  pick: '<path fill-rule="evenodd" d="M7 2.5a4.5 4.5 0 0 1 3.2 7.7L19.5 19.5 17.5 21.5l-1.5-1.5-1.5 1.5-1.5-1.5 1.5-1.5-5.7-5.7A4.5 4.5 0 1 1 7 2.5zm0 2.6a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8z"/>',
  smoke: '<circle cx="8" cy="13" r="5"/><circle cx="14.5" cy="10" r="5.5"/><circle cx="17" cy="16" r="4"/><circle cx="11" cy="18" r="3.5"/>',
  crack: `<path ${S} stroke-width="2.4" d="M13 2 9.5 9l4 2.5L9 22"/>`,
  // costume sets
  s_ninja: '<path fill-rule="evenodd" d="M12 1.5 14.2 9.8 22.5 12l-8.3 2.2L12 22.5l-2.2-8.3L1.5 12l8.3-2.2zm0 8.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>',
  s_pirate: '<path fill-rule="evenodd" d="M12 2.5c4.7 0 8 3.2 8 7.4 0 2.6-1.3 4.4-3 5.4V18a1 1 0 0 1-1 1h-1.2v-2h-1.6v2h-2.4v-2H9.2v2H8a1 1 0 0 1-1-1v-2.7c-1.7-1-3-2.8-3-5.4 0-4.2 3.3-7.4 8-7.4zM8.8 9a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6.4 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM12 13l-1.2 2h2.4z"/><path d="M5 20.5 19 22l.3-1.5L5.3 19z"/>',
  s_cat: '<path d="M4 3l4.5 4.2a10 10 0 0 1 7 0L20 3l.8 8.2c.4 1 .7 2.1.7 3.3 0 4.4-4.3 7.5-9.5 7.5s-9.5-3.1-9.5-7.5c0-1.2.3-2.3.7-3.3z"/><circle cx="8.8" cy="13.5" r="1.3" fill="rgba(0,0,0,.45)"/><circle cx="15.2" cy="13.5" r="1.3" fill="rgba(0,0,0,.45)"/>',
  s_wizard: '<path d="M13.5 1.5 18 14H6z"/><path d="M2 15.5h20c0 1.7-4.5 3-10 3s-10-1.3-10-3z"/><path fill="rgba(255,255,255,.5)" d="m11 8 .6 1.3 1.4.2-1 1 .2 1.4-1.2-.7-1.3.7.3-1.4-1-1 1.4-.2z"/>',
  s_xmas: '<path d="M4 17C4 9 8 3.5 13.5 3.5c3 0 5.5 2 6.5 5.5l-3 .8c-.6-2-1.8-3-3.5-3C10 6.8 8 11 8 17z"/><circle cx="19.5" cy="10.5" r="2.3"/><rect x="2.5" y="16.5" width="15" height="4.5" rx="2.2"/>',
  s_halloween: '<path d="M11 2.5h2.5l-.5 3.2C17.7 5.4 21.5 8.7 21.5 13s-3.8 8.5-9.5 8.5-9.5-4.2-9.5-8.5S6.3 5.4 11 5.7z"/><path fill="rgba(0,0,0,.4)" d="M7.5 11l2.2 2.4H6.8zM16.5 11l.7 2.4h-2.9zM7 16h10l-1.5 2-1.5-1-2 1-2-1-1.5 1z"/>',
  s_angel: '<path fill-rule="evenodd" d="M12 2c5 0 9 1.6 9 3.6S17 9.2 12 9.2 3 7.6 3 5.6 7 2 12 2zm0 1.8c-3.6 0-6.4.8-6.4 1.8S8.4 7.4 12 7.4s6.4-.8 6.4-1.8S15.6 3.8 12 3.8z"/><path d="M12 13c1.5-2 4.8-3 9.5-2.5-.5 5-3.5 8.5-8 9.5zM12 13c-1.5-2-4.8-3-9.5-2.5.5 5 3.5 8.5 8 9.5z"/>',
  s_sheriff: '<path d="M12 1.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 15l-5.4 3 1.2-6-4.5-4.2 6.1-.7z"/><circle cx="12" cy="21" r="1.5"/>',
  // wardrobe + hideout
  hanger: `<path ${S} d="M12 7.5a2.5 2.5 0 1 1 2.5-2.5c0 1.4-2.5 2-2.5 3.5L2.8 16a1.4 1.4 0 0 0 .9 2.5h16.6a1.4 1.4 0 0 0 .9-2.5L12 8.5"/>`,
  shirt: '<path d="M8.5 2.5 3 5.5l2 4.5 2.5-1.2V21h9V8.8L19 10l2-4.5-5.5-3c-.5 1.6-1.9 2.6-3.5 2.6S9 4.1 8.5 2.5z"/>',
  tophat: '<path d="M6.5 3h11v12h-11z"/><path d="M2 16h20v2.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z"/><path fill="rgba(0,0,0,.3)" d="M6.5 12h11v2h-11z"/>',
  lanternI: '<path d="M9 2.5h6V4h-1v1.2l3.5 2.5v11L14 21.5h-4l-3.5-2.8v-11L10 5.2V4H9z"/><path fill="rgba(255,255,255,.55)" d="M9.5 9h5v8l-2.5 1.5L9.5 17z"/>',
  tools: '<path d="M14.5 2a5 5 0 0 0-4.8 6.4L2.6 15.5a2 2 0 0 0 2.9 2.9l7.1-7.1A5 5 0 0 0 19 5.5l-3 3-2.5-.5-.5-2.5 3-3a5 5 0 0 0-1.5-.5z"/><path d="m15 14 6.5 6.5-1.5 1.5L13.5 15.5z"/>',
  shelf: '<path d="M2.5 9h19v2h-19zM2.5 19h19v2h-19z"/><rect x="4" y="3" width="4" height="6" rx="1"/><circle cx="12" cy="6.5" r="2.5"/><path d="M16 9l2.5-5L21 9z"/><rect x="5" y="13" width="3" height="6" rx="1"/><path d="M10 19v-3a2.5 2.5 0 0 1 5 0v3z"/>',
  d_rug: '<ellipse cx="12" cy="13" rx="10" ry="6"/><ellipse cx="12" cy="13" rx="6" ry="3.4" fill="rgba(255,255,255,.35)"/>',
  d_cactus: '<path d="M10 3.5a2 2 0 0 1 4 0V16h-4zM5 8a1.5 1.5 0 0 1 3 0v3h2v2H6.5A1.5 1.5 0 0 1 5 11.5zM16 6.5a1.5 1.5 0 0 1 3 0V10a1.5 1.5 0 0 1-1.5 1.5H14v-2h2z"/><path d="M6 16h12l-1.5 6h-9z"/>',
  d_lamp: '<path d="M7 2h10l2.5 7h-15z"/><rect x="11" y="9" width="2" height="10"/><rect x="7" y="19" width="10" height="3" rx="1.2"/>',
  d_fish: '<circle cx="12" cy="13" r="9" fill-opacity=".45"/><path d="M8 13c1.5-2.2 3.5-3 6-2.5l3-2v9l-3-2c-2.5.5-4.5-.3-6-2.5z"/><path d="M5 4h14v2H5z"/>',
  d_chair: '<path d="M6 3h12a2 2 0 0 1 2 2v7H4V5a2 2 0 0 1 2-2z"/><path d="M2 11a2 2 0 0 1 4 0v1h12v-1a2 2 0 0 1 4 0v7H2zM4 19h2.5v2.5H4zM17.5 19H20v2.5h-2.5z"/>',
  d_throne: '<path d="M6 2l2 3 2-3 2 3 2-3 2 3 2-3v11H6z"/><path d="M3 12h18v4H3zM5 16h3v6H5zM16 16h3v6h-3z"/><circle cx="12" cy="8.5" r="1.6" fill="rgba(0,0,0,.3)"/>',
};
export const SET_ICON = (set) => 's_' + set;
export const DECOR_ICON = { rug: 'd_rug', plant: 'd_cactus', lamp: 'd_lamp', poster: 'i_painting', fishbowl: 'd_fish', armchair: 'd_chair', globe: 'globe', throne: 'd_throne' };
// what each merchant good looks like
export const GOOD_ICON = { slippers: 'shoe', cloak: 'cloak', bigbag: 'bag', sleepdust: 'dust', feather: 'feather', lullaby: 'note', lockpick: 'pick', smoke: 'smoke' };

export function icon(name, cls = '') {
  return `<svg class="i ${cls}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${P[name] || ''}</svg>`;
}
export const hasIcon = (n) => !!P[n];

// Monster face for the wake meter, tinted with the monster's colours. mood: sleep | drowsy | peek | angry | awake | yawn
export function monsterFace(mood, col = '#8e6bd8', belly = '#f3d7ff') {
  const dark = '#2a1f33';
  const closed = (x) => `<path d="M${x - 2.6} 12.2q2.6 2.6 5.2 0" fill="none" stroke="${dark}" stroke-width="1.6" stroke-linecap="round"/>`;
  const open = (x, half) => `<circle cx="${x}" cy="12" r="2.6" fill="#fff"/><circle cx="${x}" cy="12.4" r="1.3" fill="${dark}"/>` + (half ? `<path d="M${x - 2.9} 11.6h5.8v-2.8h-5.8z" fill="${col}"/>` : '');
  const brows = `<path d="M5.6 8.6l4 1.4M18.4 8.6l-4 1.4" stroke="${dark}" stroke-width="1.7" stroke-linecap="round"/>`;
  let eyes = '', mouth = '', extra = '';
  if (mood === 'sleep') { eyes = closed(8.3) + closed(15.7); mouth = `<path d="M10.6 17.3q1.4 1 2.8 0" fill="none" stroke="${dark}" stroke-width="1.3" stroke-linecap="round"/>`; extra = `<circle cx="17.6" cy="16.6" r="1.6" fill="#bfe9ff" stroke="#7cc8ff" stroke-width=".6"/>`; }
  else if (mood === 'drowsy') { eyes = open(8.3, true) + open(15.7, true); mouth = `<path d="M10.5 17.6h3" stroke="${dark}" stroke-width="1.3" stroke-linecap="round"/>`; }
  else if (mood === 'peek') { eyes = closed(8.3) + open(15.7); mouth = `<path d="M10.5 17.6h3" stroke="${dark}" stroke-width="1.3" stroke-linecap="round"/>`; }
  else if (mood === 'angry') { eyes = open(8.3, true) + open(15.7, true) + brows; mouth = `<path d="M10 18.2q2-1.4 4 0" fill="none" stroke="${dark}" stroke-width="1.4" stroke-linecap="round"/>`; }
  else if (mood === 'awake') { eyes = open(8.3) + open(15.7) + brows; mouth = `<path d="M8.6 16.2h6.8q-.4 4-3.4 4t-3.4-4z" fill="#7a1f3a"/><path d="M9.6 16.2l.7 1.4.7-1.4M13 16.2l.7 1.4.7-1.4" fill="#fff"/>`; }
  else if (mood === 'yawn') { eyes = closed(8.3) + closed(15.7); mouth = `<ellipse cx="12" cy="17.8" rx="2" ry="2.4" fill="#7a1f3a"/>`; }
  return `<svg class="face" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5.2 6.2 3.8 1.8l4.3 2.9zM18.8 6.2l1.4-4.4-4.3 2.9z" fill="#fff1cf"/>
    <ellipse cx="12" cy="13" rx="10.5" ry="9.5" fill="${col}"/>
    <ellipse cx="12" cy="17.2" rx="5.6" ry="4" fill="${belly}"/>
    ${eyes}${mouth}${extra}</svg>`;
}

// fill every <i data-icon="name"> placeholder in static HTML
export function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = icon(el.dataset.icon); el.classList.add('icw'); });
}

// ---- language flags (real colours; corners rounded by CSS)
function star(cx, cy, r, rot = -Math.PI / 2) {
  let d = ''; for (let i = 0; i < 10; i++) { const a = rot + (i * Math.PI) / 5, rr = i % 2 ? r * 0.4 : r; d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(2) + ' ' + (cy + Math.sin(a) * rr).toFixed(2); }
  return d + 'Z';
}
const FLAGS = {
  es: '<rect width="30" height="20" fill="#aa151b"/><rect y="5" width="30" height="10" fill="#f1bf00"/>',
  de: '<rect width="30" height="20" fill="#000"/><rect y="6.67" width="30" height="6.67" fill="#DD0000"/><rect y="13.33" width="30" height="6.67" fill="#FFCE00"/>',
  fr: '<rect width="10" height="20" fill="#002395"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#ED2939"/>',
  it: '<rect width="10" height="20" fill="#009246"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#CE2B37"/>',
  pt: '<rect width="12" height="20" fill="#006600"/><rect x="12" width="18" height="20" fill="#DE2910"/><circle cx="12" cy="10" r="3.8" fill="#FFC400"/><circle cx="12" cy="10" r="2.6" fill="#fff"/><path d="M10.8 8.8h2.4v2.4h-2.4z" fill="#002B7F"/>',
  az: '<rect width="30" height="20" fill="#00b5e2"/><rect y="6.67" width="30" height="6.67" fill="#ef3340"/><rect y="13.33" width="30" height="6.67" fill="#509e2f"/><circle cx="14" cy="10" r="2.6" fill="white"/><circle cx="14.8" cy="9.6" r="2.1" fill="#ef3340"/><circle cx="18" cy="10" r="1" fill="white"/>',
  en: '<rect width="30" height="20" fill="#012169"/><path d="M0 0 30 20M30 0 0 20" stroke="#fff" stroke-width="4"/><path d="M0 0 30 20M30 0 0 20" stroke="#C8102E" stroke-width="1.5"/><path d="M15 0v20M0 10h30" stroke="#fff" stroke-width="6"/><path d="M15 0v20M0 10h30" stroke="#C8102E" stroke-width="3.4"/>',
  zh: `<rect width="30" height="20" fill="#DE2910"/><path fill="#FFDE00" d="${star(5, 5, 3)} ${star(10, 2, 1, 0.4)} ${star(12, 4, 1, 0.9)} ${star(12, 7, 1, -0.4)} ${star(10, 9, 1, 0.2)}"/>`,
  tr: `<rect width="30" height="20" fill="#E30A17"/><circle cx="11" cy="10" r="5" fill="#fff"/><circle cx="12.25" cy="10" r="4" fill="#E30A17"/><path fill="#fff" d="${star(17.2, 10, 2.2, Math.PI)}"/>`,
  ru: '<rect width="30" height="20" fill="#fff"/><rect y="6.67" width="30" height="6.67" fill="#0039A6"/><rect y="13.33" width="30" height="6.67" fill="#D52B1E"/>',
};
export function flag(id) { return `<svg class="flag" viewBox="0 0 30 20" aria-hidden="true">${FLAGS[id] || ''}</svg>`; }
