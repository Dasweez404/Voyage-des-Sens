// Numéro de version : node tools/stamp.js [version]
// Ajoute ?v=<version> à tous les fichiers de index.html et du cache hors-ligne, pour qu'un navigateur
// ne puisse jamais mélanger une page récente avec d'anciens scripts.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const build = process.argv[2] || new Date().toISOString().replace(/\D/g, '').slice(2, 12);
const rw = (f, fn) => { const p = path.join(root, f); const s = fs.readFileSync(p, 'utf8'), t = fn(s); if (s !== t) fs.writeFileSync(p, t); };

rw('index.html', s => {
  s = s.replace(/(href|src)="((?:css|js)\/[^"?]+)(?:\?v=[^"]*)?"/g, '$1="$2?v=' + build + '"');
  return /<meta name="vs-build"/.test(s)
    ? s.replace(/<meta name="vs-build" content="[^"]*">/, '<meta name="vs-build" content="' + build + '">')
    : s.replace('<meta name="theme-color"', '<meta name="vs-build" content="' + build + '">\n<meta name="theme-color"');
});
rw('sw.js', s => s.replace(/const CACHE = '[^']*';/, "const CACHE = 'vds-" + build + "';")
  .replace(/'((?:css|js)\/[^'?]+)(?:\?v=[^']*)?'/g, "'$1?v=" + build + "'"));
rw('js/app.js', s => s.replace(/const BUILD = '[^']*';/, "const BUILD = '" + build + "';"));
console.log('version', build);
