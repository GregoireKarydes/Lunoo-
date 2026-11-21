// Écrans de l'enfant : accueil, choix des histoires, lecture, moments, nuit, réveil.
import { ctx, esc, go, render, startRitual, nextStep, momentInfo, nightPhase, endNight, enterNight, toMin, keepAwake } from './ctx.js';
import { ANIMALS, PALETTES, ICONS, MOMENTS, SOUNDS, momentAnimal, storyLength, DONE_SAY } from './data.js';
import { animalSVG, icon, moonSVG, sceneFor } from './animal.js';
import { parentCorner } from './ui.js';
import { allStories, playStory } from './narrator.js';
import { stopAmbience, startBed, stopBed, bedPlaying, setBedMuted } from './sound.js';
import { currentSlot } from './clock.js';
import { REWARDABLE, buttonLabel, doneToday, dayKey, speak } from './rewards.js';

const pal = () => PALETTES[ctx.s.child.color] || PALETTES.corail;
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };

// ---------- Accueil ----------
// Animal du moment + son décor animé (bulles au bain, gouttes sous la douche…).
export { hhmm };
export function sceneBlock(kind, asleep, size) {
  const a = momentAnimal(kind);
  const sc = sceneFor(kind, { asleep });
  return `${animalSVG(a, { size, cls: sc.cls || (asleep ? '' : 'bob'), asleep, label: ANIMALS[a].label })}${sc.html}`;
}
function activityBadge(info, size = 120) {
  return `<span class="act-badge pulse" style="width:${size}px;height:${size}px;background:${info.dark ? '#2E3270' : '#fff'};color:${info.dark ? '#F5C451' : '#1F2250'}">${icon(ICONS[info.icon] || ICONS.clock, Math.round(size * 0.52))}</span>`;
}

// Horloge à aiguilles : la part colorée montre le temps qui reste avant le prochain moment,
// et l'icône du prochain moment est posée sur le cadran, à son heure.
const pt = (cx, r, deg) => [cx + r * Math.sin(deg * Math.PI / 180), cx - r * Math.cos(deg * Math.PI / 180)];
export function clockFace(next, size = 150, dark = false) {
  const d = new Date(), h = d.getHours() % 12, m = d.getMinutes();
  const aH = (h + m / 60) * 30, aM = m * 6;
  const cx = 60, R = 50;
  let wedge = '', marker = '';
  if (next) {
    const nowT = d.getHours() * 60 + m;
    const diff = (next.min - nowT + 1440) % 1440;
    if (diff > 0 && diff < 720) {
      const aN = aH + diff / 2; // 0,5° par minute pour la petite aiguille
      const [x1, y1] = pt(cx, R - 4, aH), [x2, y2] = pt(cx, R - 4, aN);
      wedge = `<path class="cf-wedge" d="M${cx} ${cx} L${x1.toFixed(1)} ${y1.toFixed(1)} A${R - 4} ${R - 4} 0 ${diff > 360 ? 1 : 0} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z" fill="${next.info.bg === '#FFFFFF' ? '#F5C451' : next.info.bg}"/>`;
      const [mx, my] = pt(cx, R + 1, aN);
      marker = `<g transform="translate(${(mx - 9).toFixed(1)} ${(my - 9).toFixed(1)})"><circle cx="9" cy="9" r="11" fill="#fff" stroke="#1F2250" stroke-width="2"/><svg x="2" y="2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1F2250" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="${ICONS[next.info.icon] || ICONS.clock}"/></svg></g>`;
    }
  }
  const ticks = Array.from({ length: 12 }, (_, i) => { const [a, b] = pt(cx, R - 2, i * 30), [c2, d2] = pt(cx, R - (i % 3 ? 7 : 11), i * 30); return `<line x1="${a.toFixed(1)}" y1="${b.toFixed(1)}" x2="${c2.toFixed(1)}" y2="${d2.toFixed(1)}"/>`; }).join('');
  return `<svg class="clockface ${dark ? 'dark' : ''}" viewBox="-6 -6 132 132" width="${size}" height="${size}" role="img" aria-label="Il est ${d.getHours()} heures ${m}">
    <circle cx="${cx}" cy="${cx}" r="${R}" class="cf-bg"/>${wedge}<g class="cf-ticks">${ticks}</g>
    <line class="cf-h" id="cf-h" x1="60" y1="60" x2="60" y2="30" transform="rotate(${aH.toFixed(1)} 60 60)"/>
    <line class="cf-m" id="cf-m" x1="60" y1="60" x2="60" y2="18" transform="rotate(${aM} 60 60)"/>
    <circle cx="60" cy="60" r="5" class="cf-dot"/>${marker}</svg>`;
}

