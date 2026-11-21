// Stockage local : IndexedDB pour les réglages et les fichiers audio.
// Rien ne quitte la tablette.

const DB_NAME = 'lunoo';
const DB_VERSION = 1;
let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      if (!db.objectStoreNames.contains('audio')) db.createObjectStore('audio');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx(store, mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const req = fn(s);
    t.oncomplete = () => resolve(req ? req.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export const kv = {
  get: (k) => tx('kv', 'readonly', (s) => s.get(k)),
  set: (k, v) => tx('kv', 'readwrite', (s) => s.put(v, k)),
  del: (k) => tx('kv', 'readwrite', (s) => s.delete(k)),
};

export const audio = {
  get: (k) => tx('audio', 'readonly', (s) => s.get(k)),
  set: (k, v) => tx('audio', 'readwrite', (s) => s.put(v, k)),
  del: (k) => tx('audio', 'readwrite', (s) => s.delete(k)),
  keys: () => tx('audio', 'readonly', (s) => s.getAllKeys()),
};

// Demande au navigateur de ne pas effacer les données (important sur iPad).
export async function requestPersistence() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const already = await navigator.storage.persisted();
      return already || (await navigator.storage.persist());
    }
  } catch (e) { /* ignoré */ }
  return false;
}

export function defaultSettings() {
  return {
    version: 1,
    onboarded: false,
    child: { name: '', age: null, color: 'corail' }, // l'âge est facultatif (réglages parent)
    schedule: {
      ritualStart: '19:00',
      wakeWeek: '7:00',
      wakeWeekend: '8:00',
      nap: { on: false, start: '13:00', dur: 90 },
    },
    rituals: {
      soir: [
        { id: 'jeu', on: false, dur: 15 },
        { id: 'bain', on: true, dur: 15 },
        { id: 'calme', on: true, dur: 10 },
        { id: 'histoire', on: true, dur: 0 },
        { id: 'nuit', on: true, dur: 0 },
      ],
      sieste: [
        { id: 'calme', on: true, dur: 5 },
        { id: 'histoire', on: true, dur: 0 },
        { id: 'nuit', on: true, dur: 0 },
      ],
    },
    stories: { choose: 2, napChoose: 1, mode: 'choice', playlistId: null, ambience: true },
    rewards: { on: true, adult: false, done: {} }, // done : { 'AAAA-MM-JJ': { slotId: heure } }
    launch: { soir: { mode: 'pick', ids: [] }, sieste: { mode: 'pick', ids: [] } }, // derniers choix au lancement de la nuit
    customStories: [], // { id, title, animal, voice, kind: 'import' }
    recordings: {},    // storyId -> { voice, pages: n, date }
    playlists: [],     // { id, name, storyIds: [] }
    night: { mode: 'off', level: 5, tint: 'ambre', touchShow: true, fade: true },
    sound: { type: 'pluie', vol: 30, cap: 40, dur: 20, fade: true },
    wake: { anim: 'soleil', soon: true, offAfter: 15 },
    access: { corner: 'hd', hold: 3, pin: null },
    guide: { hidden: false, clock: false, story: false, night: false }, // « Premiers pas » de l'espace parent
    // Horloge intelligente. Le réveil et la sieste viennent de « schedule ».
    clock: {
      on: true,
      chime: false,
      // Au départ, une journée minimale : le parent ajoute les autres moments quand il veut.
      slots: [
        { id: 'c1', type: 'jeu', time: '8:00' },
        { id: 'c9', type: 'dodo', time: '19:45' },
      ],
    },
  };
}

function merge(base, over) {
  if (Array.isArray(base) || typeof base !== 'object' || base === null) return over === undefined ? base : over;
  const out = { ...base };
  for (const k of Object.keys(over || {})) {
    out[k] = (k in base) ? merge(base[k], over[k]) : over[k];
  }
  return out;
}

export async function loadSettings() {
  const saved = await kv.get('settings');
  return merge(defaultSettings(), saved || {});
}

export async function saveSettings(s) {
  await kv.set('settings', s);
}

// ---------- Sauvegarde / restauration dans un fichier ----------

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

async function base64ToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return res.blob();
}

export async function exportBackup(settings) {
  const keys = await audio.keys();
  const files = {};
  for (const k of keys) {
    const v = await audio.get(k);
    if (v instanceof Blob) files[k] = await blobToBase64(v);
  }
  const data = { app: 'lunoo', version: 1, date: new Date().toISOString(), settings, files };
  return new Blob([JSON.stringify(data)], { type: 'application/json' });
}

export async function importBackup(file) {
  const text = await file.text();
  const data = JSON.parse(text);
  if (data.app !== 'lunoo') throw new Error('Ce fichier n’est pas une sauvegarde Lunoo.');
  for (const [k, v] of Object.entries(data.files || {})) {
    await audio.set(k, await base64ToBlob(v));
  }
  const s = merge(defaultSettings(), data.settings || {});
  await saveSettings(s);
  return s;
}
