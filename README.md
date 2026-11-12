# Voyage des Sens

Appli mobile (PWA, 100 % hors-ligne) qui transforme un lieu ou une ambiance en parfum : animation de
création, illustration du lieu, flacon, puis formule détaillée (pyramide olfactive, répartition, signature).

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
- **Création sur mesure** : texte libre, directions (nostalgie, découverte, voyage, exotisme), 18 ambiances,
  senteurs au choix, richesse de la formule.
- **70 destinations réelles** (Chamonix, Marrakech, Kyoto, Bora Bora, La Havane…) : chaque parfum reçoit la destination dont l'air lui ressemble le plus, avec un bouton « Découvrir ma destination » (affinité olfactive, itinéraire en trois moments, période, carte) et un bouton « Autre destination ».
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
| `js/destinations.js` | 70 destinations, étapes olfactives, lieu → destination |
| `js/art.js` | moteur d'illustrations SVG animées + flacon (aucune image externe) |
| `js/engine.js` | composition, statistiques, histoire, analyse du texte libre |
| `js/app.js` | écrans, animation de création, résultat, collection |
| `sw.js` | cache hors-ligne |

Ajouter un lieu : une ligne dans `js/scenes.js` (`id|cat|nom|emoji|accroche|palette|illustration|notes`),
puis `node tools/validate.js`.