// « Au dodo » n'apparaît que le soir (dès 1 h avant le rituel), pour éviter une nuit lancée à midi.
function eveningNow(t) { const r = toMin(ctx.s.schedule.ritualStart); return t >= r - 60 || t < 4 * 60; }

const doneTodayFor = (sl) => { const r = ctx.s.rewards; return !!(r && r.done[dayKey()] && r.done[dayKey()][sl.id]); };
function rewardBtn(cur) {
  if (!ctx.s.rewards || !ctx.s.rewards.on || !REWARDABLE.includes(cur.type)) return '';
  if (doneToday(cur.id)) return `<div class="done-chip">★ C'est fait, bravo !</div>`;
  return `<button type="button" class="done-btn" data-act="child-done" data-type="${cur.type}" data-slot="${esc(cur.id)}">${icon(ICONS.check, 34)}${esc(buttonLabel(cur.type))}</button>`;
}

const hhmm = () => { const d = new Date(); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; };
let handTimer = null;
function clockHome() {
  const s = ctx.s, c = s.child;
  const { cur, next, today, progress } = currentSlot(s);
  // Moment déjà fait : on ne répète pas « c'est l'heure de la douche », on attend le suivant en temps libre.
  const waiting = s.rewards && s.rewards.on && REWARDABLE.includes(cur.type) && doneToday(cur.id);
  const info = waiting ? { ...cur.info, bg: pal().bg, say: DONE_SAY[cur.type] || 'C’est fait !', icon: 'check', asleep: false, dark: false } : cur.info;
  const kind = waiting ? 'libre' : cur.type;
  const dark = !!info.dark;
  const sc = s.schedule;
  const napTime = cur.type === 'sieste';
  const nowT = nowMin();
  return `<div class="screen child home clockhome ${dark ? 'dark' : ''}" style="background:${info.bg}">
    ${parentCorner(info.bg, dark ? '#F5C451' : '#E2B24C')}
    <div class="ch-top"><h1 class="hello">Coucou ${esc(c.name)} !</h1></div>
    <div class="ch-main">
      <div class="ch-animal" data-act="say" data-v="${esc(`${info.say} ${waiting ? 'En attendant, temps libre. ' : ''}Ensuite : ${next.info.label.toLowerCase()}.`)}" role="button" aria-label="Écouter : ${esc(info.say)}">
        ${sceneBlock(kind, !!info.asleep, 320)}
        ${activityBadge(info)}
      </div>
      <div class="ch-side">
        <div class="ch-sayrow"><div class="ch-clock"><span class="ch-digital" id="ch-digital">${hhmm()}</span></div><span class="ch-say">${esc(info.say)}${waiting ? '<small>En attendant : temps libre</small>' : ''}</span></div>
        ${waiting ? '' : rewardBtn(cur)}
        <div class="ch-next">
          <span class="ch-next-ico" style="background:${next.info.bg}">${animalSVG(momentAnimal(next.type), { size: 56, asleep: !!next.info.asleep })}</span>
          <div class="grow"><span class="ch-next-label">Ensuite : ${esc(next.info.label)}</span>
            <div class="ch-bar" aria-label="Temps avant le prochain moment"><span style="width:${Math.round(progress * 100)}%"></span></div></div>
          <span class="ch-next-time">${next.time}</span>
        </div>
      </div>
    </div>
    <ol class="day-strip" aria-label="Ma journée">
      ${today.map((sl) => {
        const early = nowT < today[0].min;
        const st = (sl === cur || (early && sl.type === 'dodo')) ? 'now' : (!early && sl.min < nowT ? 'past' : '');
        const star = doneTodayFor(sl) ? '<span class="ds-star" aria-label="fait">★</span>' : '';
        return `<li class="ds ${st} ${star ? 'done' : ''}" style="background:${sl.info.bg};${sl.info.dark ? 'color:#FBF6EE' : ''}">${star}${icon(ICONS[sl.info.icon] || ICONS.clock, 28)}<span class="sr-only">${esc(sl.info.label)} ${sl.time}</span></li>`;
      }).join('')}
    </ol>
  </div>`;
}

