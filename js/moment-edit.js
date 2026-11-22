// Personnaliser un moment de la journée : nom, phrase, pictogramme, animal et couleur.
// Sert aussi à créer un moment qui n'est pas dans la liste (« Autre moment »).
import { ctx, esc } from './ctx.js';
import { ANIMALS, CLOCK_TYPES, ICONS, PICTOS, MOMENT_COLORS, GARDE_TYPES, slotInfo, momentAnimal } from './data.js';
import { animalSVG, icon } from './animal.js';
import { REWARDABLE } from './rewards.js';

const KEYS = ['label', 'say', 'icon', 'animal', 'bg', 'done'];
const PICTO_NAMES = {
  sun: 'Soleil', habiller: 'Habits', manger: 'Repas', douche: 'Douche', bain: 'Bain', dents: 'Brosse à dents', jeu: 'Jeu', ecole: 'Cartable',
  creche: 'Cubes', nounou: 'Maison de nounou', sortie: 'Arbre', calme: 'Calme', histoire: 'Livre', nuit: 'Lune', music: 'Musique', star: 'Étoile',
  coeur: 'Cœur', famille: 'Famille', piscine: 'Piscine', velo: 'Vélo', voiture: 'Voiture', ballon: 'Ballon', peinture: 'Pinceau', medecin: 'Docteur', home: 'Maison',
};

/**
 * Ouvre la fenêtre. `slot` : le moment à modifier (copie), ou un nouveau { type: 'perso', time }.
 * Résout avec le moment modifié, 'delete', ou null si on annule.
 */
