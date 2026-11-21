// Données de l'appli : animaux, couleurs, moments du rituel, histoires fournies.

export const PALETTES = {
  lavande: { label: 'Lavande', body: '#8C84D9', belly: '#C9C3F2', bg: '#EEEBFB' },
  corail: { label: 'Corail', body: '#E8875B', belly: '#FBE3D3', bg: '#FDEEE4' },
  ciel: { label: 'Ciel', body: '#6FA8DC', belly: '#D3E6F7', bg: '#E8F2FB' },
  miel: { label: 'Miel', body: '#E2B24C', belly: '#F8E6B8', bg: '#FCF3DC' },
  menthe: { label: 'Menthe', body: '#5FB89A', belly: '#CFEDE1', bg: '#E7F6EF' },
  rose: { label: 'Rose', body: '#E58BB0', belly: '#FAD9E6', bg: '#FCEDF3' },
};

export const ANIMALS = {
  hibou: { label: 'Hibou', art: 'le hibou', de: 'du hibou', palette: 'lavande' },
  renard: { label: 'Renard', art: 'le renard', de: 'du renard', palette: 'corail' },
  lapin: { label: 'Lapin', art: 'le lapin', de: 'du lapin', palette: 'ciel' },
  ours: { label: 'Ourson', art: "l'ourson", de: "de l'ourson", palette: 'miel' },
  chat: { label: 'Chat', art: 'le chat', de: 'du chat', palette: 'menthe' },
};

export const MOMENTS = {
  jeu: { label: 'Jeu', bg: '#FCEBC0', dark: false, light: 1, text: 'On joue encore un peu !', icon: 'jeu' },
  bain: { label: 'Bain', bg: '#D6EEF7', dark: false, light: 0.85, text: "C'est l'heure du bain", icon: 'bain' },
  calme: { label: 'Temps calme', bg: '#D7EFE3', dark: false, light: 0.6, text: 'On se pose tout doucement', icon: 'calme' },
  histoire: { label: 'Histoires', bg: '#2E2850', dark: true, light: 0.35, text: 'Il était une fois…', icon: 'histoire' },
  nuit: { label: 'Nuit', bg: '#000000', dark: true, light: 0, text: 'Bonne nuit', icon: 'nuit' },
};

// Horloge intelligente : types de créneaux de la journée.
// reveil et sieste suivent les réglages du réveil ; dodo ouvre la période de sommeil.
export const CLOCK_TYPES = {
  reveil: { label: 'Réveil', say: "C'est l'heure de se lever !", bg: '#FDE7B0', icon: 'sun' },
  manger: { label: 'Manger', say: "C'est l'heure de manger !", bg: '#FFE0CC', icon: 'manger' },
  douche: { label: 'Douche', say: "C'est l'heure de la douche !", bg: '#D6EEF7', icon: 'douche' },
  bain: { label: 'Bain', say: "C'est l'heure du bain !", bg: '#D6EEF7', icon: 'bain' },
  dents: { label: 'Dents', say: "On se brosse les dents !", bg: '#E8F2FB', icon: 'dents' },
  habiller: { label: "S'habiller", say: "C'est l'heure de s'habiller !", bg: '#FCEDF3', icon: 'habiller' },
  jeu: { label: 'Jeu', say: "C'est l'heure de jouer !", bg: '#FCEBC0', icon: 'jeu' },
  ecole: { label: 'École', say: "C'est l'heure de partir à l'école !", bg: '#E6E3FA', icon: 'ecole' },
  sortie: { label: 'Dehors', say: "On va se promener !", bg: '#D7EFE3', icon: 'sortie' },
  calme: { label: 'Calme', say: 'Un moment tout calme', bg: '#D7EFE3', icon: 'calme' },
  histoire: { label: 'Histoire', say: "C'est l'heure de l'histoire", bg: '#E6E3FA', icon: 'histoire' },
  sieste: { label: 'Sieste', say: "C'est l'heure de la sieste", bg: '#2E3270', dark: true, asleep: true, icon: 'nuit' },
  dodo: { label: 'Dodo', say: "C'est l'heure de dormir", bg: '#1F2250', dark: true, asleep: true, icon: 'nuit' },
};

