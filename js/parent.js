// Espace parent : code, tableau de bord et réglages.
import { ctx, esc, go, render, save, uid, fmtDur, sleepCheck, startRitual, endNight, toMin, fromMin } from './ctx.js';
import { daySlots, currentSlot } from './clock.js';
import { ANIMALS, PALETTES, ICONS, MOMENTS, SOUNDS, CLOCK_TYPES } from './data.js';
import { animalSVG, icon } from './animal.js';
import { parentLayout, toggle, chips, stepper, toast, ask, confirmBox } from './ui.js';
import { hoursBody } from './onboarding.js';
import { allStories, impKey, recKey } from './narrator.js';
import { audio, exportBackup, importBackup } from './store.js';
import { startAmbience, stopAmbience, ambiencePlaying, setAmbienceVolume } from './sound.js';

const childName = () => esc(ctx.s.child.name || 'l’enfant');

// ---------- Code parent ----------
let pin = '';
let pinMode = 'enter'; // enter | set | confirm
let pinFirst = '';
ctx.screens.pin = {
  render(p) {
    pinMode = p.mode || 'enter';
    const title = { enter: 'Code parent', set: 'Choisissez un code à 4 chiffres', confirm: 'Retapez le code' }[pinMode];
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];
    return `<div class="screen pin-screen">
      <div class="pin-box" id="pin-box">
        <h1>${title}</h1>
        <div class="pin-dots" aria-label="${pin.length} chiffres sur 4">${[0, 1, 2, 3].map((i) => `<span class="${i < pin.length ? 'on' : ''}"></span>`).join('')}</div>
        <div class="keypad">${keys.map((k) => k === '' ? '<span></span>' : `<button type="button" class="key ${k === '⌫' ? 'bare' : ''}" data-act="pin-key" data-v="${k}" aria-label="${k === '⌫' ? 'Effacer' : k}">${k}</button>`).join('')}</div>
        <button type="button" class="link-btn" data-act="pin-cancel">Annuler</button>
      </div>
    </div>`;
  },
  unmount() { if (ctx.route !== 'pin') pin = ''; },
};
ctx.actions['pin-key'] = async (b) => {
  const v = b.dataset.v;
  if (v === '⌫') pin = pin.slice(0, -1); else if (pin.length < 4) pin += v;
  if (pin.length < 4) return render();
  if (pinMode === 'enter') {
    if (pin === ctx.s.access.pin) { pin = ''; go('p-home'); }
    else { pin = ''; render(); document.getElementById('pin-box').classList.add('shake'); }
  } else if (pinMode === 'set') { pinFirst = pin; pin = ''; go('pin', { mode: 'confirm' }); }
  else {
    if (pin === pinFirst) { ctx.s.access.pin = pin; await save(); pin = ''; toast('Code parent enregistré'); go('p-access'); }
    else { pin = ''; toast('Les deux codes ne sont pas identiques'); go('pin', { mode: 'set' }); }
  }
};
ctx.actions['pin-cancel'] = () => { pin = ''; go(pinMode === 'enter' ? 'home' : 'p-access'); };

export function openParent() {
  if (ctx.s.access.pin) go('pin', { mode: 'enter' }); else go('p-home');
}
ctx.actions['exit-parent'] = () => {
  if (ctx.night) go('night'); else go('home');
};

