// Lecture d'une histoire : voix enregistrée, fichier importé, ou voix de la tablette.
import { audio } from './store.js';
import { BUILTIN_STORIES, storyPage, storyMinutes } from './data.js';
import { startBed, stopBed, chime } from './sound.js';

export const recKey = (storyId, page) => `rec:${storyId}:${page}`;
export const impKey = (storyId) => `imp:${storyId}`;

export function allStories(settings) {
  const child = settings.child;
  const builtin = BUILTIN_STORIES.map((s) => ({
    id: s.id,
    title: storyPage(s.title, child),
    animal: s.animal === 'self' ? 'hibou' : s.animal,
    amb: s.amb || null,
    minutes: storyMinutes(s.pages),
    bg: s.bg,
    pages: s.pages,
    kind: 'builtin',
    voice: settings.recordings[s.id] ? settings.recordings[s.id].voice : 'Lunoo',
    recorded: !!settings.recordings[s.id],
  }));
  const custom = settings.customStories.map((s) => ({ ...s, kind: s.kind || 'import', recorded: true, bg: s.bg || '#ECE7DD', minutes: s.minutes || null }));
  return [...builtin, ...custom];
}

function frenchVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = speechSynthesis.getVoices();
  return voices.find((v) => v.lang === 'fr-FR' && v.localService) || voices.find((v) => v.lang && v.lang.startsWith('fr')) || null;
}

/**
 * Joue une histoire. Renvoie un contrôleur { pause, resume, stop, paused }.
 * cb: { onProgress(fraction, page, total), onEnd() }
 */
export async function playStory(story, settings, cb = {}) {
  let stopped = false, paused = false, current = null, url = null;
  const ctl = {
    get paused() { return paused; },
    pause() { paused = true; if (current && current.pause) current.pause(); else if ('speechSynthesis' in window) speechSynthesis.pause(); },
    resume() { paused = false; if (current && current.play) current.play(); else if ('speechSynthesis' in window) speechSynthesis.resume(); },
    stop() { stopped = true; stopBed(2); if (current && current.pause) current.pause(); if ('speechSynthesis' in window) speechSynthesis.cancel(); if (url) URL.revokeObjectURL(url); },
  };

  const playBlob = (blob) => new Promise((resolve) => {
    if (url) URL.revokeObjectURL(url);
    url = URL.createObjectURL(blob);
    const a = new Audio(url);
    current = a;
    a.onended = resolve; a.onerror = resolve;
    a.ontimeupdate = () => { if (a.duration && cb.onTime) cb.onTime(a.currentTime / a.duration); };
    a.play().catch(resolve);
  });

  const speak = (text) => new Promise((resolve) => {
    if (!('speechSynthesis' in window)) return setTimeout(resolve, 4000);
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR'; u.rate = 0.82; u.pitch = 1.05;
    const v = frenchVoice(); if (v) u.voice = v;
    u.onend = resolve; u.onerror = resolve;
    current = null;
    speechSynthesis.speak(u);
  });

  // Ambiance très douce sous la voix (pluie, vagues, grillons…), sauf pour les fichiers importés.
  if (story.amb && story.kind !== 'import' && settings.stories.ambience !== false) {
    try { startBed(story.amb, settings.sound.cap); } catch (e) { /* son indisponible */ }
  }

  (async () => {
    // Annonce du titre, pour que l'enfant comprenne qu'une nouvelle histoire commence.
    if (cb.intro) {
      try { chime(); } catch (e) { /* pas de son */ }
      await new Promise((r) => setTimeout(r, 900));
      if (!stopped) await speak(cb.intro);
      if (!stopped) await new Promise((r) => setTimeout(r, 1000));
    }
    if (stopped) return;
    if (story.kind === 'import') {
      const blob = await audio.get(impKey(story.id));
      if (blob && !stopped) { cb.onProgress && cb.onProgress(0, 1, 1); await playBlob(blob); }
    } else {
      const total = story.pages.length;
      for (let i = 0; i < total && !stopped; i++) {
        cb.onProgress && cb.onProgress(i / total, i + 1, total);
        const blob = story.recorded ? await audio.get(recKey(story.id, i)) : null;
        if (stopped) break;
        if (blob) await playBlob(blob);
        else await speak(storyPage(story.pages[i], settings.child));
        if (!stopped) await new Promise((r) => setTimeout(r, 1200));
      }
    }
    if (!stopped) { stopBed(4); cb.onProgress && cb.onProgress(1, 0, 0); cb.onEnd && cb.onEnd(); }
  })();
  return ctl;
}
