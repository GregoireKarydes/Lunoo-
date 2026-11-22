// Voix d'un proche : enregistrer une histoire sur un autre téléphone et l'envoyer à la tablette.
// Utile surtout pour les vieilles tablettes qui ne savent pas enregistrer (iPad sous iOS 12),
// et pour les grands-parents qui habitent loin.
//
// Côté tablette : écran « p-voix » (envoyer le lien, puis importer le fichier reçu).
// Côté téléphone : le lien ouvre Lunoo en « mode enregistreur » (#voix=Prénom) : rien n'est enregistré
// sur le téléphone, on ne touche pas aux réglages d'un Lunoo déjà installé dessus.
// Le fichier échangé est un .txt (accepté partout par le partage) qui contient du JSON.
// Code lu aussi par Safari 12 : pas de ?. ni ??.
import { ctx, esc, go, render, save } from './ctx.js';
import { BUILTIN_STORIES, storyPage, storyMinutes, ICONS } from './data.js';
import { animalSVG, icon, moonSVG } from './animal.js';
import { audio } from './store.js';
import { recKey } from './narrator.js';
import { audioContext } from './sound.js';
import { parentLayout, toast, confirmBox } from './ui.js';

const FILE_KIND = 'lunoo-voix';

// ---------- Petits outils ----------

