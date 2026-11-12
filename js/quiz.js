/* Voyage des Sens — quiz olfactif
   Chaque réponse pèse sur des ambiances (tags), des familles de senteurs (fams) ou en écarte (avoid).
   Le moteur compose ensuite une formule NEUVE (aucun lieu préfait n'est repris). */
(function (G) {
  'use strict';
  const VS = G.VS = G.VS || {};

  const QUIZ = [
    { id: 'time', q: 'Quand ton parfum se réveille-t-il ?', sub: 'Choisis la lumière qui te ressemble.', type: 'one', opts: [
      { id: 'aube', label: 'À l\'aube', short: 'Aube', sub: 'Brume, rosée, premiers rayons', tags: { fra: 1, dou: 1, lum: .8 }, fams: { ve: .8, fl: .6, ma: .5 } },
      { id: 'midi', label: 'En plein midi', short: 'Midi', sub: 'Soleil haut, peau chaude', tags: { lum: 1, joy: 1, ene: .8 }, fams: { ag: 1, fr: .8, ma: .5 } },
      { id: 'crepuscule', label: 'Au crépuscule', short: 'Crépuscule', sub: 'Lumière dorée, chaleur qui retombe', tags: { cha: 1, rom: .9, nos: .8 }, fams: { am: .8, fl: .6, bo: .6, ep: .5 } },
      { id: 'nuit', label: 'En pleine nuit', short: 'Nuit', sub: 'Silence, étoiles, mystère', tags: { mys: 1.2, int: .8, fum: .6 }, fams: { re: .9, cr: .7, am: .8 } }
    ] },
    { id: 'place', q: 'Où poses-tu tes valises ?', sub: 'Un décor, tout de suite, sans réfléchir.', type: 'one', opts: [
      { id: 'mer', label: 'Au bord de l\'eau', short: 'Bord de mer', sub: 'Sel, vagues, sable tiède', tags: { sal: 1, fra: .8, voy: .6 }, fams: { ma: 1.4, ag: .7, mu: .5 }, avoid: ['cr', 'te'] },
      { id: 'foret', label: 'Sous les arbres', short: 'Forêt', sub: 'Mousse, résine, terre humide', tags: { sau: 1, apa: .8, dec: .7 }, fams: { bo: 1.2, te: 1, re: .8, ve: .7 }, avoid: ['co', 'bv'] },
      { id: 'montagne', label: 'Là-haut, dans l\'air vif', short: 'Montagne', sub: 'Neige, pin, silence blanc', tags: { fra: 1, apa: .7, dec: .8 }, fams: { mi: 1, bo: 1, re: .9, ar: .6 }, avoid: ['co'] },
      { id: 'jardin', label: 'Dans un jardin fleuri', short: 'Jardin', sub: 'Pétales, herbe, soleil doux', tags: { dou: 1, rom: .7, joy: .6 }, fams: { fl: 1.5, ve: .9, fr: .7 }, avoid: ['cr', 'mi'] },
      { id: 'ville', label: 'Au cœur d\'une ville vivante', short: 'Ville', sub: 'Café, pierre, pluie sur le bitume', tags: { ene: .8, dec: .8, nos: .5 }, fams: { go: .8, mi: .7, bv: .8, mu: .6 } },
      { id: 'desert', label: 'Dans un souk ou un désert', short: 'Souk & désert', sub: 'Épices, ambre, sable chaud', tags: { exo: 1.2, cha: .8, mys: .5 }, fams: { ep: 1.3, am: 1.1, re: .9, mi: .5 }, avoid: ['ma', 'co'] },
      { id: 'maison', label: 'Chez toi, bien au chaud', short: 'Cocon', sub: 'Plaid, bougie, odeur de gâteau', tags: { rec: 1.3, cha: .8, nos: .7 }, fams: { go: 1, mu: .9, bo: .7, am: .7 }, avoid: ['mi', 'ma'] }
    ] },
    { id: 'season', q: 'Quelle saison porte ton parfum ?', sub: 'Celle où tu te sens le mieux.', type: 'one', opts: [
      { id: 'printemps', label: 'Le printemps', short: 'Printemps', sub: 'Éveil, pluie fine, bourgeons', tags: { dou: 1, fra: .8, rom: .7 }, fams: { fl: .9, ve: .8, fr: .5 } },
      { id: 'ete', label: 'L\'été', short: 'Été', sub: 'Chaleur, fruits, longues soirées', tags: { lum: 1, joy: 1, sal: .6, exo: .5 }, fams: { ag: .9, fr: 1, ma: .6, bv: .5 } },
      { id: 'automne', label: 'L\'automne', short: 'Automne', sub: 'Feuilles mortes, pomme, cannelle', tags: { rec: 1, nos: 1, cha: .8 }, fams: { bo: .9, te: .8, ep: .8, go: .6 } },
      { id: 'hiver', label: 'L\'hiver', short: 'Hiver', sub: 'Feu de bois, neige, laine', tags: { cha: 1, rec: 1, mys: .6 }, fams: { am: .9, re: .9, cr: .7, go: .6, ep: .5 } }
    ] },
    { id: 'mood', q: 'Que veux-tu ressentir ?', sub: 'Deux envies au maximum.', type: 'multi', max: 2, w: 2, opts: [
      { id: 'rec', label: 'Du réconfort', mood: 'rec', sub: 'Se sentir enveloppé·e', tags: { rec: 1, dou: .5 } },
      { id: 'fra', label: 'De la fraîcheur', mood: 'fra', sub: 'Respirer, s\'éclaircir', tags: { fra: 1, lum: .5 } },
      { id: 'ene', label: 'De l\'élan', mood: 'ene', sub: 'Énergie et bonne humeur', tags: { ene: 1, joy: .8 } },
      { id: 'rom', label: 'De la romance', mood: 'rom', sub: 'Tendresse, séduction', tags: { rom: 1, dou: .5 } },
      { id: 'mys', label: 'Du mystère', mood: 'mys', sub: 'Profondeur, secret', tags: { mys: 1, int: .5 } },
      { id: 'sau', label: 'De la liberté sauvage', mood: 'sau', sub: 'Grand air, nature brute', tags: { sau: 1, dec: .6 } },
      { id: 'lux', label: 'Du luxe', mood: 'lux', sub: 'Précieux, raffiné', tags: { lux: 1, pou: .4 } },
      { id: 'apa', label: 'Du calme', mood: 'apa', sub: 'Lenteur, sérénité', tags: { apa: 1, dou: .6 } }
    ] },
    { id: 'story', q: 'Quelle histoire te parle ?', sub: 'Celle qui te donne envie de fermer les yeux.', type: 'one', opts: [
      { id: 'nos', label: 'Un souvenir d\'enfance', short: 'Souvenir', dir: 'nos', sub: 'Un goûter, un grenier, un été d\'avant' },
      { id: 'dec', label: 'Un chemin jamais pris', short: 'Découverte', dir: 'dec', sub: 'Curiosité, sentiers, matières brutes' },
      { id: 'voy', label: 'Un billet sans retour', short: 'Voyage', dir: 'voy', sub: 'Gares, escales, horizons qui changent' },
      { id: 'exo', label: 'Une île lointaine', short: 'Exotisme', dir: 'exo', sub: 'Fleurs rares, chaleur, parfums du bout du monde' }
    ] },
    { id: 'sweet', q: 'Et le côté gourmand ?', sub: 'Sucré, lacté, croquant… ou pas du tout.', type: 'one', opts: [
      { id: 'non', label: 'Pas du tout', short: 'Sans sucre', sub: 'Plutôt sec, vert ou boisé', avoid: ['go', 'co'], tags: { fra: .4 } },
      { id: 'peu', label: 'Un soupçon', short: 'Soupçon de douceur', sub: 'Une pointe de vanille ou de miel', fams: { go: .5 }, tags: { dou: .3 } },
      { id: 'oui', label: 'Oui, bien sucré', short: 'Gourmand', sub: 'Caramel, pâtisserie, bonbon', fams: { go: 1.5, co: 1 }, tags: { suc: 1.3, rec: .4 } },
      { id: 'epice', label: 'Plutôt épicé', short: 'Épicé', sub: 'Poivre, cannelle, safran', fams: { ep: 1.4, am: .6, go: -.7 }, avoid: ['co'], tags: { epi: 1.2, cha: .4 } }
    ] },
    { id: 'matter', q: 'Quelles matières aimes-tu sentir ?', sub: 'Trois au maximum.', type: 'multi', max: 3, opts: [
      { id: 'bois', label: 'Le bois', sub: 'Cèdre, santal, sciure', fams: { bo: 1.4 } },
      { id: 'cuir', label: 'Le cuir et la fumée', sub: 'Cuir, feu, tabac', fams: { cr: 1.3, am: .4 } },
      { id: 'propre', label: 'Le linge propre', sub: 'Coton, savon, draps', fams: { mu: 1.4 }, pick: 'lingepropre' },
      { id: 'fleurs', label: 'Les fleurs blanches', sub: 'Jasmin, tubéreuse, muguet', fams: { fl: 1.4 } },
      { id: 'fruits', label: 'Les fruits juteux', sub: 'Pêche, agrumes, baies', fams: { fr: 1.2, ag: .9 } },
      { id: 'epices', label: 'Les épices chaudes', sub: 'Cannelle, cardamome', fams: { ep: 1.3 } },
      { id: 'resine', label: 'L\'encens et les résines', sub: 'Ambre, myrrhe, benjoin', fams: { re: 1.3, am: .8 } },
      { id: 'herbe', label: 'L\'herbe et les feuilles', sub: 'Thé vert, menthe, lavande', fams: { ve: 1.2, ar: 1 } }
    ] },
    { id: 'presence', q: 'Quelle présence veux-tu ?', sub: 'Jusqu\'où ton parfum se fait remarquer.', type: 'one', opts: [
      { id: 'discret', label: 'Une seconde peau', short: 'Discret', sub: 'Léger, intime, à peine là', size: [2, 3, 3], tags: { apa: .8, dou: .8 } },
      { id: 'equilibre', label: 'Équilibré', short: 'Équilibré', sub: 'Ni trop, ni trop peu', size: [3, 3, 3] },
      { id: 'affirme', label: 'Affirmé', short: 'Affirmé', sub: 'On se retourne sur ton passage', size: [3, 4, 4], tags: { int: 1.2, lux: .6, cha: .5 } }
    ] }
  ];

  const TIME_WORD = { aube: 'Aube', midi: 'Midi', crepuscule: 'Crépuscule', nuit: 'Nuit' };
  const TIME_OF = { aube: 'd\'aube', midi: 'de plein midi', crepuscule: 'de crépuscule', nuit: 'de nuit' };
  const PLACE_OF = { mer: 'au bord de l\'eau', foret: 'sous les arbres', montagne: 'dans l\'air vif des hauteurs', jardin: 'dans un jardin fleuri', ville: 'au cœur d\'une ville vivante', desert: 'entre souk et désert', maison: 'bien au chaud chez toi' };
  const SEASON_OF = { printemps: 'porté par l\'air du printemps', ete: 'dans l\'éclat de l\'été', automne: 'dans la lumière de l\'automne', hiver: 'dans le calme de l\'hiver' };

  // illustration : lumière du moment + décor + effet de saison (motifs de art.js)
  const ART_TIME = { aube: 'sun:95,300,1.1;cloud:290,120,.9', midi: 'sun:300,105,1;cloud:90,130,.9', crepuscule: 'sun:200,300,1.6', nuit: 'stars:0,0,1;moon:300,95,.9' };
  const ART_PLACE = {
    mer: 'waves:0,365,.9,d;ship:230,365,.6;dune:0,425,.5,c;palm:70,440,1',
    foret: 'pines:0,385,1.4,d;mist:0,365,1,w;pines:0,445,1.9,d',
    montagne: 'mtnsnow:0,375,1.5,d;mtnsnow:0,415,1.1,d;pines:0,465,1.3,d',
    jardin: 'hills:0,345,.7,d;flowers:0,445,1.4;grass:0,458,1,d',
    ville: 'skyline:0,425,1.15,d;ground:0,425,1,d',
    desert: 'dune:0,345,.6,c;dune:0,400,.8,d;palm:90,440,.8;dune:0,448,.6,d',
    maison: 'win:115,385,1.25;lamp:295,415,.9;ground:0,412,1,d'
  };
  const ART_SEASON = { printemps: '', ete: '', automne: 'leaves:0,0,1', hiver: 'snow:0,0,1' };

  const opt = (qid, id) => { const q = QUIZ.find(x => x.id === qid); return q && q.opts.find(o => o.id === id); };
  const chosen = (ans, qid) => [].concat(ans[qid] || []).map(id => opt(qid, id)).filter(Boolean);

  function params(ans) {
    const tags = {}, fams = {}, avoid = new Set(); let moods = [], dirs = [], size = [3, 3, 3]; const picks = [];
    QUIZ.forEach(q => chosen(ans, q.id).forEach(o => {
      Object.entries(o.tags || {}).forEach(([k, v]) => { tags[k] = (tags[k] || 0) + v * (q.w || 1); });
      Object.entries(o.fams || {}).forEach(([k, v]) => { fams[k] = (fams[k] || 0) + v; });
      (o.avoid || []).forEach(f => avoid.add(f));
      if (o.mood) moods.push(o.mood);
      if (o.dir) dirs.push(o.dir);
      if (o.size) size = o.size;
      if (o.pick) picks.push(o.pick);
    }));
    // une famille que tu écartes ne peut pas être aussi favorisée
    avoid.forEach(f => { delete fams[f]; });
    if (!moods.length) moods = Object.keys(tags).filter(t => VS.MOODS.some(m => m[0] === t)).sort((a, b) => tags[b] - tags[a]).slice(0, 2);
    const time = (ans.time || 'midi'), place = (ans.place || 'jardin'), season = (ans.season || 'ete');
    const E = VS.Engine;
    return {
      opts: { moods: Array.from(new Set(moods)).slice(0, 3), dirs: dirs.slice(0, 1), picks: picks.slice(0, 2), size, tags, fams, avoid: Array.from(avoid) },
      nameFn: lead => (TIME_WORD[time] || 'Instant') + ' ' + E.de(lead.n),
      tag: `Un parfum ${TIME_OF[time] || ''}, ${PLACE_OF[place] || ''}, ${SEASON_OF[season] || ''}.`,
      extra: [(opt('time', time) || {}).short, (opt('place', place) || {}).short, (opt('season', season) || {}).short].filter(Boolean),
      art: [ART_TIME[time], ART_PLACE[place], ART_SEASON[season]].filter(Boolean).join(';')
    };
  }

  function summary(ans) {
    return ['time', 'place', 'season'].map(q => (chosen(ans, q)[0] || {}).short).filter(Boolean).join(' · ');
  }

  VS.QUIZ = QUIZ;
  VS.Quiz = { params, summary, chosen };
})(typeof window !== 'undefined' ? window : globalThis);
