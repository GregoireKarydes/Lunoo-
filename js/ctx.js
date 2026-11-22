// État partagé de l'appli, navigation, moteur du rituel et de la nuit.
import { kv, saveSettings } from './store.js';
import { startAmbience, stopAmbience, setBedMuted } from './sound.js';
import { MOMENTS } from './data.js';

export const ctx = {
  s: null,            // réglages (persistés)
  route: 'home',
  params: {},
  ritual: null,       // rituel en cours (en mémoire)
  night: null,        // nuit / sieste en cours (persistée)
  screens: {},        // écrans enregistrés : { render(p), mount(el, p), unmount() }
  actions: {},        // actions des boutons [data-act] : fn(bouton, événement)
  current: null,
  root: null,
  remote: null,       // mode enregistreur (lien « voix d'un proche » ouvert sur un téléphone)
};

export const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const uid = () => Math.random().toString(36).slice(2, 10);

export async function save() { if (!ctx.remote) await saveSettings(ctx.s); } // rien n'est gardé en mode enregistreur

export function go(route, params = {}) {
  ctx.route = route;
  ctx.params = params;
  render();
}

export function render() {
  const scr = ctx.screens[ctx.route] || ctx.screens.home;
  if (ctx.current && ctx.current.unmount) ctx.current.unmount();
  ctx.current = scr;
  ctx.root.innerHTML = scr.render(ctx.params);
  ctx.root.scrollTop = 0;
  window.scrollTo(0, 0);
  if (scr.mount) scr.mount(ctx.root, ctx.params);
  const focus = ctx.root.querySelector('[autofocus]');
  if (focus) focus.focus();
}

// ---------- Heures ----------

export const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
export const fromMin = (m) => { m = ((m % 1440) + 1440) % 1440; const h = Math.floor(m / 60), mm = m % 60; return `${h}:${String(mm).padStart(2, '0')}`; };
export const pad = (hhmm) => { const [h, m] = hhmm.split(':'); return `${String(h).padStart(2, '0')}:${m}`; };
export const fmtDur = (min) => { const h = Math.floor(min / 60), m = min % 60; return h ? `${h} h${m ? ' ' + String(m).padStart(2, '0') : ''}` : `${m} min`; };

export function sleepRange(age) {
  if (age <= 2) return [11 * 60, 14 * 60, '1 à 2 ans', '11 à 14 h'];
  if (age <= 5) return [10 * 60, 13 * 60, '3 à 5 ans', '10 à 13 h'];
  return [9 * 60, 12 * 60, '6 à 12 ans', '9 à 12 h'];
}

// Heure d'endormissement estimée = moment « Dodo » de la journée (+ ~15 min d'histoires).
export function estimatedBedtime(s) {
  const d = (s.clock.slots || []).find((x) => x.type === 'dodo');
  return toMin(d ? d.time : '20:00') + 15;
}

export function sleepCheck(s) {
  const bed = estimatedBedtime(s);
  const night = (toMin(s.schedule.wakeWeek) - bed + 1440) % 1440;
  const nap = s.schedule.nap.on ? s.schedule.nap.dur : 0;
  const total = night + nap;
  if (!s.child.age) return { bed, night, nap, total, ok: true, noAge: true };
  const [lo, hi, ageTxt, rangeTxt] = sleepRange(s.child.age);
  return { bed, night, nap, total, ok: total >= lo && total <= hi, ageTxt, rangeTxt };
}

// ---------- Écran toujours allumé, jour et nuit ----------
// 1) Wake Lock (Chrome, Safari récent). 2) Sinon, une vidéo muette de 3 s en boucle,
// lancée au premier toucher : c'est ce qui empêche l'iPad de se verrouiller quand Wake Lock est refusé.
let wakeLock = null;
let awakeVideo = null;
export const awakeState = { method: 'aucune' };

function videoFallback() {
  if (!awakeVideo) {
    awakeVideo = document.createElement('video');
    awakeVideo.setAttribute('playsinline', '');
    awakeVideo.setAttribute('muted', '');
    awakeVideo.muted = true;
    awakeVideo.loop = true;
    awakeVideo.src = 'assets/awake.mp4';
    awakeVideo.style.cssText = 'position:fixed;left:0;bottom:0;width:2px;height:2px;opacity:.01;pointer-events:none;z-index:-1';
    document.body.appendChild(awakeVideo);
  }
  if (awakeVideo.paused) awakeVideo.play().then(() => { awakeState.method = 'vidéo'; }).catch(() => {});
}

