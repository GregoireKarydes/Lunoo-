// Petits morceaux d'interface réutilisés par les écrans.
import { ctx, esc } from './ctx.js';
import { ICONS } from './data.js';
import { icon, moonSVG } from './animal.js';

// Coin secret de l'espace parent (appui long). Sa position suit les réglages.
export function parentCorner(cut = 'transparent', fill = '#F5C451', opacity = 0.5) {
  const c = ctx.s.access.corner;
  return `<button type="button" class="parent-corner corner-${c}" data-hold="parent" aria-label="Espace parent : gardez le doigt appuyé ${ctx.s.access.hold} secondes" style="opacity:${opacity}">
    <svg class="hold-ring" viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="34"/></svg>
    ${moonSVG(30, cut, fill)}
  </button>`;
}

export function toggle(key, on, label, desc = '') {
  return `<div class="row-setting">
    <div class="row-text"><span class="row-title">${label}</span>${desc ? `<span class="row-desc">${desc}</span>` : ''}</div>
    <button type="button" class="switch ${on ? 'on' : ''}" role="switch" aria-checked="${on}" aria-label="${esc(label)}" data-act="toggle" data-key="${key}"><span></span></button>
  </div>`;
}

export function chips(act, options, current, extra = '') {
  return `<div class="chips">${options.map(([v, l]) => `<button type="button" class="chip ${String(v) === String(current) ? 'sel' : ''}" aria-pressed="${String(v) === String(current)}" data-act="${act}" data-v="${esc(v)}" ${extra}>${l}</button>`).join('')}</div>`;
}

export function stepper(act, value, label) {
  return `<div class="stepper" role="group" aria-label="${esc(label)}">
    <button type="button" class="round" data-act="${act}" data-d="-1" aria-label="${esc(label)} : moins">−</button>
    <span class="stepper-val">${value}</span>
    <button type="button" class="round" data-act="${act}" data-d="1" aria-label="${esc(label)} : plus">+</button>
  </div>`;
}

const NAV = [
  ['p-home', 'Accueil', ICONS.home],
  ['p-child', 'L’enfant', ICONS.user],
  ['p-clock', 'Horloge', ICONS.clock],
  ['p-anim', 'Animations', ICONS.play],
  ['p-rituals', 'Rituels', ICONS.list],
  ['p-stories', 'Histoires', ICONS.histoire],
  ['p-night', 'Veilleuse et nuit', ICONS.nuit],
  ['p-sounds', 'Sons', ICONS.sound],
  ['p-wake', 'Réveil', ICONS.sun],
  ['p-access', 'Accès et sauvegarde', ICONS.lock],
];

export function parentLayout(active, title, body) {
  const name = esc(ctx.s.child.name || 'l’enfant');
  return `<div class="parent">
    <nav class="pnav" aria-label="Espace parent">
      <div class="pnav-brand">${moonSVG(28)}<span>Espace parent</span></div>
      ${NAV.map(([r, l, d]) => `<button type="button" class="pnav-item ${r === active ? 'active' : ''}" data-go="${r}" ${r === active ? 'aria-current="page"' : ''}>${icon(d, 22)}<span>${r === 'p-child' ? name : l}</span></button>`).join('')}
      <span class="grow"></span>
      <button type="button" class="pnav-exit" data-act="exit-parent">${icon(ICONS.back, 20)}<span>Retour à l’écran de ${name}</span></button>
    </nav>
    <main class="pmain">
      <h1 class="ptitle">${title}</h1>
      ${body}
    </main>
  </div>`;
}

export function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), 2600);
}

// Boîte de dialogue simple (texte), pour remplacer prompt() qui est bloqué en plein écran.
export function ask(question, value = '', placeholder = '') {
  return new Promise((resolve) => {
    const d = document.createElement('div');
    d.className = 'modal-wrap';
    d.innerHTML = `<form class="modal" role="dialog" aria-modal="true" aria-labelledby="mq">
      <label id="mq" for="mi" class="modal-q">${esc(question)}</label>
      <input id="mi" class="input" type="text" value="${esc(value)}" placeholder="${esc(placeholder)}" maxlength="60">
      <div class="modal-actions"><button type="button" class="btn ghost" data-r="0">Annuler</button><button type="submit" class="btn primary">Valider</button></div>
    </form>`;
    document.body.appendChild(d);
    const inp = d.querySelector('input');
    inp.focus(); inp.select();
    const done = (v) => { d.remove(); resolve(v); };
    d.querySelector('[data-r="0"]').onclick = () => done(null);
    d.querySelector('form').onsubmit = (e) => { e.preventDefault(); done(inp.value.trim() || null); };
  });
}

export function confirmBox(question, okLabel = 'Confirmer') {
  return new Promise((resolve) => {
    const d = document.createElement('div');
    d.className = 'modal-wrap';
    d.innerHTML = `<div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="mq">
      <p id="mq" class="modal-q">${esc(question)}</p>
      <div class="modal-actions"><button type="button" class="btn ghost" data-r="0">Annuler</button><button type="button" class="btn danger" data-r="1">${esc(okLabel)}</button></div>
    </div>`;
    document.body.appendChild(d);
    d.querySelector('[data-r="1"]').focus();
    d.addEventListener('click', (e) => { const b = e.target.closest('[data-r]'); if (b) { d.remove(); resolve(b.dataset.r === '1'); } });
  });
}
