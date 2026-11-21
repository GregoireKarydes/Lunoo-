// Récompense « C'est fait ! » : confettis, animal qui saute, et un bravo dit à voix haute.
// Principes : on félicite l'effort, sans points ni comparaison ; une seule fois par moment et par jour ;
// pour les dents, un minuteur de 2 minutes ; option « avec un adulte » pour vérifier avant de fêter.
import { ctx, esc, go, save } from './ctx.js';
import { ICONS, momentAnimal } from './data.js';
import { animalSVG, icon, sceneFor } from './animal.js';
import { fanfare, startBed, stopBed } from './sound.js';

// Moments qu'un enfant peut « faire » et valider lui-même.
export const REWARDABLE = ['habiller', 'manger', 'douche', 'bain', 'dents', 'ecole', 'sortie', 'calme'];

const BUTTON = {
  habiller: 'Mes habits sont mis !', manger: "J'ai mangé !", douche: "J'ai pris ma douche !", bain: "J'ai pris mon bain !",
  dents: 'Je me brosse les dents', ecole: 'Mon cartable est prêt !', sortie: 'Mes chaussures sont mises !', calme: 'J’ai fait une pause calme',
};
export const buttonLabel = (type) => BUTTON[type] || "C'est fait !";

// Phrases écrites pour convenir à une fille comme à un garçon (pas d'accord au féminin ou au masculin).
const PHRASES = {
  dents: [
    'Tu as des dents toutes propres !', 'Tes dents brillent comme des étoiles !', 'Plus une miette sur tes dents, le castor est épaté !',
    'Ton sourire est tout brillant !', 'Les petites bêtes des dents sont parties !', 'Tes dents te disent merci !',
    'Deux minutes de brossage, ça, c’est du travail bien fait !', 'Montre-moi ton beau sourire tout propre !',
  ],
  habiller: [
    'Tu as mis tes habits toi-même !', 'Tes habits sont mis, la journée peut commencer !', 'Quelle belle tenue !',
    'Les chaussettes, ce n’est pas facile, et c’est réussi !', 'Le pingouin a mis son nœud papillon, et toi tes habits !',
    'Tu as choisi tes habits, quelle autonomie !', 'Tes vêtements sont mis à l’endroit, bravo !',
  ],
  manger: [
    'Tu as bien mangé, ton ventre est content !', 'Miam ! Ça donne de l’énergie pour toute la journée !', 'L’ourson s’est régalé avec toi !',
    'Merci d’avoir mangé à table avec la famille !', 'Ton corps te dit merci pour ce bon repas !', 'Tu as goûté, c’est très courageux !',
  ],
  douche: [
    'Tu sens tout bon !', 'Tout est propre, de la tête aux pieds !', 'La grenouille adore l’eau, et toi aussi !',
    'Ta peau est toute douce maintenant !', 'Plus une trace de la journée, tout est lavé !', 'Ça sent bon le savon ici !',
  ],
  bain: [
    'Tu sens bon le savon !', 'Le canard est content d’avoir un copain de bain !', 'Tout est propre et tout doux !',
    'Que de bulles ! Et tout est lavé !', 'Le bain est fini, tu peux te mettre au chaud !', 'Coin coin ! Le canard dit bravo !',
  ],
  ecole: [
    'Ton cartable est prêt, bonne journée à l’école !', 'Tu vas apprendre plein de choses aujourd’hui !',
    'Le renard te souhaite une super journée !', 'Tout est prêt, tu es à l’heure !',
  ],
  sortie: ['Les chaussures sont mises, en route pour l’aventure !', 'Allez, on part se promener !', 'Le lapin est prêt à sauter dehors avec toi !', 'Tout est prêt pour sortir, super !'],
  calme: ['Tu as su te poser, c’est précieux.', 'Respirer doucement, tu sais faire !', 'Le chat ronronne avec toi.', 'Quel moment tout calme !'],
};
const OPEN = ['Bravo', 'Super', 'Génial', 'Bien joué', 'Youpi', 'Trop fort', 'Hourra', 'Waouh'];
const CLOSE = ['', '', 'Continue comme ça !', 'Tu sais faire plein de choses !', 'Tu grandis un peu chaque jour.', 'Quelle belle journée !', 'Un gros câlin de la part de tous les animaux !'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
let lastPhrase = '';

export function bravoText(type, name) {
  const list = PHRASES[type] || ['Tu l’as fait !'];
  let p = pick(list);
  if (p === lastPhrase && list.length > 1) p = list[(list.indexOf(p) + 1) % list.length];
  lastPhrase = p;
  return { title: `${pick(OPEN)} ${name} !`, line: p, close: pick(CLOSE) };
}

// ---------- Suivi du jour ----------
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function doneToday(slotId) { const r = ctx.s.rewards; return !!(r && r.done[dayKey()] && r.done[dayKey()][slotId]); }
function markDone(slotId) {
  const r = ctx.s.rewards, k = dayKey();
  r.done[k] = r.done[k] || {};
  r.done[k][slotId] = new Date().toTimeString().slice(0, 5);
  // On ne garde que deux semaines.
  Object.keys(r.done).sort().slice(0, -14).forEach((old) => delete r.done[old]);
  save();
}

// ---------- Voix ----------
function speak(text) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'fr-FR'; u.rate = 0.92; u.pitch = 1.15;
  const v = speechSynthesis.getVoices().find((x) => x.lang === 'fr-FR') || speechSynthesis.getVoices().find((x) => x.lang && x.lang.startsWith('fr'));
  if (v) u.voice = v;
  speechSynthesis.speak(u);
}

