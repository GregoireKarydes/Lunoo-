// Écrans de l'enfant : accueil, choix des histoires, lecture, moments, nuit, réveil.
import { ctx, esc, go, render, startRitual, nextStep, momentInfo, nightPhase, endNight, toMin, keepAwake } from './ctx.js';
import { ANIMALS, PALETTES, ICONS, MOMENTS } from './data.js';
import { animalSVG, icon } from './animal.js';
import { parentCorner } from './ui.js';
import { allStories, playStory } from './narrator.js';
import { stopAmbience } from './sound.js';

const pal = () => PALETTES[ctx.s.child.color] || PALETTES.corail;
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };

// ---------- Accueil ----------
ctx.screens.home = {
  render() {
    const c = ctx.s.child, p = pal();
    const sc = ctx.s.schedule;
    const napTime = sc.nap.on && Math.abs(nowMin() - toMin(sc.nap.start)) <= 90;
    const ritualSoon = Math.abs(nowMin() - toMin(sc.ritualStart)) <= 30;
    const steps = ctx.s.rituals[napTime ? 'sieste' : 'soir'].filter((x) => x.on && x.id !== 'nuit');
    return `<div class="screen child home" style="background:${p.bg}">
      ${parentCorner(p.bg)}
      <h1 class="hello">Coucou ${esc(c.name)} !</h1>
      <div class="home-main">
        <div class="home-animal">${animalSVG(c.animal, { palette: c.color, size: 340, cls: 'bob', label: ANIMALS[c.animal].label })}</div>
        <div class="home-actions">
          <button type="button" class="big-btn light" data-act="free-stories">
            <span class="big-ico" style="background:#E6E3FA">${icon(ICONS.histoire, 44)}</span><span>Mes histoires</span>
          </button>
          <button type="button" class="big-btn dark ${ritualSoon && !napTime ? 'pulse' : ''}" data-act="start-ritual" data-v="soir">
            <span class="big-ico" style="background:#2E3270;color:#F5C451">${icon(ICONS.nuit, 44)}</span><span>Au dodo !</span>
          </button>
          ${sc.nap.on ? `<button type="button" class="big-btn nap ${napTime ? 'pulse' : ''}" data-act="start-ritual" data-v="sieste">
            <span class="big-ico" style="background:#3BA776;color:#fff">${icon(ICONS.calme, 40)}</span><span>La sieste</span>
          </button>` : ''}
        </div>
      </div>
      <div class="ritual-strip" aria-label="Le rituel">
        <span class="strip-label">${napTime ? 'Sieste' : 'Ce soir'}</span>
        ${steps.map((st, i) => `${i ? `<span class="strip-arrow">${icon(ICONS.next, 18)}</span>` : ''}<span class="strip-step" style="background:${MOMENTS[st.id].bg};${MOMENTS[st.id].dark ? 'color:#FBF6EE' : ''}">${MOMENTS[st.id].label}</span>`).join('')}
        <span class="strip-arrow">${icon(ICONS.next, 18)}</span><span class="strip-step" style="background:#2E3270;color:#FBF6EE">Dodo</span>
      </div>
    </div>`;
  },
};
ctx.actions['start-ritual'] = (b) => startRitual(b.dataset.v);
ctx.actions['free-stories'] = () => { ctx.ritual = null; ctx.free = { chosen: [] }; go('pick', { max: 3, free: true }); };

