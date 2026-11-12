/* Voyage des Sens — base olfactive
   Format d'une note : id|Nom|famille|couche|emoji|tags|description
   couche : T = tête, C = cœur, F = fond                              */
(function (G) {
  'use strict';

  const FAMILIES = {
    ag: { n: 'Hespéridé', c: '#f6c945', e: '🍋' },
    fr: { n: 'Fruité', c: '#f0707a', e: '🍑' },
    fl: { n: 'Floral', c: '#e88fb8', e: '🌸' },
    ve: { n: 'Vert', c: '#6dbe6a', e: '🌿' },
    ar: { n: 'Aromatique', c: '#58b3a0', e: '🌱' },
    ep: { n: 'Épicé', c: '#d2622a', e: '🌶️' },
    go: { n: 'Gourmand', c: '#c98b5a', e: '🍮' },
    cu: { n: 'Culinaire', c: '#d9503f', e: '🍕' },
    bo: { n: 'Boisé', c: '#8a5a3b', e: '🪵' },
    re: { n: 'Résineux', c: '#b8923a', e: '🕯️' },
    am: { n: 'Ambré', c: '#e0952f', e: '🟠' },
    mu: { n: 'Musqué', c: '#d9c2d8', e: '🤍' },
    ma: { n: 'Aquatique', c: '#4fb3d9', e: '🌊' },
    te: { n: 'Terreux', c: '#7a6a4f', e: '🍄' },
    cr: { n: 'Cuiré-Fumé', c: '#6a4338', e: '🔥' },
    mi: { n: 'Minéral', c: '#9fb0bd', e: '🪨' },
    bv: { n: 'Boissons & sirops', c: '#3fc8c0', e: '🥤' },
    co: { n: 'Confiseries', c: '#ff7eb6', e: '🍭' }
  };

  // Ambiances (adjectifs) et directions : ce sont aussi les « tags » des notes
  const MOODS = [
    ['rec', 'Réconfortant', '🧸'], ['fra', 'Frais', '💧'], ['cha', 'Chaleureux', '🔥'],
    ['mys', 'Mystérieux', '🌙'], ['lum', 'Lumineux', '☀️'], ['sau', 'Sauvage', '🐺'],
    ['dou', 'Doux', '🪶'], ['int', 'Intense', '💥'], ['rom', 'Romantique', '💞'],
    ['ene', 'Énergique', '⚡'], ['apa', 'Apaisant', '🍃'], ['lux', 'Luxueux', '💎'],
    ['joy', 'Joyeux', '🎈'], ['pou', 'Poudré', '☁️'], ['fum', 'Fumé', '🌫️'],
    ['sal', 'Salin', '🌊'], ['epi', 'Épicé', '🌶️'], ['suc', 'Sucré', '🍬']
  ];
  const DIRECTIONS = [
    ['nos', 'Nostalgie', '📼', 'Souvenirs d\'enfance, objets d\'avant, douceur du temps qui passe'],
    ['dec', 'Découverte', '🧭', 'Sentiers inconnus, matières brutes, curiosité en éveil'],
    ['voy', 'Voyage', '✈️', 'Départs, escales, horizons qui changent à chaque kilomètre'],
    ['exo', 'Exotisme', '🌴', 'Îles lointaines, souks, fleurs rares et chaleur des tropiques']
  ];

  // Affinités (accords classiques) et dissonances entre familles
  const AFF = ('ag-ar,ag-ve,ag-fl,ag-ma,ag-bo,ag-ep,ag-mu,fr-fl,fr-go,fr-mu,fr-ag,fr-ve,fr-am,fl-mu,fl-bo,fl-ve,fl-am,fl-ep,fl-go,fl-re,' +
    'ar-bo,ar-ve,ar-te,ar-re,ar-mu,ar-ma,ar-ep,ep-am,ep-bo,ep-go,ep-re,ep-cr,ep-cu,ep-ag,go-am,go-bo,go-mu,go-re,go-cr,go-cu,' +
    'bo-am,bo-re,bo-mu,bo-te,bo-cr,bo-ma,re-am,re-cr,re-te,re-mu,am-mu,am-cr,ma-mu,ma-mi,ve-ma,ve-mi,ve-te,mi-bo,mi-mu,te-cr,te-mi,' +
    'cu-am,cu-bo,cu-ar,cu-te,cr-mu,mi-ag,' +
    'bv-ag,bv-fr,bv-go,bv-ar,bv-fl,bv-ep,bv-co,bv-am,bv-cr,bv-bo,bv-ve,bv-mu,co-go,co-fr,co-fl,co-mu,co-am,co-ag,co-cu').split(',');
  const CLASH = ('ma-go,ma-am,ma-ep,ma-cr,ma-cu,ag-te,ve-am,cu-fl,cu-mu,fl-cr,ma-re,co-ma,co-te,co-cr,bv-te,bv-re').split(',');
  const pairKey = (a, b) => (a < b ? a + '-' + b : b + '-' + a);
  const AFFSET = new Set(AFF.map(p => { const [a, b] = p.split('-'); return pairKey(a, b); }));
  const CLASHSET = new Set(CLASH.map(p => { const [a, b] = p.split('-'); return pairKey(a, b); }));
  // Retourne +1 (affinité), -1 (dissonance), 0 (neutre) ; même famille : +0.5
  function pairScore(fa, fb) {
    if (fa === fb) return 0.5;
    const k = pairKey(fa, fb);
    if (AFFSET.has(k)) return 1;
    if (CLASHSET.has(k)) return -1;
    return 0;
  }

  const RAW = `
bergamote|Bergamote|ag|T|🍋|fra,lum,ene|zeste vif, floral et acidulé
citron|Citron|ag|T|🍋|fra,lum,ene,joy|pétillant, franc, tonique
citronvert|Citron vert|ag|T|🟢|fra,ene,exo|acide, piquant, tropical
mandarine|Mandarine|ag|T|🍊|joy,lum,dou,nos|sucrée, juteuse, enfantine
orange|Orange douce|ag|T|🍊|joy,cha,rec,nos|zeste ensoleillé et sucré
pamplemousse|Pamplemousse|ag|T|🍊|fra,ene,lum|amer, pétillant, rosé
yuzu|Yuzu|ag|T|🍋|fra,dec,exo,lum|agrume japonais, aigre-doux
cedrat|Cédrat|ag|T|🍋|fra,lux,lum|zeste épais, parfumé, méditerranéen
orangesang|Orange sanguine|ag|T|🍊|joy,suc,int|rouge, juteuse, légèrement amère
kumquat|Kumquat|ag|T|🍊|joy,dec,exo|petit agrume croquant, zesté
combava|Combava|ag|T|🟢|exo,fra,dec,int|feuille et zeste, vif et exotique
clementine|Clémentine|ag|T|🍊|joy,nos,rec,dou|douceur de Noël
bigarade|Bigarade|ag|T|🍊|fra,dec,lux|orange amère, brillante
citronconfit|Citron confit|ag|C|🍋|exo,cha,voy,dec|salé-sucré, tajine, soleil
pommeverte|Pomme verte|fr|T|🍏|fra,joy,nos|croquante, acidulée
poire|Poire|fr|T|🍐|dou,joy,fra|juteuse, tendre, transparente
cassis|Cassis|fr|T|🫐|int,dec,fra|bourgeon et baie sombre
framboise|Framboise|fr|C|🍓|joy,suc,rom|acidulée, sucrée, rouge
fraise|Fraise|fr|C|🍓|joy,suc,nos|gourmande, fraîche, d'été
peche|Pêche|fr|C|🍑|dou,rom,suc,lum|veloutée, fondante
abricot|Abricot|fr|C|🍑|cha,dou,nos,lum|duveteux, solaire, doux
cerise|Cerise|fr|C|🍒|joy,suc,rom,nos|rouge vif, amandée
ceriseno|Cerise noire|fr|C|🍒|int,mys,suc|sombre, alcoolisée, profonde
figue|Figue|fr|C|🍇|dou,apa,dec,rec|lait de figue, vert et crémeux
mure|Mûre|fr|C|🫐|sau,suc,dec|sauvage, sombre, juteuse
myrtille|Myrtille|fr|C|🫐|dou,joy,sau,dec|sous-bois sucré
mangue|Mangue|fr|C|🥭|exo,joy,suc,cha|charnue, solaire, tropicale
ananas|Ananas|fr|T|🍍|exo,joy,ene,fra|juteux, acidulé, tropical
passion|Fruit de la passion|fr|T|🟡|exo,ene,joy,int|acide, tropical, vibrant
litchi|Litchi|fr|T|🍬|exo,rom,fra,dou|perlé, rose, délicat
banane|Banane|fr|C|🍌|exo,joy,nos,dou|mûre, crémeuse, enfantine
melon|Melon|fr|T|🍈|fra,sal,joy|aqueux, vert, estival
pasteque|Pastèque|fr|T|🍉|fra,joy,ene|aqueuse, croquante, rafraîchissante
raisin|Raisin|fr|C|🍇|dou,cha,rec,dec|muscat sucré, vendanges
prune|Prune|fr|C|🍑|cha,suc,rec,nos|confiture sombre et velours
rhubarbe|Rhubarbe|fr|T|🌱|fra,dec,ene,nos|acide, végétale, jardin
groseille|Groseille|fr|T|🍒|fra,joy,nos|acidulée, perlée
goyave|Goyave|fr|C|🍈|exo,suc,joy,cha|parfumée, rose, tropicale
papaye|Papaye|fr|C|🥭|exo,dou,cha|molle, musquée, tropicale
datte|Datte|fr|F|🌴|exo,cha,suc,lux|miel sombre du désert
noixcoco|Noix de coco|fr|C|🥥|exo,joy,cha,suc|lactée, solaire, crème solaire
grenade|Grenade|fr|C|🍎|mys,rom,dec,exo|rouge, acidulée, orientale
pommemure|Pomme mûre|fr|C|🍎|rec,nos,cha,dou|verger d'automne, sucre doré
rose|Rose|fl|C|🌹|rom,lux,dou,nos|pétale velouté, ambré
rosedamas|Rose de Damas|fl|C|🌹|exo,lux,int,rom|rose miellée, orientale
jasmin|Jasmin|fl|C|🌼|rom,int,lux,cha|blanc, capiteux, indolé
sambac|Jasmin sambac|fl|C|🌼|exo,rom,int|solaire, fruité, thé vert
tubereuse|Tubéreuse|fl|C|🤍|int,rom,lux,mys|crémeuse, vénéneuse, nocturne
ylang|Ylang-ylang|fl|C|🌼|exo,cha,rom,int|banane-vanille, onctueux
neroli|Néroli|fl|T|🌸|fra,lum,lux,apa|eau de fleur d'oranger, vive
fleuroranger|Fleur d'oranger|fl|C|🌸|dou,nos,pou,rom,rec|blanche, miellée, douce
muguet|Muguet|fl|C|🌿|fra,pou,nos,joy,dou|clair, vert et pur
violette|Violette|fl|C|💜|pou,nos,dou,rom|poudrée, sucrée, ionone
iris|Iris|fl|C|💜|pou,lux,dou,mys|racine, poudre, beurre
pivoine|Pivoine|fl|C|🌸|rom,fra,dou,joy|rose frais, aqueux
freesia|Freesia|fl|T|🌷|fra,lum,joy|citronné, doux, vert
magnolia|Magnolia|fl|C|🤍|lum,dou,lux,exo|crémeux, citronné
gardenia|Gardénia|fl|C|🤍|int,rom,exo,lux|blanc, crémeux, lacté
heliotrope|Héliotrope|fl|C|💜|dou,pou,nos,suc|amande, vanille, poudre
mimosa|Mimosa|fl|C|🌼|lum,pou,nos,joy,dou|duveteux, miellé, ensoleillé
lilas|Lilas|fl|C|💜|dou,nos,fra,rom|printanier, vert et poudré
jacinthe|Jacinthe|fl|T|💐|fra,dou,lum|verte, froide, entêtante
tiare|Tiaré|fl|C|🌺|exo,joy,cha,suc|gardénia tahitien, monoï
frangipanier|Frangipanier|fl|C|🌺|exo,cha,dou,rom|crémeux, pêche et coco
osmanthus|Osmanthus|fl|C|🌼|dec,exo,dou,lum|abricot, cuir doux, thé
fleurcoton|Fleur de coton|fl|C|☁️|pou,dou,apa|duveteuse, propre, douce
lotus|Lotus|fl|C|🪷|apa,exo,fra,dec|aquatique, laiteux, zen
cerisier|Fleur de cerisier|fl|C|🌸|dou,rom,dec,exo|amandée, tendre, printanière
geranium|Géranium|fl|C|🌺|fra,sau,dec|rosé, mentholé, vert
chevrefeuille|Chèvrefeuille|fl|C|🌼|dou,joy,nos|miel et vert, haies d'été
glycine|Glycine|fl|C|💜|rom,dou,nos|grappes sucrées, poudrées
oeillet|Œillet|fl|C|🌺|epi,cha,nos,rom|poivré, clouté, rétro
cyclamen|Cyclamen|fl|T|🌸|fra,dou,apa|aqueux, doux, rosé
tilleul|Fleur de tilleul|fl|C|🌼|apa,dou,rec,nos|tisane miellée, estivale
camomille|Camomille|fl|C|🌼|apa,rec,dou,nos|pomme séchée, tisane
pommier|Fleur de pommier|fl|T|🌸|dou,fra,nos|verger au printemps
hibiscus|Hibiscus|fl|C|🌺|exo,joy,fra|acidulé, rouge, bissap
narcisse|Narcisse|fl|C|🌼|sau,mys,int|vert, animal, foin
lys|Lys|fl|C|🤍|lux,int,rom|blanc, solennel, épicé
immortelle|Immortelle|fl|C|🌼|cha,dec,sau,exo|curry doux, miel, maquis
bleuet|Bleuet|fl|T|💙|fra,nos,dou|champêtre, discret
fleurschamps|Fleurs des champs|fl|C|🌾|joy,nos,dec,lum|prairie en juillet
genet|Genêt|fl|C|🌼|lum,sau,dec|miel doré, coco, falaises
monoi|Monoï|fl|C|🥥|exo,dou,cha,joy|coco et tiaré, peau dorée
eaurose|Eau de rose|fl|T|💧|exo,dou,rom,fra|distillée, hammam, délicate
herbecoupee|Herbe coupée|ve|T|🌱|fra,joy,nos,ene|tonte fraîche, verte
feuilletomate|Feuille de tomate|ve|T|🍅|fra,sau,dec|piquante, verte, potager
feuillefiguier|Feuille de figuier|ve|C|🌿|dou,dec,apa|laiteuse, verte, coco
thevert|Thé vert|ve|T|🍵|fra,apa,dec,exo|vif, tannique, zen
matcha|Matcha|ve|C|🍵|apa,dec,exo,dou|végétal, crémeux, poudre verte
galbanum|Galbanum|ve|T|🌿|sau,fra,int|sève verte, tranchante
bambou|Bambou|ve|C|🎋|apa,fra,dec,exo|tige humide, aérien
foin|Foin|ve|F|🌾|cha,rec,nos,sau|séché, coumarinique, doux
trefle|Trèfle|ve|T|🍀|fra,joy,nos|pré humide, fleuri
fougere|Fougère|ve|C|🌿|sau,fra,apa,dec|sous-bois, frais et humide
concombre|Concombre|ve|T|🥒|fra,apa,sal|aqueux, croquant
celeri|Céleri|ve|T|🌿|fra,dec|vert, salin, tonique
citronnelle|Citronnelle|ve|T|🌿|exo,fra,ene,dec|herbe citronnée asiatique
theblanc|Thé blanc|ve|C|🍵|apa,dou,lum,pou|soyeux, propre, clair
feuillecassis|Feuille de cassis|ve|T|🌿|fra,sau,dec|verte, animale, piquante
roseau|Roseau|ve|C|🌾|apa,sal,sau|rivière, tige verte
feuillesfroissees|Feuilles froissées|ve|T|🍃|fra,sau,dec|vert vif, sève
olivier|Feuille d'olivier|ve|C|🫒|dec,voy,apa|sèche, méditerranéenne
paille|Paille|ve|F|🌾|cha,rec,nos|chaude, séchée, grange
lavande|Lavande|ar|C|💜|apa,rec,nos,fra|provençale, camphrée, propre
romarin|Romarin|ar|T|🌿|fra,dec,sau,ene|résineux, camphré, garrigue
thym|Thym|ar|C|🌿|sau,dec,cha|chaud, herbacé, sec
basilic|Basilic|ar|T|🌿|fra,dec,ene|vert, anisé, poivré
mentheP|Menthe poivrée|ar|T|🌿|fra,ene,joy|glaciale, mentholée
mentheV|Menthe verte|ar|T|🌿|fra,joy,ene|douce, fraîche, sucrée
sauge|Sauge sclarée|ar|C|🌿|cha,mys,dou|ambrée, herbacée, vineuse
eucalyptus|Eucalyptus|ar|T|🌿|fra,apa,dec|médicinal, frais, bleuté
estragon|Estragon|ar|T|🌿|fra,dec|anisé, vert, vif
origan|Origan|ar|C|🌿|cha,dec,voy,rec|pizzeria, soleil sec
armoise|Armoise|ar|C|🌿|mys,sau,dec|amère, absinthée
verveine|Verveine|ar|T|🌿|fra,apa,nos,dou|tisane citronnée
laurier|Laurier|ar|C|🌿|cha,dec,voy|poivré, feuille chaude
marjolaine|Marjolaine|ar|C|🌿|cha,rec,dou|douce, herbacée
coriandre|Coriandre fraîche|ar|T|🌿|fra,exo,dec,ene|fraîche, citronnée
fenouil|Fenouil|ar|T|🌿|fra,dec,voy|anisé, frais
genievre|Genièvre|ar|T|🫐|fra,sau,dec|baie sombre, gin, résineux
theMenthe|Thé à la menthe|ar|C|🍵|exo,fra,cha,voy|menthe sucrée, souk
poivrenoir|Poivre noir|ep|T|⚫|epi,int,ene,cha|sec, chaud, piquant
poivrerose|Baie rose|ep|T|🌸|epi,fra,joy|poivrée, fruitée, aérée
cardamome|Cardamome|ep|C|🟢|epi,exo,cha,lum|verte, camphrée, chaï
cannelle|Cannelle|ep|C|🟤|epi,cha,rec,nos,suc|chaude, sucrée, Noël
girofle|Clou de girofle|ep|C|🟤|epi,int,cha,nos|dentiste, œillet, chaud
muscade|Muscade|ep|C|🟤|epi,cha,rec|noix chaude, boisée
safran|Safran|ep|C|🟠|epi,lux,exo,mys|cuiré, métallique, miel
gingembre|Gingembre|ep|T|🫚|epi,ene,exo,fra|racine piquante, vive
cumin|Cumin|ep|C|🟤|epi,sau,exo,int|chaud, charnel, souk
curcuma|Curcuma|ep|C|🟡|epi,exo,cha,dec|terreux, poudre d'or
piment|Piment|ep|T|🌶️|epi,int,ene|brûlant, rouge
anis|Anis étoilé|ep|C|⭐|epi,cha,exo,nos|réglisse, douceur chinoise
sichuan|Poivre de Sichuan|ep|T|🌶️|epi,exo,ene,dec|citronné, électrique
paprika|Paprika|ep|C|🌶️|epi,cha,voy|doux, fumé, rouge
curry|Curry|ep|C|🍛|epi,exo,int,cha|mélange chaud, safrané
carvi|Carvi|ep|C|🟤|epi,sau,nos|graines de pain de seigle
macis|Macis|ep|C|🟠|epi,lux|muscade fine, ambrée
quatreepices|Quatre-épices|ep|C|🟤|epi,cha,rec,nos|pain d'épices, chaleureux
vanille|Vanille|go|F|🍦|suc,cha,rec,nos,dou|crémeuse, ambrée, enveloppante
tonka|Fève tonka|go|F|🟤|suc,cha,dou,nos|amande, foin, vanille
caramel|Caramel|go|F|🍮|suc,cha,joy,nos|sucre brûlé, beurre
chocolatnoir|Chocolat noir|go|F|🍫|int,suc,cha,mys|cacao amer, profond
cacao|Cacao|go|C|🍫|cha,rec,suc,nos|poudre brune, amère
cafe|Café|go|C|☕|cha,int,ene,rec|torréfié, noir, aromatique
espresso|Espresso|go|C|☕|int,ene,voy|serré, crema, torréfié
praline|Praliné|go|F|🌰|suc,cha,nos,rec|noisette caramélisée
noisette|Noisette|go|C|🌰|cha,rec,nos,dou|beurrée, grillée
amande|Amande|go|C|🌰|dou,nos,pou,rec|lactée, douce
pistache|Pistache|go|C|🌰|dou,dec,voy|verte, crémeuse
miel|Miel|go|C|🍯|dou,suc,cha,rec|doré, floral, cireux
sucreglace|Sucre glace|go|F|🍬|suc,dou,pou,nos|poudre blanche, douceur
barbapapa|Barbe à papa|go|T|🍬|suc,joy,nos|sucre filé rose, fête foraine
guimauve|Guimauve|go|C|☁️|suc,dou,nos,joy|moelleuse, sucrée
painepices|Pain d'épices|go|C|🍞|suc,epi,cha,rec,nos|miel, cannelle, Noël
biscuit|Biscuit|go|C|🍪|suc,dou,rec,nos|sablé, beurré
brioche|Brioche|go|C|🥐|cha,dou,rec,nos|pâte dorée, beurre, œuf
beurre|Beurre|go|C|🧈|dou,rec,cha|lacté, gras, rond
lait|Lait chaud|go|C|🥛|dou,apa,rec,nos|crémeux, rond, enfantin
creme|Crème|go|C|🍨|dou,rec|onctueuse, lactée
popcorn|Pop-corn|go|C|🍿|joy,cha,nos,suc|beurre, sucre, cinéma
pecan|Noix de pécan|go|F|🌰|suc,cha,rec|grillée, caramélisée
rizlait|Riz au lait|go|C|🍚|dou,rec,nos,apa|tendre, vanillé
cassonade|Cassonade|go|F|🍬|suc,cha,rec,nos|sucre roux
erablesirop|Sirop d'érable|go|F|🍁|suc,cha,rec|boisé, caramel, nordique
patemande|Pâte d'amande|go|F|🌰|suc,dou,nos|massepain
cremebrulee|Crème brûlée|go|F|🍮|suc,cha,lux|vanille caramélisée
meringue|Meringue|go|C|🤍|suc,dou,joy|sucre blanc, aérien
reglisse|Réglisse|go|C|⚫|suc,epi,nos,mys|anisée, sombre, bonbon
bonbon|Bonbon acidulé|go|T|🍬|joy,suc,nos|sucre fruité, enfance
chewinggum|Chewing-gum|go|T|🍬|joy,suc,nos|menthe rose, enfance
marronglace|Marron glacé|go|F|🌰|suc,cha,rec,lux|châtaigne sucrée
nougat|Nougat|go|F|🍬|suc,cha,voy|miel, amande, foire
crepe|Pâte à crêpes|go|C|🥞|cha,rec,nos,joy|beurre, farine, vanille
sesame|Sésame grillé|go|C|🌰|cha,exo,dec,rec|gras, grillé
chai|Thé chaï|go|C|🍵|epi,cha,exo,rec|lait, cannelle, cardamome
rhum|Rhum|go|C|🥃|cha,int,exo,suc|canne, boisé, vanillé
amaretto|Amaretto|go|C|🥃|suc,voy,cha|amande amère, liqueur
whisky|Whisky|go|C|🥃|int,fum,cha,lux|tourbé, vanillé, chêne
cognac|Cognac|go|C|🥃|lux,cha,int|fût, raisin, vieilli
colle|Colle blanche|go|C|📎|nos,dou,pou|amande lactée, cartable
tomatecuite|Tomate cuite|cu|C|🍅|cha,voy,rec,dec|sauce mijotée, sucrée
ail|Ail rôti|cu|F|🧄|cha,int,voy|doux, grillé
patepizza|Pâte à pizza|cu|F|🍕|cha,rec,voy,nos|farine, levure, four à bois
mozzarella|Mozzarella|cu|C|🧀|dou,rec,voy|lactée, fondante
huileolive|Huile d'olive|cu|C|🫒|dec,voy,cha|verte, poivrée, fruitée
soja|Sauce soja|cu|F|🥢|exo,dec,int,cha|salée, fermentée, umami
rizbasmati|Riz basmati|cu|C|🍚|exo,dou,rec,cha|vapeur, noix, popcorn
bouillon|Bouillon|cu|C|🍜|cha,rec,exo|umami, chaud, parfumé
painchaud|Pain chaud|cu|F|🥖|cha,rec,nos,dou|croûte dorée, mie tiède
beurrenoisette|Beurre noisette|cu|F|🧈|cha,rec,nos|doré, grillé
laitcoco|Lait de coco|cu|C|🥥|exo,dou,cha|crémeux, sucré, curry thaï
fromage|Fromage fondu|cu|C|🧀|cha,rec,voy|raclette, lacté, gras
friture|Beignet frit|cu|F|🍩|joy,cha,nos,suc|sucre, huile chaude, kermesse
grillade|Grillade|cu|F|🍖|cha,fum,int|viande saisie, braise
vinchaud|Vin chaud|cu|C|🍷|cha,epi,rec,nos|vin, orange, épices
cidre|Cidre|cu|T|🍎|joy,nos,fra|pomme pétillante, rustique
nouilles|Nouilles sautées|cu|F|🍜|exo,cha,voy|wok, sésame, vapeur
cedre|Cèdre|bo|F|🌲|cha,apa,lux|crayon taillé, sec, droit
santal|Santal|bo|F|🪵|dou,cha,lux,apa,rom|laiteux, crémeux, sacré
vetiver|Vétiver|bo|F|🌿|sau,fra,dec,lux|racine, terre, fumée
gaiac|Bois de gaïac|bo|F|🪵|fum,mys,cha|fumé, sucré, résiné
boisrose|Bois de rose|bo|C|🪵|dou,rom,fra|fleuri, boisé, tendre
cypres|Cyprès|bo|C|🌲|fra,dec,sau,apa|sec, vert, méditerranéen
pin|Pin|bo|T|🌲|fra,sau,dec,rec|résine fraîche, forêt
sapin|Sapin|bo|C|🎄|fra,rec,nos,joy|Noël, aiguilles, résine
oud|Oud|bo|F|🪵|mys,int,exo,lux,fum|animal, fumé, précieux
bouleau|Bouleau|bo|F|🪵|fum,sau,dec|écorce, cuir, goudron
chene|Chêne|bo|F|🪵|cha,rec,sau|fût, tannin, solide
cachemire|Bois de cachemire|bo|F|🪵|dou,cha,pou,apa|boisé, doux, velouté
boisflotte|Bois flotté|bo|F|🪵|sal,apa,dec,voy|sec, salé, blanchi
boismouille|Bois mouillé|bo|C|🪵|apa,sau,fra|humide, pluie sur bois
sciure|Sciure|bo|F|🪵|cha,rec,nos|atelier, copeaux dorés
erable|Érable|bo|F|🍁|cha,rec,dou|bois clair, sucré, canadien
noyer|Noyer|bo|F|🪵|cha,rec,nos,lux|bois de meubles, huilé
teck|Teck|bo|F|🪵|exo,cha,voy|bois huilé, exotique
acajou|Acajou|bo|F|🪵|lux,cha,nos|rouge, ciré
buis|Buis|bo|C|🌳|fra,nos,dec|verdoyant, jardin à la française
encens|Encens|re|F|🕯️|mys,apa,fum,nos|mystique, fumée blanche, église
myrrhe|Myrrhe|re|F|🕯️|mys,int,exo|amère, médicinale, sacrée
benjoin|Benjoin|re|F|🕯️|cha,suc,rec,dou|vanillé, baume, doux
labdanum|Labdanum|re|F|🕯️|cha,int,mys,sau|ambré, cuiré, résine de ciste
perou|Baume du Pérou|re|F|🍯|cha,suc,rec,dou|vanille, cannelle, baume
tolu|Baume de Tolu|re|F|🍯|cha,dou,suc|miel balsamique
elemi|Élémi|re|T|🕯️|fra,dec,mys|citronné, résine poivrée
opoponax|Opoponax|re|F|🕯️|cha,suc,mys,exo|sucré, ambré
sevepin|Sève de pin|re|C|🌲|rec,sau,cha,fra|résine collante, forêt
copal|Copal|re|F|🕯️|mys,exo,fra,dec|encens pâle, citronné
mastic|Mastic|re|C|🕯️|dec,voy,fra|résine grecque, vert
styrax|Styrax|re|F|🕯️|cha,fum,mys|baume, cuir, fumé
cire|Cire d'abeille|re|F|🐝|cha,rec,dou,nos|miel, bougie, ruche
propolis|Propolis|re|F|🐝|cha,sau,dec|résine d'abeille, ambrée
cireparquet|Cire à parquet|re|F|🪵|nos,rec,cha|encaustique, vieux plancher
ambre|Ambre|am|F|🟠|cha,lux,dou,mys|doré, chaud, oriental
ambregris|Ambre gris|am|F|🌊|mys,lux,sal,dou|marin, animal, cuir clair
ambroxan|Ambroxan|am|F|✨|lux,lum,cha,sal|minéral, boisé, chaud
tabacblond|Tabac blond|am|F|🍂|cha,nos,rec,mys|miel, foin, feuille séchée
tabac|Tabac|am|F|🍂|fum,cha,int,nos|feuille fermentée, pipe
mielfonce|Miel de sarrasin|am|F|🍯|cha,suc,int|sombre, animal, malté
muscblanc|Musc blanc|mu|F|🤍|dou,apa,lum|cotonneux, propre, tendre
musc|Musc|mu|F|🤍|dou,cha,rom|peau chaude, animal doux
muscrose|Musc de rose|mu|F|🌸|dou,rom,pou|poudre rose, tendre
peauchaude|Peau chaude|mu|F|🧡|dou,cha,rom,exo|peau ensoleillée, salée
poudreriz|Poudre de riz|mu|F|🤍|pou,nos,dou,rom|poudrier, rétro, douce
talc|Talc|mu|F|🤍|pou,nos,dou|bébé, poudré, doux
lingepropre|Linge propre|mu|T|🧺|fra,apa,nos,rec|lessive, séché au vent
savon|Savon de Marseille|mu|C|🧼|fra,nos,apa,rec|propre, olive, mousse
draps|Draps frais|mu|C|🛏️|apa,rec,dou,fra|coton, repassé, doux
lin|Lin|mu|C|🧵|apa,fra,dec,dou|toile, séché au soleil
papier|Papier|mu|C|📄|nos,apa,dec|feuille neuve, sec
soie|Soie|mu|C|🧵|lux,dou,pou|lisse, tiède, poudrée
aldehydes|Aldéhydes|mu|T|✨|fra,lum,lux,pou|pétillant, savonneux, champagne
laine|Laine tricotée|mu|C|🧶|rec,cha,dou,nos|pull chaud, lanoline
velours|Velours|mu|C|🎭|lux,dou,nos|moquette rouge, théâtre
cremesolaire|Crème solaire|mu|C|🧴|joy,nos,exo,cha|coco, vanille, été
embruns|Embruns|ma|T|🌊|fra,sal,ene,lum,voy|goutte salée, air du large
algue|Algue|ma|C|🌿|sal,sau,dec|iodée, verte, humide
selmarin|Sel marin|ma|C|🧂|sal,fra,voy|cristal salé, minéral
calone|Brise marine|ma|T|🌬️|fra,sal,lum|ozonique, aquatique
pluie|Eau de pluie|ma|T|🌧️|fra,apa,nos|fraîche, aqueuse
sablemouille|Sable mouillé|ma|C|🏖️|sal,apa,nos|humide, minéral, plage
galet|Galets|ma|C|🪨|sal,fra,apa|pierre lisse, humide
varech|Varech|ma|F|🌿|sal,sau,int|iode, brun, rivage
coquillage|Coquillage|ma|C|🐚|sal,dou,voy|nacré, salé
sourcem|Eau de source|ma|T|💧|fra,apa|cristalline, glaciale
nenuphar|Nénuphar|ma|C|🪷|apa,fra,dou|étang, aquatique, vert
riviere|Rivière|ma|C|💧|fra,apa,dec,sau|eau vive, cailloux
rosee|Rosée du matin|ma|T|💧|fra,dou,apa,lum|goutte fraîche, herbes
brume|Brume|ma|C|🌫️|apa,mys,fra|humide, douce, grise
ozone|Ozone|ma|T|🌬️|fra,lum,ene|éclair, air électrique
patchouli|Patchouli|te|F|🌿|mys,cha,sau,exo,int|terre, chocolat, hippie
moussechene|Mousse de chêne|te|F|🌿|sau,apa,dec,nos|sous-bois, humide, chypre
terrehumide|Terre humide|te|F|🟤|sau,apa,dec|humus, après la pluie
petrichor|Pétrichor|te|C|🌧️|apa,nos,sau|pluie sur terre sèche
champignon|Champignon|te|C|🍄|sau,dec,apa|cèpe, sous-bois, humide
sousbois|Sous-bois|te|C|🌲|sau,apa,dec,rec|fougères, humus, aiguilles
feuillesmortes|Feuilles mortes|te|C|🍂|nos,rec,apa,cha|automne, sec, doux
argile|Argile|te|F|🏺|apa,dec,exo|terre cuite, minérale
tourbe|Tourbe|te|F|🟤|fum,sau,int|terre noire, fumée, Écosse
champlabour|Champ labouré|te|C|🌾|sau,rec,nos,dec|terre retournée, fraîche
terrecuite|Terre cuite|te|F|🏺|cha,voy,exo,rec|chaude, ocre, soleil
etable|Étable|te|F|🐄|sau,cha,nos,rec|foin, lait, chaleur animale
henne|Henné|te|C|🌿|exo,cha,dec|herbe séchée, terre, tatouage
cuir|Cuir|cr|F|👜|int,mys,lux,sau,fum|souple, animal, sombre
cuirrusse|Cuir de Russie|cr|F|🐎|fum,int,sau,lux|bouleau, goudron, cuir
daim|Daim|cr|F|🧤|dou,pou,cha,lux|velouté, poudré, suédé
fumee|Fumée|cr|F|💨|fum,mys,int|âcre, grise, tenace
feubois|Feu de bois|cr|C|🔥|fum,cha,rec,nos|braise, cheminée, crépitement
braise|Braises|cr|F|🔥|fum,cha,int|chaleur rouge, cendre
charbon|Charbon|cr|F|⚫|fum,int,sau|sec, noir, âcre
cigare|Cigare|cr|F|🚬|fum,lux,int,cha|tabac épais, cèdre
barbecue|Barbecue|cr|C|🍖|fum,joy,cha,voy|braise, viande, plein air
thefume|Thé fumé|cr|C|🍵|fum,mys,exo|lapsang, goudron doux
goudron|Goudron|cr|F|⚫|fum,sau,int|noir, marin, brûlé
cendre|Cendre|cr|F|🌫️|fum,apa,nos|poudre grise, froide
castoreum|Castoréum|cr|F|🐾|sau,int,mys|animal, cuiré, fourrure
bougie|Bougie éteinte|cr|C|🕯️|fum,nos,mys|mèche fumée, cire
narguile|Narguilé|cr|C|💨|fum,exo,suc,mys|pomme, fumée sucrée
pierremouillee|Pierre mouillée|mi|C|🪨|fra,apa,nos,dec|froide, humide, grise
metal|Métal|mi|T|⚙️|ene,int,fra|froid, sanguin, tranchant
essence|Essence|mi|T|⛽|int,ene,nos|carburant, volatil, cuivré
asphalte|Asphalte|mi|F|🛣️|int,ene,voy,sau|chaud, noir, bitumeux
caoutchouc|Caoutchouc|mi|F|🛞|int,nos,sau|pneu chaud, gomme
beton|Béton|mi|F|🏢|sau,apa,voy|froid, poussiéreux, urbain
craie|Craie|mi|C|⬜|pou,nos,apa|tableau noir, école
neige|Neige|mi|T|❄️|fra,apa,lum,dou|poudre froide, silencieuse
glace|Glace|mi|T|🧊|fra,lum,ene|cristalline, tranchante
airfroid|Air froid|mi|T|🌬️|fra,ene,lum|piquant, pur, altitude
poussiere|Poussière|mi|C|🌫️|nos,sau|sèche, ancienne, soleil dans le grenier
sablechaud|Sable chaud|mi|F|🏜️|cha,exo,lum,dec,voy|brûlant, sec, doré
lave|Roche volcanique|mi|F|🌋|int,sau,mys,fum,dec|basalte, soufre, chaleur
soufre|Soufre|mi|T|🌋|sau,int,mys|volcanique, minéral
alcool|Alcool médical|mi|T|🧴|fra,int,ene|propre, piquant, hôpital
desinfectant|Désinfectant|mi|T|🧴|fra,int,nos|javel douce, couloir blanc
plastique|Plastique chaud|mi|T|🧸|nos,joy|jouet neuf, manège
encre|Encre|mi|C|🖋️|nos,dec,mys|stylo, papier, bureau
silex|Silex|mi|T|🪨|fra,mys,lum|étincelle, pierre à briquet
vapeur|Vapeur|mi|T|♨️|apa,cha,exo|chaude, humide, hammam
chlore|Chlore|mi|T|🏊|fra,nos,joy,sal|piscine, javel douce, été
`;

  const NOTES = {};
  const LIST = [];
  // bonbons et sucreries : famille « Confiseries »
  const CANDY = new Set(['barbapapa', 'bonbon', 'chewinggum', 'guimauve', 'nougat', 'sucreglace', 'meringue']);
  (RAW + (G.VS_EXTRA_RAW || '')).trim().split('\n').forEach(line => {
    const p = line.split('|');
    if (p.length < 7) return;
    if (CANDY.has(p[0])) p[2] = 'co';
    const note = { id: p[0], n: p[1], f: p[2], l: p[3], e: p[4], t: p[5].split(','), d: p[6] };
    NOTES[note.id] = note;
    LIST.push(note);
  });

  G.VS = G.VS || {};
  Object.assign(G.VS, { FAMILIES, MOODS, DIRECTIONS, NOTES, NOTE_LIST: LIST, pairScore,
    LAYERS: { T: { n: 'Notes de tête', s: 'Première impression · 0 – 30 min', short: 'Tête' },
              C: { n: 'Notes de cœur', s: 'Le caractère · 30 min – 3 h', short: 'Cœur' },
              F: { n: 'Notes de fond', s: 'La trace · 3 h et plus', short: 'Fond' } } });
})(typeof window !== 'undefined' ? window : globalThis);