ctx.screens.home = {
  mount(el) {
    clearInterval(handTimer);
    handTimer = setInterval(() => {
      const d = new Date(), hEl = el.querySelector('#cf-h'), mEl = el.querySelector('#cf-m');
      if (hEl) {
        hEl.setAttribute('transform', `rotate(${((d.getHours() % 12) + d.getMinutes() / 60) * 30} 60 60)`);
        mEl.setAttribute('transform', `rotate(${d.getMinutes() * 6} 60 60)`);
      }
      const dg = el.querySelector('#ch-digital'); if (dg) dg.textContent = hhmm();
    }, 20000);
  },
  unmount() { clearInterval(handTimer); },
  render() {
    if (ctx.s.clock && ctx.s.clock.on) return clockHome();
    const c = ctx.s.child, p = pal();
    const sc = ctx.s.schedule;
    const napTime = sc.nap.on && Math.abs(nowMin() - toMin(sc.nap.start)) <= 90;
    const ritualSoon = Math.abs(nowMin() - toMin(sc.ritualStart)) <= 30;
    const steps = ctx.s.rituals[napTime ? 'sieste' : 'soir'].filter((x) => x.on && x.id !== 'nuit');
    return `<div class="screen child home" style="background:${p.bg}">
      ${parentCorner(p.bg)}
      <h1 class="hello">Coucou ${esc(c.name)} !</h1>
      <div class="home-main">
        <div class="home-animal">${animalSVG('hibou', { size: 340, cls: 'bob', label: 'Hibou' })}</div>
      </div>
      <div class="ritual-strip" aria-label="Le rituel">
        <span class="strip-label">${napTime ? 'Sieste' : 'Ce soir'}</span>
        ${steps.map((st, i) => `${i ? `<span class="strip-arrow">${icon(ICONS.next, 18)}</span>` : ''}<span class="strip-step" style="background:${MOMENTS[st.id].bg};${MOMENTS[st.id].dark ? 'color:#FBF6EE' : ''}">${MOMENTS[st.id].label}</span>`).join('')}
        <span class="strip-arrow">${icon(ICONS.next, 18)}</span><span class="strip-step" style="background:#2E3270;color:#FBF6EE">Dodo</span>
      </div>
    </div>`;
  },
};
ctx.actions.say = (b) => speak(b.dataset.v);
ctx.actions['start-ritual'] = (b) => startRitual(b.dataset.v);
ctx.actions['free-stories'] = () => { setBedMuted(false); ctx.ritual = null; ctx.free = { chosen: [] }; go('pick', { max: 3, free: true }); };