export const isApple = () => /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
const canRecord = () => !!(window.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

function appUrl() { return location.href.split('#')[0].split('?')[0]; }
export function recorderLink(childName) { return appUrl() + '#voix=' + encodeURIComponent(childName || ''); }

function slug(t) {
  return String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

// Sans fetch() : plus sûr sur les vieux Safari.
function dataUrlToBlob(dataUrl) {
  const i = dataUrl.indexOf(',');
  const type = (dataUrl.slice(5, i).split(';')[0]) || 'application/octet-stream';
  const bin = atob(dataUrl.slice(i + 1));
  const bytes = new Uint8Array(bin.length);
  for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
  return new Blob([bytes], { type });
}

// Les vieux iPad ne lisent pas le WebM (Android, Chrome) : on convertit en WAV mono 22 kHz.
// L'AAC/MP4 d'un iPhone est gardé tel quel (plus léger, lu partout).
function needsWav(blob) { return !(isApple() && /mp4|aac|mpeg/.test(blob.type)); }

async function toWav(blob) {
  const ac = audioContext();
  const data = await new Response(blob).arrayBuffer();
  const decoded = await new Promise((resolve, reject) => ac.decodeAudioData(data, resolve, reject));
  const rate = 22050;
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const off = new OAC(1, Math.max(1, Math.ceil(decoded.duration * rate)), rate);
  const src = off.createBufferSource();
  src.buffer = decoded; src.connect(off.destination); src.start(0);
  const out = await off.startRendering();
  const pcm = out.getChannelData(0);
  const buf = new ArrayBuffer(44 + pcm.length * 2), v = new DataView(buf);
  const str = (o, s) => { for (let k = 0; k < s.length; k++) v.setUint8(o + k, s.charCodeAt(k)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + pcm.length * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, pcm.length * 2, true);
  for (let k = 0; k < pcm.length; k++) { const x = Math.max(-1, Math.min(1, pcm[k])); v.setInt16(44 + k * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true); }
  return new Blob([buf], { type: 'audio/wav' });
}

async function buildVoiceFile(story, voice, childName, takes) {
  const pages = [];
  for (let k = 0; k < takes.length; k++) {
    const b = needsWav(takes[k]) ? await toWav(takes[k]) : takes[k];
    pages.push(await blobToDataUrl(b));
  }
  const data = { app: 'lunoo', kind: FILE_KIND, version: 1, date: new Date().toISOString(), storyId: story.id, title: storyPage(story.title, { name: childName }), voice, child: childName, pages };
  const name = `Lunoo - ${slug(voice) || 'voix'} - ${slug(storyPage(story.title, { name: childName }))}.txt`;
  return new File([JSON.stringify(data)], name, { type: 'text/plain' });
}

/** Ajoute à la tablette une voix reçue. Renvoie le titre de l'histoire, ou lance une erreur lisible. */
export async function importVoiceFile(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch (e) { throw new Error('Ce fichier n’est pas une voix Lunoo.'); }
  if (!data || data.app !== 'lunoo') throw new Error('Ce fichier n’est pas une voix Lunoo.');
  if (data.kind !== FILE_KIND) throw new Error('C’est une sauvegarde complète : importez-la dans Tablette › Code et sauvegarde.');
  const story = BUILTIN_STORIES.find((s) => s.id === data.storyId);
  if (!story || !Array.isArray(data.pages) || data.pages.length !== story.pages.length) {
    throw new Error('Cette histoire n’existe pas dans cette version de Lunoo. Mettez la tablette à jour.');
  }
  const title = storyPage(story.title, ctx.s.child);
  const old = ctx.s.recordings[story.id];
  if (old && !(await confirmBox(`« ${title} » a déjà la voix de ${old.voice}. La remplacer par celle de ${data.voice} ?`, 'Remplacer'))) return null;
  for (let k = 0; k < data.pages.length; k++) await audio.set(recKey(story.id, k), dataUrlToBlob(data.pages[k]));
  ctx.s.recordings[story.id] = { voice: data.voice || 'Famille', pages: data.pages.length, date: data.date || new Date().toISOString(), from: 'proche' };
  await save();
  return { title, voice: data.voice || 'Famille' };
}

function qrSvg(text, size) {
  if (!window.qrcode) return '';
  const q = window.qrcode(0, 'M');
  q.addData(text); q.make();
  const n = q.getModuleCount(), cell = size / (n + 8);
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${(c + 4) * cell} ${(r + 4) * cell}h${cell}v${cell}h-${cell}z`;
  return `<svg class="qr" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="QR code du lien"><rect width="${size}" height="${size}" fill="#fff"/><path d="${d}" fill="#1F2250" shape-rendering="crispEdges"/></svg>`;
}

function copyText(t) {
  if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
  const ta = document.createElement('textarea');
  ta.value = t; ta.setAttribute('readonly', ''); ta.style.position = 'absolute'; ta.style.left = '-9999px';
  document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, t.length);
  document.execCommand('copy'); ta.remove();
  return Promise.resolve();
}

const step = (n, title, body) => `<div class="voix-step"><span class="voix-n">${n}</span><div class="voix-step-body"><strong>${title}</strong>${body}</div></div>`;

// ================= Côté tablette =================

ctx.screens['p-voix'] = {
  render() {
    const name = ctx.s.child.name || 'votre enfant';
    const link = recorderLink(ctx.s.child.name);
    const fam = Object.keys(ctx.s.recordings).filter((id) => ctx.s.recordings[id].from === 'proche');
    const body = `<p class="lead muted">Un proche (papa, mamie, parrain…) enregistre une histoire sur <strong>son téléphone</strong>, puis vous l’envoie. ${esc(name)} l’écoutera ici, avec sa voix. Aucune application à installer, aucun compte.</p>
      <div class="voix-steps">
        ${step(1, 'Donnez le lien au proche', `
          <div class="voix-link">
            ${qrSvg(link, 168)}
            <div class="voix-link-txt">
              <span>À côté de vous ? Il <strong>vise ce carré avec l’appareil photo</strong> de son téléphone.</span>
              <span>Il habite loin ? Envoyez-lui le lien par SMS, WhatsApp ou mail :</span>
              <div class="pair"><button type="button" class="btn primary" data-act="voix-share">${icon(ICONS.upload, 20)}Envoyer le lien</button><button type="button" class="btn ghost sm" data-act="voix-copy">Copier</button></div>
            </div>
          </div>`)}
        ${step(2, 'Il enregistre sur son téléphone', `<span class="muted">Lunoo le guide : il choisit une histoire, la lit page par page, puis touche « Envoyer à la tablette » et vous l’envoie (AirDrop, SMS, WhatsApp, mail…). Comptez quelques minutes.</span>`)}
        ${step(3, 'Vous recevez un fichier : ajoutez-le ici', `
          <span class="muted">Sur cette tablette, ouvrez le message reçu, touchez le fichier, puis <strong>Partager › Enregistrer dans Fichiers</strong>. Revenez ensuite ici :</span>
          <div><button type="button" class="btn primary" data-act="voix-import">${icon(ICONS.download, 20)}Ajouter la voix reçue</button></div>
          <input type="file" id="voix-file" accept=".txt,.json,text/plain,application/json" hidden>`)}
      </div>
      ${fam.length ? `<div class="card"><span class="label">Déjà reçues</span>${fam.map((id) => { const st = BUILTIN_STORIES.find((s) => s.id === id); return st ? `<span>${icon(ICONS.coeur, 18)} ${esc(storyPage(st.title, ctx.s.child))} · voix de ${esc(ctx.s.recordings[id].voice)}</span>` : ''; }).join('')}</div>` : ''}`;
    return parentLayout('p-voix', 'Voix d’un proche', body);
  },
  mount(el) {
    const f = el.querySelector('#voix-file');
    f.onchange = async () => {
      const file = f.files[0]; f.value = '';
      if (!file) return;
      toast('Ajout de la voix…');
      try {
        const r = await importVoiceFile(file);
        if (r) { toast(`« ${r.title} » sera lue avec la voix de ${r.voice} !`); render(); }
      } catch (e) { toast(e.message || 'Ce fichier n’a pas pu être ajouté.'); }
    };
  },
};

ctx.actions['voix-import'] = () => document.getElementById('voix-file').click();
ctx.actions['voix-copy'] = () => copyText(recorderLink(ctx.s.child.name)).then(() => toast('Lien copié : collez-le dans un message'), () => toast('Copie impossible'));
ctx.actions['voix-share'] = () => {
  const name = ctx.s.child.name || 'notre enfant';
  const url = recorderLink(ctx.s.child.name);
  const text = `Tu veux enregistrer une histoire pour ${name} ? Ouvre ce lien sur ton téléphone, tout est expliqué, ça prend quelques minutes :`;
  if (navigator.share) navigator.share({ title: 'Une histoire pour ' + name, text, url }).catch(() => {});
  else ctx.actions['voix-copy']();
};

// ================= Côté téléphone : mode enregistreur =================

const remoteHead = (n) => `<div class="rv-head">${moonSVG(30)}<span class="rv-brand">lunoo</span><span class="grow"></span>${n ? `<span class="rv-step">Étape ${n} sur 3</span>` : ''}</div>`;

ctx.screens['rv-hello'] = {
  render() {
    const r = ctx.remote, child = esc(r.child || 'l’enfant');
    if (!canRecord()) {
      return `<div class="screen rv">${remoteHead(0)}<div class="rv-body">
        <h1>Ce téléphone ne peut pas enregistrer</h1>
        <p class="lead">Ouvrez ce lien sur un téléphone plus récent (iPhone sous iOS 14.3 ou plus, ou Android avec Chrome).</p></div></div>`;
    }
    return `<div class="screen rv">${remoteHead(1)}<div class="rv-body">
      <div class="rv-hero">${animalSVG('hibou', { size: 110 })}</div>
      <h1>Une histoire pour ${child}</h1>
      <p class="lead">Vous allez lire une courte histoire à voix haute. ${child} l’écoutera le soir sur sa tablette, avec <strong>votre voix</strong>.</p>
      <label class="label" for="rv-voice">Comment ${child} vous appelle-t-il ?</label>
      <input id="rv-voice" class="input" type="text" maxlength="30" placeholder="Mamie, Papi, Tonton…" value="${esc(r.voice || '')}" autocomplete="off">
      <button type="button" class="btn primary xl" data-act="rv-hello-next">Continuer</button>
      <span class="muted small">Rien n’est envoyé sur Internet : le fichier part seulement quand vous l’envoyez vous-même.</span>
    </div></div>`;
  },
};
ctx.actions['rv-hello-next'] = () => {
  const v = document.getElementById('rv-voice').value.trim();
  if (!v) { toast('Écrivez comment l’enfant vous appelle'); return; }
  ctx.remote.voice = v;
  go('rv-pick');
};

ctx.screens['rv-pick'] = {
  render() {
    const child = { name: ctx.remote.child };
    return `<div class="screen rv">${remoteHead(2)}<div class="rv-body top">
      <h1>Choisissez une histoire</h1>
      <p class="muted">Les plus courtes sont en haut. Vous lirez une page à la fois.</p>
      <div class="rv-list">${BUILTIN_STORIES.slice().sort((a, b) => storyMinutes(a.pages) - storyMinutes(b.pages)).map((s) => `
        <button type="button" class="rv-story" data-go="p-studio" data-p='{"id":"${s.id}"}'>
          <span class="thumb sm" style="background:${s.bg}">${animalSVG(s.animal === 'self' ? 'hibou' : s.animal, { size: 56 })}</span>
          <span class="rv-story-txt"><strong>${esc(storyPage(s.title, child))}</strong><span class="muted small">${s.pages.length} pages · environ ${storyMinutes(s.pages)} min</span></span>
          ${icon(ICONS.next, 22)}
        </button>`).join('')}</div>
      <button type="button" class="link-btn small" data-go="rv-hello">Retour</button>
    </div></div>`;
  },
};

let sendFile = null;
ctx.screens['rv-send'] = {
  render() {
    const r = ctx.remote, child = esc(r.child || 'l’enfant');
    const apple = isApple();
    return `<div class="screen rv">${remoteHead(3)}<div class="rv-body">
      <div class="rv-hero ok">${icon(ICONS.check, 56)}</div>
      <h1>Bravo ${esc(r.voice)} !</h1>
      <p class="lead">Il reste à envoyer l’histoire à la tablette de ${child}.</p>
      <button type="button" class="btn primary xl" id="rv-share" data-act="rv-share" disabled>Préparation…</button>
      <div class="card rv-help">
        <span class="label">Comment l’envoyer ?</span>
        ${apple ? '<span>• Vous êtes à côté de la tablette : choisissez <strong>AirDrop</strong>, puis la tablette.</span>' : ''}
        <span>• ${apple ? 'Sinon : choisissez' : 'Choisissez'} <strong>Messages, WhatsApp ou Mail</strong> et envoyez-le au parent de ${child}.</span>
        <span class="muted small">Le parent l’ajoutera ensuite dans Lunoo › Histoires › Voix d’un proche.</span>
      </div>
      <button type="button" class="link-btn small" data-act="rv-download" id="rv-dl" disabled>Le bouton ne marche pas ? Télécharger le fichier</button>
      <button type="button" class="btn ghost" data-act="rv-again">Enregistrer une autre histoire</button>
    </div></div>`;
  },
  async mount() {
    if (sendFile) return ready();
    try {
      sendFile = await buildVoiceFile(ctx.remote.story, ctx.remote.voice, ctx.remote.child, ctx.remote.takes);
      ready();
    } catch (e) {
      const b = document.getElementById('rv-share');
      if (b) b.textContent = 'Erreur, réessayez';
      toast('Le fichier n’a pas pu être préparé : ' + (e.message || e));
    }
    function ready() {
      const b = document.getElementById('rv-share'), d = document.getElementById('rv-dl');
      if (b) { b.disabled = false; b.innerHTML = `${icon(ICONS.upload, 26)}Envoyer à la tablette`; }
      if (d) d.disabled = false;
    }
  },
};
ctx.actions['rv-share'] = () => {
  if (!sendFile) return;
  const data = { files: [sendFile], title: 'Histoire pour ' + ctx.remote.child };
  if (navigator.canShare && navigator.canShare(data)) navigator.share(data).catch(() => {});
  else ctx.actions['rv-download']();
};
ctx.actions['rv-download'] = () => {
  if (!sendFile) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(sendFile); a.download = sendFile.name;
  document.body.appendChild(a); a.click(); a.remove();
  toast('Fichier téléchargé : envoyez-le au parent par message ou mail.');
};
ctx.actions['rv-again'] = () => { sendFile = null; ctx.remote.takes = null; ctx.remote.story = null; go('rv-pick'); };

/** Appelé par le studio quand l'histoire est finie en mode enregistreur. */
export function remoteStudioDone(story, takes) {
  ctx.remote.story = story; ctx.remote.takes = takes; sendFile = null;
  go('rv-send');
}

/** Démarrage en mode enregistreur si le lien contient #voix=… */
export function remoteFromHash() {
  const m = /^#voix=?([^&]*)/.exec(location.hash);
  if (!m) return null;
  let child = '';
  try { child = decodeURIComponent(m[1]); } catch (e) { child = m[1]; }
  return { child: child.slice(0, 40), voice: '', story: null, takes: null };
}
