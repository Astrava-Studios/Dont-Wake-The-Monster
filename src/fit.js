// Keeps the UI inside the part of the screen the player can actually see.
// In a mobile browser the address bar and toolbars eat into the height, but CSS `vh` still means the
// full screen, so cards were cut off at the bottom (the Sneak/OK buttons disappeared). Two fixes:
//  1. --vh tracks the real visible height (visualViewport), and the stylesheet sizes things with it.
//  2. Any centered card that still doesn't fit is shrunk with `zoom` until it does, so nothing is clipped.

const vv = window.visualViewport;
let queued = false;

function setVh() {
  const h = vv ? vv.height : innerHeight;
  document.documentElement.style.setProperty('--vh', `${h / 100}px`);
}

function fitCard(card) {
  card.style.zoom = '';
  card.style.maxHeight = '';
  const screen = card.parentElement;
  const cs = getComputedStyle(screen);
  const avail = screen.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const ccs = getComputedStyle(card);
  const borders = parseFloat(ccs.borderTopWidth) + parseFloat(ccs.borderBottomWidth);
  const natural = card.scrollHeight + borders; // full content height, even when the card clips it
  if (avail <= 0 || natural <= avail + 1) return;
  card.style.maxHeight = 'none';
  card.style.zoom = String(Math.max(0.5, (avail - 2) / natural));
}

function fitAll() {
  queued = false;
  setVh();
  for (const card of document.querySelectorAll('.screen:not(.hidden) > .kcard:not(.mkSheet)')) fitCard(card);
}

export function refit() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(fitAll);
}

export function initFit() {
  setVh();
  addEventListener('resize', refit);
  addEventListener('orientationchange', () => setTimeout(refit, 250));
  if (vv) vv.addEventListener('resize', refit);
  // Screens open by toggling .hidden and fill their cards dynamically: refit whenever that happens.
  const app = document.getElementById('app') || document.body;
  new MutationObserver(refit).observe(app, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  // Web fonts change text metrics once they load.
  if (document.fonts) document.fonts.ready.then(refit);
  refit();
}
