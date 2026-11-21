// Premier lancement, sans inscription : prénom, couleur, horaires. Les animaux suivent les moments de la journée.
import { ctx, esc, go, save, render, toMin, fromMin, fmtDur, sleepCheck } from './ctx.js';
import { ANIMALS, PALETTES, ICONS } from './data.js';
import { animalSVG, moonSVG, icon } from './animal.js';
import { requestPersistence } from './store.js';

const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function head(step, back) {
  return `<div class="onb-head">
    <button type="button" class="link-btn" data-go="${back}">${icon(ICONS.back)}Retour</button>
    <div class="progress" aria-label="Étape ${step} sur 3">${[1, 2, 3].map((i) => `<span class="${i <= step ? 'done' : ''}"></span>`).join('')}</div>
    <span class="muted step-n">${step} / 3</span>
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
      <h1>Préparons le rituel du soir de votre enfant</h1>
      <div class="animal-row">${['coq', 'ours', 'canard', 'castor', 'mouton', 'hibou'].map((a) => `<span class="animal-tile">${animalSVG(a, { size: 84, label: ANIMALS[a].label })}</span>`).join('')}</div>
      <p class="lead muted-light">Un animal pour chaque moment : le coq au réveil, le canard au bain, le hibou pour dormir…</p>
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
          <input id="child-name" class="input big" type="text" value="${esc(c.name)}" maxlength="20" autocomplete="off" autofocus>
          <span class="muted">Il apparaîtra sur son écran et dans ses histoires.</span>
        </div>
        <div class="field center">
          <span class="label">Son âge</span>
          <div class="chips big">${[1, 2, 3, 4, 5, 6, 7].map((a) => `<button type="button" class="chip ${c.age === a ? 'sel' : ''}" aria-pressed="${c.age === a}" data-act="onb-age" data-v="${a}">${a === 7 ? '7 ans et +' : a + (a === 1 ? ' an' : ' ans')}</button>`).join('')}</div>
          <span class="muted">Sert à vous conseiller une durée de sommeil adaptée.</span>
        </div>
      </div>
      <div class="onb-foot"><span class="muted">Plusieurs enfants ? Installez Lunoo sur une tablette par chambre.</span><button type="button" class="btn primary" data-act="onb-name-next">Continuer</button></div>
    </div>`;
  },
};
ctx.actions['onb-age'] = (b) => { ctx.s.child.name = document.getElementById('child-name').value.trim(); ctx.s.child.age = Number(b.dataset.v); render(); };
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
          <p class="muted lead">Elle colore son écran et ses boutons. Le soir, les teintes s'adoucissent toutes seules.</p>
          <div class="grid3">${Object.entries(PALETTES).map(([id, p]) => `
            <button type="button" class="color-card ${c.color === id ? 'sel' : ''}" aria-pressed="${c.color === id}" data-act="onb-color" data-v="${id}">
              <span class="dot" style="background:${p.body}"></span><span>${p.label}</span>
            </button>`).join('')}</div>
        </div>
      </div>
      <div class="onb-foot end"><button type="button" class="btn primary" data-go="onb-hours">Continuer</button></div>
    </div>`;
  },
};
ctx.actions['onb-color'] = (b) => { ctx.s.child.color = b.dataset.v; save(); render(); };

export function hoursBody() {
  const s = ctx.s, sc = s.schedule, chk = sleepCheck(s);
  return `<div class="grid3 hours">
    <div class="card center">
      <span class="card-title">${icon(ICONS.nuit, 24)}Début du rituel</span>
      <span class="time-big">${sc.ritualStart}</span>
      <div class="pair"><button type="button" class="round" data-act="time" data-k="ritualStart" data-d="-15" aria-label="15 minutes plus tôt">−</button><button type="button" class="round" data-act="time" data-k="ritualStart" data-d="15" aria-label="15 minutes plus tard">+</button></div>
      <span class="muted">Endormissement vers ${fromMin(chk.bed)}</span>
    </div>
    <div class="card center">
      <span class="card-title">${icon(ICONS.sun, 24)}Réveil</span>
      <span class="time-big">${sc.wakeWeek}</span>
      <div class="pair"><button type="button" class="round" data-act="time" data-k="wakeWeek" data-d="-15" aria-label="15 minutes plus tôt">−</button><button type="button" class="round" data-act="time" data-k="wakeWeek" data-d="15" aria-label="15 minutes plus tard">+</button></div>
      <span class="muted">Week-end : ${sc.wakeWeekend}</span>
    </div>
    <div class="card center ${sc.nap.on ? 'nap-on' : ''}">
      <div class="card-head"><span class="card-title">Sieste</span>
        <button type="button" class="switch ${sc.nap.on ? 'on' : ''}" role="switch" aria-checked="${sc.nap.on}" aria-label="Sieste" data-act="nap-toggle"><span></span></button></div>
      ${sc.nap.on ? `<span class="time-mid">${sc.nap.start}</span>
        <div class="pair"><button type="button" class="round sm" data-act="time" data-k="nap.start" data-d="-15" aria-label="Sieste plus tôt">−</button><button type="button" class="round sm" data-act="time" data-k="nap.start" data-d="15" aria-label="Sieste plus tard">+</button></div>
        <span class="muted">Durée : ${fmtDur(sc.nap.dur)}</span>
        <div class="pair"><button type="button" class="round sm" data-act="nap-dur" data-d="-15" aria-label="Sieste plus courte">−</button><button type="button" class="round sm" data-act="nap-dur" data-d="15" aria-label="Sieste plus longue">+</button></div>`
        : '<span class="muted pad">Pas de sieste. Vous pourrez l’ajouter à tout moment.</span>'}
    </div>
  </div>
  <div class="check ${chk.ok ? 'ok' : 'warn'}">
    ${icon(chk.ok ? ICONS.check : ICONS.sun, 26)}
    <div><strong>Nuit ${fmtDur(chk.night)}${chk.nap ? ' + sieste ' + fmtDur(chk.nap) : ''} = ${fmtDur(chk.total)}</strong>
    <span>${chk.ok ? 'Dans la plage conseillée' : 'En dehors de la plage conseillée'} pour ${chk.ageTxt} : ${chk.rangeTxt} par 24 h, sieste comprise (Académie américaine de médecine du sommeil).</span></div>
  </div>`;
}

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

ctx.screens['onb-hours'] = {
  render() {
    return `<div class="screen onb">
      ${head(3, 'onb-color')}
      <div class="onb-body"><h1>Quand ${esc(ctx.s.child.name)} dort-il ?</h1>${hoursBody()}</div>
      <div class="onb-foot end"><button type="button" class="btn primary" data-act="onb-finish">Terminer</button></div>
    </div>`;
  },
};
ctx.actions['onb-finish'] = async () => { ctx.s.onboarded = true; await save(); requestPersistence(); go('onb-ready'); };

ctx.screens['onb-ready'] = {
  render() {
    const c = ctx.s.child, sc = ctx.s.schedule, pal = PALETTES[c.color];
    const corner = { hd: 'en haut à droite', hg: 'en haut à gauche', bd: 'en bas à droite', bg: 'en bas à gauche' }[ctx.s.access.corner];
    return `<div class="screen onb ready" style="background:${pal.bg}">
      <div class="ready-animal">${animalSVG('hibou', { size: 300 })}</div>
      <div class="col">
        <h1>Tout est prêt pour ${esc(c.name)} !</h1>
        <div class="chips static">
          <span class="chip">Couleur ${pal.label.toLowerCase()}</span>
          <span class="chip">Rituel ${sc.ritualStart}</span>
          ${sc.nap.on ? `<span class="chip">Sieste ${sc.nap.start} · ${fmtDur(sc.nap.dur)}</span>` : ''}
          <span class="chip">Réveil ${sc.wakeWeek}</span>
        </div>
        <div class="card row-card">
          <div class="mini-tablet" aria-hidden="true"><span class="mini-moon corner-${ctx.s.access.corner}"></span></div>
          <div><strong>Pour revenir aux réglages</strong><span>Gardez le doigt <strong>${ctx.s.access.hold} secondes</strong> sur la petite lune, ${corner} de l'écran.</span></div>
        </div>
        <p class="muted">Avant la première nuit : baissez la luminosité de la tablette au minimum, branchez-la, et activez « Accès guidé » (iPad) ou « Épinglage d'écran » (Android) pour que ${esc(c.name)} reste dans Lunoo.</p>
        <button type="button" class="btn primary xl" data-go="home">Aller à l'écran de ${esc(c.name)}</button>
      </div>
    </div>`;
  },
};