export function editMoment(slot, { isNew = false, canDelete = false } = {}) {
  return new Promise((resolve) => {
    const d = { ...slot };
    const childName = esc(ctx.s.child.name || 'l’enfant');
    const wrap = document.createElement('div');
    wrap.className = 'modal-wrap';
    const base = () => CLOCK_TYPES[d.type] || CLOCK_TYPES.jeu;
    const canDone = () => d.done === undefined ? REWARDABLE.includes(d.type) : !!d.done;

    const draw = () => {
      const info = slotInfo(d), b = base();
      const perso = d.type === 'perso';
      wrap.innerHTML = `<form class="modal medit" role="dialog" aria-modal="true" aria-labelledby="me-t">
        <h2 class="h2" id="me-t">${isNew ? 'Nouveau moment' : 'Personnaliser le moment'}</h2>
        <div class="me-preview" style="background:${info.bg};${info.dark ? 'color:#FBF6EE' : ''}">
          ${animalSVG(info.animal, { size: 96, asleep: !!info.asleep })}
          <span class="me-badge">${icon(ICONS[info.icon] || ICONS.clock, 26)}</span>
          <div class="me-ptext"><strong>${esc(info.label)}</strong><span>${esc(info.say)}</span></div>
        </div>
        ${isNew && perso ? '' : `<label class="me-field"><span class="label">Type de moment</span>
          <select class="input" id="me-type">${Object.entries(CLOCK_TYPES).filter(([k]) => !['reveil', 'sieste'].includes(k))
            .map(([k, t]) => `<option value="${k}" ${k === d.type ? 'selected' : ''}>${k === 'perso' ? 'Autre (je crée le mien)' : t.label}</option>`).join('')}</select>
          ${perso ? '' : '<span class="muted small">Les champs vides gardent le texte proposé.</span>'}</label>`}
        ${GARDE_TYPES.includes(d.type) ? `<fieldset class="me-set"><legend class="label">Où va ${childName} ?</legend>
          <div class="chips">${GARDE_TYPES.map((k) => `<button type="button" class="chip ${d.type === k ? 'sel' : ''}" aria-pressed="${d.type === k}" data-me="type" data-v="${k}">${icon(ICONS[CLOCK_TYPES[k].icon], 18)}${CLOCK_TYPES[k].label}</button>`).join('')}</div></fieldset>` : ''}
        <label class="me-field"><span class="label">Nom du moment</span>
          <input class="input" id="me-label" type="text" maxlength="22" value="${esc(d.label || '')}" placeholder="${esc(perso ? 'Ex. : Piscine, Papi et Mamie…' : b.label)}" ${perso ? 'required' : ''}></label>
        <label class="me-field"><span class="label">Ce que dit l’écran (et la voix)</span>
          <input class="input" id="me-say" type="text" maxlength="60" value="${esc(d.say || '')}" placeholder="${esc(perso ? (d.label ? `C'est l'heure : ${d.label} !` : "C'est l'heure de la piscine !") : b.say)}"></label>
        <fieldset class="me-set"><legend class="label">Pictogramme</legend>
          <div class="me-grid picto">${PICTOS.map((k) => `<button type="button" class="me-opt ${info.icon === k ? 'sel' : ''}" aria-pressed="${info.icon === k}" data-me="icon" data-v="${k}" aria-label="${PICTO_NAMES[k] || k}">${icon(ICONS[k], 26)}</button>`).join('')}</div>
        </fieldset>
        <fieldset class="me-set"><legend class="label">Personnage</legend>
          <div class="me-grid animals">${Object.entries(ANIMALS).map(([k, a]) => `<button type="button" class="me-opt ani ${info.animal === k ? 'sel' : ''}" aria-pressed="${info.animal === k}" data-me="animal" data-v="${k}">${animalSVG(k, { size: 52 })}<span>${a.label}</span></button>`).join('')}</div>
        </fieldset>
        ${b.asleep ? '' : `<fieldset class="me-set"><legend class="label">Couleur de l’écran</legend>
          <div class="me-grid colors">${MOMENT_COLORS.map((c) => `<button type="button" class="me-swatch ${info.bg === c ? 'sel' : ''}" aria-pressed="${info.bg === c}" data-me="bg" data-v="${c}" style="background:${c}" aria-label="Couleur ${c}"></button>`).join('')}</div>
        </fieldset>
        <div class="row-setting"><div class="row-text"><span class="row-title">Bouton « C’est fait ! »</span><span class="row-desc">${childName} peut toucher le bouton quand c’est fini</span></div>
          <button type="button" class="switch ${canDone() ? 'on' : ''}" role="switch" aria-checked="${canDone()}" aria-label="Bouton C’est fait" data-me="done"><span></span></button></div>`}
        <div class="modal-actions me-actions">
          ${canDelete ? `<button type="button" class="link-btn danger-txt" data-me="delete">${icon(ICONS.trash, 18)}Supprimer</button>` : ''}
          ${!isNew && !perso && KEYS.some((k) => d[k] !== undefined && d[k] !== '') ? '<button type="button" class="link-btn" data-me="reset">Revenir à l’original</button>' : ''}
          <span class="grow"></span>
          <button type="button" class="btn ghost" data-me="cancel">Annuler</button>
          <button type="submit" class="btn primary">${isNew ? 'Ajouter' : 'Enregistrer'}</button>
        </div>
      </form>`;
    };

    // Les champs texte mettent l'aperçu à jour sans redessiner (le clavier reste ouvert).
    const readText = () => {
      const l = wrap.querySelector('#me-label'), s = wrap.querySelector('#me-say');
      if (l) d.label = l.value.trim();
      if (s) d.say = s.value.trim();
    };
    const refreshPreview = () => {
      const info = slotInfo(d), p = wrap.querySelector('.me-ptext');
      if (p) p.innerHTML = `<strong>${esc(info.label)}</strong><span>${esc(info.say)}</span>`;
    };
    const redraw = () => {
      const focus = document.activeElement && document.activeElement.dataset ? [document.activeElement.dataset.me, document.activeElement.dataset.v] : null;
      const scroll = wrap.querySelector('.modal').scrollTop;
      draw();
      wrap.querySelector('.modal').scrollTop = scroll;
      if (focus && focus[0]) { const el = wrap.querySelector(`[data-me="${focus[0]}"]${focus[1] ? `[data-v="${focus[1]}"]` : ''}`); if (el) el.focus(); }
    };

    const done = (v) => { wrap.remove(); resolve(v); };
    wrap.addEventListener('input', (e) => { if (e.target.id === 'me-type') return; readText(); refreshPreview(); });
    // Nouveau type : on repart de son apparence par défaut.
    wrap.addEventListener('change', (e) => {
      if (e.target.id !== 'me-type') return;
      KEYS.forEach((x) => delete d[x]);
      d.type = e.target.value;
      redraw();
    });
    wrap.addEventListener('click', (e) => {
      const b = e.target.closest('[data-me]');
      if (!b) return;
      readText();
      const k = b.dataset.me;
      if (k === 'cancel') return done(null);
      if (k === 'delete') return done('delete');
      if (k === 'reset') { KEYS.forEach((x) => delete d[x]); return redraw(); }
      if (k === 'done') d.done = !canDone();
      else d[k] = b.dataset.v;
      // L'animal proposé par défaut n'est pas enregistré comme un choix.
      if (k === 'animal' && d.animal === momentAnimal(d.type)) delete d.animal;
      if (k === 'icon' && d.icon === base().icon) delete d.icon;
      if (k === 'bg' && d.bg === base().bg) delete d.bg;
      redraw();
    });
    wrap.addEventListener('submit', (e) => {
      e.preventDefault();
      readText();
      if (d.type === 'perso' && !d.label) { const l = wrap.querySelector('#me-label'); l.focus(); return; }
      KEYS.forEach((x) => { if (d[x] === '' || d[x] === undefined) delete d[x]; });
      if (d.done === REWARDABLE.includes(d.type)) delete d.done;
      done(d);
    });
    wrap.addEventListener('keydown', (e) => { if (e.key === 'Escape') done(null); });
    draw();
    document.body.appendChild(wrap);
    const first = wrap.querySelector(isNew ? '#me-label' : '.btn.primary');
    if (first) first.focus();
  });
}