export const SOUNDS = {
  pluie: { label: 'Pluie douce' },
  vagues: { label: 'Vagues' },
  ronron: { label: 'Ronron' },
  coeur: { label: 'Battements' },
  blanc: { label: 'Bruit blanc' },
  rose: { label: 'Bruit rose' },
  aucun: { label: 'Silence' },
};

export const ICONS = {
  jeu: 'M6 11h4M8 9v4M15 12h.01M18 10h.01M17.3 5H6.7a4 4 0 0 0-4 3.6L2 15a3 3 0 0 0 5.4 2l1.1-1.5h7l1.1 1.5A3 3 0 0 0 22 15l-.7-6.4A4 4 0 0 0 17.3 5z',
  bain: 'M4 12h16v3a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-3zM6 12V5a2 2 0 0 1 4 0',
  calme: 'M2 12h20M6 8h12M9 4h6M6 16h12',
  histoire: 'M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2zM22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z',
  nuit: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  back: 'M15 18l-6-6 6-6',
  next: 'M9 6l6 6-6 6',
  play: 'M8 5v14l11-7z',
  pause: 'M6 5h4v14H6zM14 5h4v14h-4z',
  mic: 'M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM5 10a7 7 0 0 0 14 0M12 17v5',
  check: 'M20 6 9 17l-5-5',
  home: 'M3 11l9-8 9 8M5 10v10h14V10',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  sound: 'M11 5L6 9H2v6h4l5 4V5zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
  plus: 'M12 5v14M5 12h14',
  trash: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14',
  up: 'M6 15l6-6 6 6',
  down: 'M6 9l6 6 6-6',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  download: 'M12 4v12M7 11l5 5 5-5M4 20h16',
  close: 'M6 6l12 12M18 6L6 18',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  manger: 'M7 2v8a2 2 0 0 0 4 0V2M9 2v20M17 2c-1.7 0-3 2.2-3 5s1.3 4 3 4v11M17 2v9',
  douche: 'M4 20V8a5 5 0 0 1 10 0M11 8h6l-1 3h-4zM12 14v1M15 14v1M18 14v1M12 18v1M15 18v1M18 18v1',
  dents: 'M2 15h11M13 13h8v4h-8zM14 13V9M17 13V9M20 13V9',
  habiller: 'M8 3l4 3 4-3 5 4-3 4-2-1v11H8V10l-2 1-3-4z',
  ecole: 'M6 8a6 6 0 0 1 12 0v12H6zM9 14h6M9 4.5V3h6v1.5',
  sortie: 'M12 22v-6M8 16h8l-4-6 3 0-3-6-3 6h3z',
};

