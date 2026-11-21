// Dessin des cinq compagnons en SVG (endormis ou réveillés).
import { PALETTES } from './data.js';
import { pop } from './sound.js';

const DARK = '#1F2250';

const SHAPES = {
  hibou: (b, l) => `
    <path d="M50 70 L58 30 L84 58 Z" fill="${b}"/><path d="M150 70 L142 30 L116 58 Z" fill="${b}"/>
    <ellipse cx="100" cy="120" rx="64" ry="70" fill="${b}"/><ellipse cx="100" cy="150" rx="36" ry="36" fill="${l}"/>
    <path d="M93 120 L107 120 L100 132 Z" fill="#F5C451"/>`,
  renard: (b, l) => `
    <path d="M46 84 L56 22 L94 62 Z" fill="${b}"/><path d="M154 84 L144 22 L106 62 Z" fill="${b}"/>
    <ellipse cx="100" cy="118" rx="68" ry="60" fill="${b}"/>
    <path d="M36 122 Q66 176 100 180 Q134 176 164 122 Q134 142 100 142 Q66 142 36 122 Z" fill="${l}"/>
    <circle cx="100" cy="142" r="8" fill="${DARK}"/>`,
  lapin: (b, l) => `
    <ellipse cx="74" cy="48" rx="15" ry="42" fill="${b}"/><ellipse cx="126" cy="48" rx="15" ry="42" fill="${b}"/>
    <ellipse cx="74" cy="50" rx="6" ry="28" fill="${l}"/><ellipse cx="126" cy="50" rx="6" ry="28" fill="${l}"/>
    <circle cx="100" cy="124" r="60" fill="${b}"/><ellipse cx="100" cy="146" rx="24" ry="18" fill="${l}"/>
    <ellipse cx="100" cy="137" rx="6" ry="4" fill="#E98A9A"/>`,
  ours: (b, l) => `
    <circle cx="50" cy="66" r="22" fill="${b}"/><circle cx="150" cy="66" r="22" fill="${b}"/>
    <circle cx="50" cy="66" r="11" fill="${l}"/><circle cx="150" cy="66" r="11" fill="${l}"/>
    <circle cx="100" cy="120" r="64" fill="${b}"/><ellipse cx="100" cy="146" rx="30" ry="22" fill="${l}"/>
    <ellipse cx="100" cy="137" rx="9" ry="6" fill="${DARK}"/>`,
  chat: (b, l) => `
    <path d="M42 82 L52 30 L88 60 Z" fill="${b}"/><path d="M158 82 L148 30 L112 60 Z" fill="${b}"/>
    <ellipse cx="100" cy="120" rx="66" ry="58" fill="${b}"/><ellipse cx="100" cy="148" rx="30" ry="20" fill="${l}"/>
    <path d="M94 134 L106 134 L100 141 Z" fill="#E98A9A"/>
    <path d="M38 132 L70 136 M38 146 L70 142 M162 132 L130 136 M162 146 L130 142" stroke="${DARK}" stroke-width="3" stroke-linecap="round"/>`,
};

const EYES_OPEN = `
  <g class="eyes"><circle cx="78" cy="106" r="14" fill="#fff"/><circle cx="122" cy="106" r="14" fill="#fff"/>
  <circle cx="80" cy="108" r="7" fill="${DARK}"/><circle cx="120" cy="108" r="7" fill="${DARK}"/></g>`;

const eyesClosed = (l) => `
  <path d="M66 106 Q78 118 90 106" stroke="${DARK}" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M110 106 Q122 118 134 106" stroke="${DARK}" stroke-width="6" fill="none" stroke-linecap="round"/>
  <text x="150" y="40" fill="${l}" font-size="26" font-weight="700" class="zz">z</text>
  <text x="168" y="20" fill="${l}" font-size="18" font-weight="700" class="zz zz2">z</text>`;

/**
 * @param {string} animal hibou | renard | lapin | ours | chat
 * @param {object} opts { palette, asleep, size, cls, colors:{body,belly} }
 */
export function animalSVG(animal, opts = {}) {
  const pal = opts.colors || PALETTES[opts.palette] || PALETTES.corail;
  const shape = SHAPES[animal] || SHAPES.renard;
  const size = opts.size || 200;
  const label = opts.label || '';
  const aria = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
  return `<svg class="animal ${opts.cls || ''} ${opts.asleep ? 'asleep' : 'awake'}" viewBox="0 0 200 200" width="${size}" height="${size}" ${aria}>
    ${shape(pal.body, pal.belly)}
    ${opts.asleep ? eyesClosed(pal.belly) : EYES_OPEN}
  </svg>`;
}

