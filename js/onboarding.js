// Premier lancement, sans inscription : prénom, sa journée, les heures, le geste de la lune.
import { ctx, esc, go, save, render, toMin, fromMin } from './ctx.js';
import { ANIMALS, PALETTES, ICONS, CLOCK_TYPES } from './data.js';
import { daySlots } from './clock.js';
import { animalSVG, moonSVG, icon } from './animal.js';
import { requestPersistence } from './store.js';

const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const STEPS = 4;
function head(step, back) {
  return `<div class="onb-head">
    <button type="button" class="link-btn" data-go="${back}">${icon(ICONS.back)}Retour</button>
    <div class="progress" aria-label="Étape ${step} sur ${STEPS}">${[1, 2, 3, 4].map((i) => `<span class="${i <= step ? 'done' : ''}"></span>`).join('')}</div>
    <span class="muted step-n">${step} / ${STEPS}</span>
  </div>`;
}

ctx.screens['onb-welcome'] = {
  render() {
    const install = isStandalone() ? '' : `<div class="install-tip">
      <strong>Important : installez Lunoo sur l'écran d'accueil</strong>
      <span>${isIOS()
        ? 'Sur iPad : touchez le bouton Partager (le carré avec une flèche), puis « Sur l’écran d’accueil ».'
        : 'Ouvrez le menu du navigateur (⋮), puis « Installer l’application » ou « Ajouter à l’écran d’accueil ».'}
      Ensuite, ouvrez Lunoo depuis son icône. Sinon, le navigateur peut effacer vos histoires enregistrées.</span>
    </div>`;
    return `<div class="screen onb onb-welcome">
      <div class="brand-big">${moonSVG(64)}<span>lunoo</span></div>
      <h1>La journée et le dodo de votre enfant, en images</h1>
      <p class="lead muted-light">On s’occupe de tout. Trois petites questions et c’est prêt (1 minute).</p>
      <div class="animal-row">${['coq', 'ours', 'canard', 'castor', 'mouton', 'hibou'].map((a) => `<span class="animal-tile">${animalSVG(a, { size: 84, label: ANIMALS[a].label })}</span>`).join('')}</div>
      ${install}
      <button type="button" class="btn primary xl" data-go="onb-name">Commencer</button>
      <div class="ticks">
        <span>${icon(ICONS.check, 20)}Aucun compte à créer</span>
        <span>${icon(ICONS.check, 20)}Tout reste sur cette tablette</span>
        <span>${icon(ICONS.check, 20)}Fonctionne sans Internet</span>
      </div>
      <button type="button" class="link-btn small" data-act="onb-restore">J'ai un fichier de sauvegarde</button>
      <input type="file" id="restore-file" accept="application/json,.json" hidden>
    </div>`;
  },
  mount(el) {
    const f = el.querySelector('#restore-file');
    f.onchange = async () => {
      if (!f.files[0]) return;
      const { importBackup } = await import('./store.js');
      try { ctx.s = await importBackup(f.files[0]); ctx.s.onboarded = true; await save(); go('home'); }
      catch (e) { alert(e.message); }
    };
  },
};
ctx.actions['onb-restore'] = () => document.getElementById('restore-file').click();

ctx.screens['onb-name'] = {
  render() {
    const c = ctx.s.child;
    return `<div class="screen onb">
      ${head(1, 'onb-welcome')}
      <div class="onb-body">
        <h1>Comment s'appelle votre enfant ?</h1>
        <div class="field wide">
          <label for="child-name">Prénom</label>
          <input id="child-name" class="input big" type="text" value="${esc(c.name)}" maxlength="20" autocomplete="off" enterkeyhint="next" autofocus>
          <span class="muted">Lunoo l’appellera par son prénom, sur l’écran et dans les histoires.</span>
        </div>
      </div>
      <div class="onb-foot end"><button type="button" class="btn primary" data-act="onb-name-next">Continuer</button></div>
    </div>`;
  },
  mount(el) {
    const i = el.querySelector('#child-name');
    i.onkeydown = (e) => { if (e.key === 'Enter') ctx.actions['onb-name-next'](); };
  },
};
ctx.actions['onb-name-next'] = () => {
  const v = document.getElementById('child-name').value.trim();
  if (!v) { document.getElementById('child-name').focus(); return; }
  ctx.s.child.name = v; save(); go('onb-day');
};

