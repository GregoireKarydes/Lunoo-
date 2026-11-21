// Sons générés par la tablette (aucun fichier à télécharger).
// Deux canaux : l'ambiance du soir (bruit blanc, pluie…) et l'ambiance d'une histoire, jouée très bas sous la voix.
// Le volume est plafonné et le son s'arrête tout seul.

let ctx = null;

export function audioContext() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

const buffers = {};
function noiseBuffer(ac, kind) {
  if (buffers[kind]) return buffers[kind];
  const len = ac.sampleRate * 4;
  const buf = ac.createBuffer(2, len, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'white') d[i] = w * 0.5;
      else if (kind === 'pink') {
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
      } else { // brown
        last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5;
      }
    }
  }
  buffers[kind] = buf;
  return buf;
}

// Un canal = un gain maître + la liste de ce qu'il faut arrêter.
function channel(ac, level) {
  const out = ac.createGain();
  out.gain.setValueAtTime(0, ac.currentTime);
  out.gain.linearRampToValueAtTime(level, ac.currentTime + 3);
  out.connect(ac.destination);
  return { out, nodes: [], alive: true };
}

function loopSource(ac, ch, kind) {
  const s = ac.createBufferSource();
  s.buffer = noiseBuffer(ac, kind); s.loop = true; s.start();
  ch.nodes.push(s);
  return s;
}

function filter(ac, type, freq, q) {
  const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
  return f;
}

function lfo(ac, ch, freq, depth, target, base) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.frequency.value = freq; g.gain.value = depth;
  target.value = base;
  o.connect(g); g.connect(target); o.start();
  ch.nodes.push(o);
}

// Événements ponctuels (grillons, crépitements, notes) : relancés à intervalle irrégulier.
function every(ch, minMs, maxMs, fn) {
  let t = null;
  const loop = () => { if (!ch.alive) return; fn(); t = setTimeout(loop, minMs + Math.random() * (maxMs - minMs)); };
  t = setTimeout(loop, minMs);
  ch.nodes.push({ stop: () => clearTimeout(t), disconnect() {} });
}

function blip(ac, out, freq, start, dur, vol, type = 'sine') {
  const o = ac.createOscillator(); const g = ac.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, start); g.gain.linearRampToValueAtTime(vol, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0005, start + dur);
  o.connect(g); g.connect(out); o.start(start); o.stop(start + dur + 0.05);
}

function build(type, ac, ch) {
  const out = ch.out;
  if (type === 'blanc') {
    loopSource(ac, ch, 'white').connect(filter(ac, 'lowpass', 9000)).connect(out);
  } else if (type === 'rose') {
    loopSource(ac, ch, 'pink').connect(out);
  } else if (type === 'pluie') {
    const g = ac.createGain();
    loopSource(ac, ch, 'pink').connect(filter(ac, 'bandpass', 2500, 0.4)).connect(g).connect(out);
    lfo(ac, ch, 0.13, 0.12, g.gain, 0.9);
    const lg = ac.createGain(); lg.gain.value = 0.6;
    loopSource(ac, ch, 'brown').connect(filter(ac, 'lowpass', 400)).connect(lg).connect(out);
  } else if (type === 'vagues') {
    const f = filter(ac, 'lowpass', 900);
    const g = ac.createGain();
    loopSource(ac, ch, 'pink').connect(f).connect(g).connect(out);
    lfo(ac, ch, 0.09, 0.45, g.gain, 0.55);
    lfo(ac, ch, 0.09, 500, f.frequency, 900);
  } else if (type === 'ronron') {
    const g = ac.createGain();
    const breath = ac.createGain();
    loopSource(ac, ch, 'brown').connect(filter(ac, 'lowpass', 260)).connect(g).connect(breath).connect(out);
    lfo(ac, ch, 24, 0.35, g.gain, 0.6);
    lfo(ac, ch, 0.28, 0.4, breath.gain, 0.6);
  } else if (type === 'coeur') {
    const g = ac.createGain(); g.gain.value = 0; g.connect(out);
    const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = 52; o.connect(g); o.start();
    ch.nodes.push(o);
    every(ch, 968, 968, () => {
      const t = ac.currentTime + 0.05;
      [0, 0.28].forEach((dt, i) => {
        g.gain.setValueAtTime(0, t + dt);
        g.gain.linearRampToValueAtTime(i ? 0.6 : 0.9, t + dt + 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.22);
      });
    });
  } else if (type === 'vent') {
    const f = filter(ac, 'bandpass', 500, 0.8);
    const g = ac.createGain();
    loopSource(ac, ch, 'pink').connect(f).connect(g).connect(out);
    lfo(ac, ch, 0.06, 280, f.frequency, 560);
    lfo(ac, ch, 0.11, 0.35, g.gain, 0.7);
  } else if (type === 'ruisseau') {
    const g = ac.createGain();
    loopSource(ac, ch, 'white').connect(filter(ac, 'bandpass', 1800, 1.2)).connect(g).connect(out);
    lfo(ac, ch, 3.1, 0.18, g.gain, 0.45);
    const g2 = ac.createGain();
    loopSource(ac, ch, 'pink').connect(filter(ac, 'bandpass', 3600, 2)).connect(g2).connect(out);
    lfo(ac, ch, 5.3, 0.12, g2.gain, 0.25);
  } else if (type === 'feu') {
    const lg = ac.createGain(); lg.gain.value = 0.7;
    loopSource(ac, ch, 'brown').connect(filter(ac, 'lowpass', 500)).connect(lg).connect(out);
    every(ch, 60, 420, () => { // crépitements
      const s = ac.createBufferSource(); s.buffer = noiseBuffer(ac, 'white');
      const g = ac.createGain(); const t = ac.currentTime;
      g.gain.setValueAtTime(0.5 + Math.random() * 0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.02 + Math.random() * 0.04);
      s.connect(filter(ac, 'highpass', 1500 + Math.random() * 2500)).connect(g).connect(out);
      s.start(t, Math.random() * 3); s.stop(t + 0.08);
    });
  } else if (type === 'nuit' || type === 'foret') {
    const lg = ac.createGain(); lg.gain.value = type === 'foret' ? 0.5 : 0.3;
    const f = filter(ac, 'bandpass', 600, 0.7);
    loopSource(ac, ch, 'pink').connect(f).connect(lg).connect(out);
    lfo(ac, ch, 0.07, 200, f.frequency, 600);
    if (type === 'nuit') { // grillons
      every(ch, 900, 2200, () => {
        const t = ac.currentTime, fr = 4200 + Math.random() * 500;
        for (let i = 0; i < 3; i++) blip(ac, out, fr, t + i * 0.06, 0.04, 0.025);
      });
    } else { // un hibou au loin
      every(ch, 9000, 16000, () => {
        const t = ac.currentTime;
        [0, 0.55].forEach((dt) => {
          const o = ac.createOscillator(); const g = ac.createGain();
          o.frequency.setValueAtTime(420, t + dt); o.frequency.linearRampToValueAtTime(360, t + dt + 0.4);
          g.gain.setValueAtTime(0, t + dt); g.gain.linearRampToValueAtTime(0.05, t + dt + 0.08);
          g.gain.exponentialRampToValueAtTime(0.0005, t + dt + 0.45);
          o.connect(g); g.connect(out); o.start(t + dt); o.stop(t + dt + 0.5);
        });
      });
    }
  } else if (type === 'boite') { // boîte à musique : notes pentatoniques lentes
    const notes = [1046.5, 1174.7, 1318.5, 1568, 1760, 2093];
    every(ch, 650, 1300, () => {
      const t = ac.currentTime;
      blip(ac, out, notes[Math.floor(Math.random() * notes.length)], t, 1.6, 0.07, 'triangle');
    });
  }
}

