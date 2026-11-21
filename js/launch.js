// Lancer la nuit (ou la sieste) : une question à la fois, dans une petite fenêtre,
// par-dessus l'écran de l'enfant ou l'espace parent. Les choix sont gardés pour la fois suivante :
// dès la deuxième fois, un seul écran « Comme d'habitude ? » suffit.
import { ctx, esc, save, launchNight, fmtDur } from './ctx.js';
import { ICONS, SOUNDS, storyLength } from './data.js';
import { animalSVG, icon } from './animal.js';
import { allStories } from './narrator.js';
import { startAmbience, stopAmbience, ambiencePlaying } from './sound.js';

const MAIN_SOUNDS = ['berceuse', 'melodie', 'pluie', 'ventre', 'coeur', 'blanc', 'vagues', 'aucun'];
const LIGHTS = [['off', 'Écran noir', 'Rien ne brille'], ['faible', 'Veilleuse très faible', 'Juste une lueur'], ['on', 'Veilleuse allumée', 'Une douce lumière']];
const DURS = [[10, '10 min'], [20, '20 min'], [30, '30 min'], [45, '45 min'], [0, 'Toute la nuit']];

let W = null;   // état de l'assistant
let el = null;  // fenêtre affichée

const name = () => esc(ctx.s.child.name || 'l’enfant');
const countKey = () => (W.type === 'sieste' ? 'napChoose' : 'choose');
const dodo = () => (W.type === 'sieste' ? 'la sieste' : 'la nuit');

export function openLaunch(type = 'soir') {
  type = type === 'sieste' ? 'sieste' : 'soir';
  const saved = (ctx.s.launch && ctx.s.launch[type]) || {};
  const known = new Set(allStories(ctx.s).map((x) => x.id));
  W = { type, mode: saved.mode || 'child', ids: (saved.ids || []).filter((id) => known.has(id)), hist: [], edit: false };
  if (W.mode === 'pick' && !W.ids.length) W.mode = 'child';
  W.step = saved.done ? 'recap' : 'stories';
  if (!el) {
    el = document.createElement('div');
    el.className = 'modal-wrap wizard-wrap';
    el.addEventListener('click', onClick);
    document.body.appendChild(el);
  }
  draw();
}

function close() {
  if (ambiencePlaying() && !ctx.night) stopAmbience(true);
  if (el) el.remove();
  el = null; W = null;
}

function persist(done = false) {
  ctx.s.launch = ctx.s.launch || {};
  const prev = ctx.s.launch[W.type] || {};
  ctx.s.launch[W.type] = { mode: W.mode, ids: [...W.ids], done: done || !!prev.done };
  save();
}

// Étape suivante (ou retour au récapitulatif quand on modifie un seul choix).
function to(step) {
  if (ambiencePlaying() && !ctx.night) stopAmbience(true);
  W.hist.push(W.step);
  W.step = step;
  draw();
}
function after(step) { to(W.edit ? 'recap' : step); }

function storiesTxt() {
  const n = ctx.s.stories[countKey()];
  if (W.mode === 'child') return `${name()} choisit ${n} histoire${n > 1 ? 's' : ''}`;
  if (W.mode === 'none' || !W.ids.length) return 'Sans histoire';
  const st = allStories(ctx.s);
  const min = W.ids.reduce((t, id) => t + ((st.find((x) => x.id === id) || {}).minutes || 0), 0);
  return `${W.ids.length} histoire${W.ids.length > 1 ? 's' : ''} choisie${W.ids.length > 1 ? 's' : ''}${min ? ` · environ ${min} min` : ''}`;
}
function soundTxt() {
  const so = ctx.s.sound;
  if (so.type === 'aucun') return 'Silence';
  return `${SOUNDS[so.type].label} · ${so.dur ? so.dur + ' min' : 'toute la nuit'}`;
}
const lightTxt = () => (LIGHTS.find((l) => l[0] === ctx.s.night.mode) || LIGHTS[0])[1];

function tile(attrs, inner, sel = false, cls = '') {
  return `<button type="button" class="wz-tile ${cls} ${sel ? 'sel' : ''}" aria-pressed="${sel}" ${attrs}>${inner}</button>`;
}