// ---------- Fête ----------
const COLORS = ['#F5C451', '#E8875B', '#7D74E6', '#4FA3E8', '#3DB58A', '#EE6FA0'];
const EXTRA = { dents: '✦', bain: '○', douche: '💧', manger: '♥', habiller: '★', ecole: '★', sortie: '🍃', calme: '✦' };

function confetti(n = 70) {
  return Array.from({ length: n }, (_, i) => {
    const c = COLORS[i % COLORS.length];
    const round = i % 3 === 0;
    return `<span class="confetti" style="left:${Math.random() * 100}%;background:${c};${round ? 'border-radius:50%;' : ''}--dx:${Math.round(Math.random() * 160 - 80)}px;--rot:${Math.round(Math.random() * 720)}deg;animation-delay:${(Math.random() * 0.6).toFixed(2)}s;animation-duration:${(2.2 + Math.random() * 1.6).toFixed(2)}s"></span>`;
  }).join('');
}

/** Affiche la fête par-dessus l'écran. preview : sans voix ni enregistrement. */
export function celebrate(type, slotId, { preview = false } = {}) {
  if (!preview && slotId) markDone(slotId);
  const name = ctx.s.child.name || '';
  const t = bravoText(type, name);
  const a = momentAnimal(type);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const extra = EXTRA[type] || '★';
  const el = document.createElement('div');
  el.className = 'celebrate';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', t.title);
  el.innerHTML = `${reduce ? '' : `<div class="confetti-wrap" aria-hidden="true">${confetti()}</div>`}
    <div class="cel-inner">
      <div class="cel-animal">${animalSVG(a, { size: 260, cls: 'cheer' })}
        ${reduce ? '' : `<span class="cel-extra" aria-hidden="true">${Array.from({ length: 6 }, (_, i) => `<span style="--a:${i * 60}deg;animation-delay:${i * 0.1}s">${extra}</span>`).join('')}</span>`}</div>
      <h1 class="cel-title">${esc(t.title)}</h1>
      <p class="cel-line">${esc(t.line)}</p>
      ${t.close ? `<p class="cel-close">${esc(t.close)}</p>` : ''}
      <button type="button" class="btn primary xl cel-ok">${icon(ICONS.check, 26)}Merci !</button>
    </div>`;
  document.body.appendChild(el);
  try { fanfare(); } catch (e) { /* pas de son */ }
  setTimeout(() => speak(`${t.title} ${t.line} ${t.close}`), 500);
  let closed = false;
  const close = () => {
    if (closed) return; closed = true;
    el.classList.add('out');
    setTimeout(() => { el.remove(); if (!preview && ctx.route === 'home') go('home'); }, 400);
  };
  el.querySelector('.cel-ok').addEventListener('click', close);
  setTimeout(close, preview ? 7000 : 9000);
}

