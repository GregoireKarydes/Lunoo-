// Lancer la nuit (ou la sieste) : une question à la fois, dans une petite fenêtre,
// par-dessus l'écran de l'enfant ou l'espace parent. Les choix sont gardés pour la fois suivante :
// dès la deuxième fois, un seul écran « Comme d'habitude ? » suffit.
import { ctx, esc, save, launchNight, fmtDur } from './ctx.js';
import { ICONS, SOUNDS, storyLength } from './data.js';
import { animalSVG, icon } from './animal.js';
import { allStories } from './narrator.js';
import { startAmbience, stopAmbience, ambiencePlaying, setAmbienceVolume } from './sound.js';

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
  W = { type, mode: saved.mode || 'child', ids: (saved.ids || []).filter((id) => known.has(id)), hist: [], edit: false, voice: 'all', len: 'all', sort: 'default' };
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
      const all = allStories(s);
      // Voix disponibles : celles des proches (enregistrées) et la voix de la tablette.
      const vOf = (x) => (x.recorded ? (x.voice || 'Famille') : 'Lunoo');
      const voices = {};
      all.forEach((x) => { voices[vOf(x)] = (voices[vOf(x)] || 0) + 1; });
      const family = Object.keys(voices).filter((v) => v !== 'Lunoo').sort();
      const nFamily = family.reduce((n, v) => n + voices[v], 0);
      let list = all.filter((x) => (W.voice === 'all' ? true : W.voice === 'family' ? x.recorded : vOf(x) === W.voice));
      if (W.len !== 'all') list = list.filter((x) => x.minutes && storyLength(x.minutes).id === W.len);
      if (W.sort !== 'default') list = [...list].sort((p, q) => ((p.minutes || 999) - (q.minutes || 999)) * (W.sort === 'long' ? -1 : 1));
      const total = W.ids.reduce((t, id) => t + ((all.find((x) => x.id === id) || {}).minutes || 0), 0);
      const chip = (w, v, label) => `<button type="button" class="chip ${W[w] === v ? 'sel' : ''}" aria-pressed="${W[w] === v}" data-w="f-${w}" data-v="${esc(v)}">${label}</button>`;
      return {
        q: 'Quelles histoires ?',
        sub: 'Touchez-les dans l’ordre de lecture.',
        html: `<div class="wz-filters">
            <div class="wz-frow"><span class="label">Voix</span><div class="chips">
              ${chip('voice', 'all', `Toutes (${all.length})`)}
              ${nFamily ? chip('voice', 'family', `${icon(ICONS.mic, 16)}Voix des proches (${nFamily})`) : ''}
              ${family.map((v) => chip('voice', v, `${esc(v)} (${voices[v]})`)).join('')}
              ${chip('voice', 'Lunoo', `Voix Lunoo (${voices.Lunoo || 0})`)}
            </div></div>
            ${nFamily ? '' : '<span class="muted small wz-hint">Aucune voix de proche pour l’instant : enregistrez une histoire dans l’espace parent › Histoires.</span>'}
            <div class="wz-frow"><span class="label">Durée</span><div class="chips">
              ${chip('len', 'all', 'Toutes')}${chip('len', 'courte', 'Courtes')}${chip('len', 'moyenne', 'Moyennes')}${chip('len', 'longue', 'Longues')}
            </div></div>
            <div class="wz-frow"><span class="label">Trier</span><div class="chips">
              ${chip('sort', 'default', 'Par défaut')}${chip('sort', 'short', 'Plus courtes d’abord')}${chip('sort', 'long', 'Plus longues d’abord')}
            </div></div>
            ${s.playlists.length ? `<div class="wz-frow"><span class="label">Playlists</span><div class="chips">${s.playlists.map((pl) => `<button type="button" class="chip" data-w="pl" data-v="${esc(pl.id)}">${icon(ICONS.list, 16)}${esc(pl.name)}</button>`).join('')}</div></div>` : ''}
          </div>
          ${list.length ? `<div class="wz-stories">${list.map((x) => { const i = W.ids.indexOf(x.id); return `
            <button type="button" class="wz-story ${i >= 0 ? 'sel' : ''}" aria-pressed="${i >= 0}" data-w="story" data-v="${esc(x.id)}">
              <span class="thumb sm" style="background:${x.bg}">${animalSVG(x.animal || 'hibou', { size: 64 })}${i >= 0 ? `<span class="order">${i + 1}</span>` : ''}</span>
              <span class="wz-st"><strong>${esc(x.title)}</strong>
                <span>${x.minutes ? `${icon(ICONS.clock, 14)} ${x.minutes} min · ${storyLength(x.minutes).label.toLowerCase()}` : 'Durée inconnue'}</span>
                <span class="wz-voice ${x.recorded ? 'fam' : ''}">${icon(x.recorded ? ICONS.mic : ICONS.sound, 14)} ${x.recorded ? esc(vOf(x)) : 'Voix Lunoo'}</span></span>
            </button>`; }).join('')}</div>` : '<p class="muted center">Aucune histoire avec ces filtres.</p>'}`,
        foot: `<div class="wz-total">${W.ids.length ? `<strong>${W.ids.length} histoire${W.ids.length > 1 ? 's' : ''}</strong> · environ <strong>${total} min</strong> au total <button type="button" class="link-btn small" data-w="clear">tout retirer</button>` : '<span class="muted">Aucune histoire choisie</span>'}</div>
          <button type="button" class="btn primary" data-w="pick-ok" ${W.ids.length ? '' : 'disabled'}>Suivant</button>`,
      };
    }
    case 'sound': {
      const so = s.sound, playing = ambiencePlaying() && !ctx.night;
      const keys = ['aucun', ...Object.keys(SOUNDS).filter((k) => k !== 'aucun')];
      return {
        q: `Un son pour ${dodo()} ?`,
        sub: 'Il démarre après les histoires. Touchez un son, puis « Écouter » pour l’essayer.',
        html: `<div class="wz-grid g5">${keys.map((k) => tile(`data-w="snd" data-v="${k}"`,
            `${icon(k === 'aucun' ? ICONS.close : (SOUNDS[k].music ? ICONS.music : ICONS.sound), 26)}<strong>${SOUNDS[k].label}</strong>${playing && W.preview === k ? '<span class="wz-onair">♪ en écoute</span>' : ''}`,
            so.type === k, 'xs')).join('')}</div>
          ${so.type === 'aucun' ? '<p class="muted center">Pas de son : la nuit sera silencieuse.</p>' : `
          <div class="wz-vol">
            <span class="label">Volume</span>
            <button type="button" class="round" data-w="vol" data-v="-5" aria-label="Moins fort">−</button>
            <div class="vol-track"><div class="vol-fill" style="width:${so.vol}%"></div><span class="vol-cap" style="left:${so.cap}%"></span></div>
            <button type="button" class="round" data-w="vol" data-v="5" aria-label="Plus fort">+</button>
            <strong class="wz-volv">${so.vol} %</strong>
            <button type="button" class="btn ${playing ? 'primary' : 'ghost'} wz-listen" data-w="listen" data-v="${so.type}">${icon(playing ? ICONS.close : ICONS.sound, 20)}${playing ? 'Arrêter' : 'Écouter'}</button>
          </div>
          <p class="muted small center">Maximum ${so.cap} % pour protéger ses oreilles. Posez la tablette loin du lit.</p>`}`,
        foot: `<button type="button" class="btn primary" data-w="snd-ok">Suivant</button>`,
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
    case 'f-voice': W.voice = v; return draw();
    case 'f-len': W.len = v; return draw();
    case 'f-sort': W.sort = v; return draw();
    case 'clear': W.ids = []; return draw();
    case 'listen':
      if (ambiencePlaying() && !ctx.night) { stopAmbience(); W.preview = null; }
      else { W.preview = v; startAmbience({ ...s.sound, type: v, dur: 1 }); }
      return draw();
    case 'snd':
      s.sound.type = v; save();
      if (v === 'aucun') { if (ambiencePlaying() && !ctx.night) stopAmbience(); W.preview = null; }
      else if (ambiencePlaying() && !ctx.night) { W.preview = v; startAmbience({ ...s.sound, type: v, dur: 1 }); }
      return draw();
    case 'vol': {
      const so = s.sound;
      so.vol = Math.max(5, Math.min(so.cap, so.vol + Number(v))); save();
      setAmbienceVolume(so);
      return draw();
    }
    case 'snd-ok': return s.sound.type === 'aucun' ? after('light') : to('dur');
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
