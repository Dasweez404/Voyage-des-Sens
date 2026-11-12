# Voyage des Sens

Appli mobile (PWA, 100 % hors-ligne) qui transforme un lieu ou une ambiance en parfum : animation de
création, illustration du lieu, flacon, puis formule détaillée (pyramide olfactive, répartition, signature).

## Mobile et ordinateur

Une seule appli, une seule adresse : la mise en page s'adapte toute seule à la largeur de la fenêtre.
- **Téléphone** : barre d'onglets en bas, une colonne.
- **Ordinateur** (détecté si la fenêtre fait ≥ 960 px, ou ≥ 720 px avec une souris) : barre latérale, grilles multi-colonnes, création en deux colonnes, résultat avec image fixe à gauche, fenêtre modale pour les senteurs, survols, glisser à la souris dans les carrousels.
- Forçage : `?view=desktop`, `?view=mobile` ou `?view=auto` dans l'adresse, ou « Affichage » dans Préférences.
- Clavier : `Échap` ferme la couche du dessus, `/` lance la recherche, `1` à `5` changent d'onglet.

## Versions et cache

Après chaque modification, lancer `node tools/stamp.js` : il numérote tous les fichiers (`?v=…`) et le cache hors-ligne, pour qu'un navigateur ne mélange jamais une page récente avec d'anciens scripts. Le service worker interroge toujours le réseau en priorité (revalidation forcée) et ne sert le cache que hors-ligne.

## Lancer

Aucune dépendance, aucun build. Servir le dossier en HTTP puis ouvrir `index.html` sur mobile :

```bash
python3 -m http.server 8000      # puis http://localhost:8000
```

Sur téléphone : « Ajouter à l'écran d'accueil » pour l'installer (le service worker met tout en cache).

## Contenu

- **111 lieux préfaits** : Intérieurs (chalet, bibliothèque, hôpital, gare, école…), Particuliers (station-service,
  fête foraine, cirque, ferme…), Voyage (marché oriental, volcan, jungle, pizzeria new-yorkaise…) et Souvenirs.
- **549 senteurs** réparties en 18 familles (hespéridés, floraux, boisés, gourmands, marins, minéraux, boissons & sirops, confiseries…) : cola, grenadine, chips paprika, pop-corn, barbe à papa, violette, caramel, cuir….
- **Sous-catégories** pour filtrer les lieux : 4 ou 5 par catégorie (Cocon & chaleur, Mers & îles, Goûters & douceurs…).
- **Quiz olfactif** (onglet sous Créer) : 9 questions (moment, lieu, une précision qui s'adapte au lieu — rivage, forêt, altitude, ville…, saison, envies, histoire, gourmandise, matières, présence). Il aboutit à **une destination** choisie parmi les 111 (classement selon le type de lieu, la saison, l'ambiance, l'histoire et les matières), avec son itinéraire olfactif, les notes qui correspondent au profil, « Un cran sous… » qui explique l'écart avec la première, « Autre destination » (4 meilleures), cœur pour garder la destination (section « Destinations gardées » de la Collection), bouton de partage (image PNG) et le parfum de la destination (lieu préfait rattaché, sinon une formule composée pour elle, toujours la même) via « Le sentir ». Les allergies et senteurs écartées pénalisent le classement et sont barrées sur la fiche.
- **Création sur mesure** : texte libre, directions (nostalgie, découverte, voyage, exotisme), 18 ambiances,
  senteurs au choix, richesse de la formule.
- **111 destinations réelles** (Chamonix, Marrakech, Kyoto, Bora Bora, La Havane…) : chaque parfum reçoit la destination dont l'air lui ressemble le plus, avec un bouton « Découvrir ma destination » (affinité olfactive, itinéraire en trois moments, période, carte) et un bouton « Autre destination ».
- **Préférences** : 16 groupes d'allergies et d'intolérances (agrumes, fruits à coque, lait, gluten, alcools…), familles entières ou senteurs précises à éviter. Ces senteurs n'apparaissent ni dans le sélecteur ni dans les formules ; les lieux préfaits sont adaptés en remplaçant chaque note écartée par la plus proche.
- Collection locale, variation d'un parfum, partage de la formule.

## Cohérence des formules

`js/notes.js` définit des accords classiques (affinités) et des dissonances entre familles.
`js/engine.js` choisit les notes par couche (cœur → fond → tête) en pénalisant les familles qui se contredisent,
impose toujours un fond tenace, calcule les pourcentages et un indice de cohérence.
Les lieux préfaits sont écrits à la main avec les mêmes règles.

```bash
node tools/validate.js    # ids, couches (3 à 5 notes par temps), aucune note > 16 %, motifs, harmonie, préférences
node tools/audit.js notes # relecture du catalogue par famille et par temps
node tools/audit.js scenes # relecture de toutes les formules
```

## Structure

| Fichier | Rôle |
| --- | --- |
| `js/notes_extra.js` | boissons, sirops, chips, snacks, confiseries, pâtisseries, fleurs, quotidien |
| `js/notes.js` | familles, ambiances, règles d'accords, 549 notes |
| `js/scenes.js` | 111 lieux (palette, illustration, notes) |
| `js/prefs.js` | groupes d'allergies et d'intolérances |
| `js/destinations.js` | 111 destinations, étapes olfactives, lieu → destination |
| `js/art.js` | moteur d'illustrations SVG animées + flacon (aucune image externe) |
| `js/quiz.js` | questions du quiz et traduction des réponses en paramètres |
| `js/engine.js` | composition, statistiques, histoire, analyse du texte libre |
| `js/app.js` | écrans, animation de création, résultat, collection |
| `sw.js` | cache hors-ligne |

Ajouter un lieu : une ligne dans `js/scenes.js` (`id|cat|nom|emoji|accroche|palette|illustration|notes`),
puis `node tools/validate.js`.

## Tests

- `node tools/validate.js` : cohérence des données (notes, lieux, destinations, quiz).
- `node tools/e2e.js` : parcours complet dans un navigateur (nécessite Playwright) — quiz mobile et ordinateur, favoris, partage, allergies, clavier, hors-ligne.
