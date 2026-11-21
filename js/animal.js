// Dessin des cinq compagnons en SVG (endormis ou réveillés).
import { PALETTES } from './data.js';

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

export function icon(d, size = 24, extra = '') {
  // Les attributs de « extra » passent en premier : en HTML, le premier attribut en double l'emporte.
  return `<svg ${extra} width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
}
