// Horloge intelligente : quel créneau de la journée est en cours ?
import { CLOCK_TYPES } from './data.js';

const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6;

/** Créneaux d'une journée donnée, triés : réveil (selon semaine / week-end), sieste, et ceux du parent. */
export function daySlots(s, date = new Date()) {
  const wake = isWeekend(date) ? s.schedule.wakeWeekend : s.schedule.wakeWeek;
  const list = [{ id: 'wake', type: 'reveil', time: wake, fixed: 'wake' }];
  if (s.schedule.nap.on) list.push({ id: 'nap', type: 'sieste', time: s.schedule.nap.start, fixed: 'nap' });
  // Le week-end, si le réveil est plus tard, les moments du matin sont décalés d'autant.
  const delta = toMin(wake) - toMin(s.schedule.wakeWeek);
  const fmt = (m) => `${Math.floor(m / 60) % 24}:${String(m % 60).padStart(2, '0')}`;
  for (const sl of s.clock.slots) {
    let m = toMin(sl.time);
    if (delta && m < 12 * 60 && sl.type !== 'dodo') m += delta;
    // Rien avant le réveil : la nuit dure jusqu'à l'heure du réveil.
    if (m <= toMin(wake) && sl.type !== 'dodo') continue;
    list.push({ ...sl, time: fmt(m) });
  }
  // Après la sieste, retour au jeu par défaut si rien n'est prévu juste après.
  if (s.schedule.nap.on) {
    const end = toMin(s.schedule.nap.start) + s.schedule.nap.dur;
    const after = list.filter((x) => toMin(x.time) > toMin(s.schedule.nap.start) && toMin(x.time) <= end + 5);
    if (!after.length) {
      const h = Math.floor(end / 60) % 24, m = end % 60;
      list.push({ id: 'napend', type: 'jeu', time: `${h}:${String(m).padStart(2, '0')}`, fixed: 'napend' });
    }
  }
  return list
    .map((x) => ({ ...x, min: toMin(x.time), info: CLOCK_TYPES[x.type] || CLOCK_TYPES.jeu }))
    .sort((a, b) => a.min - b.min);
}

/**
 * Créneau en cours à l'instant `now`.
 * Avant le premier créneau du jour (ex. 5 h du matin), on est encore dans le dernier créneau de la veille (dodo).
 */
export function currentSlot(s, now = new Date()) {
  const today = daySlots(s, now);
  const t = now.getHours() * 60 + now.getMinutes();
  let idx = -1;
  for (let i = 0; i < today.length; i++) if (today[i].min <= t) idx = i;
  let cur, start, next, nextStart;
  if (idx === -1) {
    const yest = new Date(now); yest.setDate(now.getDate() - 1);
    const y = daySlots(s, yest);
    cur = y[y.length - 1];
    start = cur.min - 1440;
    next = today[0]; nextStart = today[0].min;
  } else {
    cur = today[idx];
    start = cur.min;
    if (idx + 1 < today.length) { next = today[idx + 1]; nextStart = next.min; }
    else {
      const tom = new Date(now); tom.setDate(now.getDate() + 1);
      next = daySlots(s, tom)[0]; nextStart = next.min + 1440;
    }
  }
  const progress = Math.max(0, Math.min(1, (t - start) / Math.max(1, nextStart - start)));
  return { cur, next, today, idx, progress, minutesLeft: nextStart - t };
}

/** Heure (ms) à laquelle la période de sommeil en cours a commencé. */
export function sleepStartedAt(s, now = new Date()) {
  const { cur, today } = currentSlot(s, now);
  const t = now.getHours() * 60 + now.getMinutes();
  const d = new Date(now);
  if (t < today[0].min) d.setDate(d.getDate() - 1);
  d.setHours(Math.floor(cur.min / 60), cur.min % 60, 0, 0);
  return d.getTime();
}

/** Vrai pendant la période de sommeil de la nuit (du créneau « dodo » jusqu'au réveil). */
export function isSleepTime(s, now = new Date()) {
  if (!s.clock.on) return false;
  return currentSlot(s, now).cur.type === 'dodo';
}