function body() {
  const s = ctx.s;
  switch (W.step) {
    case 'stories': return {
      q: 'Des histoires avant de dormir ?',
      html: `<div class="wz-grid g3">
        ${tile('data-w="mode" data-v="child"', `${icon(ICONS.histoire, 40)}<strong>${name()} choisit</strong><span>sur la tablette</span>`, W.mode === 'child')}
        ${tile('data-w="mode" data-v="pick"', `${icon(ICONS.list, 40)}<strong>Je choisis</strong><span>maintenant</span>`, W.mode === 'pick')}
        ${tile('data-w="mode" data-v="none"', `${icon(ICONS.nuit, 40)}<strong>Pas d’histoire</strong><span>dodo tout de suite</span>`, W.mode === 'none')}
      </div>`,
    };
    case 'count': return {
      q: `Combien d’histoires ${name()} peut-il choisir ?`,
      html: `<div class="wz-grid g3">${[1, 2, 3].map((n) => tile(`data-w="count" data-v="${n}"`, `<strong class="big-n">${n}</strong><span>histoire${n > 1 ? 's' : ''}</span>`, s.stories[countKey()] === n)).join('')}</div>`,
    };
    case 'pick': {
      const st = allStories(s);
      return {
        q: 'Quelles histoires ?',
        sub: 'Touchez-les dans l’ordre de lecture.',
        html: `${s.playlists.length ? `<div class="chips">${s.playlists.map((pl) => `<button type="button" class="chip" data-w="pl" data-v="${esc(pl.id)}">${icon(ICONS.list, 16)}${esc(pl.name)}</button>`).join('')}</div>` : ''}
          <div class="wz-stories">${st.map((x) => { const i = W.ids.indexOf(x.id); return `
            <button type="button" class="wz-story ${i >= 0 ? 'sel' : ''}" aria-pressed="${i >= 0}" data-w="story" data-v="${esc(x.id)}">
              <span class="thumb sm" style="background:${x.bg}">${animalSVG(x.animal || 'hibou', { size: 64 })}${i >= 0 ? `<span class="order">${i + 1}</span>` : ''}</span>
              <span class="wz-st"><strong>${esc(x.title)}</strong>${x.minutes ? `<span>${storyLength(x.minutes).label} · ${x.minutes} min</span>` : ''}</span>
            </button>`; }).join('')}</div>`,
        foot: `<button type="button" class="btn primary" data-w="pick-ok" ${W.ids.length ? '' : 'disabled'}>Suivant${W.ids.length ? ` (${W.ids.length})` : ''}</button>`,
      };
    }
    case 'sound': {
      const playing = ambiencePlaying() && !ctx.night;
      return {
        q: `Un son pour ${dodo()} ?`,
        sub: 'Il démarre après les histoires. Touchez le haut-parleur pour écouter.',
        html: `<div class="wz-grid g4">${MAIN_SOUNDS.map((k) => `<div class="wz-snd">
          ${tile(`data-w="snd" data-v="${k}"`, `${icon(k === 'aucun' ? ICONS.close : (SOUNDS[k].music ? ICONS.music : ICONS.sound), 30)}<strong>${SOUNDS[k].label}</strong>`, s.sound.type === k, 'sm')}
          ${k === 'aucun' ? '' : `<button type="button" class="wz-play ${playing && W.preview === k ? 'on' : ''}" data-w="listen" data-v="${k}" aria-label="Écouter ${SOUNDS[k].label}">${icon(playing && W.preview === k ? ICONS.close : ICONS.sound, 18)}</button>`}
        </div>`).join('')}</div>`,
      };
    }
    case 'dur': return {
      q: 'Le son dure combien de temps ?',
      html: `<div class="wz-grid g3">${DURS.map(([v, l]) => tile(`data-w="dur" data-v="${v}"`, `<strong>${l}</strong>${v ? '<span>puis silence</span>' : '<span>jusqu’au réveil</span>'}`, s.sound.dur === v)).join('')}</div>`,
    };
    case 'light': return {
      q: 'Et la lumière ?',
      html: `<div class="wz-grid g3">${LIGHTS.map(([v, l, d]) => tile(`data-w="light" data-v="${v}"`, `<span class="wz-light l-${v}"></span><strong>${l}</strong><span>${d}</span>`, s.night.mode === v)).join('')}</div>`,
    };
    default: { // recap
      const wake = W.type === 'sieste' ? `Réveil dans ${fmtDur(s.schedule.nap.dur)}` : `Réveil à ${s.schedule.wakeWeek}`;
      const first = !(ctx.s.launch && ctx.s.launch[W.type] && ctx.s.launch[W.type].done);
      return {
        q: first ? 'C’est prêt !' : 'Comme d’habitude ?',
        sub: 'Touchez une ligne pour la changer.',
        html: `<div class="wz-recap">
          <button type="button" class="wz-line" data-w="edit" data-v="stories">${icon(ICONS.histoire, 26)}<span>${storiesTxt()}</span>${icon(ICONS.next, 20)}</button>
          <button type="button" class="wz-line" data-w="edit" data-v="sound">${icon(ICONS.sound, 26)}<span>${soundTxt()}</span>${icon(ICONS.next, 20)}</button>
          <button type="button" class="wz-line" data-w="edit" data-v="light">${icon(ICONS.nuit, 26)}<span>${lightTxt()}</span>${icon(ICONS.next, 20)}</button>
          <div class="wz-line static">${icon(ICONS.sun, 26)}<span>${wake}</span></div>
        </div>`,
        foot: `<button type="button" class="btn primary xl wz-go" data-w="go">${icon(ICONS.nuit, 26)}${W.type === 'sieste' ? 'Lancer la sieste' : 'Lancer la nuit'}</button>`,
      };
    }
  }
}