function stopChannel(ch, fadeSec) {
  if (!ch) return;
  ch.alive = false;
  const ac = audioContext();
  const end = () => { ch.nodes.forEach((n) => { try { n.stop(); } catch (e) {} try { n.disconnect(); } catch (e) {} }); try { ch.out.disconnect(); } catch (e) {} };
  if (!fadeSec) return end();
  ch.out.gain.cancelScheduledValues(ac.currentTime);
  ch.out.gain.setValueAtTime(ch.out.gain.value, ac.currentTime);
  ch.out.gain.linearRampToValueAtTime(0, ac.currentTime + fadeSec);
  setTimeout(end, fadeSec * 1000 + 100);
}

// ---------- Ambiance du soir ----------
let amb = null;
let stopTimer = null;

/**
 * Lance une ambiance.
 * @param {object} s réglages son { type, vol, cap, dur, fade }
 */
export function startAmbience(s) {
  stopAmbience(true);
  if (!s || s.type === 'aucun') return;
  const ac = audioContext();
  amb = channel(ac, Math.min(s.vol, s.cap) / 100 * 0.7);
  build(s.type, ac, amb);
  if (s.dur > 0) stopTimer = setTimeout(() => stopAmbience(false, s.fade ? 180 : 2), s.dur * 60000);
}

export function setAmbienceVolume(s) {
  if (!amb) return;
  const ac = audioContext();
  amb.out.gain.linearRampToValueAtTime(Math.min(s.vol, s.cap) / 100 * 0.7, ac.currentTime + 0.3);
}

export function stopAmbience(immediate = false, fadeSec = 3) {
  clearTimeout(stopTimer); stopTimer = null;
  const ch = amb; amb = null;
  stopChannel(ch, immediate ? 0 : fadeSec);
}

export function ambiencePlaying() { return !!amb; }

// ---------- Ambiance d'une histoire (sous la voix) ----------
let bed = null;
let bedMuted = false; // coupée par un parent : reste coupée pour les histoires suivantes de la soirée
export function setBedMuted(v) { bedMuted = !!v; }
export function startBed(type, cap = 40) {
  stopBed(0);
  if (!type || bedMuted) return;
  const ac = audioContext();
  bed = channel(ac, Math.min(cap, 40) / 100 * 0.35);
  build(type, ac, bed);
}
export function stopBed(fadeSec = 3) { const ch = bed; bed = null; stopChannel(ch, fadeSec); }
export function bedPlaying() { return !!bed; }

// ---------- Petits sons ----------
// Petit carillon doux (réveil ou passage d'un moment), désactivable.
export function chime() {
  const ac = audioContext();
  [523.25, 659.25, 783.99].forEach((f, i) => blip(ac, ac.destination, f, ac.currentTime + i * 0.25, 1.6, 0.08));
}

// Petit « pop » court, au toucher de l'animal (une note qui monte, sans bruit fort).
export function pop() {
  const ac = audioContext();
  const o = ac.createOscillator(); const g = ac.createGain();
  o.type = 'sine';
  const t = ac.currentTime;
  o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(980, t + 0.16);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.07, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 0.25);
}

// Petite fanfare joyeuse pour « C'est fait ! » (douce, pas de son fort).
export function fanfare() {
  const ac = audioContext(), t = ac.currentTime;
  [[523.25, 0], [659.25, 0.12], [783.99, 0.24], [1046.5, 0.4]].forEach(([f, dt]) => blip(ac, ac.destination, f, t + dt, dt === 0.4 ? 1.2 : 0.35, 0.09, 'triangle'));
}