// ---------- Choix des histoires ----------
// La longueur se lit sans savoir lire : 1, 2 ou 3 petites lunes.
const lenLevel = (m) => ({ courte: 1, moyenne: 2, longue: 3 })[storyLength(m).id];
const moons = (n) => `<span class="moons" aria-hidden="true">${'<i></i>'.repeat(n)}</span>`;
let pickState = { sel: [], tab: 'toutes' };
ctx.screens.pick = {
  render(p) {
    const max = p.max || 2;
    const stories = allStories(ctx.s);
    const family = stories.filter((s) => s.recorded);
    const tab = pickState.tab;
    let items;
    if (tab === 'playlists') {
      items = ctx.s.playlists.filter((pl) => pl.storyIds.length).map((pl) => {
        const first = stories.find((s) => s.id === pl.storyIds[0]) || stories[0];
        return { id: 'pl:' + pl.id, title: pl.name, animal: first.animal, bg: '#2E3270', voice: `${pl.storyIds.length} histoires`, pl };
      });
    } else if (['courte', 'moyenne', 'longue'].includes(tab)) items = stories.filter((x) => x.minutes && storyLength(x.minutes).id === tab);
    else items = tab === 'famille' ? family : stories;
    const sel = pickState.sel;
    const isPl = sel.length === 1 && sel[0].startsWith('pl:');
    const count = isPl ? max : sel.length;
    const c = ctx.s.child;
    return `<div class="screen child pick" style="background:${pal().bg}">
      ${parentCorner(pal().bg)}
      <div class="pick-head">
        <button type="button" class="round-btn" data-act="pick-back" aria-label="Retour">${icon(ICONS.back, 34)}</button>
        <h1>Quelle histoire ${ctx.ritual ? 'ce soir' : ''} ?</h1>
        <div class="slots" aria-label="${count} sur ${max}">${Array.from({ length: max }, (_, i) => `<span class="${i < count ? 'on' : ''}" style="${i < count ? `background:${pal().body}` : ''}"></span>`).join('')}<strong>${count} sur ${max}</strong></div>
      </div>
      <div class="tabs">
        ${[['toutes', 'Toutes'], ['courte', moons(1) + ' Petites'], ['moyenne', moons(2) + ' Moyennes'], ['longue', moons(3) + ' Longues'], ...(family.length ? [['famille', 'Voix de la famille']] : [])].map(([id, l]) => `<button type="button" class="tab ${tab === id ? 'sel' : ''}" aria-pressed="${tab === id}" data-act="pick-tab" data-v="${id}">${l}</button>`).join('')}
      </div>
      <div class="story-grid">
        ${items.length ? items.map((s) => {
          const idx = sel.indexOf(s.id);
          const a = s.animal || 'hibou';
          return `<button type="button" class="story-card ${idx >= 0 ? 'sel' : ''}" style="${idx >= 0 ? `border-color:${pal().body}` : ''}" aria-pressed="${idx >= 0}" data-act="pick-story" data-v="${esc(s.id)}" data-max="${max}">
            <span class="thumb" style="background:${s.bg}">${animalSVG(a, { size: 116 })}
              ${idx >= 0 ? `<span class="order" style="background:${pal().body}">${isPl ? icon(ICONS.check, 22) : idx + 1}</span>` : ''}
              ${s.recorded ? `<span class="voice-tag">${icon(ICONS.mic, 14)}${esc(s.voice)}</span>` : ''}
              ${s.minutes ? `<span class="len-tag len-${storyLength(s.minutes).id}" aria-label="Environ ${s.minutes} minutes">${moons(lenLevel(s.minutes))}<b>${s.minutes} min</b></span>` : ''}</span>
            <span class="story-title">${esc(s.title)}</span>
          </button>`;
        }).join('') : `<p class="empty">${tab === 'famille' ? 'Pas encore d’histoire enregistrée par la famille.' : 'Aucune playlist pour l’instant.'}</p>`}
      </div>
      <div class="pick-foot"><button type="button" class="btn primary xl go-btn" data-act="pick-go" ${sel.length ? '' : 'disabled'}>C'est parti ! ${icon(ICONS.play, 26, 'fill="#F5C451" stroke="none"')}</button></div>
    </div>`;
  },
  unmount() {},
};
ctx.actions['pick-tab'] = (b) => { pickState.tab = b.dataset.v; render(); };
ctx.actions['pick-story'] = (b) => {
  const id = b.dataset.v, max = Number(b.dataset.max);
  let sel = pickState.sel;
  if (id.startsWith('pl:')) sel = sel[0] === id ? [] : [id];
  else {
    sel = sel.filter((x) => !x.startsWith('pl:'));
    const i = sel.indexOf(id);
    if (i >= 0) sel.splice(i, 1); else if (sel.length < max) sel.push(id);
  }
  pickState.sel = sel; render();
};
ctx.actions['pick-back'] = () => {
  pickState = { sel: [], tab: 'toutes' };
  if (ctx.ritual) { ctx.ritual = null; stopAmbience(); }
  go('home');
};
ctx.actions['pick-go'] = () => {
  let ids = pickState.sel;
  if (ids.length === 1 && ids[0].startsWith('pl:')) {
    const pl = ctx.s.playlists.find((p) => 'pl:' + p.id === ids[0]);
    ids = pl ? [...pl.storyIds] : [];
  }
  pickState = { sel: [], tab: 'toutes' };
  if (ctx.ritual) ctx.ritual.chosen = ids; else ctx.free = { chosen: ids };
  go('player', { i: 0 });
};