const FLOW = ['stories', 'sound', 'light', 'recap'];
function draw() {
  if (!el || !W) return;
  const b = body();
  const pos = Math.max(0, FLOW.indexOf({ count: 'stories', pick: 'stories', dur: 'sound' }[W.step] || W.step));
  const showDots = W.step !== 'recap' && !W.edit;
  el.innerHTML = `<div class="modal wizard" role="dialog" aria-modal="true" aria-labelledby="wz-q">
    <div class="wz-head">
      ${W.hist.length ? `<button type="button" class="link-btn" data-w="back">${icon(ICONS.back)}Retour</button>` : '<span></span>'}
      ${showDots ? `<div class="progress">${[0, 1, 2].map((i) => `<span class="${i <= pos ? 'done' : ''}"></span>`).join('')}</div>` : '<span></span>'}
      <button type="button" class="icon-btn" data-w="close" aria-label="Fermer">${icon(ICONS.close, 22)}</button>
    </div>
    <h2 id="wz-q" class="wz-q">${b.q}</h2>
    ${b.sub ? `<p class="muted wz-sub">${b.sub}</p>` : ''}
    <div class="wz-body">${b.html}</div>
    ${b.foot ? `<div class="wz-foot">${b.foot}</div>` : ''}
  </div>`;
}

function onClick(e) {
  if (e.target === el) return close(); // toucher à côté ferme
  const b = e.target.closest('[data-w]');
  if (!b || b.disabled || !W) return;
  const v = b.dataset.v, s = ctx.s;
  switch (b.dataset.w) {
    case 'close': return close();
    case 'back': {
      if (ambiencePlaying() && !ctx.night) stopAmbience(true);
      W.step = W.hist.pop() || 'stories';
      if (W.step === 'recap') W.edit = false;
      return draw();
    }
    case 'edit': W.edit = true; W.hist.push('recap'); W.step = v; return draw();
    case 'mode':
      W.mode = v;
      if (v === 'pick') return to('pick');
      persist();
      return v === 'child' ? to('count') : after('sound');
    case 'count': s.stories[countKey()] = Number(v); persist(); return after('sound');
    case 'story': {
      const i = W.ids.indexOf(v);
      if (i >= 0) W.ids.splice(i, 1); else if (W.ids.length < 5) W.ids.push(v);
      return draw();
    }
    case 'pl': { const pl = s.playlists.find((x) => x.id === v); if (pl) W.ids = [...pl.storyIds]; return draw(); }
    case 'pick-ok': persist(); return after('sound');
    case 'listen':
      if (ambiencePlaying() && W.preview === v) { stopAmbience(); W.preview = null; }
      else { W.preview = v; startAmbience({ ...s.sound, type: v, dur: 1 }); }
      return draw();
    case 'snd':
      s.sound.type = v; save();
      if (v === 'aucun') return after('light');
      return to('dur');
    case 'dur': s.sound.dur = Number(v); save(); return after('light');
    case 'light': s.night.mode = v; save(); W.edit = false; return to('recap');
    case 'go': {
      persist(true);
      const type = W.type, ids = W.mode === 'pick' ? [...W.ids] : [], child = W.mode === 'child';
      close();
      launchNight(type, ids, child);
    }
  }
}