// Étape 2 : les moments de sa journée. Réveil et dodo sont toujours là ; on ajoute ce qu'on veut.
const DAY_IDEAS = [
  ['habiller', 'habiller', 'S’habiller', '7:15'],
  ['petitdej', 'manger', 'Petit-déjeuner', '7:30'],
  ['ecole', 'ecole', 'École', '8:15'],
  ['dejeuner', 'manger', 'Déjeuner', '12:00'],
  ['sieste', 'sieste', 'Sieste', '13:00'],
  ['gouter', 'manger', 'Goûter', '16:30'],
  ['dehors', 'sortie', 'Dehors', '17:00'],
  ['bain', 'bain', 'Bain', '18:15'],
  ['diner', 'manger', 'Dîner', '18:45'],
  ['dents', 'dents', 'Dents', '19:20'],
];
const hasIdea = (key) => (key === 'sieste' ? ctx.s.schedule.nap.on : ctx.s.clock.slots.some((x) => x.id === key));

ctx.screens['onb-day'] = {
  render() {
    const t = (type) => CLOCK_TYPES[type];
    const fixed = (type, label) => `<div class="day-tile fixed" style="background:${t(type).bg};${t(type).dark ? 'color:#FBF6EE' : ''}">${icon(ICONS[t(type).icon], 32)}<strong>${label}</strong><span>toujours là</span></div>`;
    return `<div class="screen onb">
      ${head(2, 'onb-name')}
      <div class="onb-body">
        <h1>Que fait ${esc(ctx.s.child.name)} dans sa journée ?</h1>
        <p class="lead muted">Touchez les moments à afficher sur son écran. Un animal et une couleur pour chacun.</p>
        <div class="day-grid">
          ${fixed('reveil', 'Réveil')}
          ${DAY_IDEAS.map(([key, type, label]) => { const on = hasIdea(key); return `<button type="button" class="day-tile ${on ? 'sel' : ''}" aria-pressed="${on}" data-act="onb-idea" data-v="${key}" style="${on ? `background:${t(type).bg};${t(type).dark ? 'color:#FBF6EE' : ''}` : ''}">
            ${icon(ICONS[t(type).icon], 32)}<strong>${label}</strong><span class="day-check">${on ? icon(ICONS.check, 18) : '+'}</span></button>`; }).join('')}
          ${fixed('dodo', 'Dodo')}
        </div>
      </div>
      <div class="onb-foot"><span class="muted">Vous pourrez en ajouter ou en retirer plus tard.</span><button type="button" class="btn primary" data-act="onb-day-next">Continuer</button></div>
    </div>`;
  },
};
ctx.actions['onb-idea'] = (b) => {
  const key = b.dataset.v, idea = DAY_IDEAS.find((x) => x[0] === key);
  if (key === 'sieste') ctx.s.schedule.nap.on = !ctx.s.schedule.nap.on;
  else if (hasIdea(key)) ctx.s.clock.slots = ctx.s.clock.slots.filter((x) => x.id !== key);
  else ctx.s.clock.slots.push({ id: key, type: idea[1], time: idea[3] });
  save(); render();
};
ctx.actions['onb-day-next'] = () => {
  const sl = ctx.s.clock.slots;
  const chosen = DAY_IDEAS.some(([key]) => key !== 'sieste' && sl.some((x) => x.id === key));
  // Le moment « Jeu » par défaut ne sert que si rien n'est choisi (sinon l'écran dirait « réveil » toute la journée).
  if (chosen) ctx.s.clock.slots = sl.filter((x) => x.id !== 'c1');
  else if (!sl.some((x) => x.id === 'c1')) sl.push({ id: 'c1', type: 'jeu', time: '8:00' });
  save(); go('onb-times');
};

