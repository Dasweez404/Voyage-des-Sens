// Vérifie la cohérence des données (ids, couches, harmonie) — node tools/validate.js
const fs = require('fs'), path = require('path'), vm = require('vm');
global.window = global;
for (const f of ['notes', 'scenes', 'art', 'engine']) vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'js', f + '.js'), 'utf8'), { filename: f });
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
console.log(JSON.stringify(VS.Engine.analyzeText('un chalet en hiver, doux et un peu de vanille').scene && VS.Engine.analyzeText('un chalet en hiver, doux et un peu de vanille').scene.id));
console.log(bad ? 'ERREURS: ' + bad : 'OK');
process.exit(bad ? 1 : 0);
