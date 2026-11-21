// Espace parent : voir toutes les animations, en vignettes puis en plein écran.
import { ctx, esc, go } from './ctx.js';
import { CLOCK_TYPES, ANIMALS, ICONS, momentAnimal } from './data.js';
import { icon } from './animal.js';
import { parentLayout } from './ui.js';
import { sceneBlock, clockFace, hhmm } from './child.js';
import { celebrate } from './rewards.js';

const MOMENT_KINDS = ['reveil', 'habiller', 'manger', 'ecole', 'jeu', 'sortie', 'douche', 'bain', 'dents', 'calme', 'histoire', 'sieste', 'dodo'];
const SPECIAL = [
  ['fete', 'Bravo !', 'La fête quand l’enfant touche « C’est fait ! »', '#FCEBC0', 'jeu'],
  ['brush', 'Brossage des dents', 'Le minuteur de 2 minutes', '#E8F2FB', 'dents'],
  ['nuit', 'La nuit', 'Si l’enfant se réveille avant l’heure', '#000', 'nuit'],
  ['soon', 'Bientôt le matin', '20 minutes avant le réveil', '#3B2F4F', 'nuit'],
  ['wake', 'Réveil', 'Le coq annonce qu’on peut se lever', '#FDE7B0', 'reveil'],
];
const ORDER = [...MOMENT_KINDS, ...SPECIAL.map((x) => x[0])];

ctx.screens['p-anim'] = {
  render() {
    const tile = (k, label, desc, bg, sceneKind, dark) => `<button type="button" class="anim-tile" data-go="anim-preview" data-p='{"k":"${k}"}' style="background:${bg};${dark ? 'color:#FBF6EE' : ''}">
        <span class="anim-stage">${sceneBlock(sceneKind, ['sieste', 'dodo', 'nuit', 'soon'].includes(k), 130)}</span>
        <strong>${esc(label)}</strong>${desc ? `<span class="small">${esc(desc)}</span>` : ''}</button>`;
    const body = `
      <p class="muted lead">Touchez une vignette pour la voir en grand, comme sur l’écran de l’enfant. Un animal différent accompagne chaque moment.</p>
      <span class="label">Les moments de la journée</span>
      <div class="anim-grid">${MOMENT_KINDS.map((k) => { const t = CLOCK_TYPES[k]; return tile(k, t.label, ANIMALS[momentAnimal(k)].label, t.bg, k, t.dark); }).join('')}</div>
      <span class="label">Écrans spéciaux</span>
      <div class="anim-grid">${SPECIAL.map(([k, l, d, bg, sk]) => tile(k, l, d, bg, sk === 'nuit' ? 'dodo' : sk, ['nuit', 'soon'].includes(k))).join('')}</div>`;
    return parentLayout('p-anim', 'Animations', body);
  },
};

function bar(k) {
  const i = ORDER.indexOf(k);
  const prev = ORDER[(i - 1 + ORDER.length) % ORDER.length], next = ORDER[(i + 1) % ORDER.length];
  const label = CLOCK_TYPES[k] ? CLOCK_TYPES[k].label : (SPECIAL.find((x) => x[0] === k) || [])[1];
  return `<div class="preview-bar">
    <button type="button" class="icon-btn" data-go="anim-preview" data-p='{"k":"${prev}"}' aria-label="Précédent">${icon(ICONS.back, 20)}</button>
    <span>Aperçu : <strong>${esc(label || '')}</strong></span>
    <button type="button" class="icon-btn" data-go="anim-preview" data-p='{"k":"${next}"}' aria-label="Suivant">${icon(ICONS.next, 20)}</button>
    <button type="button" class="btn primary sm" data-go="p-anim">${icon(ICONS.close, 18)}Fermer</button>
  </div>`;
}

ctx.screens['anim-preview'] = {
  render(p) {
    const k = p.k || 'bain';
    if (k === 'nuit' || k === 'soon') return `<div class="preview-host">${ctx.screens.night.render({ phase: k === 'soon' ? 'soon' : 'night', preview: true })}${bar(k)}</div>`;
    if (k === 'wake') return `<div class="preview-host">${ctx.screens.wake.render()}${bar(k)}</div>`;
    const kind = k === 'fete' ? 'dents' : k;
    const t = CLOCK_TYPES[kind];
    const fake = { min: (new Date().getHours() * 60 + new Date().getMinutes() + 25) % 1440, info: CLOCK_TYPES.manger };
    return `<div class="preview-host"><div class="screen child home clockhome ${t.dark ? 'dark' : ''}" style="background:${t.bg}">
      <div class="ch-main">
        <div class="ch-animal">${sceneBlock(kind, !!t.asleep, 340)}</div>
        <div class="ch-side"><div class="ch-sayrow"><div class="ch-clock">${clockFace(fake, 132, !!t.dark)}<span class="ch-digital">${hhmm()}</span></div><span class="ch-say">${esc(t.say)}</span></div>
          ${k === 'brush' ? '<button type="button" class="done-btn" data-go="brush" data-p=\'{"back":"p-anim"}\'>Lancer le minuteur</button>' : ''}
          ${k === 'fete' ? '<button type="button" class="done-btn" data-act="prev-fete">Rejouer la fête</button>' : ''}
        </div>
      </div></div>${bar(k)}</div>`;
  },
  mount(el, p) { if (p.k === 'fete') setTimeout(() => celebrate('dents', '', { preview: true }), 300); },
};
ctx.actions['prev-fete'] = () => celebrate('dents', '', { preview: true });