// Étape 3 : les heures, déjà proposées ; on ajuste seulement si besoin.
ctx.screens['onb-times'] = {
  render() {
    const s = ctx.s, sc = s.schedule;
    const ref = new Date(); while (ref.getDay() === 0 || ref.getDay() === 6) ref.setDate(ref.getDate() + 1);
    const pm = (act, extra, label) => `<div class="pair"><button type="button" class="round sm" data-act="${act}" ${extra} data-d="-15" aria-label="${label} plus tôt">−</button>`;
    const rows = daySlots(s, ref).filter((x) => x.fixed !== 'napend').map((sl) => {
      const info = sl.info;
      const label = (DAY_IDEAS.find((x) => x[0] === sl.id) || [])[2] || (sl.fixed === 'wake' ? 'Réveil' : sl.fixed === 'nap' ? 'Sieste' : info.label);
      let ctl;
      if (sl.fixed === 'wake') ctl = `${pm('time', 'data-k="wakeWeek"', label)}<span class="ck-time">${sc.wakeWeek}</span><button type="button" class="round sm" data-act="time" data-k="wakeWeek" data-d="15" aria-label="${label} plus tard">+</button></div>`;
      else if (sl.fixed === 'nap') ctl = `${pm('time', 'data-k="nap.start"', label)}<span class="ck-time">${sc.nap.start}</span><button type="button" class="round sm" data-act="time" data-k="nap.start" data-d="15" aria-label="${label} plus tard">+</button></div>`;
      else ctl = `${pm('ck-time', `data-id="${esc(sl.id)}"`, label)}<span class="ck-time">${sl.time}</span><button type="button" class="round sm" data-act="ck-time" data-id="${esc(sl.id)}" data-d="15" aria-label="${label} plus tard">+</button></div>`;
      return `<div class="ck-row"><span class="ck-ico" style="background:${info.bg};${info.dark ? 'color:#F5C451' : ''}">${icon(ICONS[info.icon] || ICONS.clock, 26)}</span>
        <div class="ck-label"><strong>${label}</strong>${sl.fixed === 'nap' ? `<span class="muted small">Durée ${Math.floor(sc.nap.dur / 60) ? Math.floor(sc.nap.dur / 60) + ' h ' : ''}${sc.nap.dur % 60 ? String(sc.nap.dur % 60).padStart(2, '0') : ''} <button type="button" class="link-btn small" data-act="nap-dur" data-d="-15">−</button><button type="button" class="link-btn small" data-act="nap-dur" data-d="15">+</button></span>` : ''}</div>${ctl}</div>`;
    }).join('');
    return `<div class="screen onb">
      ${head(3, 'onb-day')}
      <div class="onb-body top">
        <h1>Les heures, à peu près</h1>
        <p class="lead muted">Elles sont déjà proposées. Ajustez avec − et + si besoin, sinon continuez.</p>
        <div class="ck-list onb-times">${rows}</div>
      </div>
      <div class="onb-foot end"><button type="button" class="btn primary" data-go="onb-moon">Continuer</button></div>
    </div>`;
  },
};

ctx.actions.time = (b) => {
  const sc = ctx.s.schedule, k = b.dataset.k, d = Number(b.dataset.d);
  if (k === 'nap.start') sc.nap.start = fromMin(toMin(sc.nap.start) + d);
  else {
    const before = sc[k];
    sc[k] = fromMin(toMin(sc[k]) + d);
    if (k === 'wakeWeek' && sc.wakeWeekend === fromMin(toMin(before) + 60)) sc.wakeWeekend = fromMin(toMin(sc.wakeWeek) + 60);
  }
  save(); render();
};
ctx.actions['nap-toggle'] = () => { ctx.s.schedule.nap.on = !ctx.s.schedule.nap.on; save(); render(); };
ctx.actions['nap-dur'] = (b) => { const n = ctx.s.schedule.nap; n.dur = Math.max(30, Math.min(180, n.dur + Number(b.dataset.d))); save(); render(); };