// ---------- Lecture ----------
let player = null;
ctx.screens.player = {
  render(p) {
    const chosen = (ctx.ritual ? ctx.ritual.chosen : (ctx.free && ctx.free.chosen)) || [];
    const stories = allStories(ctx.s);
    const story = stories.find((s) => s.id === chosen[p.i]);
    if (!story) return '<div class="screen night-black"></div>';
    const next = stories.find((s) => s.id === chosen[p.i + 1]);
    const c = ctx.s.child;
    return `<div class="screen child player">
      ${parentCorner('#221A30', '#D9A93F', 0.35)}
      <div class="player-art">${animalSVG(story.animal || 'hibou', { size: 300, cls: 'breathe' })}</div>
      <div class="player-info">
        <span class="muted-warm">Histoire ${p.i + 1} sur ${chosen.length}</span>
        <h1>${esc(story.title)}</h1>
        <span class="voice-line">${icon(ICONS.mic, 22)}Racontée par ${esc(story.voice)}${story.minutes ? ` · environ ${story.minutes} min` : ''}</span>
        <div class="bar"><div class="bar-fill" id="prog"></div></div>
        <div class="player-ctl">
          <button type="button" class="play-btn" data-act="player-toggle" aria-label="Pause" id="play-btn">${icon(ICONS.pause, 46, 'fill="#221A30" stroke="none"')}</button>
          ${next ? `<div class="next-up"><span class="muted-warm">Ensuite</span><strong>${esc(next.title)}</strong></div>` : ''}
          ${story.amb && story.kind !== 'import' && ctx.s.stories.ambience !== false ? `<button type="button" class="amb-btn ${bedPlaying() || !player ? 'on' : ''}" data-act="player-amb" aria-pressed="true">${icon(ICONS.sound, 24)}<span>Ambiance ${esc((SOUNDS[story.amb] || { label: 'forêt' }).label.toLowerCase())}</span></button>` : ''}
        </div>
        <div class="player-skip">
          <button type="button" class="hold-btn" data-holdact="skip">${icon(ICONS.next, 24)}<span>${next ? 'Histoire suivante' : 'Finir l’histoire'}</span><i class="hold-bar"></i></button>
          <button type="button" class="hold-btn" data-holdact="sleep">${icon(ICONS.nuit, 24)}<span>Dormir maintenant</span><i class="hold-bar"></i></button>
        </div>
        <span class="muted-warm small">Pour les grands : gardez le doigt appuyé sur un bouton. ${ctx.ritual ? 'Après la dernière histoire, la nuit commence toute seule.' : ''}</span>
      </div>
    </div>`;
  },
  mount(el, p) {
    const chosen = (ctx.ritual ? ctx.ritual.chosen : (ctx.free && ctx.free.chosen)) || [];
    const story = allStories(ctx.s).find((s) => s.id === chosen[p.i]);
    curPlay = { story, i: p.i, chosen };
    if (!story) { if (ctx.ritual) nextStep(); else go('home'); return; }
    const prog = el.querySelector('#prog');
    let base = 0, span = 1;
    playStory(story, ctx.s, {
      onProgress: (f, page, total) => { base = f; span = total ? 1 / total : 0; prog.style.width = (f * 100) + '%'; },
      onTime: (t) => { prog.style.width = ((base + t * span) * 100) + '%'; },
      onEnd: () => afterStory(p.i, chosen),
    }).then((ctl) => { player = ctl; });
    if (ctx.ritual) el.querySelector('.player').classList.add('fading');
  },
  unmount() { if (player) player.stop(); player = null; curPlay = null; },
};
// Après une histoire (finie ou passée) : la suivante, sinon la suite du rituel (la nuit), sinon l'accueil.
function afterStory(i, chosen) {
  if (i + 1 < chosen.length) go('player', { i: i + 1 });
  else if (ctx.ritual) nextStep();
  else go('home');
}
let curPlay = null;
/** Passer à l'histoire suivante (panneau « Pour les grands »). */
export function skipStory() {
  if (!curPlay) return;
  const { i, chosen } = curPlay;
  if (player) player.stop();
  player = null;
  afterStory(i, chosen);
}
/** Couper ou remettre l'ambiance de l'histoire en cours. Renvoie true si elle joue. */
export function toggleStoryAmbience() {
  if (bedPlaying()) { stopBed(1); setBedMuted(true); return false; }
  setBedMuted(false);
  if (curPlay && curPlay.story && curPlay.story.amb) { startBed(curPlay.story.amb, ctx.s.sound.cap); return true; }
  return false;
}
/** Arrêter les histoires et passer directement à la nuit (ou à la sieste). */
export function sleepNow() {
  if (player) player.stop();
  player = null;
  if (ctx.ritual) { ctx.ritual.idx = ctx.ritual.steps.length - 2; return nextStep(); }
  const { cur } = currentSlot(ctx.s);
  enterNight(cur.type === 'sieste' && ctx.s.schedule.nap.on ? 'sieste' : 'soir');
}
// Boutons « à garder appuyé » (1,5 s) : visibles pour les parents, difficiles à déclencher par hasard.
let holdT = null;
document.addEventListener('pointerdown', (e) => {
  const b = e.target.closest && e.target.closest('[data-holdact]');
  if (!b) return;
  e.preventDefault();
  b.classList.add('holding');
  clearTimeout(holdT);
  holdT = setTimeout(() => { b.classList.remove('holding'); if (b.dataset.holdact === 'skip') skipStory(); else sleepNow(); }, 1500);
});
['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => document.addEventListener(t, () => { clearTimeout(holdT); document.querySelectorAll('.hold-btn.holding').forEach((x) => x.classList.remove('holding')); }, true));
ctx.actions['player-amb'] = (b) => { const on = toggleStoryAmbience(); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); };
ctx.actions['player-toggle'] = (b) => {
  if (!player) return;
  if (player.paused) { player.resume(); b.innerHTML = icon(ICONS.pause, 46, 'fill="#221A30" stroke="none"'); b.setAttribute('aria-label', 'Pause'); }
  else { player.pause(); b.innerHTML = icon(ICONS.play, 46, 'fill="#221A30" stroke="none"'); b.setAttribute('aria-label', 'Lecture'); }
};

