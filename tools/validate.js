// Vérifie la cohérence des données (ids, couches, harmonie) — node tools/validate.js
const fs = require('fs'), path = require('path'), vm = require('vm');
global.window = global;
for (const f of ['notes_extra', 'notes', 'scenes', 'destinations', 'prefs', 'art', 'engine', 'quiz']) vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'js', f + '.js'), 'utf8'), { filename: f });
const VS = global.VS; let bad = 0;
console.log('notes:', VS.NOTE_LIST.length, 'lieux:', VS.SCENES.length);
const seen = new Set(VS.NOTE_LIST.map(n => n.id));
if (seen.size !== VS.NOTE_LIST.length) { console.log('ID de note dupliqué'); bad++; }
VS.NOTE_LIST.forEach(n => {
  if (!VS.FAMILIES[n.f]) { console.log('famille inconnue', n.id); bad++; }
  if (!'TCF'.includes(n.l)) { console.log('couche inconnue', n.id); bad++; }
  n.t.forEach(t => { if (!VS.MOODS.concat(VS.DIRECTIONS).some(m => m[0] === t)) { console.log('tag inconnu', n.id, t); bad++; } });
});
const art = Object.keys(VS.Art).length;
VS.SCENES.forEach(sc => {
  sc.notes.forEach(id => { if (!VS.NOTES[id]) { console.log('note inconnue', sc.id, id); bad++; } });
  const c = VS.Engine.fromScene(sc);
  const cnt = 'TCF'.split('').map(l => c.byLayer[l].length);
  if (cnt.some(x => x < 3) || cnt.some(x => x > 5)) { console.log('équilibre des temps (3 à 5 notes par temps)', sc.id, cnt); bad++; }
  const mxp = Math.max(...c.notes.map(n => n.pct)); if (mxp > 16) { console.log('une note domine trop', sc.id, mxp); bad++; }
  const sum = c.notes.reduce((a, n) => a + n.pct, 0);
  if (sum !== 100) { console.log('pct != 100', sc.id, sum); bad++; }
  const svg = VS.Art.scene(c.spec);
  if (svg.length < 500) { console.log('svg vide', sc.id); bad++; }
  const unk = sc.art.split(';').map(t => t.split(':')[0]);
  if (c.stats.harmony < 80) console.log('harmonie faible', sc.id, c.stats.harmony);
});
// tokens d'art inconnus
const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'art.js'), 'utf8');
const motifs = new Set([...src.matchAll(/^\s*M\.(\w+) =/gm)].map(m => m[1]));
VS.SCENES.forEach(sc => sc.art.split(';').forEach(t => { const n = t.split(':')[0]; if (!motifs.has(n)) { console.log('motif inconnu', sc.id, n); bad++; } }));
// générations aléatoires
let min = 100;
for (let i = 0; i < 300; i++) {
  const moods = VS.MOODS.map(m => m[0]).sort(() => Math.random() - .5).slice(0, 1 + (i % 3));
  const dirs = i % 2 ? [VS.DIRECTIONS[i % 4][0]] : [];
  const c = VS.Engine.compose({ moods, dirs, size: [3, 3, 3] });
  min = Math.min(min, c.stats.harmony);
  if (c.notes.reduce((a, n) => a + n.pct, 0) !== 100) { console.log('pct custom', c.name); bad++; }
}
console.log('harmonie min (300 créations):', min);
console.log(VS.Engine.compose({ moods: ['cha', 'rec'], dirs: ['nos'] }).story);
// préférences : ids valides + aucune senteur écartée ne doit ressortir
VS.ALLERGENS.forEach(g => { g.ids.forEach(id => { if (!VS.NOTES[id]) { console.log('allergène : note inconnue', g.id, id); bad++; } }); g.fams.forEach(f => { if (!VS.FAMILIES[f]) { console.log('allergène : famille', g.id, f); bad++; } }); });
{
  const ex = new Set();
  VS.ALLERGENS.filter(g => ['lait', 'gluten', 'agrumes', 'alcool', 'pollens'].includes(g.id)).forEach(g => { g.ids.forEach(i => ex.add(i)); VS.NOTE_LIST.filter(n => g.fams.includes(n.f)).forEach(n => ex.add(n.id)); });
  VS.NOTE_LIST.filter(n => ['cr', 'go'].includes(n.f)).forEach(n => ex.add(n.id));
  VS.EXCL = ex;
  let leaks = 0, swaps = 0;
  VS.SCENES.forEach(x => { const c = VS.Engine.fromScene(x); swaps += c.swaps.length; if (c.ids.some(i => ex.has(i))) leaks++; if (c.notes.length < 5) { console.log('trop peu de notes après adaptation', x.id); bad++; } });
  for (let i = 0; i < 300; i++) { const c = VS.Engine.compose({ moods: [VS.MOODS[i % 18][0]], dirs: [VS.DIRECTIONS[i % 4][0]], picks: i % 3 ? [] : ['vanille', 'cuir'] }); if (c.ids.some(id => ex.has(id))) leaks++; }
  console.log('exclusions :', ex.size, 'senteurs écartées |', swaps, 'remplacements sur les lieux | fuites :', leaks);
  if (leaks) bad++;
  VS.EXCL = new Set();
}
// quiz : 400 profils aléatoires -> formules neuves, cohérentes, sans note qui domine ni fuite d'exclusion
{
  const ex = new Set(VS.NOTE_LIST.filter(n => ['cr', 'co'].includes(n.f)).map(n => n.id)); VS.ALLERGENS.filter(g => g.id === 'lait').forEach(g => g.ids.forEach(i => ex.add(i)));
  let leaks = 0, over = 0, low = 0, same = 0; const pickN = (a, n) => a.slice().sort(() => Math.random() - .5).slice(0, n);
  for (const withEx of [false, true]) {
    VS.EXCL = withEx ? ex : new Set();
    for (let i = 0; i < 200; i++) {
      const ans = {}; VS.QUIZ.forEach(q => { const ids = q.opts.map(o => o.id); ans[q.id] = q.type === 'multi' ? pickN(ids, 1 + Math.floor(Math.random() * q.max)) : pickN(ids, 1)[0]; });
      const p = VS.Quiz.params(ans), c = VS.Engine.compose(Object.assign({ nameFn: p.nameFn }, p.opts));
      if (c.ids.some(id => VS.EXCL.has(id))) leaks++;
      if (Math.max(...c.notes.map(n => n.pct)) > 17) over++;
      if (c.stats.harmony < 85) low++;
      if (VS.SCENES.some(sc => sc.notes.join() === c.ids.join())) same++;
    }
  }
  VS.EXCL = new Set();
  console.log('quiz : fuites', leaks, '| note > 17 %', over, '| harmonie < 85', low, '| copie d\'un lieu', same);
  if (leaks || over || low || same) bad++;
}
// sous-catégories
VS.SCENES.forEach(x => { const subs = (VS.SUBS[x.cat] || []).map(y => y[0]); if (!x.sub || !subs.includes(x.sub)) { console.log('sous-catégorie manquante', x.id, x.cat, x.sub); bad++; } });
Object.keys(VS.SUBS).forEach(c => VS.SUBS[c].forEach(y => y[2].split(' ').forEach(id => { const sc = VS.SCENES.find(z => z.id === id); if (!sc) { console.log('sous-cat : lieu inconnu', id); bad++; } else if (sc.cat !== c) { console.log('sous-cat : mauvaise catégorie', id); bad++; } })));
// destinations
const sc = new Set(VS.SCENES.map(x => x.id)), tg = new Set(VS.MOODS.concat(VS.DIRECTIONS).map(m => m[0]));
VS.DESTS.forEach(d => {
  if (isNaN(d.lat) || isNaN(d.lon) || Math.abs(d.lat) > 90 || Math.abs(d.lon) > 180) { console.log('coordonnées', d.id); bad++; }
  d.notes.forEach(id => { if (!VS.NOTES[id]) { console.log('dest note inconnue', d.id, id); bad++; } });
  d.fams.forEach(f => { if (!VS.FAMILIES[f]) { console.log('dest famille', d.id, f); bad++; } });
  d.tags.forEach(t => { if (!tg.has(t)) { console.log('dest tag', d.id, t); bad++; } });
  if (!sc.has(d.art)) { console.log('dest art inconnu', d.id, d.art); bad++; }
  if (d.stops.length !== 3 || d.stops.some(x => !x.o)) { console.log('dest étapes', d.id); bad++; }
});
VS.DESTS.forEach(d => { if (!VS.DEST_PLACE[d.id] || !VS.DEST_PLACE[d.id].length) { console.log('destination sans type de lieu', d.id); bad++; } });
Object.keys(VS.DEST_PLACE).forEach(id => { if (!VS.DESTS.some(d => d.id === id)) { console.log('type de lieu : destination inconnue', id); bad++; } });
const dids = new Set(VS.DESTS.map(d => d.id));
if (dids.size !== VS.DESTS.length) { console.log('dest id dupliqué'); bad++; }
Object.keys(VS.SCENE_DEST).forEach(k => { if (!sc.has(k)) { console.log('SCENE_DEST scène inconnue', k); bad++; } if (!dids.has(VS.SCENE_DEST[k])) { console.log('SCENE_DEST dest inconnue', k, VS.SCENE_DEST[k]); bad++; } });
VS.SCENES.forEach(x => { if (!VS.SCENE_DEST[x.id]) console.log('(auto) pas de destination choisie pour', x.id, '->', VS.Engine.destinations(VS.Engine.fromScene(x))[0].d.id); });
const used = new Set(VS.SCENES.map(x => VS.Engine.destinations(VS.Engine.fromScene(x))[0].d.id));
console.log('destinations:', VS.DESTS.length, '| utilisées par les lieux:', used.size);
let dd = new Set(); for (let i = 0; i < 300; i++) { const c = VS.Engine.compose({ moods: [VS.MOODS[i % 18][0]], dirs: [VS.DIRECTIONS[i % 4][0]] }); dd.add(VS.Engine.destinations(c)[0].d.id); }
console.log('destinations différentes sur 300 créations:', dd.size);
console.log(JSON.stringify(VS.Engine.analyzeText('un chalet en hiver, doux et un peu de vanille').scene && VS.Engine.analyzeText('un chalet en hiver, doux et un peu de vanille').scene.id));
console.log(bad ? 'ERREURS: ' + bad : 'OK');
process.exit(bad ? 1 : 0);
