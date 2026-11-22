// Studio voix : enregistrer une histoire page par page avec sa propre voix.
import { ctx, esc, go, save } from './ctx.js';
import { BUILTIN_STORIES, storyPage, ICONS } from './data.js';
import { icon } from './animal.js';
import { audio } from './store.js';
import { recKey } from './narrator.js';
import { audioContext } from './sound.js';
import { toast, ask } from './ui.js';
import { isApple, remoteStudioDone } from './voix.js';

let st = null; // { story, page, takes: Blob[], voice, stream, rec, chunks, analyser, raf, recording, startAt, audioEl }

function pickMime() {
  // Sur Apple, le MP4 (AAC) est lu par toutes les tablettes, même les vieux iPad.
  const types = isApple() ? ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'] : ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'];
  for (const t of types) if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) return t;
  return '';
}

ctx.screens['p-studio'] = {
  render(p) {
    const story = BUILTIN_STORIES.find((s) => s.id === p.id);
    if (!story) return '<div class="screen"></div>';
    if (!st || st.story.id !== story.id) st = { story, page: 0, takes: [], voice: ctx.remote ? ctx.remote.voice : ((ctx.s.recordings[story.id] || {}).voice || '') };
    const pages = story.pages, i = st.page, child = ctx.s.child;
    const hl = (t) => esc(storyPage(t, child))
      .replace(new RegExp(esc(child.name), 'g'), `<mark class="m-name">${esc(child.name)}</mark>`);
    const done = st.takes.filter(Boolean).length;
    return `<div class="screen studio">
      <div class="studio-top">
        <button type="button" class="round-btn dark" data-act="studio-close" aria-label="Fermer le studio">${icon(ICONS.close, 22)}</button>
        <div class="grow"><span class="studio-kicker">Studio voix</span><span class="studio-title">${esc(storyPage(story.title, child))}</span></div>
        <button type="button" class="pill" data-act="studio-voice">${icon(ICONS.user, 18)}Voix : ${esc(st.voice || 'à préciser')}</button>
        <span class="pill" id="mic-state"><span class="dot-live"></span>Micro</span>
      </div>
      <div class="studio-main">
        <div class="pages" aria-label="Pages de l'histoire">
          <span class="muted-light small">${done} sur ${pages.length} faites</span>
          ${pages.map((_, k) => `<button type="button" class="page-btn ${k === i ? 'cur' : ''}" data-act="studio-page" data-v="${k}"><span>Page ${k + 1}</span><span class="${st.takes[k] ? 'ok' : ''}">${st.takes[k] ? '✓' : (k === i ? '●' : '—')}</span></button>`).join('')}
        </div>
        <div class="prompter">
          ${i > 0 ? `<p class="prev">${hl(pages[i - 1])}</p>` : ''}
          <p class="cur">${hl(pages[i])}</p>
          <span class="muted-light small">Astuce : lisez lentement, à voix basse, comme au bord du lit.</span>
        </div>
        <div class="vu" aria-label="Niveau du micro"><span class="muted-light tiny">Niveau</span><div class="vu-bars" id="vu">${Array.from({ length: 12 }, () => '<span></span>').join('')}</div></div>
      </div>
      <div class="studio-bottom">
        <canvas id="wave" class="wave" height="54" aria-hidden="true"></canvas>
        <div class="transport">
          <span class="timer" id="timer">0:00</span>
          <span class="rec-status" id="rec-status">${st.takes[i] ? 'Page enregistrée' : 'Prêt'}</span>
          <span class="grow"></span>
          <button type="button" class="btn studio-ghost" data-act="studio-listen" ${st.takes[i] ? '' : 'disabled'}>${icon(ICONS.play, 20)}Réécouter</button>
          <button type="button" class="rec-btn" id="rec-btn" data-act="studio-rec" aria-label="Enregistrer"><span></span></button>
          ${i < pages.length - 1
            ? `<button type="button" class="btn primary" data-act="studio-next" ${st.takes[i] ? '' : 'disabled'}>Page suivante</button>`
            : `<button type="button" class="btn primary" data-act="studio-save" ${done === pages.length ? '' : 'disabled'}>Terminer</button>`}
        </div>
      </div>
    </div>`;
  },
  async mount() {
    if (!st) return;
    if (!st.voice) setTimeout(() => ctx.actions['studio-voice'](), 300);
    if (!st.stream) {
      try {
        st.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      } catch (e) {
        const m = document.getElementById('mic-state'); if (m) m.textContent = 'Micro refusé';
        toast('Autorisez le micro dans les réglages du navigateur pour enregistrer.');
        return;
      }
    }
    if (!st.analyser) {
      const ac = audioContext();
      const src = ac.createMediaStreamSource(st.stream);
      st.analyser = ac.createAnalyser(); st.analyser.fftSize = 1024;
      src.connect(st.analyser);
    }
    drawLoop();
  },
  unmount() { cancelAnimationFrame(st && st.raf); },
};