// ---------- Moment du rituel (jeu, bain, temps calme) ----------
let momentTimer = null;
ctx.screens.moment = {
  render(p) {
    const m = momentInfo(p.id), c = ctx.s.child;
    const r = ctx.ritual;
    return `<div class="screen child moment ${m.dark ? 'dark' : ''}" style="background:${m.bg}">
      ${parentCorner(m.bg)}
      <span class="moment-step">${r ? `Étape ${r.idx + 1} sur ${r.steps.length}` : ''}</span>
      <div class="moment-animal">${sceneBlock(p.id, false, 320)}</div>
      <h1>${m.text}</h1>
      <div class="moment-bar" aria-hidden="true"><span id="mbar"></span></div>
      <div class="moment-time" id="mtime">${p.dur} min</div>
    </div>`;
  },
  mount(el, p) {
    const end = Date.now() + p.dur * 60000;
    const t = el.querySelector('#mtime');
    clearInterval(momentTimer);
    momentTimer = setInterval(() => {
      const left = Math.max(0, end - Date.now());
      const min = Math.ceil(left / 60000);
      t.textContent = left > 60000 ? `${min} min` : 'Presque fini…';
      const mb = el.querySelector('#mbar'); if (mb) mb.style.width = (100 * left / (p.dur * 60000)) + '%';
      if (left <= 0) { clearInterval(momentTimer); nextStep(); }
    }, 1000);
  },
  unmount() { clearInterval(momentTimer); },
};
ctx.actions['moment-next'] = () => { clearInterval(momentTimer); nextStep(); };