export function moonSVG(size = 36, cut = '#1F2250', fill = '#F5C451') {
  return `<svg width="${size}" height="${size}" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15" fill="${fill}"/><circle cx="25" cy="13" r="13" fill="${cut}"/></svg>`;
}

// Réaction au toucher : quand l'animal est réveillé, il s'écrase, rebondit et lâche quelques étoiles.
// Les animaux endormis ne réagissent pas (pas de stimulation au moment du dodo).
const FX = [['★', '#F5C451'], ['♥', '#E98A9A'], ['✦', '#8C84D9'], ['★', '#5FB89A'], ['♥', '#6FA8DC'], ['✦', '#E8875B']];
document.addEventListener('pointerdown', (e) => {
  const a = e.target.closest && e.target.closest('.animal.awake');
  if (!a) return;
  a.classList.remove('squash');
  void a.offsetWidth; // relance l'animation si on retouche tout de suite
  a.classList.add('squash');
  a.addEventListener('animationend', () => a.classList.remove('squash'), { once: true });
  try { pop(); } catch (err) { /* pas de son si le navigateur le refuse */ }
  const r = a.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  FX.forEach(([ch, col], i) => {
    const s = document.createElement('span');
    s.className = 'fx-star';
    s.textContent = ch;
    s.style.left = cx + 'px';
    s.style.top = cy + 'px';
    s.style.setProperty('--a', (i * 60 + Math.random() * 20) + 'deg');
    s.style.setProperty('--r', (90 + Math.random() * 60) + 'px');
    s.style.setProperty('--c', col);
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 900);
  });
});

// Décor et mouvement adaptés à chaque moment : bulles au bain, gouttes sous la douche, il mange, il brosse les dents…
const SCENES = {
  bain: { cls: 'bob', fx: 'bulles', n: 7 },
  douche: { cls: 'bob', fx: 'gouttes', n: 10 },
  manger: { cls: 'chew', fx: 'manger', n: 1 },
  dents: { cls: 'wiggle', fx: 'etoiles', n: 6 },
  dehors: { cls: 'sway', fx: 'feuilles', n: 6 },
  jeu: { cls: 'hop', fx: 'notes', n: 4 },
  histoire: { cls: 'breathe', fx: 'notes', n: 3 },
  calme: { cls: 'breathe', fx: 'etoiles', n: 3 },
  habiller: { cls: 'wiggle', fx: '', n: 0 },
  ecole: { cls: 'bob', fx: '', n: 0 },
  sieste: { cls: '', fx: '', n: 0 },
  dodo: { cls: '', fx: '', n: 0 },
};

const range = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join('');
const FX_HTML = {
  bulles: (n) => range(n, (i) => `<span class="bulle" style="left:${8 + (i * 13) % 80}%;--s:${10 + (i * 7) % 18}px;animation-duration:${3 + (i % 3)}s;animation-delay:-${i * 0.6}s"></span>`),
  gouttes: (n) => range(n, (i) => `<span class="goutte" style="left:${6 + (i * 9) % 88}%;animation-duration:${1.6 + (i % 4) * 0.25}s;animation-delay:-${i * 0.35}s"></span>`),
  manger: () => '<span class="miette">🍎</span>',
  etoiles: (n) => range(n, (i) => `<span class="etoile" style="left:${10 + (i * 17) % 80}%;top:${8 + (i * 23) % 70}%;animation-delay:-${i * 0.7}s">✦</span>`),
  feuilles: (n) => range(n, (i) => `<span class="feuille" style="left:${(i * 19) % 90}%;animation-duration:${4 + (i % 3)}s;animation-delay:-${i * 0.9}s">🍃</span>`),
  notes: (n) => range(n, (i) => `<span class="note" style="left:${20 + (i * 21) % 60}%;bottom:${20 + (i * 9) % 20}%;animation-delay:-${i}s">♪</span>`),
};

/** Renvoie la classe d'animation de l'animal et le décor (HTML) pour un moment donné. */
export function sceneFor(kind, { asleep = false } = {}) {
  const sc = SCENES[kind] || {};
  const build = FX_HTML[sc.fx];
  const html = !asleep && build && sc.n ? `<span class="scene scene-${sc.fx}" aria-hidden="true">${build(sc.n)}</span>` : '';
  return { cls: asleep ? '' : (sc.cls || ''), html };
}

export function icon(d, size = 24, extra = '') {
  // Les attributs de « extra » passent en premier : en HTML, le premier attribut en double l'emporte.
  return `<svg ${extra} width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
}
