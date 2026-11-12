// Vérifie la cohérence des données (ids, couches, harmonie) — node tools/validate.js
const fs = require('fs'), path = require('path'), vm = require('vm');
global.window = global;
for (const f of ['notes_extra', 'notes', 'scenes', 'destinations', 'art', 'engine']) vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'js', f + '.js'), 'utf8'), { filename: f });
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
  if (cnt.some(x => x < 2)) { console.log('couche pauvre', sc.id, cnt); bad++; }
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