// ---------- Choix des histoires ----------
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
    } else items = tab === 'famille' ? family : stories;
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
        ${[['toutes', 'Toutes'], ['famille', 'Voix de la famille'], ['playlists', 'Playlists']].map(([id, l]) => `<button type="button" class="tab ${tab === id ? 'sel' : ''}" aria-pressed="${tab === id}" data-act="pick-tab" data-v="${id}">${l}</button>`).join('')}
      </div>
      <div class="story-grid">
        ${items.length ? items.map((s) => {
          const idx = sel.indexOf(s.id);
          const a = s.animal || c.animal;
          const colors = (s.selfColor || a === c.animal) ? PALETTES[c.color] : PALETTES[ANIMALS[a] ? ANIMALS[a].palette : 'corail'];
          return `<button type="button" class="story-card ${idx >= 0 ? 'sel' : ''}" style="${idx >= 0 ? `border-color:${pal().body}` : ''}" aria-pressed="${idx >= 0}" data-act="pick-story" data-v="${esc(s.id)}" data-max="${max}">
            <span class="thumb" style="background:${s.bg}">${animalSVG(a, { colors, size: 116 })}
              ${idx >= 0 ? `<span class="order" style="background:${pal().body}">${isPl ? icon(ICONS.check, 22) : idx + 1}</span>` : ''}
              <span class="voice-tag">${icon(ICONS.mic, 14)}${esc(s.voice)}</span></span>
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
    const colorsFor = (s) => (s.selfColor || s.animal === c.animal) ? PALETTES[c.color] : PALETTES[ANIMALS[s.animal] ? ANIMALS[s.animal].palette : 'corail'];
    return `<div class="screen child player">
      ${parentCorner('#221A30', '#D9A93F', 0.35)}
      <div class="player-art">${animalSVG(story.animal, { colors: colorsFor(story), size: 300, cls: 'dim' })}</div>
      <div class="player-info">
        <span class="muted-warm">Histoire ${p.i + 1} sur ${chosen.length}</span>
        <h1>${esc(story.title)}</h1>
        <span class="voice-line">${icon(ICONS.mic, 22)}Racontée par ${esc(story.voice)}</span>
        <div class="bar"><div class="bar-fill" id="prog"></div></div>
        <div class="player-ctl">
          <button type="button" class="play-btn" data-act="player-toggle" aria-label="Pause" id="play-btn">${icon(ICONS.pause, 46, 'fill="#221A30" stroke="none"')}</button>
          ${next ? `<div class="next-up"><span class="muted-warm">Ensuite</span><strong>${esc(next.title)}</strong></div>` : ''}
        </div>
        <span class="muted-warm small">${ctx.ritual ? 'L’écran s’assombrit doucement, puis s’éteint après la dernière histoire.' : ''}</span>
      </div>
    </div>`;
  },
  mount(el, p) {
    const chosen = (ctx.ritual ? ctx.ritual.chosen : (ctx.free && ctx.free.chosen)) || [];
    const story = allStories(ctx.s).find((s) => s.id === chosen[p.i]);
    if (!story) { if (ctx.ritual) nextStep(); else go('home'); return; }
    const prog = el.querySelector('#prog');
    let base = 0, span = 1;
    playStory(story, ctx.s, {
      onProgress: (f, page, total) => { base = f; span = total ? 1 / total : 0; prog.style.width = (f * 100) + '%'; },
      onTime: (t) => { prog.style.width = ((base + t * span) * 100) + '%'; },
      onEnd: () => {
        if (p.i + 1 < chosen.length) go('player', { i: p.i + 1 });
        else if (ctx.ritual) nextStep();
        else go('home');
      },
    }).then((ctl) => { player = ctl; });
    if (ctx.ritual) el.querySelector('.player').classList.add('fading');
  },
  unmount() { if (player) player.stop(); player = null; },
};
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
      <div class="moment-animal">${animalSVG(c.animal, { palette: c.color, size: 320, cls: p.id === 'jeu' ? 'hop' : (p.id === 'bain' ? 'bob' : 'breathe') })}</div>
      <h1>${m.text}</h1>
      <div class="moment-time" id="mtime">${p.dur} min</div>
      <button type="button" class="btn ghost-dark" data-act="moment-next">Étape suivante ${icon(ICONS.next, 22)}</button>
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
      if (left <= 0) { clearInterval(momentTimer); nextStep(); }
    }, 1000);
  },
  unmount() { clearInterval(momentTimer); },
};
ctx.actions['moment-next'] = () => { clearInterval(momentTimer); nextStep(); };

// ---------- Nuit ----------
let nightTimer = null, touchTimer = null;
ctx.screens.night = {
  render() {
    const phase = nightPhase();
    const c = ctx.s.child, n = ctx.s.night;
    if (phase === 'soon') {
      return `<div class="screen child soon" data-act="night-touch">
        ${parentCorner('#3B2F4F', '#C9834F', 0.3)}
        <div class="sun low" aria-hidden="true"></div>
        <div class="soon-inner">${animalSVG(c.animal, { palette: c.color, size: 280, asleep: true })}
          <h1>Le soleil se lève…</h1><p>${esc(ANIMALS[c.animal].art.replace(/^./, (x) => x.toUpperCase()))} dort encore un peu. Reste au lit, c'est bientôt.</p></div>
      </div>`;
    }
    const lvl = n.mode === 'off' ? 0 : (n.mode === 'faible' ? Math.min(n.level, 15) : Math.min(n.level, 40));
    const tint = { ambre: '#E39A47', rouge: '#D9786E', lune: '#E9C46A' }[n.tint] || '#E39A47';
    return `<div class="screen night" data-act="night-touch" aria-label="Nuit">
      ${parentCorner('#000', '#3A2A1A', 0.25)}
      <div class="night-animal ${lvl ? 'visible' : ''}" id="night-animal" style="--lvl:${lvl ? lvl / 100 + 0.08 : 0}">
        <div class="night-glow" style="background:${tint}"></div>
        ${animalSVG(c.animal, { colors: { body: '#7A4A33', belly: '#8E6E5C' }, size: 260, asleep: true })}
        <p class="night-text">Chut… ${esc(ANIMALS[c.animal].art)} dort encore</p>
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
      <div class="wake-inner">${animalSVG(c.animal, { palette: c.color, size: 320, cls: anim === 'etire' ? 'stretch' : 'bob' })}
        <h1>Bonjour ${esc(c.name)} !</h1>
        <p>${esc(ANIMALS[c.animal].art.replace(/^./, (x) => x.toUpperCase()))} est réveillé : tu peux te lever !</p>
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