// ---------- Nuit ----------
let nightTimer = null, touchTimer = null;
function nightProgress() {
  const n = ctx.night; if (!n) return 0;
  return Math.max(0, Math.min(1, (Date.now() - n.startedAt) / Math.max(1, n.wakeAt - n.startedAt)));
}
ctx.screens.night = {
  render(p = {}) {
    const phase = p.phase || nightPhase();
    const c = ctx.s.child, n = ctx.s.night;
    if (phase === 'soon') {
      return `<div class="screen child soon" data-act="night-touch">
        ${parentCorner('#3B2F4F', '#C9834F', 0.3)}
        <div class="sun low" aria-hidden="true"></div>
        <div class="soon-inner">${animalSVG('hibou', { size: 280, asleep: true })}
          <h1>Le soleil se lève…</h1><p>Le hibou dort encore un peu. Reste au lit, c'est bientôt.</p></div>
      </div>`;
    }
    const lvl = n.mode === 'off' ? 0 : (n.mode === 'faible' ? Math.min(n.level, 15) : Math.min(n.level, 40));
    const tint = { ambre: '#E39A47', rouge: '#D9786E', lune: '#E9C46A' }[n.tint] || '#E39A47';
    return `<div class="screen night" data-act="night-touch" aria-label="Nuit">
      ${parentCorner('#000', '#3A2A1A', 0.25)}
      <div class="night-animal ${lvl ? 'visible' : ''} ${p.preview && !lvl ? 'touched' : ''}" id="night-animal" style="--lvl:${lvl ? Math.min(0.9, 0.45 + lvl / 80).toFixed(2) : 0}">
        <div class="night-glow" style="background:${tint}"></div>
        ${animalSVG('hibou', { colors: { body: '#7A4A33', belly: '#8E6E5C' }, size: 260, asleep: true })}
        <p class="night-text">C'est encore l'heure de dormir</p>
        <p class="night-sub">Chut… le hibou dort encore. On reste dans son lit.</p>
        <div class="night-track" aria-label="Le matin arrive bientôt">
          ${moonSVG(26, '#000', '#6E5646')}
          <span class="nt-bar"><span style="width:${Math.round(nightProgress() * 100)}%"></span></span>
          ${icon(ICONS.sun, 28)}
        </div>
      </div>
    </div>`;
  },
  mount() {
    keepAwake();
    clearInterval(nightTimer);
    let last = nightPhase();
    nightTimer = setInterval(() => {
      const ph = nightPhase();
      if (ph === 'wake') { clearInterval(nightTimer); go('wake'); }
      else if (ph !== last) { last = ph; render(); }
    }, 15000);
  },
  unmount() { clearInterval(nightTimer); clearTimeout(touchTimer); },
};
ctx.actions['night-touch'] = () => {
  if (!ctx.s.night.touchShow || nightPhase() !== 'night') return;
  const a = document.getElementById('night-animal');
  if (!a) return;
  a.classList.add('touched');
  clearTimeout(touchTimer);
  touchTimer = setTimeout(() => a.classList.remove('touched'), 10000);
};

// ---------- Réveil ----------
let wakeTimer = null;
ctx.screens.wake = {
  render() {
    const c = ctx.s.child, anim = ctx.s.wake.anim;
    return `<div class="screen child wake anim-${anim}" style="background:${anim === 'coucou' ? pal().bg : '#FDE7B0'}">
      ${parentCorner('#FDE7B0')}
      ${anim !== 'coucou' ? '<div class="sun rise" aria-hidden="true"></div>' : ''}
      <div class="wake-inner">${animalSVG('coq', { size: 320, cls: anim === 'etire' ? 'stretch' : 'wiggle' })}
        <h1>Bonjour ${esc(c.name)} !</h1>
        <p>Cocorico ! Le coq est réveillé : tu peux te lever !</p>
        <button type="button" class="btn primary xl" data-act="wake-done">Bonne journée !</button>
      </div>
    </div>`;
  },
  mount() {
    stopAmbience(false, 4);
    clearTimeout(wakeTimer);
    const mins = ctx.s.wake.offAfter || 15;
    wakeTimer = setTimeout(() => endNight(true), mins * 60000);
  },
  unmount() { clearTimeout(wakeTimer); },
};
ctx.actions['wake-done'] = () => endNight(true);