// « Avec un adulte » : l'enfant montre à un grand, qui garde le doigt appuyé 2 secondes.
function askAdult(type, slotId) {
  const el = document.createElement('div');
  el.className = 'celebrate adult';
  el.innerHTML = `<div class="cel-inner">
      ${animalSVG(momentAnimal(type), { size: 200, cls: 'bob' })}
      <h1 class="cel-title">Va montrer à un grand !</h1>
      <p class="cel-line">Papa, maman ou un adulte va regarder, puis appuyer longtemps sur le bouton.</p>
      <button type="button" class="btn primary xl hold-adult"><span class="hold-fill"></span><span class="hold-txt">Un grand a vérifié (appui long)</span></button>
      <button type="button" class="link-btn adult-cancel">Pas encore</button>
    </div>`;
  document.body.appendChild(el);
  const b = el.querySelector('.hold-adult');
  let timer = null;
  const start = (e) => { e.preventDefault(); b.classList.add('holding'); timer = setTimeout(() => { el.remove(); celebrate(type, slotId); }, 2000); };
  const cancel = () => { b.classList.remove('holding'); clearTimeout(timer); };
  b.addEventListener('pointerdown', start);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, cancel));
  el.querySelector('.adult-cancel').addEventListener('click', () => el.remove());
}

/** Bouton « C'est fait ! » touché par l'enfant. */
export function childDone(type, slotId) {
  if (doneToday(slotId)) { speak('Déjà fait ! Bravo encore.'); return; }
  if (type === 'dents') return go('brush', { slotId });
  if (ctx.s.rewards.adult) return askAdult(type, slotId);
  celebrate(type, slotId);
}

// ---------- Minuteur de brossage (2 minutes, quatre coins de la bouche) ----------
const ZONES = ['En haut, à droite', 'En haut, à gauche', 'En bas, à gauche', 'En bas, à droite'];
const BRUSH_SEC = 120, CAN_FINISH = 90;
let brushTimer = null;
ctx.screens.brush = {
  render(p) {
    const sc = sceneFor('dents');
    return `<div class="screen child brush" style="background:#E8F2FB">
      <button type="button" class="link-btn brush-later" data-act="brush-stop" data-back="${p.back || 'home'}">${icon(ICONS.back, 22)}Plus tard</button>
      <div class="brush-main">
        <div class="ch-animal">${animalSVG('castor', { size: 300, cls: 'brushing', label: 'Castor' })}${sc.html}</div>
        <div class="brush-side">
          <svg class="brush-ring" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="bg"/><circle cx="60" cy="60" r="52" class="fg" id="brush-arc"/></svg>
          <span class="brush-time" id="brush-time">2:00</span>
          <span class="brush-zone" id="brush-zone">${ZONES[0]}</span>
          <span class="muted">Brosse, brosse, petits cercles…</span>
          <button type="button" class="mid-btn light" id="brush-done" data-act="brush-done" data-v="${esc(p.slotId || '')}" data-back="${p.back || 'home'}" disabled>${icon(ICONS.check, 30)}J'ai fini !</button>
        </div>
      </div>
    </div>`;
  },
  mount(el, p) {
    const start = Date.now();
    const arc = el.querySelector('#brush-arc'), tm = el.querySelector('#brush-time'), zone = el.querySelector('#brush-zone'), done = el.querySelector('#brush-done');
    const L = 2 * Math.PI * 52;
    arc.style.strokeDasharray = L;
    try { startBed('boite', ctx.s.sound.cap); } catch (e) { /* pas de son */ }
    let lastZone = 0;
    clearInterval(brushTimer);
    const tick = () => {
      const t = Math.min(BRUSH_SEC, (Date.now() - start) / 1000);
      const left = Math.ceil(BRUSH_SEC - t);
      tm.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
      arc.style.strokeDashoffset = L * (1 - t / BRUSH_SEC);
      const z = Math.min(3, Math.floor(t / 30));
      if (z !== lastZone) { lastZone = z; zone.textContent = ZONES[z]; speak(ZONES[z]); }
      if (t >= CAN_FINISH) done.disabled = false;
      if (t >= BRUSH_SEC) { clearInterval(brushTimer); stopBed(2); finishBrush(p.slotId, p.back); }
    };
    tick();
    brushTimer = setInterval(tick, 500);
    setTimeout(() => speak('On brosse en haut, à droite.'), 400);
  },
  unmount() { clearInterval(brushTimer); stopBed(1); },
};
function finishBrush(slotId, back) {
  if (back && back !== 'home') { go(back); celebrate('dents', '', { preview: true }); return; }
  go('home');
  if (ctx.s.rewards.adult) askAdult('dents', slotId); else celebrate('dents', slotId);
}
ctx.actions['brush-stop'] = (b) => go(b.dataset.back || 'home');
ctx.actions['brush-done'] = (b) => { clearInterval(brushTimer); finishBrush(b.dataset.v, b.dataset.back); };
ctx.actions['child-done'] = (b) => childDone(b.dataset.type, b.dataset.slot);