// Histoires fournies : des textes originaux, lus par la voix de la tablette
// tant que personne ne les a enregistrés. {P} = prénom, {A} = « le renard », {AL} = « Renard ».
export const BUILTIN_STORIES = [
  {
    id: 'lune',
    title: '{AL} et la lune',
    animal: 'self',
    bg: '#2E3270',
    pages: [
      "Ce soir-là, la lune était toute ronde au-dessus de la maison de {P}.",
      "{A} colla son museau contre la fenêtre. « Regarde, {P} ! La lune nous fait coucou. »",
      "{P} enfila son pyjama le plus doux, et tous les deux s'installèrent sous la couverture.",
      "« Pourquoi la lune ne dort jamais ? » demanda {P}. {A} réfléchit très fort.",
      "« Elle veille sur les enfants qui dorment, répondit {A}. C'est sa façon de dire bonne nuit. »",
      "Alors {P} fit un petit signe à la lune, ferma les yeux, et {A} se blottit tout contre lui. Bonne nuit.",
    ],
  },
  {
    id: 'doudou',
    title: 'Lapin cherche son doudou',
    animal: 'lapin',
    bg: '#D6EEF7',
    pages: [
      "Petit Lapin cherchait partout son doudou. Sous le lit ? Non. Dans le coffre à jouets ? Non plus.",
      "Il demanda à {P} : « Tu n'aurais pas vu mon doudou, celui qui a une oreille toute mâchouillée ? »",
      "{P} regarda derrière le rideau, puis dans le panier à linge. Toujours rien.",
      "Ils prirent une grande inspiration, et soufflèrent tout doucement. On réfléchit mieux quand on est calme.",
      "Et soudain, Petit Lapin se souvint : il l'avait posé sur son oreiller, pour qu'il l'attende bien au chaud.",
      "Petit Lapin serra son doudou, {P} serra le sien, et la maison devint toute silencieuse. Bonne nuit.",
    ],
  },
  {
    id: 'cabane',
    title: "La cabane de l'ourson",
    animal: 'ours',
    bg: '#D7EFE3',
    pages: [
      "Au fond de la forêt, l'ourson avait construit une cabane avec des branches et des feuilles.",
      "« Elle est parfaite pour dormir, dit-il à {P}. Il y a de la mousse toute douce, et une petite fenêtre sur les étoiles. »",
      "{P} entra dans la cabane. Ça sentait le pin et le miel.",
      "Dehors, la pluie se mit à tomber. Plic, ploc, plic, ploc. Mais dans la cabane, on était bien au sec.",
      "L'ourson bâilla un grand bâillement d'ourson. {P} bâilla aussi. C'est contagieux, les bâillements.",
      "Ils s'allongèrent sur la mousse, écoutèrent la pluie, et s'endormirent tout doucement. Bonne nuit.",
    ],
  },
  {
    id: 'hibou',
    title: "Le hibou qui n'avait pas sommeil",
    animal: 'hibou',
    bg: '#E6E3FA',
    pages: [
      "Il était une fois un petit hibou qui n'avait jamais sommeil. Les hiboux, c'est fait pour veiller la nuit !",
      "Mais ce soir, il était venu voir {P}. « Comment on fait, toi, pour s'endormir ? »",
      "« D'abord, on se met bien sous la couette, dit {P}. Ensuite, on respire lentement, comme une vague. »",
      "Le hibou essaya. Il inspira… et souffla. Inspira… et souffla. Ses plumes se mirent à frissonner de bien-être.",
      "« Et après ? » chuchota le hibou. « Après, on pense à quelque chose de joli, et on ferme les yeux. »",
      "Le hibou pensa à la lune, {P} pensa à son animal préféré, et pour une fois, le hibou s'endormit aussi. Bonne nuit.",
    ],
  },
  {
    id: 'etoiles',
    title: 'Chat et les étoiles filantes',
    animal: 'chat',
    bg: '#FCEBC0',
    pages: [
      "Sur le toit de la maison, Chat comptait les étoiles. Une, deux, trois… il y en avait tellement !",
      "« {P}, viens voir ! » miaula-t-il doucement. {P} ouvrit la fenêtre, enveloppé dans son plaid.",
      "Tout à coup, une étoile traversa le ciel. « Une étoile filante ! On peut faire un vœu », dit Chat.",
      "{P} ferma les yeux et fit un vœu tout bas, rien que pour lui. Chat fit le sien aussi.",
      "Le ciel était si calme qu'on entendait seulement le vent dans les arbres.",
      "Ils rentrèrent se coucher, le cœur plein d'étoiles, et rêvèrent jusqu'au matin. Bonne nuit.",
    ],
  },
  {
    id: 'voyage',
    title: 'Le grand voyage de {P}',
    animal: 'self',
    bg: '#FFE0CC',
    pages: [
      "Ce soir, dit {P}, on part en voyage. {A} sauta dans son sac à dos, tout content.",
      "Ils marchèrent sur un chemin de nuages, si moelleux qu'on aurait dit de la barbe à papa.",
      "Ils croisèrent une baleine qui chantait une berceuse, et un arc-en-ciel qui faisait la sieste.",
      "Au bout du chemin, il y avait un lit tout rond, fait de coton et de plumes.",
      "« C'est le lit des voyageurs fatigués », dit {A}. {P} s'y allongea, et {A} se roula en boule à ses pieds.",
      "Et le grand voyage continua, cette fois dans les rêves. Bonne nuit, {P}.",
    ],
  },
];

export function storyText(t, child) {
  const a = ANIMALS[child.animal] || ANIMALS.renard;
  return t
    .replaceAll('{P}', child.name || 'mon petit')
    .replaceAll('{AL}', a.label)
    .replaceAll('{A}', a.art);
}

// Met une majuscule en début de phrase après remplacement.
export function storyPage(t, child) {
  const s = storyText(t, child);
  return s.replace(/(^|[.!?]\s+|«\s)([a-zàâçéèêëîïôûùüÿñæœ])/g, (m, p, c) => p + c.toUpperCase());
}
