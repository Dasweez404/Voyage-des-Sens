/* Tests de bout en bout (navigateur) : node tools/e2e.js
   Nécessite Playwright (npm i -D playwright) et un Chromium installé.
   Vérifie : parcours du quiz → destination (mobile et ordinateur), précision adaptative, « un cran sous »,
   favoris + collection, parfum dédié, partage d'image, allergies, accessibilité clavier, mode hors-ligne. */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => {
  let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith(path.sep)) f += 'index.html';
  fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(b); });
});
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++; };

async function answer(p, steps) {
  for (const s of steps) {
    if (Array.isArray(s)) { for (const o of s) await p.click('[data-o=' + o + ']'); await p.click('[data-q=next]'); }
    else await p.click('[data-o=' + s + ']');
    await p.waitForTimeout(1250);
  }
}
const FOREST = ['crepuscule', 'foret', 'tempere', 'automne', ['rec', 'sau'], 'nos', 'peu', ['bois', 'resine'], 'equilibre'];

async function openQuiz(p, goSel) {
  await p.goto(BASE + '/index.html'); await p.waitForTimeout(3300);
  await p.click(goSel); await p.waitForTimeout(1700);
  await p.click('[data-q=start]'); await p.waitForTimeout(1500);
}
let BASE;

(async () => {
  await new Promise(r => srv.listen(0, r)); BASE = 'http://localhost:' + srv.address().port;
  const b = await chromium.launch(); const errs = [];
  const watch = p => { p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); };

  console.log('Mobile 390×844');
  const mob = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, acceptDownloads: true });
  let p = await mob.newPage(); watch(p);
  await openQuiz(p, '#tabbar [data-go=quiz]');
  ok(await p.$eval('.qz-count', e => e.textContent.includes('/ 9')), 'le quiz compte 9 questions');
  await answer(p, FOREST.slice(0, 2));
  ok(await p.$eval('.qz-q', e => e.textContent.includes('forêt')), 'la question 3 s\'adapte au décor (forêt)');
  await answer(p, FOREST.slice(2));
  await p.waitForSelector('#dest.show', { timeout: 12000 }); await p.waitForTimeout(3500);
  const name = await p.$eval('#destScroll h1', e => e.textContent);
  ok(/Forêt|Banff|Sequoia|Séquoia|Québec|Cabane|Fontainebleau/i.test(name), 'destination cohérente avec « forêt tempérée » : ' + name);
  ok(await p.$eval('#destScroll .accord', e => /affinité/.test(e.textContent)), 'affinité affichée');
  ok(!(await p.$('.why-not')), 'pas de « cran sous » sur la première');
  ok(!!(await p.$('.scent-card')), 'carte « parfum de ta destination »');
  await p.click('#dNext'); await p.waitForTimeout(1700);
  ok(!!(await p.$('.why-not')), '« Un cran sous… » affiché sur la 2e destination');
  // favori
  await p.click('#dFav'); await p.waitForTimeout(400);
  ok(await p.$eval('#dFav', e => e.getAttribute('aria-pressed') === 'true'), 'destination gardée (aria-pressed)');
  // partage = téléchargement d'une image
  const dl = p.waitForEvent('download', { timeout: 8000 }).catch(() => null);
  await p.click('#dShare'); const d = await dl;
  ok(!!d && /\.png$/.test(d.suggestedFilename()), 'image de partage générée' + (d ? ' : ' + d.suggestedFilename() : ''));
  if (d) { const f = await d.path(); fs.copyFileSync(f, path.join(process.env.E2E_OUT || '/tmp', 'e2e-share.png')); ok(fs.statSync(f).size > 20000, 'image non vide (' + fs.statSync(f).size + ' o)'); }
  // parfum de la destination (dédié ou préfait)
  await p.evaluate(() => document.querySelector('.scent-card').scrollIntoView({ block: 'center' })); await p.waitForTimeout(900);
  await p.click('.scent-card'); await p.waitForTimeout(1200); await p.click('#labSkip');
  await p.waitForSelector('#result.show', { timeout: 15000 }); await p.waitForTimeout(2500);
  const nm = await p.$eval('#resScroll h1', e => e.textContent);
  ok(!!nm, 'le parfum de la destination s\'ouvre : ' + nm);
  await p.click('#rBack'); await p.waitForTimeout(1300);
  // collection
  await p.click('#tabbar [data-go=coll]'); await p.waitForTimeout(1500);
  ok(await p.$eval('#favDest', e => !e.hidden && !!e.querySelector('[data-fd]')), 'la destination gardée apparaît dans la Collection');
  await p.click('[data-fd]'); await p.waitForSelector('#dest.show'); await p.waitForTimeout(2800);
  ok(!(await p.$('#dNext')) , 'ouverte depuis la collection (une seule destination)');
  await p.click('#dBack'); await p.waitForTimeout(1400);
  // retour quiz : dernier profil
  await p.click('#tabbar [data-go=quiz]'); await p.waitForTimeout(1500);
  ok(!!(await p.$('[data-q=again]')), '« Revoir ma destination » proposé');

  console.log('Huiles essentielles');
  const eo = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  p = await eo.newPage(); watch(p);
  await p.goto(BASE + '/index.html'); await p.waitForTimeout(3300);
  await p.click('#s-home .fmt-switch [data-fmt=huile]'); await p.waitForTimeout(700);
  ok(await p.evaluate(() => document.documentElement.classList.contains('eo') && localStorage.getItem('vs.mode') === '"huile"'), 'le switch active le mode huiles essentielles (mémorisé)');
  await p.click('#tabbar [data-go=quiz]'); await p.waitForTimeout(1500); await p.click('[data-q=start]'); await p.waitForTimeout(1500);
  await answer(p, FOREST);
  await p.waitForSelector('#dest.show', { timeout: 12000 }); await p.waitForTimeout(3000);
  await p.evaluate(() => document.querySelector('.scent-card').scrollIntoView({ block: 'center' })); await p.waitForTimeout(900);
  await p.click('.scent-card'); await p.waitForTimeout(1200); await p.click('#labSkip');
  await p.waitForSelector('#result.show', { timeout: 15000 }); await p.waitForTimeout(2500);
  const ids = await p.$$eval('#resScroll .ncard', e => e.map(x => x.dataset.note));
  ok(ids.length >= 9 && await p.evaluate(a => a.every(i => VS.EO.has(i)), ids), 'toutes les notes de la formule existent en huile essentielle (' + ids.length + ')');
  const dsum = await p.$$eval('.dr-row .dn2', e => e.reduce((a, x) => a + parseInt(x.textContent), 0));
  ok(dsum === 12 && !!(await p.$('.eo-note')), 'formule en 12 gouttes + précautions (' + dsum + ' gouttes)');
  ok(await p.$eval('#resScroll .badge', e => /Huiles essentielles/.test(e.textContent)), 'badge « Huiles essentielles »');
  await p.click('#rSave'); await p.click('#rBack'); await p.waitForTimeout(1300);
  await p.click('#dBack').catch(() => {}); await p.waitForTimeout(800);
  await p.click('#tabbar [data-go=coll]'); await p.waitForTimeout(1500);
  ok(!!(await p.$('.ccard.eo-c')), 'le parfum gardé reste marqué « huiles essentielles »');
  await p.click('#s-home .fmt-switch [data-fmt=parfum]').catch(async () => { await p.click('#tabbar [data-go=home]'); await p.waitForTimeout(900); await p.click('#s-home .fmt-switch [data-fmt=parfum]'); });
  await p.waitForTimeout(600);
  ok(await p.evaluate(() => !document.documentElement.classList.contains('eo')), 'retour au mode parfum');
  await eo.close();

  console.log('Allergies');
  const al = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  p = await al.newPage(); watch(p);
  await p.addInitScript(() => localStorage.setItem('vs.prefs', JSON.stringify({ allergies: ['cannelle', 'noix', 'lait', 'gluten', 'oeuf', 'alcool', 'miel'], fams: ['bo'], notes: [] })));
  await openQuiz(p, '#tabbar [data-go=quiz]');
  await answer(p, FOREST);
  await p.waitForSelector('#dest.show', { timeout: 12000 }); await p.waitForTimeout(3000);
  const hits = await p.$$eval('.dn span.on', e => e.map(x => x.textContent));
  ok(!(await p.$$eval('.dn span.on.ex', e => e.length)), 'aucune note écartée n\'est mise en avant (' + hits.length + ' en couleur)');
  const nm2 = await p.$eval('#destScroll h1', e => e.textContent);
  console.log('        (avec ces préférences : ' + nm2 + ')');
  await al.close();

  console.log('Mouvement réduit + clavier');
  const rm = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  p = await rm.newPage(); watch(p);
  await openQuiz(p, '#tabbar [data-go=quiz]');
  ok(await p.evaluate(() => document.activeElement && document.activeElement.id === 'qzQ'), 'le focus passe sur la question (lecteur d\'écran)');
  await p.keyboard.press('Tab'); await p.keyboard.press('ArrowDown');
  ok(await p.evaluate(() => document.activeElement.classList.contains('qo')), 'flèches : navigation entre les réponses');
  await rm.close();

  console.log('Ordinateur 1440×900');
  const desk = await b.newContext({ viewport: { width: 1440, height: 900 } });
  p = await desk.newPage(); watch(p);
  await openQuiz(p, '#tabbar [data-go=quiz]');
  ok(await p.evaluate(() => document.documentElement.classList.contains('desktop')), 'mode ordinateur détecté');
  await answer(p, ['aube', 'mer', 'tropical', 'ete', ['fra', 'ene'], 'exo', 'oui', ['fruits', 'fleurs'], 'affirme']);
  await p.waitForSelector('#dest.show', { timeout: 12000 }); await p.waitForTimeout(3500);
  const dn = await p.$eval('#destScroll h1', e => e.textContent);
  ok(/./.test(dn), 'destination (ordinateur) : ' + dn);
  const ov = await p.evaluate(() => { const s = document.getElementById('destScroll'); return s.scrollWidth > s.clientWidth + 2; });
  ok(!ov, 'pas de défilement horizontal');
  await p.screenshot({ path: path.join(process.env.E2E_OUT || '/tmp', 'e2e-desk.png') });
  await desk.close();

  console.log('Hors-ligne');
  const off = await b.newContext({ viewport: { width: 390, height: 844 } });
  p = await off.newPage(); watch(p);
  await p.goto(BASE + '/index.html'); await p.waitForTimeout(3500);
  await p.evaluate(() => navigator.serviceWorker && navigator.serviceWorker.ready); await p.waitForTimeout(1500);
  const sw = await p.evaluate(() => navigator.serviceWorker && navigator.serviceWorker.controller ? 'actif' : 'inactif');
  await p.reload(); await p.waitForTimeout(1500);   // le contrôleur prend la main
  await off.setOffline(true);
  await p.reload(); await p.waitForTimeout(3500);
  ok(await p.evaluate(() => !!(window.VS && VS.DESTS && VS.DESTS.length === 111)), 'hors-ligne : l\'appli recharge avec les 111 destinations (service worker ' + sw + ')');
  await p.click('#tabbar [data-go=quiz]'); await p.waitForTimeout(1500);
  ok(!!(await p.$('[data-q=start]')), 'hors-ligne : le quiz fonctionne');
  await off.close();

  const real = errs.filter(e => !/Failed to load resource|net::ERR/.test(e));
  ok(!real.length, 'aucune erreur JS' + (real.length ? ' : ' + real.slice(0, 3).join(' | ') : ''));
  await b.close(); srv.close();
  console.log(fails ? '\n' + fails + ' échec(s)' : '\nTout est bon');
  process.exit(fails ? 1 : 0);
})();
