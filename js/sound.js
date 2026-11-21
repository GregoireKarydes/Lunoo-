// Sons d'ambiance générés par la tablette (aucun fichier à télécharger).
// Le volume est plafonné et le son s'arrête tout seul.

let ctx = null;
let master = null;
let nodes = [];
let stopTimer = null;

export function audioContext() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function noiseBuffer(ac, kind) {
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
  return buf;
}

function loopSource(ac, buf) {
  const s = ac.createBufferSource();
  s.buffer = buf; s.loop = true; s.start();
  nodes.push(s);
  return s;
}

function lfo(ac, freq, depth, target, base) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.frequency.value = freq; g.gain.value = depth;
  target.value = base;
  o.connect(g); g.connect(target); o.start();
  nodes.push(o);
}

function build(type, ac, out) {
  if (type === 'blanc') {
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 9000;
    loopSource(ac, noiseBuffer(ac, 'white')).connect(f); f.connect(out);
  } else if (type === 'rose') {
    loopSource(ac, noiseBuffer(ac, 'pink')).connect(out);
  } else if (type === 'pluie') {
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2500; f.Q.value = 0.4;
    const g = ac.createGain();
    loopSource(ac, noiseBuffer(ac, 'pink')).connect(f); f.connect(g); g.connect(out);
    lfo(ac, 0.13, 0.12, g.gain, 0.9);
    const low = ac.createBiquadFilter(); low.type = 'lowpass'; low.frequency.value = 400;
    const lg = ac.createGain(); lg.gain.value = 0.6;
    loopSource(ac, noiseBuffer(ac, 'brown')).connect(low); low.connect(lg); lg.connect(out);
  } else if (type === 'vagues') {
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    const g = ac.createGain();
    loopSource(ac, noiseBuffer(ac, 'pink')).connect(f); f.connect(g); g.connect(out);
    lfo(ac, 0.09, 0.45, g.gain, 0.55);
    lfo(ac, 0.09, 500, f.frequency, 900);
  } else if (type === 'ronron') {
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260;
    const g = ac.createGain();
    loopSource(ac, noiseBuffer(ac, 'brown')).connect(f); f.connect(g); g.connect(out);
    lfo(ac, 24, 0.35, g.gain, 0.6);
    const breath = ac.createGain(); g.disconnect(); g.connect(breath); breath.connect(out);
    lfo(ac, 0.28, 0.4, breath.gain, 0.6);
  } else if (type === 'coeur') {
    const g = ac.createGain(); g.gain.value = 0; g.connect(out);
    const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = 52; o.connect(g); o.start();
    nodes.push(o);
    const beat = () => {
      if (!master) return;
      const t = ac.currentTime + 0.05;
      [0, 0.28].forEach((dt, i) => {
        g.gain.setValueAtTime(0, t + dt);
        g.gain.linearRampToValueAtTime(i ? 0.6 : 0.9, t + dt + 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.22);
      });
    };
    beat();
    const iv = setInterval(beat, 60000 / 62);
    nodes.push({ stop: () => clearInterval(iv), disconnect() {} });
  }
}

/**
 * Lance une ambiance.
 * @param {object} s réglages son { type, vol, cap, dur, fade }
 */
export function startAmbience(s) {
  stopAmbience(true);
  if (!s || s.type === 'aucun') return;
  const ac = audioContext();
  master = ac.createGain();
  const vol = Math.min(s.vol, s.cap) / 100;
  master.gain.setValueAtTime(0, ac.currentTime);
  master.gain.linearRampToValueAtTime(vol * 0.7, ac.currentTime + 3);
  master.connect(ac.destination);
  build(s.type, ac, master);
  if (s.dur > 0) {
    stopTimer = setTimeout(() => stopAmbience(false, s.fade ? 180 : 2), s.dur * 60000);
  }
}

export function setAmbienceVolume(s) {
  if (!master) return;
  const ac = audioContext();
  master.gain.linearRampToValueAtTime(Math.min(s.vol, s.cap) / 100 * 0.7, ac.currentTime + 0.3);
}

export function stopAmbience(immediate = false, fadeSec = 3) {
  clearTimeout(stopTimer); stopTimer = null;
  if (!master) return;
  const m = master, ns = nodes;
  master = null; nodes = [];
  const ac = audioContext();
  const end = () => { ns.forEach((n) => { try { n.stop(); } catch (e) {} try { n.disconnect(); } catch (e) {} }); try { m.disconnect(); } catch (e) {} };
  if (immediate) return end();
  m.gain.cancelScheduledValues(ac.currentTime);
  m.gain.setValueAtTime(m.gain.value, ac.currentTime);
  m.gain.linearRampToValueAtTime(0, ac.currentTime + fadeSec);
  setTimeout(end, fadeSec * 1000 + 100);
}

export function ambiencePlaying() { return !!master; }

// Petit carillon doux (réveil ou passage d'un moment), désactivable.
export function chime() {
  const ac = audioContext();
  [523.25, 659.25, 783.99].forEach((f, i) => {
    const o = ac.createOscillator(); const g = ac.createGain();
    o.type = 'sine'; o.frequency.value = f;
    const t = ac.currentTime + i * 0.25;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.08, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 1.7);
  });
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
