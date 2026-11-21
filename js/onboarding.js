// Premier lancement, sans inscription : prénom, couleur, horaires. Les animaux suivent les moments de la journée.
import { ctx, esc, go, save, render, toMin, fromMin } from './ctx.js';
import { ANIMALS, PALETTES, ICONS } from './data.js';
import { animalSVG, moonSVG, icon } from './animal.js';
import { requestPersistence } from './store.js';

const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const STEPS = 3;
function head(step, back) {
  return `<div class="onb-head">
    <button type="button" class="link-btn" data-go="${back}">${icon(ICONS.back)}Retour</button>
    <div class="progress" aria-label="Étape ${step} sur ${STEPS}">${[1, 2, 3].map((i) => `<span class="${i <= step ? 'done' : ''}"></span>`).join('')}</div>
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
  ctx.s.child.name = v; save(); go('onb-color');
};

ctx.screens['onb-color'] = {
  render() {
    const c = ctx.s.child, pal = PALETTES[c.color];
    return `<div class="screen onb">
      ${head(2, 'onb-name')}
      <div class="onb-body row">
        <div class="preview" style="background:${pal.bg}">${animalSVG('hibou', { size: 280 })}<span class="preview-hi">Coucou ${esc(c.name)} !</span></div>
        <div class="col">
          <h1>Sa couleur préférée ?</h1>
          <p class="muted lead">Touchez une couleur : son écran change tout de suite. Vous pourrez la changer quand vous voulez.</p>
          <div class="grid3">${Object.entries(PALETTES).map(([id, p]) => `
            <button type="button" class="color-card ${c.color === id ? 'sel' : ''}" aria-pressed="${c.color === id}" data-act="onb-color" data-v="${id}">
              <span class="dot" style="background:${p.body}"></span><span>${p.label}</span>
            </button>`).join('')}</div>
        </div>
      </div>
      <div class="onb-foot end"><button type="button" class="btn primary" data-go="onb-moon">Continuer</button></div>
    </div>`;
  },
};
ctx.actions['onb-color'] = (b) => { ctx.s.child.color = b.dataset.v; save(); render(); };

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
      ${head(3, 'onb-color')}
      ${done ? '' : `<button type="button" class="parent-corner corner-${a.corner} practice" id="practice-moon" aria-label="Gardez le doigt appuyé ${a.hold} secondes">
        <svg class="hold-ring" viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="34"/></svg>${moonSVG(34)}</button>`}
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

ctx.actions['onb-finish'] = async () => { ctx.s.onboarded = true; await save(); requestPersistence(); go('onb-ready'); };

ctx.screens['onb-ready'] = {
  render() {
    const c = ctx.s.child, sc = ctx.s.schedule, pal = PALETTES[c.color];
    const dodo = (ctx.s.clock.slots.find((x) => x.type === 'dodo') || {}).time || '19:45';
    return `<div class="screen onb ready" style="background:${pal.bg}">
      <div class="ready-animal">${animalSVG('hibou', { size: 300 })}</div>
      <div class="col">
        <h1>Tout est prêt pour ${esc(c.name)} !</h1>
        <p class="lead">Pour commencer, sa journée est toute simple :</p>
        <div class="chips static">
          <span class="chip">${icon(ICONS.sun, 18)} Réveil ${sc.wakeWeek}</span>
          <span class="chip">${icon(ICONS.nuit, 18)} Dodo ${dodo}</span>
        </div>
        <p class="muted">Ces heures se changent en deux secondes dans l’espace parent. Un petit guide vous y attend pour la suite : vos heures, une histoire avec votre voix, la première nuit.</p>
        <details class="card tips"><summary>Avant la première nuit (conseillé)</summary>
          <span>Branchez la tablette, baissez la luminosité au minimum, et activez « Accès guidé » (iPad) ou « Épinglage d'écran » (Android) pour que ${esc(c.name)} reste dans Lunoo.</span></details>
        <button type="button" class="btn primary xl" data-go="home">Voir l'écran de ${esc(c.name)}</button>
      </div>
    </div>`;
  },
};
