# Lunoo

Le rituel du coucher de votre enfant, sur une vieille tablette, **hors ligne et sans compte**.

Lunoo transforme une tablette (ou un ancien téléphone) en compagnon du soir : un animal choisi par l'enfant l'accompagne du bain jusqu'au dodo, des histoires racontées avec la voix de la famille, des sons doux, un écran qui s'éteint la nuit, et un réveil visuel qui indique quand il peut se lever. La sieste a son propre rituel.

## V1 : 100 % front, hébergée sur GitHub Pages

- **Aucun serveur, aucun compte.** Les réglages et les voix enregistrées restent dans le navigateur de la tablette (IndexedDB).
- **Hors ligne** : un service worker garde l'appli en cache après la première ouverture.
- **Sauvegarde** : export / import d'un fichier depuis l'espace parent.
- **Sons générés en direct** (Web Audio) : pluie, vagues, ronron, battements, bruit blanc, bruit rose. Volume plafonné, arrêt automatique.
- **Studio voix** : enregistrement page par page avec le micro de la tablette (MediaRecorder).
- **Histoires fournies** : 6 textes originaux personnalisés avec le prénom et l'animal de l'enfant, lus par la voix de synthèse de la tablette tant que personne ne les a enregistrés.
- **Import de sons** : un parent peut ajouter un fichier audio dont il a les droits.
- **Horloge intelligente** : le parent règle les moments de la journée (réveil, s'habiller, manger, douche, dents, jeu, école, sieste, dodo…). L'écran de l'enfant change tout seul d'image, de couleur et de message, montre ce qui vient ensuite et toute la journée en pictogrammes. Pendant « Dodo », la tablette passe d'elle-même en mode nuit jusqu'au réveil : si l'enfant se lève à 5 h, il voit que c'est encore l'heure de dormir. Le week-end, les moments du matin sont décalés avec le réveil.

## Mettre en ligne

1. Dans le dépôt GitHub : **Settings › Pages › Build and deployment › Source : GitHub Actions**.
2. Chaque push sur `main` publie le site (workflow `.github/workflows/pages.yml`).
3. Adresse : `https://<compte>.github.io/<dépôt>/`.

À chaque nouvelle version, augmentez `VERSION` dans `sw.js` pour que les tablettes récupèrent la mise à jour.

## Installer sur la tablette

1. Ouvrir l'adresse du site dans Safari (iPad) ou Chrome (Android).
2. **Ajouter à l'écran d'accueil** (iPad : bouton Partager › « Sur l'écran d'accueil »). Indispensable sur iPad : sinon Safari peut effacer les données d'un site non installé.
3. Ouvrir Lunoo depuis son icône et suivre le premier lancement.
4. Avant la première nuit : brancher la tablette, **baisser la luminosité au minimum**, et activer l'**Accès guidé** (iPad) ou l'**Épinglage d'écran** (Android).

Pour entrer dans l'espace parent : appui long (3 s par défaut) sur la petite lune dans le coin de l'écran. Un code à 4 chiffres peut être ajouté.

## Limites connues de la V1

- L'appli doit **rester ouverte** la nuit : une web app ne peut pas se réveiller toute seule si elle est fermée.
- Une web app ne peut pas régler la luminosité : « écran éteint » = écran noir. Sur un écran LCD, un peu de lumière passe ; d'où la consigne de baisser la luminosité.
- Le son ne peut démarrer qu'après un geste sur l'écran (règle des navigateurs) : le rituel se lance d'un appui.
- La voix de synthèse dépend des voix françaises installées sur la tablette.

## Développement

Aucune étape de build : HTML, CSS et modules JavaScript natifs.

```bash
python3 -m http.server 8000   # puis ouvrir http://localhost:8000
python3 tools/make-icons.py   # régénérer les icônes
```

Structure :

```
index.html, manifest.webmanifest, sw.js
css/app.css
js/app.js         démarrage, clics, appui long
js/ctx.js         état, navigation, moteur du rituel et de la nuit
js/clock.js       horloge intelligente (créneaux de la journée)
js/store.js       IndexedDB, réglages, sauvegarde
js/data.js        animaux, couleurs, moments, histoires
js/animal.js      dessins SVG
js/sound.js       sons générés
js/narrator.js    lecture des histoires
js/onboarding.js  premier lancement
js/child.js       écrans de l'enfant
js/parent.js      espace parent
js/studio.js      studio voix
```

## Sources sur le sommeil de l'enfant

Les choix de conception s'appuient sur : Mindell et al. (Sleep, 2009 et 2015) sur les routines du coucher ; Hale et al. (J Fam Psychol, 2011) sur les routines avec lecture ; Akacem et al. (Physiol Rep, 2018) et Hartstein et al. (J Pineal Res, 2022) sur la lumière du soir ; Hugh et al. (Pediatrics, 2014) sur le volume des machines à bruit blanc ; les recommandations de durée de sommeil de l'American Academy of Sleep Medicine (Paruthi et al., 2016). Lunoo n'est pas un dispositif médical.

Polices : Fredoka et Nunito, licence SIL Open Font License (voir `fonts/`).

## Version 1.3

- **Un animal par moment** : coq au réveil, pingouin pour s'habiller, ourson au repas, renard pour l'école, chien pour jouer, lapin dehors, grenouille sous la douche, canard au bain, castor pour les dents, chat pour le calme et la sieste, mouton pour les histoires, hibou pour dormir. L'enfant ne choisit plus d'animal.
- **« C'est fait ! »** : seul bouton de l'écran de l'enfant. Confettis, animal qui saute et bravo dit au prénom, avec des phrases variées et bienveillantes. Une fois par moment et par jour, étoile sur la frise de la journée. Minuteur de 2 minutes pour les dents. Option « vérifié par un adulte » (appui long de 2 s). Le parent voit et peut annuler les validations du jour (Horloge).
- **Réservé aux parents** : passer au moment suivant, afficher un autre moment, lancer les histoires, avancer le rituel (tableau de bord de l'espace parent).
- **Heure en chiffres** sur l’écran de l’enfant (l’horloge à aiguilles a été retirée en 1.6.1).
- **Écran toujours allumé** : Wake Lock, ou vidéo muette en boucle si le navigateur le refuse (`assets/awake.mp4`).
- **Animations** dans l'espace parent : tous les moments et écrans spéciaux, en vignettes et en plein écran.
- **16 histoires** de 1 à 10 minutes, durée affichée avec 1 à 3 lunes, et une ambiance sonore générée sous la voix (pluie, vagues, grillons, vent, ruisseau, feu de bois, forêt, boîte à musique).

## Version 1.6

- **Pendant les histoires** (appui long sur la lune) : histoire suivante, couper ou remettre l'ambiance (la coupure vaut pour la soirée), arrêter les histoires et passer à la nuit. Bouton « Ambiance » aussi sur l'écran de lecture.
- **Audit UX** : bouton « C'est parti » toujours visible au choix des histoires, onglets simplifiés pour l'enfant, barre de temps sur les étapes du rituel, frise sur une ligne, mise en page portrait (accueil, lecture), titres de l'espace parent cohérents, réglages de la journée dans un ordre logique (horaires d'abord), étiquettes de voix seulement pour les voix de la famille.

## Version 1.8

- **Sons pour dormir** inspirés des veilleuses musicales : berceuse de Brahms (domaine public), mélodie douce originale, « ventre de maman », arrêt après 30 min possible. L'animal respire lentement la nuit.
- **Lancer la nuit = tout régler au même endroit** : histoires (je choisis / l'enfant choisit combien / sans), son après les histoires, durée, lumière. Les choix sont gardés pour la fois suivante : la première nuit sert d'installation.
- **Paroles de l'animal** : phrases bienveillantes et variées pour chaque moment, avec ce qui vient après ; aussi pour l'annonce vocale des moments.
