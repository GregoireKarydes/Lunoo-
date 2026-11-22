// Glisser-déposer des moments de la journée, au doigt comme à la souris (pointer events).
// Une liste <div data-reorder="nom"> contient des lignes [data-row="id"] ; on attrape une ligne
// par sa poignée [data-drag]. Au lâcher : ctx.reorders[nom](id, idAvant, idAprès).
// Clavier : flèches haut / bas sur la poignée.
import { ctx } from './ctx.js';

ctx.reorders = ctx.reorders || {};

const rowsOf = (list) => [...list.querySelectorAll(':scope > [data-row]')];

function scrollParent(el) {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY;
    if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight) return p;
  }
  return document.scrollingElement || document.documentElement;
}

function drop(list, row, prev, next) {
  const fn = ctx.reorders[list.dataset.reorder];
  const id = row.dataset.row;
  if (fn) fn(id, prev ? prev.dataset.row : null, next ? next.dataset.row : null);
  // Après le nouveau rendu, la poignée du moment déplacé garde le focus (clavier).
  return id;
}

let drag = null;

document.addEventListener('pointerdown', (e) => {
  const h = e.target.closest('[data-drag]');
  if (!h || drag) return;
  const row = h.closest('[data-row]'), list = row && row.parentElement;
  if (!list || !list.dataset.reorder) return;
  e.preventDefault();
  try { h.setPointerCapture(e.pointerId); } catch (err) { /* ignoré */ }
  const rows = rowsOf(list);
  const idx = rows.indexOf(row);
  const rects = rows.map((r) => r.getBoundingClientRect());
  const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
  const sp = scrollParent(list);
  drag = { h, row, list, rows, idx, rects, step: rects[idx].height + gap, y0: e.clientY, y: e.clientY, s0: sp.scrollTop, sp, target: idx, id: e.pointerId };
  row.classList.add('dragging');
  list.classList.add('sorting');
  if (navigator.vibrate) navigator.vibrate(15);
  drag.raf = requestAnimationFrame(tick);
});

function layout() {
  const d = drag;
  const dy = d.y - d.y0 + (d.sp.scrollTop - d.s0);
  d.row.style.transform = `translateY(${dy}px)`;
  const cy = d.rects[d.idx].top + d.rects[d.idx].height / 2 + dy;
  // Nouvelle place : le nombre d'autres lignes dont le milieu est au-dessus du doigt.
  let target = 0;
  d.rows.forEach((r, i) => { if (i !== d.idx && d.rects[i].top + d.rects[i].height / 2 < cy) target++; });
  // Une ligne sans poignée en tête de liste (le réveil) reste en tête.
  const firstLocked = d.rows[0] !== d.row && !d.rows[0].querySelector('[data-drag]');
  if (firstLocked) target = Math.max(1, target);
  d.target = target;
  d.rows.forEach((r, i) => {
    if (i === d.idx) return;
    let shift = 0;
    if (i > d.idx && i <= target) shift = -d.step;
    if (i < d.idx && i >= target) shift = d.step;
    r.style.transform = shift ? `translateY(${shift}px)` : '';
  });
}

// Défilement automatique près des bords, puis mise en place des lignes.
function tick() {
  if (!drag) return;
  const r = drag.sp === document.scrollingElement ? { top: 0, bottom: innerHeight } : drag.sp.getBoundingClientRect();
  const edge = 70;
  if (drag.y < r.top + edge) drag.sp.scrollTop -= Math.ceil((r.top + edge - drag.y) / 6);
  else if (drag.y > r.bottom - edge) drag.sp.scrollTop += Math.ceil((drag.y - (r.bottom - edge)) / 6);
  layout();
  drag.raf = requestAnimationFrame(tick);
}

document.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  e.preventDefault();
  drag.y = e.clientY;
}, { passive: false });

function end(e, cancel) {
  if (!drag || (e && e.pointerId !== drag.id)) return;
  const d = drag; drag = null;
  cancelAnimationFrame(d.raf);
  d.rows.forEach((r) => { r.style.transform = ''; });
  d.row.classList.remove('dragging');
  d.list.classList.remove('sorting');
  if (cancel || d.target === d.idx) return;
  const order = d.rows.filter((r) => r !== d.row);
  order.splice(d.target, 0, d.row);
  const id = drop(d.list, d.row, order[d.target - 1], order[d.target + 1]);
  refocus(id, false);
}
document.addEventListener('pointerup', (e) => end(e, false));
document.addEventListener('pointercancel', (e) => end(e, true));

function refocus(id, focus) {
  requestAnimationFrame(() => {
    const row = document.querySelector(`[data-row="${CSS.escape(id)}"]`);
    if (!row) return;
    row.classList.add('just-moved');
    setTimeout(() => row.classList.remove('just-moved'), 900);
    if (focus) { const h = row.querySelector('[data-drag]'); if (h) h.focus(); }
  });
}

document.addEventListener('keydown', (e) => {
  const h = e.target.closest && e.target.closest('[data-drag]');
  if (!h || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
  const row = h.closest('[data-row]'), list = row.parentElement;
  e.preventDefault();
  const order = rowsOf(list).filter((r) => r !== row);
  let i = rowsOf(list).indexOf(row) + (e.key === 'ArrowUp' ? -1 : 1);
  const firstLocked = !order[0].querySelector('[data-drag]');
  i = Math.max(firstLocked ? 1 : 0, Math.min(order.length, i));
  order.splice(i, 0, row);
  refocus(drop(list, row, order[i - 1], order[i + 1]), true);
});
