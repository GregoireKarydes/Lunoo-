// Démarrage de Lunoo : chargement, navigation, appui long, mode nuit.
import { ctx, go, render, keepAwake, nightPhase, enterNight } from './ctx.js';
import { kv, loadSettings } from './store.js';
import { audioContext, chime } from './sound.js';
import { currentSlot, setOverride } from './clock.js';
import { save } from './ctx.js';
import './onboarding.js';
import './child.js';
import './preview.js';
import { speak } from './rewards.js';
import { momentTalk } from './data.js';
import { openParent } from './parent.js';
import './studio.js';
import './reorder.js';

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

// ---------- Appui long sur un moment de la frise : on y passe directement ----------
// Même principe que la lune, mais deux fois plus court (1 s minimum). Un simple toucher ne fait rien.
let jumpTimer = null, jumpEl = null;
const jumpSec = () => Math.max(1, Math.round((ctx.s.access.hold || 3) / 2 * 2) / 2);
function cancelJump() { clearTimeout(jumpTimer); jumpTimer = null; if (jumpEl) jumpEl.classList.remove('holding'); jumpEl = null; }
document.addEventListener('pointerdown', (e) => {
  const el = e.target.closest('[data-jump]');
  if (!el || ctx.route !== 'home') return;
  e.preventDefault();
  cancelJump();
  jumpEl = el;
  el.style.setProperty('--hold', jumpSec() + 's');
  el.classList.add('holding');
  jumpTimer = setTimeout(() => {
    const id = el.dataset.jump; cancelJump();
    if (navigator.vibrate) navigator.vibrate(30);
    setOverride(ctx.s, id); save(); render();
  }, jumpSec() * 1000);
});
['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => document.addEventListener(t, (e) => { if (jumpEl && (t !== 'pointerleave' || e.target === jumpEl)) cancelJump(); }));
document.addEventListener('contextmenu', (e) => { if (e.target.closest('[data-jump]')) e.preventDefault(); });

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

// ---------- Horloge intelligente ----------
// La nuit ne se lance jamais toute seule : à l'heure du dodo, l'écran de l'enfant montre que c'est l'heure
// de dormir et un bouton à maintenir (code parent si besoin) lance la nuit.
// L'accueil se met à jour chaque minute (créneau en cours, bouton « Au dodo » qui clignote).
let lastSlot = null;
setInterval(() => { if (document.visibilityState === 'visible') keepAwake(); }, 60000); // si le système a relâché le verrou
setInterval(async () => {
  if (ctx.route === 'home') {
    const cs = ctx.s.clock.on ? currentSlot(ctx.s) : null;
    const id = cs ? cs.cur.id : null;
    if (id !== lastSlot) {
      lastSlot = id;
      if (id && ctx.s.clock.chime) chime();
      // Annonce à voix haute du nouveau moment (jamais pendant le sommeil).
      if (cs && ctx.s.clock.voice !== false && !cs.cur.info.asleep) setTimeout(() => speak(momentTalk(cs.cur, ctx.s.child.name, cs.next)), 1200);
      render();
    } else if (cs) {
      // Même moment : on avance juste la barre, sans redessiner (les animations ne repartent pas de zéro).
      const bar = document.querySelector('.ch-bar span');
      if (bar) bar.style.width = Math.round(cs.progress * 100) + '%';
    } else render();
  }
}, 30000);

// ---------- Démarrage ----------
async function boot() {
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js').then((reg) => reg.update()).catch(() => {});
    // Nouvelle version installée : on recharge une fois pour l'afficher (sauf pendant la nuit ou une histoire).
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController) return;
      const reload = () => location.reload();
      if (ctx.night || ctx.ritual || ['player', 'brush'].includes(ctx.route)) document.addEventListener('visibilitychange', reload, { once: true });
      else reload();
    });
  }
  ctx.s = await loadSettings();
  keepAwake(); // l'écran reste allumé jour et nuit
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
  ctx.nightOffUntil = (await kv.get('nightOffUntil')) || null;
  ctx.route = 'home';
  lastSlot = ctx.s.clock.on ? currentSlot(ctx.s).cur.id : null;
  go('home');
}

boot().catch((e) => {
  ctx.root.innerHTML = `<div class="screen center-msg"><h1>Oups</h1><p>Lunoo n'a pas pu démarrer : ${String(e.message || e)}</p></div>`;
});
