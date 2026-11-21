// Démarrage de Lunoo : chargement, navigation, appui long, mode nuit.
import { ctx, go, render, keepAwake, nightPhase } from './ctx.js';
import { kv, loadSettings } from './store.js';
import { audioContext } from './sound.js';
import './onboarding.js';
import './child.js';
import { openParent } from './parent.js';
import './studio.js';

ctx.root = document.getElementById('app');

// ---------- Clics : [data-go] change d'écran, [data-act] lance une action ----------
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-hold]')) return; // le coin parent ne réagit qu'à l'appui long
  const goEl = e.target.closest('[data-go]');
  if (goEl && !goEl.disabled) {
    let params = {};
    try { if (goEl.dataset.p) params = JSON.parse(goEl.dataset.p); } catch (err) { /* ignoré */ }
    go(goEl.dataset.go, params);
    return;
  }
  const actEl = e.target.closest('[data-act]');
  if (actEl && !actEl.disabled) {
    const fn = ctx.actions[actEl.dataset.act];
    if (fn) fn(actEl, e);
  }
});

document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-change]');
  if (el && ctx.changes && ctx.changes[el.dataset.change]) ctx.changes[el.dataset.change](el, e);
});

// Le son et l'écran actif ne peuvent démarrer qu'après un geste de l'utilisateur.
document.addEventListener('pointerdown', () => { audioContext(); keepAwake(); }, { once: false, passive: true });

// ---------- Appui long dans le coin pour l'espace parent ----------
let holdTimer = null, holdEl = null;
function cancelHold() {
  clearTimeout(holdTimer); holdTimer = null;
  if (holdEl) holdEl.classList.remove('holding');
  holdEl = null;
}
document.addEventListener('pointerdown', (e) => {
  const el = e.target.closest('[data-hold]');
  if (!el) return;
  e.preventDefault();
  cancelHold();
  holdEl = el;
  const sec = ctx.s.access.hold || 3;
  el.style.setProperty('--hold', sec + 's');
  el.classList.add('holding');
  holdTimer = setTimeout(() => { cancelHold(); if (navigator.vibrate) navigator.vibrate(30); openParent(); }, sec * 1000);
});
['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => document.addEventListener(t, (e) => { if (holdEl && (t !== 'pointerleave' || e.target === holdEl)) cancelHold(); }));
document.addEventListener('contextmenu', (e) => { if (e.target.closest('[data-hold]')) e.preventDefault(); });

// Clavier : Entrée / Espace maintenus sur le coin (accessibilité).
document.addEventListener('keydown', (e) => {
  const el = e.target.closest && e.target.closest('[data-hold]');
  if (el && (e.key === 'Enter' || e.key === ' ') && !holdTimer && !e.repeat) {
    e.preventDefault();
    holdEl = el; el.classList.add('holding');
    holdTimer = setTimeout(() => { cancelHold(); openParent(); }, (ctx.s.access.hold || 3) * 1000);
  }
});
document.addEventListener('keyup', (e) => { if (holdEl && (e.key === 'Enter' || e.key === ' ')) cancelHold(); });

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    keepAwake();
    if (ctx.night && ['night', 'wake'].includes(ctx.route)) {
      if (nightPhase() === 'wake' && ctx.route !== 'wake') go('wake'); else render();
    }
  }
});

// L'accueil se met à jour chaque minute (bouton « Au dodo » qui clignote à l'heure du rituel).
setInterval(() => { if (ctx.route === 'home') render(); }, 60000);

// ---------- Démarrage ----------
async function boot() {
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  ctx.s = await loadSettings();
  if (!ctx.s.onboarded) return go('onb-welcome');

  const night = await kv.get('night');
  if (night) {
    const late = Date.now() - night.wakeAt > (ctx.s.wake.offAfter || 15) * 60000;
    if (late) await kv.del('night');
    else {
      ctx.night = night;
      return go(nightPhase() === 'wake' ? 'wake' : 'night');
    }
  }
  go('home');
}

boot().catch((e) => {
  ctx.root.innerHTML = `<div class="screen center-msg"><h1>Oups</h1><p>Lunoo n'a pas pu démarrer : ${String(e.message || e)}</p></div>`;
});