const levels = [];
function drawLoop() {
  const an = st && st.analyser; if (!an) return;
  const data = new Uint8Array(an.fftSize);
  const vu = document.querySelectorAll('#vu span');
  const cv = document.getElementById('wave');
  const timer = document.getElementById('timer');
  if (!cv) return;
  const g = cv.getContext('2d');
  cv.width = cv.clientWidth * (window.devicePixelRatio || 1);
  const loop = () => {
    if (!document.getElementById('wave')) return;
    an.getByteTimeDomainData(data);
    let peak = 0; for (const v of data) peak = Math.max(peak, Math.abs(v - 128) / 128);
    const lvl = Math.min(12, Math.round(peak * 24));
    vu.forEach((b, k) => { b.className = k < lvl ? (k > 9 ? 'r' : k > 7 ? 'y' : 'g') : ''; });
    if (st.recording) {
      levels.push(peak);
      const s = Math.floor((Date.now() - st.startAt) / 1000);
      timer.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    }
    const w = cv.width, h = cv.height, n = 120, bw = w / n;
    g.clearRect(0, 0, w, h);
    const recent = levels.slice(-n);
    recent.forEach((v, k) => {
      const bh = Math.max(3, v * h * 1.6);
      g.fillStyle = st.recording && k > recent.length - 8 ? '#F08A80' : '#8C84D9';
      g.fillRect(k * bw + 1, (h - bh) / 2, bw - 2, Math.min(h, bh));
    });
    st.raf = requestAnimationFrame(loop);
  };
  loop();
}

function setRecUI(on) {
  const b = document.getElementById('rec-btn'), s = document.getElementById('rec-status');
  if (b) { b.classList.toggle('on', on); b.setAttribute('aria-label', on ? 'Arrêter l’enregistrement' : 'Enregistrer'); }
  if (s) { s.textContent = on ? '● Enregistrement…' : 'En pause'; s.classList.toggle('live', on); }
}

ctx.actions['studio-rec'] = () => {
  if (!st || !st.stream) { toast('Le micro n’est pas disponible.'); return; }
  if (st.recording) { st.rec.stop(); return; }
  if (!window.MediaRecorder) { toast('Cette tablette ne peut pas enregistrer : passez par Histoires › Voix d’un proche.'); return; }
  levels.length = 0;
  const mime = pickMime();
  st.rec = new MediaRecorder(st.stream, mime ? { mimeType: mime } : undefined);
  st.chunks = [];
  st.rec.ondataavailable = (e) => { if (e.data.size) st.chunks.push(e.data); };
  st.rec.onstop = () => {
    st.recording = false;
    st.takes[st.page] = new Blob(st.chunks, { type: st.rec.mimeType || 'audio/webm' });
    setRecUI(false);
    go('p-studio', { id: st.story.id });
  };
  st.rec.start();
  st.recording = true; st.startAt = Date.now();
  setRecUI(true);
};

ctx.actions['studio-listen'] = () => {
  const blob = st && st.takes[st.page]; if (!blob) return;
  if (st.audioEl) st.audioEl.pause();
  st.audioEl = new Audio(URL.createObjectURL(blob));
  st.audioEl.play();
};
ctx.actions['studio-page'] = (b) => { if (st.recording) return; st.page = Number(b.dataset.v); go('p-studio', { id: st.story.id }); };
ctx.actions['studio-next'] = () => { if (st.recording) return; st.page = Math.min(st.story.pages.length - 1, st.page + 1); go('p-studio', { id: st.story.id }); };
ctx.actions['studio-voice'] = async () => {
  const v = await ask('Qui raconte cette histoire ?', st.voice || '', 'Maman, Papa, Mamie…');
  if (v) { st.voice = v; go('p-studio', { id: st.story.id }); }
};
ctx.actions['studio-save'] = async () => {
  if (ctx.remote) {
    const story = st.story, takes = st.takes.slice();
    ctx.remote.voice = st.voice || ctx.remote.voice;
    stopStudio();
    remoteStudioDone(story, takes);
    return;
  }
  const id = st.story.id;
  for (let k = 0; k < st.takes.length; k++) if (st.takes[k]) await audio.set(recKey(id, k), st.takes[k]);
  ctx.s.recordings[id] = { voice: st.voice || 'Famille', pages: st.story.pages.length, date: new Date().toISOString() };
  await save();
  toast('Histoire enregistrée !');
  closeStudio();
};
function stopStudio() {
  if (st && st.stream) st.stream.getTracks().forEach((t) => t.stop());
  if (st) cancelAnimationFrame(st.raf);
  st = null;
}
function closeStudio() {
  stopStudio();
  go(ctx.remote ? 'rv-pick' : 'p-stories');
}
ctx.actions['studio-close'] = () => {
  if (st && st.recording) st.rec.stop();
  closeStudio();
};