export async function keepAwake() {
  if (wakeLock) return;
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      awakeState.method = 'wakelock';
      wakeLock.addEventListener('release', () => { wakeLock = null; awakeState.method = 'aucune'; });
      if (awakeVideo) awakeVideo.pause();
      return;
    }
  } catch (e) { /* refusé : on passe à la vidéo */ }
  videoFallback();
}

// ---------- Rituel ----------

export function startRitual(type) {
  const steps = ctx.s.rituals[type].filter((x) => x.on).map((x) => ({ ...x }));
  ctx.ritual = { type, steps, idx: -1, chosen: [], ambience: false };
  keepAwake();
  nextStep();
}

/**
 * Lancé par un parent : histoires choisies (ou choisies par l'enfant), puis la nuit ou la sieste.
 * ids : histoires dans l'ordre ; childPicks : l'enfant choisit sur la tablette ; aucun des deux : nuit tout de suite.
 */
export async function launchNight(type, ids = [], childPicks = false) {
  if (ctx.s.guide && !ctx.s.guide.night) { ctx.s.guide.night = true; save(); }
  if (ctx.night) { ctx.night = null; await kv.del('night'); } // une nuit lancée toute seule par l'horloge
  if (ctx.s.clock && ctx.s.clock.override) { delete ctx.s.clock.override; save(); }
  ctx.nightOffUntil = null; await kv.del('nightOffUntil');
  setBedMuted(false);
  ctx.ritual = { type, steps: [{ id: 'histoire', on: true, dur: 0 }, { id: 'nuit', on: true, dur: 0 }], idx: 0, chosen: [], ambience: false };
  keepAwake();
  stopAmbience(true); // le son de la nuit viendra après les histoires
  if (childPicks) return go('pick', { max: type === 'sieste' ? ctx.s.stories.napChoose : ctx.s.stories.choose });
  if (!ids.length) return enterNight(type);
  ctx.ritual.chosen = ids;
  go('player', { i: 0 });
}

export function nextStep() {
  const r = ctx.ritual;
  if (!r) return go('home');
  r.idx += 1;
  const step = r.steps[r.idx];
  if (!step) return enterNight(r.type);
  // Le son de la nuit (pluie, bruit blanc…) ne démarre qu'après les histoires : enterNight s'en charge.
  if (step.id === 'histoire') {
    const st = ctx.s.stories;
    const pl = st.mode === 'playlist' && ctx.s.playlists.find((p) => p.id === st.playlistId);
    if (pl && pl.storyIds.length) { r.chosen = [...pl.storyIds]; return go('player', { i: 0 }); }
    return go('pick', { max: r.type === 'sieste' ? st.napChoose : st.choose });
  }
  if (step.id === 'nuit') return enterNight(r.type);
  go('moment', { id: step.id, dur: step.dur });
}

export function momentInfo(id) { return MOMENTS[id] || MOMENTS.calme; }

// ---------- Nuit et sieste ----------

export function nextWake(s) {
  const now = new Date();
  const d = new Date(now);
  for (let i = 0; i < 2; i++) {
    const day = d.getDay();
    const hhmm = (day === 0 || day === 6) ? s.schedule.wakeWeekend : s.schedule.wakeWeek;
    const [h, m] = hhmm.split(':').map(Number);
    const t = new Date(d); t.setHours(h, m, 0, 0);
    if (t > now) return t.getTime();
    d.setDate(d.getDate() + 1);
  }
  return now.getTime() + 10 * 3600e3;
}

export async function enterNight(type, opts = {}) {
  const s = ctx.s;
  if (!opts.quiet && (!ctx.ritual || !ctx.ritual.ambience)) startAmbience(s.sound);
  const wakeAt = type === 'sieste' ? Date.now() + s.schedule.nap.dur * 60000 : nextWake(s);
  ctx.night = { type, wakeAt, startedAt: opts.startedAt || Date.now(), auto: !!opts.quiet };
  ctx.ritual = null;
  await kv.set('night', ctx.night);
  keepAwake();
  go('night');
}

// Quand un parent arrête la nuit à la main, l'horloge ne la relance pas avant le prochain réveil.
export async function endNight(toHome = true, byParent = false) {
  if (byParent && ctx.night) {
    ctx.nightOffUntil = ctx.night.wakeAt;
    await kv.set('nightOffUntil', ctx.nightOffUntil);
  }
  ctx.night = null;
  stopAmbience(false, 2);
  await kv.del('night');
  if (toHome) go('home');
}

export function nightPhase() {
  const n = ctx.night;
  if (!n) return null;
  const now = Date.now();
  if (now >= n.wakeAt) return 'wake';
  if (ctx.s.wake.soon && now >= n.wakeAt - 20 * 60000) return 'soon';
  return 'night';
}