// Étape 3 : on apprend le seul geste à connaître, en vrai, à l'endroit où il se trouve.
let practiceTimer = null;
ctx.screens['onb-moon'] = {
  render(p) {
    const a = ctx.s.access, done = !!p.done;
    const corner = { hd: 'en haut à droite', hg: 'en haut à gauche', bd: 'en bas à droite', bg: 'en bas à gauche' }[a.corner];
    return `<div class="screen onb onb-moon">
      ${head(4, 'onb-times')}
      ${done ? '' : `<button type="button" class="parent-corner corner-${a.corner} practice" id="practice-moon" aria-label="Gardez le doigt appuyé ${a.hold} secondes">
        <svg class="hold-ring" viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="34"/></svg>${moonSVG(40, '#FBF6EE')}</button>`}
      <div class="onb-body">
        ${done ? `<div class="big-tick">${icon(ICONS.check, 64)}</div>
          <h1>Bravo, c’est exactement ça !</h1>
          <p class="lead muted">Ce geste ouvre <strong>l’espace parent</strong> : lancer la nuit, les histoires, régler la journée.<br>${esc(ctx.s.child.name)} ne pourra pas l’ouvrir par hasard.</p>`
        : `<h1>Le seul geste à retenir</h1>
          <p class="lead muted">Voyez la petite lune ${corner} ?<br><strong>Gardez le doigt dessus ${a.hold} secondes</strong>, jusqu’à ce que le cercle se remplisse.</p>
          <span class="practice-hint">Essayez maintenant ↗</span>`}
      </div>
      <div class="onb-foot ${done ? 'end' : ''}">
        ${done ? '<button type="button" class="btn primary" data-act="onb-finish">Terminer</button>'
          : '<button type="button" class="link-btn small" data-act="onb-finish">Passer</button>'}
      </div>
    </div>`;
  },
  mount(el) {
    const m = el.querySelector('#practice-moon');
    if (!m) return;
    const sec = ctx.s.access.hold || 3;
    m.style.setProperty('--hold', sec + 's');
    const stop = () => { clearTimeout(practiceTimer); practiceTimer = null; m.classList.remove('holding'); };
    m.addEventListener('pointerdown', (e) => {
      e.preventDefault(); stop(); m.classList.add('holding');
      practiceTimer = setTimeout(() => { stop(); if (navigator.vibrate) navigator.vibrate(30); go('onb-moon', { done: true }); }, sec * 1000);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => m.addEventListener(t, stop));
    m.addEventListener('contextmenu', (e) => e.preventDefault());
  },
  unmount() { clearTimeout(practiceTimer); practiceTimer = null; },
};

ctx.actions['onb-finish'] = async () => { ctx.s.onboarded = true; ctx.s.guide = { ...(ctx.s.guide || {}), clock: true }; await save(); requestPersistence(); go('onb-ready'); };

ctx.screens['onb-ready'] = {
  render() {
    const c = ctx.s.child, sc = ctx.s.schedule, pal = PALETTES[c.color];
    return `<div class="screen onb ready" style="background:${pal.bg}">
      <div class="ready-animal">${animalSVG('hibou', { size: 300 })}</div>
      <div class="col">
        <h1>Tout est prêt pour ${esc(c.name)} !</h1>
        <p class="lead">Sa journée :</p>
        <div class="chips static">${daySlots(ctx.s).filter((x) => x.fixed !== 'napend').map((x) => `<span class="chip">${icon(ICONS[x.info.icon] || ICONS.clock, 18)} ${x.time} ${esc((DAY_IDEAS.find((d) => d[0] === x.id) || [])[2] || x.info.label)}</span>`).join('')}</div>
        <p class="muted">Tout se change dans l’espace parent. Un petit guide vous y attend pour la suite : une histoire avec votre voix, puis la première nuit.</p>
        <details class="card tips"><summary>Avant la première nuit (conseillé)</summary>
          <span>Branchez la tablette, baissez la luminosité au minimum, et activez « Accès guidé » (iPad) ou « Épinglage d'écran » (Android) pour que ${esc(c.name)} reste dans Lunoo.</span></details>
        <button type="button" class="btn primary xl" data-go="home">Voir l'écran de ${esc(c.name)}</button>
      </div>
    </div>`;
  },
};