// ---------- Tableau de bord ----------
ctx.screens['p-home'] = {
  render() {
    const s = ctx.s, c = s.child, sc = s.schedule, chk = sleepCheck(s);
    const steps = (t) => s.rituals[t].filter((x) => x.on).map((x) => `<span class="mini-chip" style="background:${MOMENTS[x.id].bg};${MOMENTS[x.id].dark ? 'color:#FBF6EE' : ''}">${MOMENTS[x.id].label}${x.dur ? ' ' + x.dur + ' min' : ''}</span>`).join('');
    const pl = s.stories.mode === 'playlist' && s.playlists.find((p) => p.id === s.stories.playlistId);
    const nightTxt = { off: 'Écran <strong>éteint</strong>', faible: 'Veilleuse <strong>très faible</strong>', on: 'Écran <strong>allumé</strong>' }[s.night.mode];
    const body = `
      <div class="ph-head">
        <span class="avatar" style="background:${PALETTES[c.color].bg}">${animalSVG(c.animal, { palette: c.color, size: 54 })}</span>
        <div><strong class="h2">${childName()}, ${c.age} an${c.age > 1 ? 's' : ''}</strong><span class="muted">Tout est enregistré sur cette tablette et fonctionne hors ligne.</span></div>
      </div>
      ${ctx.night ? `<div class="card alert-card"><div><strong>${ctx.night.type === 'sieste' ? 'Sieste' : 'Nuit'} en cours</strong><span class="muted">Réveil prévu à ${new Date(ctx.night.wakeAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span></div>
        <button type="button" class="btn ghost" data-act="go-night">Revenir à la nuit</button><button type="button" class="btn danger" data-act="stop-night">Arrêter</button></div>` : ''}
      <div class="grid2">
        <button type="button" class="launch dark" data-act="launch" data-v="soir"><span class="launch-ico">${icon(ICONS.play, 28, 'fill="#1F2250" stroke="none"')}</span><span><strong>Lancer le rituel du soir</strong><span>À faire avec ${childName()}, ou le laisser appuyer sur « Au dodo »</span></span></button>
        <button type="button" class="launch green" data-act="launch" data-v="sieste" ${sc.nap.on ? '' : 'disabled'}><span class="launch-ico">${icon(ICONS.play, 28, 'fill="#fff" stroke="none"')}</span><span><strong>Lancer la sieste</strong><span>${sc.nap.on ? `${sc.nap.start} · ${fmtDur(sc.nap.dur)}` : 'Sieste désactivée'}</span></span></button>
      </div>
      <div class="grid2">
        <button type="button" class="card link-card" data-go="p-rituals"><span class="card-row"><strong>Rituels</strong><span class="edit">Modifier</span></span><div class="mini-chips">${steps('soir')}</div><span class="muted">Sieste : ${s.rituals.sieste.filter((x) => x.on).map((x) => MOMENTS[x.id].label.toLowerCase()).join(', ')}</span></button>
        <button type="button" class="card link-card" data-go="p-wake"><span class="card-row"><strong>Réveil</strong><span class="edit">Modifier</span></span>
          <div class="times"><span><b>${sc.wakeWeek}</b>semaine</span><span><b>${sc.wakeWeekend}</b>week-end</span>${sc.nap.on ? `<span><b>${fmtDur(sc.nap.dur)}</b>de sieste</span>` : ''}</div>
          <span class="${chk.ok ? 'ok-txt' : 'warn-txt'}">${fmtDur(chk.total)} de sommeil · ${chk.ok ? 'plage conseillée' : 'hors plage conseillée'}</span></button>
        <button type="button" class="card link-card" data-go="p-stories"><span class="card-row"><strong>Histoires</strong><span class="edit">Gérer</span></span>
          <span>${pl ? `Playlist <strong>${esc(pl.name)}</strong> lue telle quelle` : `${childName()} choisit <strong>${s.stories.choose} histoire${s.stories.choose > 1 ? 's' : ''}</strong> le soir`}</span>
          <span class="muted">${allStories(s).length} histoires · ${Object.keys(s.recordings).length + s.customStories.length} avec une voix de la famille</span></button>
        <button type="button" class="card link-card" data-go="p-night"><span class="card-row"><strong>Nuit</strong><span class="edit">Modifier</span></span>
          <span>${nightTxt}${s.night.touchShow ? ' · l’animal apparaît si on touche l’écran' : ''}</span>
          <span class="muted">${SOUNDS[s.sound.type].label}${s.sound.type !== 'aucun' ? `, volume ${s.sound.vol} %, ${s.sound.dur ? 'arrêt après ' + s.sound.dur + ' min' : 'toute la nuit'}` : ''}</span></button>
      </div>`;
    return parentLayout('p-home', 'Bonjour !', body);
  },
};
ctx.actions.launch = (b) => startRitual(b.dataset.v);
ctx.actions['go-night'] = () => go('night');
ctx.actions['stop-night'] = () => endNight(false, true).then(() => render());

// ---------- Enfant ----------
ctx.screens['p-child'] = {
  render() {
    const c = ctx.s.child, p = PALETTES[c.color];
    const body = `<div class="split">
      <div class="col">
        <div class="field-row">
          <div class="field grow2"><label for="pc-name">Prénom</label><input id="pc-name" class="input" type="text" value="${esc(c.name)}" maxlength="20" data-change="child-name"></div>
          <div class="field"><label for="pc-age">Âge</label><select id="pc-age" class="input" data-change="child-age">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((a) => `<option value="${a}" ${a === c.age ? 'selected' : ''}>${a} an${a > 1 ? 's' : ''}</option>`).join('')}</select></div>
        </div>
        <span class="label">Compagnon</span>
        <div class="grid5 small">${Object.entries(ANIMALS).map(([id, a]) => `<button type="button" class="pick-card sm ${c.animal === id ? 'sel' : ''}" aria-pressed="${c.animal === id}" data-act="pc-animal" data-v="${id}">${animalSVG(id, { palette: c.color, size: 64 })}<span>${a.label}</span></button>`).join('')}</div>
        <span class="label">Couleur</span>
        <div class="swatches">${Object.entries(PALETTES).map(([id, pp]) => `<button type="button" class="swatch ${c.color === id ? 'sel' : ''}" aria-pressed="${c.color === id}" aria-label="${pp.label}" data-act="pc-color" data-v="${id}" style="background:${pp.body}"></button>`).join('')}</div>
        <span class="label">Caractère de l'animal en journée</span>
        ${chips('pc-char', [['doux', 'Doux et calme'], ['joueur', 'Joueur'], ['rigolo', 'Rigolo']], c.character)}
        <span class="muted">Le soir, il devient toujours calme.</span>
      </div>
      <div class="side-preview"><span class="label">Aperçu</span>
        <div class="preview sm" style="background:${p.bg}">${animalSVG(c.animal, { palette: c.color, size: 180 })}<span class="preview-hi">Coucou ${childName()} !</span></div>
        <span class="muted">Les changements sont enregistrés tout de suite.</span></div>
    </div>`;
    return parentLayout('p-child', `Le profil de ${childName()}`, body);
  },
};
ctx.actions['pc-animal'] = (b) => { ctx.s.child.animal = b.dataset.v; save(); render(); };
ctx.actions['pc-color'] = (b) => { ctx.s.child.color = b.dataset.v; save(); render(); };
ctx.actions['pc-char'] = (b) => { ctx.s.child.character = b.dataset.v; save(); render(); };
ctx.changes = ctx.changes || {};
ctx.changes['child-name'] = (el) => { const v = el.value.trim(); if (v) { ctx.s.child.name = v; save(); } };
ctx.changes['child-age'] = (el) => { ctx.s.child.age = Number(el.value); save(); render(); };

// ---------- Rituels ----------
let ritualTab = 'soir';
ctx.screens['p-rituals'] = {
  render() {
    const list = ctx.s.rituals[ritualTab];
    const rows = list.map((r, i) => {
      const m = MOMENTS[r.id];
      const fixed = r.id === 'histoire' || r.id === 'nuit';
      return `<div class="ritual-row ${r.on ? '' : 'off'}">
        <div class="updown"><button type="button" class="icon-btn" data-act="r-move" data-i="${i}" data-d="-1" aria-label="Monter ${m.label}">${icon(ICONS.up, 20)}</button><button type="button" class="icon-btn" data-act="r-move" data-i="${i}" data-d="1" aria-label="Descendre ${m.label}">${icon(ICONS.down, 20)}</button></div>
        <span class="r-dot" style="background:${m.bg};${m.dark ? 'color:#FBF6EE' : ''}">${icon(ICONS[m.icon], 22)}</span>
        <div class="r-name"><strong>${m.label}</strong><span class="muted">${r.id === 'histoire' ? (ritualTab === 'sieste' ? ctx.s.stories.napChoose : ctx.s.stories.choose) + ' histoire(s), selon leur durée' : (r.id === 'nuit' ? 'Jusqu’au réveil' : 'Lumière ' + Math.round(m.light * 100) + ' %')}</span></div>
        ${fixed ? '<span class="r-dur muted">—</span>' : stepper(`r-dur" data-i="${i}`, r.dur + ' min', 'Durée ' + m.label)}
        ${r.id === 'nuit' ? '<span class="r-sw"></span>' : `<button type="button" class="switch ${r.on ? 'on' : ''}" role="switch" aria-checked="${r.on}" aria-label="Activer ${m.label}" data-act="r-toggle" data-i="${i}"><span></span></button>`}
      </div>`;
    }).join('');
    const missing = Object.keys(MOMENTS).filter((id) => !list.find((x) => x.id === id));
    const body = `
      <div class="seg" role="tablist">${[['soir', 'Soir'], ['sieste', 'Sieste']].map(([id, l]) => `<button type="button" role="tab" aria-selected="${ritualTab === id}" class="${ritualTab === id ? 'sel' : ''}" data-act="r-tab" data-v="${id}">${l}</button>`).join('')}</div>
      ${ritualTab === 'soir' ? `<div class="card inline"><span>Heure habituelle du rituel</span>
        <div class="pair"><button type="button" class="round sm" data-act="time" data-k="ritualStart" data-d="-15" aria-label="Plus tôt">−</button><strong class="h2">${ctx.s.schedule.ritualStart}</strong><button type="button" class="round sm" data-act="time" data-k="ritualStart" data-d="15" aria-label="Plus tard">+</button></div>
        <span class="muted">Le bouton « Au dodo » clignote doucement à cette heure-là.</span></div>` : ''}
      <div class="ritual-list">${rows}</div>
      ${missing.length ? `<div class="chips">${missing.map((id) => `<button type="button" class="chip dashed" data-act="r-add" data-v="${id}">${icon(ICONS.plus, 18)}${MOMENTS[id].label}</button>`).join('')}</div>` : ''}`;
    return parentLayout('p-rituals', 'Rituels', body);
  },
};
ctx.actions['r-tab'] = (b) => { ritualTab = b.dataset.v; render(); };
ctx.actions['r-toggle'] = (b) => { const r = ctx.s.rituals[ritualTab][b.dataset.i]; r.on = !r.on; save(); render(); };
ctx.actions['r-dur'] = (b) => { const r = ctx.s.rituals[ritualTab][b.dataset.i]; r.dur = Math.max(5, Math.min(60, r.dur + 5 * Number(b.dataset.d))); save(); render(); };
ctx.actions['r-move'] = (b) => {
  const l = ctx.s.rituals[ritualTab], i = Number(b.dataset.i), j = i + Number(b.dataset.d);
  if (j < 0 || j >= l.length || l[i].id === 'nuit' || l[j].id === 'nuit') return;
  [l[i], l[j]] = [l[j], l[i]]; save(); render();
};
ctx.actions['r-add'] = (b) => {
  const l = ctx.s.rituals[ritualTab];
  const at = Math.max(0, l.findIndex((x) => x.id === 'nuit'));
  l.splice(at, 0, { id: b.dataset.v, on: true, dur: 10 }); save(); render();
};

// ---------- Histoires et playlists ----------
let storyTab = 'toutes', openPl = null;
ctx.screens['p-stories'] = {
  render() {
    const s = ctx.s, c = s.child;
    const stories = allStories(s);
    const items = storyTab === 'famille' ? stories.filter((x) => x.recorded) : (storyTab === 'todo' ? stories.filter((x) => !x.recorded) : stories);
    const pl = s.playlists.find((p) => p.id === openPl) || s.playlists[0] || null;
    if (pl) openPl = pl.id;
    const colorsFor = (st) => (st.selfColor || st.animal === c.animal) ? PALETTES[c.color] : PALETTES[ANIMALS[st.animal] ? ANIMALS[st.animal].palette : 'corail'];
    const body = `<div class="split">
      <div class="col grow">
        <div class="toolbar">
          ${chips('st-tab', [['toutes', `Toutes (${stories.length})`], ['famille', `Voix de la famille (${stories.filter((x) => x.recorded).length})`], ['todo', `À enregistrer (${stories.filter((x) => !x.recorded).length})`]], storyTab)}
          <span class="grow"></span>
          <button type="button" class="btn ghost" data-act="st-import">${icon(ICONS.upload, 20)}Importer un son</button>
          <input type="file" id="import-audio" accept="audio/*" hidden>
        </div>
        <div class="pstory-grid">${items.map((st) => `
          <div class="pstory">
            <div class="thumb sm" style="background:${st.bg}">${animalSVG(st.animal, { colors: colorsFor(st), size: 80 })}</div>
            <span class="story-title sm">${esc(st.title)}</span>
            <div class="pstory-foot">
              <span class="tag ${st.recorded ? 'fam' : ''}">${st.kind === 'import' ? 'Fichier importé' : (st.recorded ? 'Voix : ' + esc(st.voice) : 'Voix de la tablette')}</span>
              ${pl ? `<button type="button" class="icon-btn ${pl.storyIds.includes(st.id) ? 'in' : ''}" data-act="pl-toggle" data-v="${st.id}" aria-label="${pl.storyIds.includes(st.id) ? 'Retirer de' : 'Ajouter à'} la playlist">${icon(pl.storyIds.includes(st.id) ? ICONS.check : ICONS.plus, 20)}</button>` : ''}
            </div>
            <div class="pstory-actions">
              ${st.kind === 'builtin' ? `<button type="button" class="mini-btn rec" data-go="p-studio" data-p='{"id":"${st.id}"}'>${icon(ICONS.mic, 16)}${st.recorded ? 'Réenregistrer' : 'Enregistrer ma voix'}</button>` : ''}
              ${st.recorded ? `<button type="button" class="mini-btn" data-act="st-delete" data-v="${st.id}" data-k="${st.kind}" aria-label="Supprimer la voix">${icon(ICONS.trash, 16)}</button>` : ''}
            </div>
          </div>`).join('')}</div>
      </div>
      <aside class="aside">
        <span class="label">Ce soir, ${childName()} peut choisir</span>
        ${chips('st-choose', [[1, '1'], [2, '2'], [3, '3'], ['pl', 'Playlist']], s.stories.mode === 'playlist' ? 'pl' : s.stories.choose)}
        <span class="muted small">Pour la sieste : ${s.stories.napChoose} histoire${s.stories.napChoose > 1 ? 's' : ''}. « Playlist » : la playlist choisie est lue telle quelle.</span>
        <hr>
        <div class="card-row"><span class="label">Playlists</span><button type="button" class="link-btn small" data-act="pl-new">${icon(ICONS.plus, 18)}Nouvelle</button></div>
        ${s.playlists.length ? chips('pl-open', s.playlists.map((p) => [p.id, esc(p.name)]), openPl) : '<span class="muted small">Créez une playlist pour enchaîner plusieurs histoires.</span>'}
        ${pl ? `<ol class="pl-list">${pl.storyIds.map((id, i) => { const st = stories.find((x) => x.id === id); return st ? `<li><span class="n">${i + 1}</span><span class="grow">${esc(st.title)}</span><button type="button" class="icon-btn" data-act="pl-move" data-i="${i}" data-d="-1" aria-label="Monter">${icon(ICONS.up, 18)}</button><button type="button" class="icon-btn" data-act="pl-toggle" data-v="${id}" aria-label="Retirer">${icon(ICONS.close, 18)}</button></li>` : ''; }).join('') || '<li class="muted">Ajoutez des histoires avec le bouton +.</li>'}</ol>
          <div class="pl-foot">
            <button type="button" class="btn ${s.stories.mode === 'playlist' && s.stories.playlistId === pl.id ? 'primary' : 'ghost'} sm" data-act="pl-use">${s.stories.mode === 'playlist' && s.stories.playlistId === pl.id ? 'Utilisée ce soir' : 'Utiliser ce soir'}</button>
            <button type="button" class="link-btn small" data-act="pl-delete">Supprimer</button>
          </div>` : ''}
      </aside>
    </div>`;
    return parentLayout('p-stories', 'Histoires', body);
  },
  mount(el) {
    const f = el.querySelector('#import-audio');
    f.onchange = async () => {
      const file = f.files[0]; if (!file) return;
      if (file.size > 60 * 1024 * 1024) { toast('Fichier trop lourd (60 Mo maximum)'); return; }
      const title = await ask('Titre de l’histoire', file.name.replace(/\.[^.]+$/, ''));
      if (!title) return;
      const voice = await ask('Qui raconte ?', 'Maman');
      const id = 'imp-' + uid();
      await audio.set(impKey(id), file);
      ctx.s.customStories.push({ id, title, animal: ctx.s.child.animal, selfColor: true, voice: voice || 'Famille', kind: 'import', bg: '#FFE0CC' });
      await save(); toast('Histoire ajoutée'); render();
    };
  },
};
ctx.actions['st-tab'] = (b) => { storyTab = b.dataset.v; render(); };
ctx.actions['st-import'] = () => {
  toast('Importez uniquement des sons dont vous avez les droits (votre voix, un ami…)');
  document.getElementById('import-audio').click();
};
ctx.actions['st-choose'] = (b) => {
  const st = ctx.s.stories;
  if (b.dataset.v === 'pl') {
    if (!ctx.s.playlists.length) { toast('Créez d’abord une playlist'); return; }
    st.mode = 'playlist'; st.playlistId = st.playlistId || ctx.s.playlists[0].id;
  } else { st.mode = 'choice'; st.choose = Number(b.dataset.v); }
  save(); render();
};
ctx.actions['st-delete'] = async (b) => {
  const id = b.dataset.v;
  if (!(await confirmBox('Supprimer cet enregistrement ? Il ne pourra pas être récupéré.', 'Supprimer'))) return;
  if (b.dataset.k === 'import') {
    await audio.del(impKey(id));
    ctx.s.customStories = ctx.s.customStories.filter((x) => x.id !== id);
    ctx.s.playlists.forEach((p) => { p.storyIds = p.storyIds.filter((x) => x !== id); });
  } else {
    const n = (ctx.s.recordings[id] || {}).pages || 0;
    for (let i = 0; i < n; i++) await audio.del(recKey(id, i));
    delete ctx.s.recordings[id];
  }
  await save(); render();
};
ctx.actions['pl-new'] = async () => {
  const name = await ask('Nom de la playlist', '', 'Soirée tout calme');
  if (!name) return;
  const p = { id: uid(), name, storyIds: [] };
  ctx.s.playlists.push(p); openPl = p.id; await save(); render();
};
ctx.actions['pl-open'] = (b) => { openPl = b.dataset.v; render(); };
ctx.actions['pl-toggle'] = (b) => {
  const p = ctx.s.playlists.find((x) => x.id === openPl); if (!p) return;
  const i = p.storyIds.indexOf(b.dataset.v);
  if (i >= 0) p.storyIds.splice(i, 1); else p.storyIds.push(b.dataset.v);
  save(); render();
};
ctx.actions['pl-move'] = (b) => {
  const p = ctx.s.playlists.find((x) => x.id === openPl); const i = Number(b.dataset.i);
  if (!p || i === 0) return; [p.storyIds[i - 1], p.storyIds[i]] = [p.storyIds[i], p.storyIds[i - 1]]; save(); render();
};
ctx.actions['pl-use'] = () => { const st = ctx.s.stories; st.mode = 'playlist'; st.playlistId = openPl; save(); render(); };
ctx.actions['pl-delete'] = async () => {
  if (!(await confirmBox('Supprimer cette playlist ? Les histoires restent dans la bibliothèque.', 'Supprimer'))) return;
  ctx.s.playlists = ctx.s.playlists.filter((x) => x.id !== openPl);
  if (ctx.s.stories.playlistId === openPl) { ctx.s.stories.mode = 'choice'; ctx.s.stories.playlistId = null; }
  openPl = null; await save(); render();
};

// ---------- Veilleuse et nuit ----------
ctx.screens['p-night'] = {
  render() {
    const n = ctx.s.night;
    const modes = [
      ['off', 'S’éteint', 'Écran noir. Le plus favorable au sommeil.', 'Recommandé', 'good', 0],
      ['faible', 'Veilleuse très faible', 'Une lueur chaude au minimum, toute la nuit.', 'Pour les peurs du noir', '', 0.35],
      ['on', 'Reste allumé', 'L’animal endormi reste visible toute la nuit.', 'Déconseillé', 'bad', 0.8],
    ];
    const tint = { ambre: '#E39A47', rouge: '#D9786E', lune: '#E9C46A' };
    const body = `
      <div class="grid3" role="radiogroup" aria-label="Mode de nuit">${modes.map(([id, l, d, tag, cls, op]) => `
        <button type="button" role="radio" aria-checked="${n.mode === id}" class="mode-card ${n.mode === id ? 'sel' : ''}" data-act="n-mode" data-v="${id}">
          <span class="mode-preview"><span style="background:${tint[n.tint]};opacity:${op}"></span></span>
          <strong>${l}</strong><span class="muted">${d}</span><span class="tag ${cls}">${tag}</span>
        </button>`).join('')}</div>
      ${n.mode !== 'off' ? `<div class="card inline wrap">
        <div class="field"><span class="label">Intensité</span>${stepper('n-level', n.level + ' %', 'Intensité')}</div>
        <div class="field"><span class="label">Teinte</span><div class="swatches">${Object.entries({ ambre: 'Ambre', rouge: 'Rouge doux', lune: 'Lune' }).map(([id, l]) => `<button type="button" class="swatch ${n.tint === id ? 'sel' : ''}" aria-pressed="${n.tint === id}" aria-label="${l}" data-act="n-tint" data-v="${id}" style="background:${tint[id]}"></button>`).join('')}</div></div>
      </div>` : ''}
      ${n.mode === 'on' ? '<div class="warn-box">Les jeunes enfants sont très sensibles à la lumière du soir, même faible. Si vous laissez l’écran allumé, gardez-le au plus bas, en teinte chaude, tourné vers le mur.</div>' : ''}
      <div class="card list">
        ${toggle('night.touchShow', n.touchShow, `Si ${childName()} touche l’écran la nuit`, 'Son compagnon apparaît endormi pendant 10 s : « on reste au lit »')}
        ${toggle('night.fade', n.fade, 'Extinction progressive', 'La lumière baisse doucement pendant les histoires')}
      </div>
      <p class="muted small">Une appli web ne peut pas régler la luminosité de la tablette : baissez-la au minimum dans les réglages de l’appareil. Sur un écran LCD, le noir laisse passer un peu de lumière.</p>`;
    return parentLayout('p-night', 'La nuit, l’écran…', body);
  },
};
ctx.actions['n-mode'] = (b) => { ctx.s.night.mode = b.dataset.v; save(); render(); };
ctx.actions['n-tint'] = (b) => { ctx.s.night.tint = b.dataset.v; save(); render(); };
ctx.actions['n-level'] = (b) => { const n = ctx.s.night; const max = n.mode === 'faible' ? 15 : 40; n.level = Math.max(1, Math.min(max, n.level + Number(b.dataset.d) * (n.level < 5 ? 1 : 5))); save(); render(); };
ctx.actions.toggle = (b) => {
  const [a, k] = b.dataset.key.split('.');
  ctx.s[a][k] = !ctx.s[a][k]; save(); render();
};

// ---------- Sons ----------
ctx.screens['p-sounds'] = {
  render() {
    const so = ctx.s.sound;
    const playing = ambiencePlaying();
    const body = `
      <div class="sound-grid" role="radiogroup" aria-label="Son">${Object.entries(SOUNDS).map(([id, x]) => `
        <button type="button" role="radio" aria-checked="${so.type === id}" class="sound-card ${so.type === id ? 'sel' : ''}" data-act="so-type" data-v="${id}">${icon(id === 'aucun' ? ICONS.close : ICONS.sound, 30)}<span>${x.label}</span></button>`).join('')}</div>
      <div class="card">
        <div class="card-row"><strong>Volume</strong><strong class="h2">${so.vol} %</strong></div>
        <div class="vol-row">
          <button type="button" class="round" data-act="so-vol" data-d="-5" aria-label="Moins fort">−</button>
          <div class="vol-track"><div class="vol-fill" style="width:${so.vol}%"></div><span class="vol-cap" style="left:${so.cap}%"></span></div>
          <button type="button" class="round" data-act="so-vol" data-d="5" aria-label="Plus fort">+</button>
          <button type="button" class="btn ghost sm" data-act="so-test">${playing ? 'Arrêter l’essai' : 'Écouter'}</button>
        </div>
        <span class="muted small">Plafonné à ${so.cap} % (modifiable dans Accès et sauvegarde). Posez la tablette loin du lit, à 2 m si possible.</span>
      </div>
      <div class="card">
        <strong>S'arrête après</strong>
        ${chips('so-dur', [[10, '10 min'], [20, '20 min'], [45, '45 min'], [0, 'Toute la nuit']], so.dur)}
        <span class="muted small">${so.dur ? 'Le son s’arrête une fois l’enfant endormi.' : 'Toute la nuit : gardez un volume bas et la tablette éloignée du lit.'}</span>
      </div>
      <div class="card list">${toggle('sound.fade', so.fade, 'Fondu de fin', 'Le son baisse sur 3 minutes avant de s’arrêter')}</div>`;
    return parentLayout('p-sounds', 'Sons pour s’endormir', body);
  },
  unmount() { if (ctx.route !== 'p-sounds' && !ctx.night && !ctx.ritual) stopAmbience(true); },
};
ctx.actions['so-type'] = (b) => { ctx.s.sound.type = b.dataset.v; save(); if (ambiencePlaying()) startAmbience({ ...ctx.s.sound, dur: 1 }); render(); };
ctx.actions['so-vol'] = (b) => { const so = ctx.s.sound; so.vol = Math.max(0, Math.min(so.cap, so.vol + Number(b.dataset.d))); save(); setAmbienceVolume(so); render(); };
ctx.actions['so-dur'] = (b) => { ctx.s.sound.dur = Number(b.dataset.v); save(); render(); };
ctx.actions['so-test'] = () => { if (ambiencePlaying()) stopAmbience(); else startAmbience({ ...ctx.s.sound, dur: 1 }); setTimeout(render, 50); };

// ---------- Réveil ----------
ctx.screens['p-wake'] = {
  render() {
    const w = ctx.s.wake, sc = ctx.s.schedule;
    const anims = [['soleil', 'Lever de soleil', 'Le soleil monte doucement, puis le compagnon ouvre les yeux.'], ['etire', 'Il s’étire', 'Le compagnon bâille, s’étire et fait coucou.'], ['coucou', 'Petit coucou', 'Juste le compagnon qui sourit, sans animation.']];
    const body = `
      <div class="grid3">
        <div class="card center"><span class="label">Semaine</span><span class="time-big">${sc.wakeWeek}</span><div class="pair"><button type="button" class="round sm" data-act="time" data-k="wakeWeek" data-d="-15" aria-label="Plus tôt">−</button><button type="button" class="round sm" data-act="time" data-k="wakeWeek" data-d="15" aria-label="Plus tard">+</button></div><span class="muted">lun → ven</span></div>
        <div class="card center"><span class="label">Week-end</span><span class="time-big">${sc.wakeWeekend}</span><div class="pair"><button type="button" class="round sm" data-act="time" data-k="wakeWeekend" data-d="-15" aria-label="Plus tôt">−</button><button type="button" class="round sm" data-act="time" data-k="wakeWeekend" data-d="15" aria-label="Plus tard">+</button></div><span class="muted">sam, dim</span></div>
        <div class="card center nap-on"><span class="label">Sieste</span>${sc.nap.on ? `<span class="time-big">${fmtDur(sc.nap.dur)}</span><div class="pair"><button type="button" class="round sm" data-act="nap-dur" data-d="-15" aria-label="Plus courte">−</button><button type="button" class="round sm" data-act="nap-dur" data-d="15" aria-label="Plus longue">+</button></div><span class="muted">à partir du lancement</span>` : '<span class="muted pad">Sieste désactivée</span>'}
          <button type="button" class="switch ${sc.nap.on ? 'on' : ''}" role="switch" aria-checked="${sc.nap.on}" aria-label="Sieste" data-act="nap-toggle"><span></span></button></div>
      </div>
      <div class="card">
        <strong>Animation du réveil</strong>
        ${chips('w-anim', anims.map(([id, l]) => [id, l]), w.anim)}
        <span class="muted small">${anims.find((a) => a[0] === w.anim)[2]}</span>
      </div>
      <div class="card list">
        ${toggle('wake.soon', w.soon, 'Annonce « bientôt » 20 min avant', 'Le ciel s’éclaircit, mais le compagnon dort encore')}
        <div class="row-setting"><div class="row-text"><span class="row-title">Éteindre l'écran après le réveil</span><span class="row-desc">Retour à l'accueil au bout de ${w.offAfter} min</span></div>${stepper('w-off', w.offAfter + ' min', 'Délai')}</div>
      </div>
      ${(() => { const c = sleepCheck(ctx.s); return `<div class="check ${c.ok ? 'ok' : 'warn'}">${icon(c.ok ? ICONS.check : ICONS.sun, 24)}<div><strong>Semaine : ${fmtDur(c.night)} de nuit${c.nap ? ' + ' + fmtDur(c.nap) + ' de sieste' : ''}</strong><span>${c.ok ? 'Dans' : 'En dehors de'} la plage conseillée pour ${c.ageTxt} (${c.rangeTxt} par 24 h).</span></div></div>`; })()}
      <p class="muted small">Le réveil est visuel et silencieux : il ne réveille pas l'enfant, il lui indique quand il peut se lever. La tablette doit rester sur Lunoo, branchée.</p>`;
    return parentLayout('p-wake', 'Quand le compagnon se réveille', body);
  },
};
ctx.actions['w-anim'] = (b) => { ctx.s.wake.anim = b.dataset.v; save(); render(); };
ctx.actions['w-off'] = (b) => { const w = ctx.s.wake; w.offAfter = Math.max(5, Math.min(60, w.offAfter + 5 * Number(b.dataset.d))); save(); render(); };

// ---------- Accès et sauvegarde ----------
ctx.screens['p-access'] = {
  render() {
    const a = ctx.s.access;
    const corners = [['hg', 'en haut à gauche'], ['hd', 'en haut à droite'], ['bg', 'en bas à gauche'], ['bd', 'en bas à droite']];
    const body = `<div class="grid2">
      <div class="card">
        <strong>Pour entrer : appui long dans un coin</strong>
        <div class="corner-pick">${corners.map(([id, l]) => `<button type="button" class="cp corner-${id} ${a.corner === id ? 'sel' : ''}" aria-pressed="${a.corner === id}" aria-label="Coin ${l}" data-act="a-corner" data-v="${id}"></button>`).join('')}</div>
        <span class="label">Durée de l'appui</span>
        ${chips('a-hold', [[2, '2 s'], [3, '3 s'], [5, '5 s']], a.hold)}
      </div>
      <div class="col">
        <div class="card">
          <div class="card-row"><div><strong>Code parent à 4 chiffres</strong><span class="muted small">Facultatif, demandé après l'appui long</span></div>
            <button type="button" class="switch ${a.pin ? 'on' : ''}" role="switch" aria-checked="${!!a.pin}" aria-label="Code parent" data-act="a-pin"><span></span></button></div>
          ${a.pin ? '<button type="button" class="btn ghost sm" data-act="a-pin-change">Changer le code</button>' : ''}
        </div>
        <div class="card">
          <strong>Volume maximum des sons</strong>
          ${chips('a-cap', [[30, '30 %'], [40, '40 %'], [60, '60 %']], ctx.s.sound.cap)}
        </div>
        <div class="card">
          <strong>Garder l'enfant dans Lunoo</strong>
          <span class="small"><b>iPad :</b> Réglages › Accessibilité › Accès guidé, puis triple-clic sur le bouton latéral.</span>
          <span class="small"><b>Android :</b> Paramètres › Sécurité › Épinglage d'écran.</span>
        </div>
      </div>
      <div class="card dark span2">
        <div class="grow"><strong>Sauvegarde, sans compte</strong><span>Tout est enregistré sur cette tablette. Exportez un fichier pour garder les voix enregistrées si vous changez d'appareil.</span></div>
        <button type="button" class="btn primary" data-act="a-export">${icon(ICONS.download, 20)}Exporter</button>
        <button type="button" class="btn ghost-dark" data-act="a-import">${icon(ICONS.upload, 20)}Importer</button>
        <input type="file" id="import-backup" accept="application/json,.json" hidden>
      </div>
      <div class="span2 muted small">Lunoo V1 · toutes les données restent sur l'appareil · <button type="button" class="link-btn small" data-act="a-reset">Tout effacer</button></div>
    </div>`;
    return parentLayout('p-access', 'Accès et sauvegarde', body);
  },
  mount(el) {
    const f = el.querySelector('#import-backup');
    f.onchange = async () => {
      if (!f.files[0]) return;
      if (!(await confirmBox('Remplacer les réglages et les voix de cette tablette par ceux du fichier ?', 'Remplacer'))) return;
      try { ctx.s = await importBackup(f.files[0]); toast('Sauvegarde restaurée'); render(); }
      catch (e) { toast(e.message); }
    };
  },
};
ctx.actions['a-corner'] = (b) => { ctx.s.access.corner = b.dataset.v; save(); render(); };
ctx.actions['a-hold'] = (b) => { ctx.s.access.hold = Number(b.dataset.v); save(); render(); };
ctx.actions['a-cap'] = (b) => { const so = ctx.s.sound; so.cap = Number(b.dataset.v); so.vol = Math.min(so.vol, so.cap); save(); render(); };
ctx.actions['a-pin'] = async () => {
  if (ctx.s.access.pin) { ctx.s.access.pin = null; await save(); render(); }
  else go('pin', { mode: 'set' });
};
ctx.actions['a-pin-change'] = () => go('pin', { mode: 'set' });
ctx.actions['a-export'] = async () => {
  toast('Préparation de la sauvegarde…');
  const blob = await exportBackup(ctx.s);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `lunoo-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
};
ctx.actions['a-import'] = () => document.getElementById('import-backup').click();
ctx.actions['a-reset'] = async () => {
  if (!(await confirmBox('Effacer tous les réglages et toutes les voix enregistrées de cette tablette ? C’est définitif.', 'Tout effacer'))) return;
  indexedDB.deleteDatabase('lunoo');
  location.reload();
};

// ---------- Horloge intelligente ----------
ctx.screens['p-clock'] = {
  render() {
    const s = ctx.s, ck = s.clock, sc = s.schedule;
    const ref = new Date(); while (ref.getDay() === 0 || ref.getDay() === 6) ref.setDate(ref.getDate() + 1);
    const slots = daySlots(s, ref); // on règle la journée type de la semaine
    const { cur } = currentSlot(s);
    const typeOptions = (sel) => Object.entries(CLOCK_TYPES).filter(([id]) => id !== 'reveil' && id !== 'sieste')
      .map(([id, t]) => `<option value="${id}" ${id === sel ? 'selected' : ''}>${t.label}</option>`).join('');
    const rows = slots.map((sl) => {
      const info = sl.info;
      const locked = sl.fixed === 'napend';
      let timeCtl;
      if (sl.fixed === 'wake') timeCtl = `<div class="pair"><button type="button" class="round sm" data-act="time" data-k="wakeWeek" data-d="-15" aria-label="Réveil plus tôt">−</button><span class="ck-time">${sc.wakeWeek}</span><button type="button" class="round sm" data-act="time" data-k="wakeWeek" data-d="15" aria-label="Réveil plus tard">+</button></div>`;
      else if (sl.fixed === 'nap') timeCtl = `<div class="pair"><button type="button" class="round sm" data-act="time" data-k="nap.start" data-d="-15" aria-label="Sieste plus tôt">−</button><span class="ck-time">${sc.nap.start}</span><button type="button" class="round sm" data-act="time" data-k="nap.start" data-d="15" aria-label="Sieste plus tard">+</button></div>`;
      else if (locked) timeCtl = `<div class="pair"><span class="ck-time">${sl.time}</span></div>`;
      else timeCtl = `<div class="pair"><button type="button" class="round sm" data-act="ck-time" data-id="${sl.id}" data-d="-15" aria-label="Plus tôt">−</button><span class="ck-time">${sl.time}</span><button type="button" class="round sm" data-act="ck-time" data-id="${sl.id}" data-d="15" aria-label="Plus tard">+</button></div>`;
      const label = sl.fixed === 'wake' ? `<strong>Réveil</strong><span class="muted small">Week-end : ${sc.wakeWeekend} · réglable dans Réveil</span>`
        : sl.fixed === 'nap' ? `<strong>Sieste</strong><span class="muted small">${fmtDur(sc.nap.dur)} · réglable dans Réveil</span>`
        : locked ? `<strong>Après la sieste : ${info.label}</strong><span class="muted small">Ajoutez un moment juste après la sieste pour changer</span>`
        : `<label class="sr-only" for="ck-${sl.id}">Moment de ${sl.time}</label><select id="ck-${sl.id}" class="input sm" data-change="ck-type" data-id="${sl.id}">${typeOptions(sl.type)}</select>`;
      return `<div class="ck-row ${sl.id === cur.id ? 'now' : ''}">
        ${timeCtl}
        <span class="ck-ico" style="background:${info.bg};${info.dark ? 'color:#F5C451' : ''}">${icon(ICONS[info.icon] || ICONS.clock, 26)}</span>
        <div class="ck-label">${label}</div>
        ${sl.fixed ? '<span class="ck-del"></span>' : `<button type="button" class="icon-btn" data-act="ck-del" data-id="${sl.id}" aria-label="Supprimer ce moment">${icon(ICONS.trash, 18)}</button>`}
      </div>`;
    }).join('');
    const hasDodo = ck.slots.some((x) => x.type === 'dodo');
    const body = `
      <div class="card list">
        ${toggle('clock.on', ck.on, 'Horloge de la journée', `L’écran de ${childName()} montre le moment en cours : image, couleur et message changent tout seuls`)}
        ${toggle('clock.chime', ck.chime, 'Petit carillon à chaque changement', 'Un son très doux quand on passe au moment suivant')}
      </div>
      ${ck.on ? `
      <div class="split">
        <div class="col">
          <div class="ck-list">${rows}</div>
          ${sc.wakeWeekend !== sc.wakeWeek ? `<span class="muted small">Le week-end, les moments du matin sont décalés avec le réveil (${sc.wakeWeekend}).</span>` : ''}
          <span class="label">Ajouter un moment</span>
          <div class="chips">${Object.entries(CLOCK_TYPES).filter(([id]) => id !== 'reveil' && id !== 'sieste').map(([id, t]) => `<button type="button" class="chip dashed" data-act="ck-add" data-v="${id}">${icon(ICONS[t.icon] || ICONS.clock, 18)}${t.label}</button>`).join('')}</div>
        </div>
        <div class="side-preview"><span class="label">En ce moment</span>
          <div class="preview sm" style="background:${cur.info.bg};${cur.info.dark ? 'color:#FBF6EE' : ''}">${animalSVG(s.child.animal, { palette: s.child.color, size: 140, asleep: !!cur.info.asleep })}<span class="preview-say">${esc(cur.info.say)}</span></div>
          ${hasDodo
            ? `<span class="muted small">Pendant « Dodo », l'écran passe tout seul en mode nuit jusqu'au réveil (${sc.wakeWeek} en semaine, ${sc.wakeWeekend} le week-end). Si ${childName()} se lève avant, il voit que c'est encore l'heure de dormir.</span>`
            : '<div class="warn-box small">Ajoutez un moment « Dodo » pour que l’écran passe tout seul en mode nuit.</div>'}
        </div>
      </div>` : ''}`;
    return parentLayout('p-clock', 'Horloge de la journée', body);
  },
};
ctx.actions['ck-time'] = (b) => {
  const sl = ctx.s.clock.slots.find((x) => x.id === b.dataset.id); if (!sl) return;
  sl.time = fromMin(toMin(sl.time) + Number(b.dataset.d)); save(); render();
};
ctx.actions['ck-del'] = (b) => { ctx.s.clock.slots = ctx.s.clock.slots.filter((x) => x.id !== b.dataset.id); save(); render(); };
ctx.actions['ck-add'] = (b) => {
  const now = new Date();
  const m = Math.ceil((now.getHours() * 60 + now.getMinutes()) / 15) * 15;
  ctx.s.clock.slots.push({ id: uid(), type: b.dataset.v, time: fromMin(m) });
  save(); render();
  toast(`« ${CLOCK_TYPES[b.dataset.v].label} » ajouté à ${fromMin(m)}, réglez l’heure avec − et +`);
};
ctx.changes['ck-type'] = (el) => {
  const sl = ctx.s.clock.slots.find((x) => x.id === el.dataset.id); if (!sl) return;
  sl.type = el.value; save(); render();
};
