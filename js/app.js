/* Voyage des Sens — interface */
(function () {
  'use strict';
  const BUILD = '2611121601';
  // page et scripts de versions différentes (cache) : on repart d'un état propre, une seule fois
  (function guard() {
    const meta = document.querySelector('meta[name="vs-build"]');
    if (!meta || meta.content === BUILD || BUILD === 'dev') return;
    try {
      if (sessionStorage.getItem('vs.reloaded') === BUILD) return;
      sessionStorage.setItem('vs.reloaded', BUILD);
      const sw = navigator.serviceWorker ? navigator.serviceWorker.getRegistrations().then(rs => Promise.all(rs.map(r => r.unregister()))) : Promise.resolve();
      sw.then(() => window.caches ? caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k)))) : null).then(() => location.reload(), () => location.reload());
    } catch (e) { /* ignore */ }
  })();
  const VS = window.VS, E = VS.Engine, Art = VS.Art, NOTES = VS.NOTES, FAM = VS.FAMILIES;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const strip = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const store = {
    get(k, d) { try { const raw = localStorage.getItem(k); if (raw == null) return d; try { return JSON.parse(raw); } catch (e) { return raw; } } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } }
  };
  const vibrate = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* ignore */ } };
  const SCENE = {}; VS.SCENES.forEach(s => SCENE[s.id] = s);
  const CAT = {}; VS.CATS.forEach(c => CAT[c.id] = c);
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const state = { tab: 'home', cat: 'all', q: '', dirs: new Set(), moods: new Set(), picks: [], sub: 'all', fam: 'all', nq: '', rich: 1, text: '' };
  let coll = store.get('vs.coll', []);
  // flacon : plat (SVG), 3D (CSS) ou 3D liquide (WebGL) — réglable dans les préférences
  let bottleKind = (v => v === true || v === 'css' ? 'css' : v === 'gl' ? 'gl' : 'flat')(store.get('vs.b3d', 'flat'));
  let mode = store.get('vs.mode', 'parfum') === 'huile' ? 'huile' : 'parfum';   // format : parfum ou huiles essentielles
  document.documentElement.classList.toggle('eo', mode === 'huile');
  let current = null;          // composition affichée
  let resultOpen = false;

  /* ---------- utilitaires UI ---------- */
  let toastT;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400);
  }
  function lazyArt(root) {
    const io = new IntersectionObserver((es, o) => es.forEach(e => {
      if (!e.isIntersecting) return;
      const w = e.target; o.unobserve(w);
      const sc = SCENE[w.dataset.art]; if (sc) w.innerHTML = Art.scene({ id: sc.id, pal: sc.pal, art: sc.art, n: sc.n }, { static: true });
    }), { rootMargin: '200px' });
    $$('[data-art]', root).forEach(w => io.observe(w));
  }
  const noteIcons = (sc, n) => sc.notes.slice(0, n).map(id => NOTES[id].e).join(' ');

  /* ---------- formes ondulées de fond (morphing SMIL, aplats) ---------- */
  function blobsSVG() {
    const A = ['M-20,-20 L250,-20 C300,60 250,130 170,150 C100,168 60,210 40,270 C25,320 10,330 -20,340 Z', 'M-20,-20 L290,-20 C290,80 220,110 150,170 C90,220 70,250 60,300 C45,350 20,380 -20,390 Z'];
    const B = ['M420,820 L420,560 C340,570 310,620 250,650 C190,680 150,730 160,820 Z', 'M420,820 L420,520 C350,560 300,600 260,670 C220,730 230,770 200,820 Z'];
    const C = ['M420,250 C340,240 300,300 320,360 C340,420 290,450 330,520 C350,550 380,560 420,560 Z', 'M420,300 C350,290 280,330 300,390 C320,440 300,500 340,540 C360,560 380,570 420,570 Z'];
    const path = (cls, v, dur) => `<path class="${cls}" d="${v[0]}"><animate attributeName="d" dur="${dur}s" repeatCount="indefinite" calcMode="spline" keyTimes="0;.5;1" keySplines=".45 0 .55 1;.45 0 .55 1" values="${v[0]};${v[1]};${v[0]}"/></path>`;
    return `<svg viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice"><g class="bg3">${path('b3', C, 21)}</g><g class="bg2">${path('b2', B, 17)}</g><g class="bg1">${path('b1', A, 15)}</g></svg>`;
  }
  $('#blobs').innerHTML = blobsSVG(); $('#labBlobs').innerHTML = blobsSVG();

  /* ---------- mouvement : révélations, parallaxe, ondes au toucher, mots qui montent ---------- */
  const Motion = (function () {
    const ios = new WeakMap(), app = $('#app');
    function observerFor(root) {
      if (ios.has(root)) return ios.get(root);
      const io = new IntersectionObserver(es => {
        let k = 0;
        es.filter(e => e.isIntersecting).forEach(e => { e.target.style.setProperty('--d', (k++ * 120) + 'ms'); e.target.classList.add('in'); const t = e.target; setTimeout(() => t.classList.add('ar-done'), 1700 + k * 120); io.unobserve(e.target); });
      }, { root, threshold: .06, rootMargin: '0px 0px -5% 0px' });
      ios.set(root, io); return io;
    }
    function watchEls(container, els) {
      const io = observerFor(container.closest('.scroll, .res-scroll') || null);
      els.forEach(el => { el.classList.add('ar'); el.classList.remove('in', 'ar-done'); io.observe(el); });
    }
    function watchScreens() {
      $$('.screen .scroll').forEach(sc => watchEls(sc, Array.from(sc.children).filter(c => !c.classList.contains('pgrid') && !c.classList.contains('cgrid'))));
    }
    // rejoue les révélations d'un écran quand on y revient (sans fondu inverse visible)
    function replay(screen) {
      const sc = $('.scroll', screen); if (!sc) return;
      const io = observerFor(sc);
      $$('.ar', screen).forEach(el => { el.style.transition = 'none'; el.classList.remove('in', 'ar-done'); void el.offsetWidth; el.style.transition = ''; io.observe(el); });
    }
    function splitWords(el) {
      if (!el || el.dataset.sp) return; el.dataset.sp = '1'; let i = 0;
      const walk = n => Array.from(n.childNodes).forEach(c => {
        if (c.nodeType === 3) {
          const f = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(t => { if (!t) return; if (/^\s+$/.test(t)) f.appendChild(document.createTextNode(' ')); else { const w = document.createElement('span'); w.className = 'w'; w.style.setProperty('--i', i++); w.textContent = t; f.appendChild(w); } });
          c.replaceWith(f);
        } else if (c.nodeType === 1 && !c.classList.contains('w')) walk(c);
      });
      walk(el);
    }
    function ripple(e) {
      if (reduce) return;
      const t = e.target.closest('.btn,.chip,.al,.dir,.pcard,.hcard,.ctile,.pill,.round,.excl-row,.seg button,.fam-h,.ncard,.ccard'); if (!t) return;
      const r = t.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2.4;
      const sp = document.createElement('span'); sp.className = 'rpl';
      sp.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
      t.appendChild(sp); setTimeout(() => sp.remove(), 1500);
    }
    document.addEventListener('pointerdown', ripple, { passive: true });
    // parallaxe du décor + barre d'onglets qui se retire en descendant
    // les cartes flottent très doucement selon leur position à l'écran (décalage entre colonnes, image qui glisse dans son cadre)
    const DRIFT = '.pcard,.hcard,.ccard,.ctile';
    function drift(sc) {
      if (reduce) return;
      const H = sc.clientHeight, top = sc.getBoundingClientRect().top, rows = [];
      $$(DRIFT, sc).forEach((el, i) => {
        const r = el.getBoundingClientRect(), y = r.top - top;
        if (y > H + 160 || y + r.height < -160) return;
        rows.push([el, ((y + r.height / 2) / H - .5), i]);
      });
      rows.forEach(([el, p, i]) => {
        const k = i % 2 ? 1 : .55;
        el.style.setProperty('--dr', (p * -16 * k).toFixed(1) + 'px');
        el.style.setProperty('--pi', (p * -10).toFixed(1) + 'px');
      });
    }
    let last = 0;
    $$('.screen .scroll').forEach(sc => {
      let tick = false;
      sc.addEventListener('scroll', () => {
        if (tick) return; tick = true;
        requestAnimationFrame(() => {
          const y = sc.scrollTop, dy = y - last; tick = false;
          if (!sc.closest('.screen.active')) return;
          app.style.setProperty('--sy', y); sc.style.setProperty('--sy', y);
          drift(sc);
          if (y > 80 && dy > 12) app.classList.add('tbhide'); else if (dy < -12 || y < 50) app.classList.remove('tbhide');
          last = y;
        });
      }, { passive: true });
    });
    function progress(wrap, sc) {
      let p = wrap.querySelector('.prog');
      if (!p) { p = document.createElement('div'); p.className = 'prog'; p.innerHTML = '<i></i>'; wrap.appendChild(p); }
      if (sc._pf) sc.removeEventListener('scroll', sc._pf);
      sc._pf = () => { const m = sc.scrollHeight - sc.clientHeight; p.style.setProperty('--p', m > 0 ? Math.min(1, sc.scrollTop / m).toFixed(3) : 0); wrap.style.setProperty('--rs', Math.min(sc.scrollTop, 900)); };
      sc.addEventListener('scroll', sc._pf, { passive: true }); sc._pf();
    }
    return { watchEls, watchScreens, replay, splitWords, progress, resetScroll() { last = 0; app.classList.remove('tbhide'); app.style.setProperty('--sy', 0); } };
  })();

  /* ---------- navigation ---------- */
  function go(tab) {
    if (destOpen) closeDest(true);
    if (resultOpen) closeResult(true);
    const order = ['home', 'places', 'create', 'quiz', 'coll'], dir = order.indexOf(tab) >= order.indexOf(state.tab) ? 1 : -1;
    const cur = $('.screen.active'), nxt = $('#s-' + tab);
    if (nxt && cur !== nxt) {
      if (cur) cur.style.setProperty('--tx', (-dir * 38) + 'px');                      // l'écran quitté glisse d'un côté…
      nxt.style.transition = 'none'; nxt.style.setProperty('--tx', (dir * 38) + 'px'); void nxt.offsetWidth; nxt.style.transition = '';   // …le nouveau arrive de l'autre
      Motion.replay(nxt);
    }
    state.tab = tab; $('#app').dataset.tab = tab;
    $('#tabbar').style.setProperty('--i', Math.max(0, order.indexOf(tab)));
    $$('.screen').forEach(s => s.classList.toggle('active', s.id === 's-' + tab));
    $$('#tabbar button').forEach(b => b.classList.toggle('on', b.dataset.go === tab));
    if (tab === 'coll') renderColl();
    if (tab === 'quiz') renderQuiz();
    const sc = $('#s-' + tab + ' .scroll'); if (sc) sc.scrollTop = 0;
    Motion.resetScroll();
  }
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-go]'); if (g) { vibrate(8); go(g.dataset.go); return; }
    const card = e.target.closest('[data-sc]');
    if (card) {
      const id = card.dataset.sc, grid = card.parentElement;
      if (grid.classList.contains('dimmed')) return;
      vibrate(10);
      if (reduce) { openScene(id); return; }
      card.classList.add('picked'); grid.classList.add('dimmed');            // la carte se soulève, les autres s'effacent
      setTimeout(() => { grid.classList.remove('dimmed'); card.classList.remove('picked'); openScene(id); }, 560);
    }
  });

  // logos monochromes des quatre catégories (traits arrondis, tracés au chargement)
  const LOGO = (() => {
    const wrap = body => `<svg class="logo" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
    const P = d => `<path pathLength="1" d="${d}"/>`;
    return {
      // Intérieurs : une maison, sa fenêtre en arche et sa cheminée
      int: wrap(P('M9 31 L32 11 L55 31') + P('M15 27 V53 H49 V27') + P('M25 53 V39 a7 7 0 0 1 14 0 V53') + P('M43 19 V11 H49 V24')),
      // Particuliers : le chapiteau d'un cirque, symbole des fêtes, foires et lieux du quotidien
      par: wrap(P('M32 7 V15') + P('M32 7 L42 10.5 L32 14') + P('M32 15 L7 35 H57 Z') + P('M12 35 V54 H52 V35') + P('M25 54 V46 a7 7 0 0 1 14 0 V54')),
      // Voyage : un globe et ses méridiens
      voy: wrap(`<circle pathLength="1" cx="32" cy="32" r="22"/><ellipse pathLength="1" cx="32" cy="32" rx="10" ry="22"/>` + P('M10 32 H54') + P('M14 20 Q32 25 50 20') + P('M14 44 Q32 39 50 44')),
      // Souvenirs : une photo instantanée avec son soleil et sa colline
      sou: wrap(`<rect pathLength="1" x="11" y="8" width="42" height="48" rx="5"/><rect pathLength="1" x="16" y="13" width="32" height="30" rx="2"/><circle pathLength="1" cx="27" cy="23" r="3.6"/>` + P('M16 43 L29 30 L36 38 L41 33 L48 43') + P('M23 50 H41'))
    };
  })();
  const CAT_TEXT = { int: 'Chalet, bibliothèque, hôpital…', par: 'Station-service, cirque, ferme…', voy: 'Marchés, plages, volcans…', sou: 'Grenier, rentrée, Noël…' };

  /* ---------- accueil ---------- */
  function renderHome() {
    const picks = shuffle(VS.SCENES).slice(0, 10);
    $('#homeCarousel').innerHTML = picks.map(s => `<button class="hcard" data-sc="${s.id}"><div class="pic"><div class="art-w" data-art="${s.id}"></div><span class="em">${s.e}</span></div><b>${s.n}</b><small>${s.tag}</small></button>`).join('');
    lazyArt($('#homeCarousel'));
    const tc = { int: ['#f4dcbf', '#e6b67f'], par: ['#f6d6c9', '#d9a18d'], voy: ['#dfe5c8', '#adb78f'], sou: ['#ecd5dd', '#d3a2b5'] };
    const desc = { int: 'Chalet, bibliothèque, hôpital…', par: 'Station-service, cirque, ferme…', voy: 'Marchés, plages, volcans…', sou: 'Grenier, rentrée, Noël…' };
    $('#catTiles').innerHTML = VS.CATS.map(c => `<button class="ctile" data-cat="${c.id}" style="--tb:${tc[c.id][0]};--tc:${tc[c.id][1]}">${LOGO[c.id]}<b>${c.n}</b><small>${VS.SCENES.filter(s => s.cat === c.id).length} lieux · ${CAT_TEXT[c.id]}</small></button>`).join('');
    $$('#catTiles .ctile').forEach(b => b.addEventListener('click', () => { state.cat = b.dataset.cat; state.sub = 'all'; renderPlaces(); go('places'); }));
    $('#homeStats').innerHTML = `<div><b>${VS.NOTE_LIST.length}</b><span>senteurs</span></div><div><b>${VS.SCENES.length}</b><span>lieux</span></div><div><b>${Object.keys(FAM).length}</b><span>familles</span></div>`;
  }
  $$('[data-sl]').forEach(b => b.addEventListener('click', () => { const c = $('#homeCarousel'); c.scrollBy({ left: +b.dataset.sl * Math.round(c.clientWidth * .8), behavior: 'smooth' }); vibrate(6); }));
  $('#btnSurprise').addEventListener('click', () => {
    vibrate(15);
    if (Math.random() < .5) { openScene(VS.SCENES[Math.floor(Math.random() * VS.SCENES.length)].id); return; }
    const moods = shuffle(VS.MOODS).slice(0, 2).map(m => m[0]), dirs = [shuffle(VS.DIRECTIONS)[0][0]];
    const opts = { moods, dirs, picks: [], size: [3, 3, 3] };
    const c = E.compose(opts); c.opts = opts; run(c);
  });

  /* ---------- lieux ---------- */
  function renderPlaces() {
    $('#catChips').innerHTML = [{ id: 'all', n: 'Tous' }].concat(VS.CATS).map(c => `<button class="chip${state.cat === c.id ? ' on' : ''}" data-c="${c.id}">${c.n}</button>`).join('');
    $$('#catChips .chip').forEach(b => b.addEventListener('click', () => { state.cat = b.dataset.c; state.sub = 'all'; renderPlaces(); }));
    // sous-catégories de la catégorie choisie
    const row = $('#subRow'), subs = state.cat === 'all' ? [] : VS.SUBS[state.cat];
    row.classList.toggle('open', subs.length > 0);
    if (subs.length) {
      const n = id => VS.SCENES.filter(s => s.cat === state.cat && s.sub === id).length;
      $('#subChips').innerHTML = [['all', 'Toutes', VS.SCENES.filter(s => s.cat === state.cat).length]].concat(subs.map(x => [x[0], x[1], n(x[0])]))
        .map((x, i) => `<button class="chip sm${state.sub === x[0] ? ' on' : ''}" data-s="${x[0]}" style="--k:${i}">${x[1]} <em>${x[2]}</em></button>`).join('');
      $$('#subChips .chip').forEach(b => b.addEventListener('click', () => { state.sub = b.dataset.s; vibrate(8); renderPlaces(); }));
    }
    const q = strip(state.q.trim());
    const list = VS.SCENES.filter(s => (state.cat === 'all' || s.cat === state.cat) && (state.sub === 'all' || s.sub === state.sub) && (!q || strip(s.n + ' ' + s.tag + ' ' + s.notes.map(id => NOTES[id].n).join(' ')).includes(q)));
    $('#placeCount').textContent = list.length + (list.length > 1 ? ' lieux' : ' lieu');
    const grid = $('#placeGrid');
    grid.innerHTML = list.length ? list.map((s, i) => `<button class="pcard" data-sc="${s.id}" style="--i:${Math.min(i, 14)}"><div class="pic"><div class="art-w" data-art="${s.id}"></div><span class="em">${s.e}</span>${E.adaptIds(s.notes).swaps.length ? '<span class="adp">Adapté</span>' : ''}</div><b>${s.n}</b><span class="t">${s.tag}</span><span class="ns">${noteIcons(s, 5)}</span></button>`).join('') : `<div class="empty"><span class="shape"></span>Aucun lieu ne répond à « ${state.q} ».<br>Essaie de le décrire dans <b>Créer</b>.</div>`;
    lazyArt(grid); Motion.watchEls(grid, $$('.pcard', grid));
  }
  $('#placeSearch').addEventListener('input', e => { state.q = e.target.value; renderPlaces(); });

  /* ---------- création ---------- */
  function renderCreate() {
    $('#dirGrid').innerHTML = VS.DIRECTIONS.map(d => `<button class="dir" data-d="${d[0]}" style="--dc:${{ nos: '#e6b67f', dec: '#adb78f', voy: '#efcbbb', exo: '#d9a18d' }[d[0]]}"><b>${d[1]}</b><small>${d[3]}</small></button>`).join('');
    $$('#dirGrid .dir').forEach(b => b.addEventListener('click', () => { toggleSet(state.dirs, b.dataset.d, 2); b.classList.toggle('on', state.dirs.has(b.dataset.d)); vibrate(8); sync(); }));
    $('#moodChips').innerHTML = VS.MOODS.map(m => `<button class="chip" data-m="${m[0]}">${m[1]}</button>`).join('');
    $$('#moodChips .chip').forEach(b => b.addEventListener('click', () => { toggleSet(state.moods, b.dataset.m, 5); b.classList.toggle('on', state.moods.has(b.dataset.m)); vibrate(8); sync(); }));
    renderNotePicker();
    $$('#richSeg button').forEach(b => b.addEventListener('click', () => { state.rich = +b.dataset.r; $$('#richSeg button').forEach(x => x.classList.toggle('on', x === b)); vibrate(8); }));
  }
  function toggleSet(set, v, max) {
    if (set.has(v)) set.delete(v);
    else if (set.size >= max) toast(`${max} choix maximum — retire-en un d'abord`);
    else set.add(v);
  }
  /* ---------- sélecteur de senteurs : pyramide, suggestions, univers, familles repliables ---------- */
  const MACROS = [
    ['fl', 'Fleurs', ['fl']], ['fr', 'Fruits & agrumes', ['fr', 'ag']], ['go', 'Gourmandises', ['go', 'co']], ['bv', 'Boissons & sirops', ['bv']],
    ['cu', 'Salé & snacks', ['cu']], ['ep', 'Épices & herbes', ['ep', 'ar', 've']], ['bo', 'Bois & résines', ['bo', 're', 'am']],
    ['ma', 'Mer & minéral', ['ma', 'mi']], ['te', 'Terre & fumée', ['te', 'cr']], ['mu', 'Propre & poudré', ['mu']]
  ];
  const ICONIC = ['vanille', 'rose', 'bergamote', 'cedre', 'cuir', 'caramel', 'popcorn', 'violette', 'jasmin', 'ambre', 'citron', 'cannelle'];
  const chipHTML = (n, on) => `<button class="chip note${on ? ' on' : ''}" data-n="${n.id}" style="--fc:${FAM[n.f].c}">${n.e} ${n.n}</button>`;
  const byName = (a, b) => a.n.localeCompare(b.n, 'fr');
  state.macro = 'all'; state.layer = 'all'; state.open = new Set();

  function renderMacros() {
    const cnt = ids => VS.NOTE_LIST.filter(n => ids.includes(n.f) && !VS.EXCL.has(n.id)).length;
    $('#macroChips').innerHTML = [['all', 'Tout', Object.keys(FAM)]].concat(MACROS).map(m => `<button class="chip${state.macro === m[0] ? ' on' : ''}" data-m="${m[0]}"><span class="dot" style="--fc:${FAM[m[2][0]].c}"></span>${m[1]} <em>${cnt(m[2])}</em></button>`).join('');
    $$('#macroChips .chip').forEach(b => b.addEventListener('click', () => {
      state.macro = b.dataset.m; state.open = new Set(); vibrate(8);
      $$('#macroChips .chip').forEach(x => x.classList.toggle('on', x === b)); renderNotes();
    }));
  }
  function renderNotePicker() {
    renderMacros();
    $$('#layerSeg button').forEach(b => b.addEventListener('click', () => {
      state.layer = b.dataset.l; vibrate(8); $$('#layerSeg button').forEach(x => x.classList.toggle('on', x === b)); renderNotes();
    }));
    const step = $('#noteStep');
    step.addEventListener('click', e => {
      const h = e.target.closest('.fam-h');
      if (h) { const sec = h.parentElement, f = sec.dataset.f; sec.classList.toggle('open'); sec.classList.contains('open') ? state.open.add(f) : state.open.delete(f); vibrate(6); return; }
      const x = e.target.closest('[data-x]'); if (x) { togglePick(x.dataset.x); return; }
      const c = e.target.closest('.chip[data-n]'); if (c) togglePick(c.dataset.n);
    });
    renderNotes(); refreshTray(); refreshSugg();
  }
  function togglePick(id) {
    const i = state.picks.indexOf(id);
    if (i >= 0) state.picks.splice(i, 1);
    else if (state.picks.length >= 5) { toast('5 senteurs maximum : retire-en une d\'abord'); return; }
    else state.picks.push(id);
    vibrate(8);
    $$('#noteStep .chip[data-n="' + id + '"]').forEach(b => b.classList.toggle('on', state.picks.includes(id)));
    refreshTray(); refreshBadges(); sync();
  }
  function refreshBadges() {
    $$('#noteList .fam').forEach(sec => {
      const k = state.picks.filter(id => NOTES[id].f === sec.dataset.f).length, b = $('.selb', sec);
      b.hidden = !k; b.textContent = k;
    });
  }
  function refreshTray() {
    const rows = ['T', 'C', 'F'].map(L => {
      const ids = state.picks.filter(id => NOTES[id].l === L);
      return `<div class="tr"><span class="tl">${VS.LAYERS[L].short}</span><div class="tc">${ids.length ? ids.map(id => `<button class="chip note on" data-x="${id}" style="--fc:${FAM[NOTES[id].f].c}">${NOTES[id].e} ${NOTES[id].n} <u>×</u></button>`).join('') : '<span class="ph">à choisir</span>'}</div></div>`;
    }).join('');
    $('#tray').innerHTML = `<div class="tray-h">Ta pyramide <b>${state.picks.length} / 5</b></div>${rows}`;
  }
  function refreshSugg() {
    const q = state.nq.trim();
    $('#suggBox').hidden = !!q;
    if (q) return;
    const tw = {}; state.moods.forEach(t => tw[t] = (tw[t] || 0) + 1); state.dirs.forEach(t => tw[t] = (tw[t] || 0) + 1.7);
    const picks = state.picks.map(id => NOTES[id]);
    let list, label;
    if (state.moods.size || state.dirs.size || picks.length) {
      label = 'Suggestions pour toi';
      list = VS.NOTE_LIST.filter(n => !state.picks.includes(n.id) && !VS.EXCL.has(n.id)).map(n => {
        let sc = n.t.reduce((a, t) => a + (tw[t] || 0), 0);
        picks.forEach(p => { sc += VS.pairScore(n.f, p.f) * 1.1; });
        return { n, sc: sc + (ICONIC.includes(n.id) ? .4 : 0) };
      }).sort((a, b) => b.sc - a.sc).slice(0, 12).map(x => x.n);
    } else { label = 'Pour commencer'; list = ICONIC.map(id => NOTES[id]).filter(n => !VS.EXCL.has(n.id)); }
    $('#suggL').textContent = label;
    $('#sugg').innerHTML = list.map(n => chipHTML(n, state.picks.includes(n.id))).join('');
  }
  function renderNotes() {
    const q = strip(state.nq.trim());
    const fams = state.macro === 'all' ? Object.keys(FAM) : MACROS.find(m => m[0] === state.macro)[2];
    let html = '';
    fams.forEach(f => {
      const ns = VS.NOTE_LIST.filter(n => n.f === f && !VS.EXCL.has(n.id) && (state.layer === 'all' || q || n.l === state.layer) && (!q || strip(n.n + ' ' + n.d).includes(q)));
      if (!ns.length) return;
      const open = !!q || state.open.has(f) || (state.macro !== 'all' && fams.length <= 3);
      const sel = state.picks.filter(id => NOTES[id].f === f).length;
      const body = ['T', 'C', 'F'].map(L => ({ L, l: ns.filter(n => n.l === L).sort(byName) })).filter(g => g.l.length)
        .map(g => (state.layer === 'all' ? `<h6>${VS.LAYERS[g.L].n} · ${g.l.length}</h6>` : '') + `<div class="chips wrap">${g.l.map(n => chipHTML(n, state.picks.includes(n.id))).join('')}</div>`).join('');
      html += `<section class="fam${open ? ' open' : ''}" data-f="${f}" style="--fc:${FAM[f].c}"><button class="fam-h"><i class="dot"></i><b>${FAM[f].n}</b><em>${ns.length}</em><span class="prev">${ns.slice(0, 5).map(n => n.e).join('')}</span><span class="selb"${sel ? '' : ' hidden'}>${sel}</span><i class="chev"></i></button><div class="fam-b"><div class="fam-in">${body}</div></div></section>`;
    });
    $('#noteList').innerHTML = html || '<div class="empty" style="padding:24px">Aucune senteur trouvée.<br>Essaie un autre mot ou un autre univers.</div>';
  }
  $('#noteSearch').addEventListener('input', e => { state.nq = e.target.value; renderNotes(); refreshSugg(); });
  let textT;
  $('#freeText').addEventListener('input', e => {
    state.text = e.target.value; clearTimeout(textT); textT = setTimeout(analyze, 350); sync();
  });
  function analyze() {
    const t = state.text.trim(), hint = $('#textHint');
    if (t.length < 3) { hint.textContent = ''; return; }
    const a = E.analyzeText(t), bits = [];
    if (a.dirs.length) bits.push('direction ' + a.dirs.map(d => VS.DIRECTIONS.find(x => x[0] === d)[1]).join(' + '));
    if (a.tags.length) bits.push('ambiance ' + a.tags.map(d => VS.MOODS.find(x => x[0] === d)[1].toLowerCase()).join(', '));
    if (a.picks.length) bits.push('senteurs ' + a.picks.map(id => NOTES[id].n.toLowerCase()).join(', '));
    if (a.scene) bits.push('proche de « ' + a.scene.n + ' »');
    hint.textContent = bits.length ? '✓ Compris : ' + bits.join(' · ') : 'Je n\'ai pas tout saisi, mais je m\'en inspire — ajoute quelques envies ci-dessous.';
  }
  let lastN = -1;
  function sync() {
    const n = state.dirs.size + state.moods.size + state.picks.length, hasT = state.text.trim().length > 2;
    if (typeof refreshSugg === 'function' && $('#sugg')) refreshSugg();
    $('#moodCount').textContent = state.moods.size ? state.moods.size + ' / 5' : 'jusqu\'à 5';
    $('#pickCount').textContent = state.picks.length ? state.picks.length + ' / 5' : 'jusqu\'à 5';
    $('#btnCreate').disabled = !(n || hasT);
    if (n + (hasT ? 1 : 0) !== lastN) { lastN = n + (hasT ? 1 : 0); const ci = $('#cbInfo'); ci.classList.remove('bump'); void ci.offsetWidth; ci.classList.add('bump'); }
    $('#cbInfo').innerHTML = n || hasT
      ? `<b>${n + (hasT ? 1 : 0)}</b> envie${n + (hasT ? 1 : 0) > 1 ? 's' : ''} · ${state.dirs.size} direction${state.dirs.size > 1 ? 's' : ''}, ${state.moods.size} ambiance${state.moods.size > 1 ? 's' : ''}, ${state.picks.length} senteur${state.picks.length > 1 ? 's' : ''}`
      : 'Choisis au moins une envie';
  }
  $('#btnCreate').addEventListener('click', () => {
    vibrate(20);
    const t = state.text.trim();
    const an = t.length > 2 ? E.analyzeText(t) : { tags: [], dirs: [], picks: [], scene: null };
    const moods = Array.from(new Set([...state.moods, ...an.tags])).slice(0, 6);
    const dirs = Array.from(new Set([...state.dirs, ...an.dirs])).slice(0, 2);
    const picks = state.picks.slice();
    an.picks.forEach(p => { if (!picks.includes(p) && !VS.EXCL.has(p) && picks.length < 5) picks.push(p); });
    if (an.scene && !picks.length) {
      const ns = an.scene.notes.map(id => NOTES[id]);
      ['C', 'F', 'T'].forEach(l => { const n = ns.find(x => x.l === l); if (n && !VS.EXCL.has(n.id) && picks.length < 3) picks.push(n.id); });
    }
    const spec = an.scene ? { id: 't' + an.scene.id, pal: an.scene.pal, art: an.scene.art } : null;
    const opts = { moods, dirs, picks, size: [[2, 2, 2], [3, 3, 3], [3, 4, 4]][state.rich], spec };
    const c = E.compose(opts); c.opts = opts;
    if (an.scene) c.tag = 'D\'après ton idée : « ' + t.replace(/\.+$/, '') + ' »';
    run(c);
  });

  /* ---------- collection ---------- */
  function renderFavD() {
    const box = $('#favDest'), list = favD.map(id => VS.DESTS.find(d => d.id === id)).filter(Boolean);
    box.hidden = !list.length;
    box.innerHTML = list.length ? `<h3 class="fav-t">Destinations gardées</h3><div class="rel fav-row">${list.map(d => `<button class="hcard" data-fd="${d.id}"><div class="pic"><div class="art-w" data-art="${d.art}"></div></div><b>${d.n}</b><small>${d.c}</small></button>`).join('')}</div>` : '';
    lazyArt(box);
    $$('[data-fd]', box).forEach(b => b.addEventListener('click', () => { const i = list.findIndex(d => d.id === b.dataset.fd); openDest({ fav: true, ids: [], families: [], accord: '', text: '' }, list.map(d => ({ d, hits: [], aff: null })), i); }));
  }
  function renderColl() {
    const grid = $('#collGrid');
    $('#collBadge').hidden = !(coll.length + favD.length); $('#collBadge').textContent = coll.length + favD.length;
    renderFavD();
    if (!coll.length) { grid.innerHTML = `<div class="empty"><span class="shape"></span>${favD.length ? 'Pas encore de parfum gardé.' : 'Ta collection est vide.<br>Compose un parfum et touche <b>Garder</b> pour le retrouver ici.'}</div>`; return; }
    grid.innerHTML = coll.map((c, i) => {
      const comp = rebuild(c);
      return `<button class="ccard${c.fmt === 'huile' ? ' eo-c' : ''}" data-k="${c.key}" style="animation-delay:${i * 60}ms"><div class="th">${Art.scene(comp.spec, { static: true })}<span class="bt">${Art.bottle({ cols: [comp.layerColor.T, comp.layerColor.C, comp.layerColor.F], shares: shares(comp) })}</span></div><div><b>${comp.name}</b><div class="ac">${comp.accord}</div>${comp.conflicts && comp.conflicts.length ? '<div class="warnb">Contient une senteur que tu évites</div>' : ''}<div class="nn">${comp.notes.slice(0, 5).map(n => n.e + ' ' + n.n).join(' · ')}</div></div><span class="del" data-del="${c.key}" aria-label="Supprimer">✕</span></button>`;
    }).join('');
    Motion.watchEls(grid, $$('.ccard', grid));
    $$('.ccard', grid).forEach(b => b.addEventListener('click', e => {
      const del = e.target.closest('[data-del]');
      if (del) { e.stopPropagation(); coll = coll.filter(x => x.key !== del.dataset.del); store.set('vs.coll', coll); renderColl(); toast('Parfum retiré de ta collection'); return; }
      const c = coll.find(x => x.key === b.dataset.k); if (c) openResult(rebuild(c), false);
    }));
  }
  function rebuild(c) { const comp = E.build(c.ids, { extra: c.extra, key: c.key, name: c.name, tag: c.tag, sceneId: c.sceneId, emoji: c.emoji, cat: c.cat, dirs: c.dirs, moods: c.moods, spec: c.spec }); comp.opts = c.opts; comp.fmt = c.fmt || 'parfum'; return comp; }
  const isSaved = k => coll.some(c => c.key === k);
  function toggleSave(comp) {
    if (isSaved(comp.key)) { coll = coll.filter(c => c.key !== comp.key); toast('Retiré de ta collection'); }
    else { coll.unshift({ key: comp.key, name: comp.name, tag: comp.tag, sceneId: comp.sceneId, emoji: comp.emoji, cat: comp.cat, dirs: comp.dirs, moods: comp.moods, extra: comp.extra || [], ids: comp.ids, fmt: comp.fmt || mode, spec: comp.spec, opts: comp.opts || null, ts: Date.now() }); toast('Ajouté à ta collection 💜'); }
    store.set('vs.coll', coll); renderColl();
  }
  const shares = comp => { const s = comp.layerShare; return [s.T || 0, s.C || 0, s.F || 0]; };

  /* ---------- lancement : scène préfaite ou création ---------- */
  function openScene(id) { const sc = SCENE[id]; if (!sc) return; const c = E.fromScene(sc); run(c); }
  async function run(comp) { await runLab(comp); openResult(comp, true); }

  /* ---------- laboratoire (animation de création) ---------- */
  let labAbort = null;
  const FLASK = 'M82,20 H118 V84 C168,98 186,142 176,184 C168,226 136,246 100,246 C64,246 32,226 24,184 C14,142 32,98 82,84Z';
  function bottleHTML(comp, lab) {
    const o = { lab, cols: [comp.layerColor.T, comp.layerColor.C, comp.layerColor.F], shares: shares(comp) };
    if (bottleKind === 'gl' && VS.BottleGL.ok()) return VS.BottleGL.html(o);
    if (bottleKind !== 'flat') return VS.Bottle3D.html(o);
    return lab ? flaskSVG(comp) : Art.bottle(o);
  }
  // monte le flacon 3D ou liquide ; renvoie l'API WebGL (ou null)
  function mountBottle(root) {
    VS.Bottle3D.mount(root);
    return VS.BottleGL.ok() ? VS.BottleGL.mount(root) : null;
  }
  const flaskSVG = comp => Art.flask({ cols: [comp.layerColor.T, comp.layerColor.C, comp.layerColor.F], shares: shares(comp) });
  async function runLab(comp) {
    const lab = $('#lab'), stage = $('#labStage'), wipe = $('#labWipe');
    let aborted = false; labAbort = () => { aborted = true; };
    const pastel = (c, t) => Art.mix(c, '#fff6ee', t);
    lab.style.setProperty('--lb0', pastel(comp.layerColor.C, .84)); lab.style.setProperty('--lb1', pastel(comp.layerColor.C, .7));
    lab.style.setProperty('--lb2', pastel(comp.layerColor.F, .6)); lab.style.setProperty('--lb3', pastel(comp.layerColor.T, .68));
    $('#labTitle').textContent = comp.name;
    stage.className = 'lab-stage'; stage.innerHTML = bottleHTML(comp, true);
    const gla = mountBottle(stage);
    wipe.className = 'wipe';
    $$('.lab-dots i', lab).forEach(d => d.classList.remove('on'));
    $$('.fly,.ringp', lab).forEach(n => n.remove());
    lab.hidden = false; lab.setAttribute('aria-hidden', 'false'); void lab.offsetWidth; lab.classList.add('show');

    const phase = (t, s) => { $('#labPhase').innerHTML = `<span class="ph">${t}<small>${s || ''}</small></span>`; };
    const dot = i => $$('.lab-dots i', lab)[i].classList.add('on');
    $('#labSkip').onclick = () => { aborted = true; };
    const wait = async ms => { const end = Date.now() + ms; while (Date.now() < end && !aborted) await sleep(40); };
    const quick = reduce ? .25 : 1;
    const b3 = stage.querySelector('.b3d');
    // montée du liquide et goutte qui tombe : version plate (SVG) ou 3D
    const rise = L => { if (gla) gla.rise(L); else if (b3) b3.classList.add('in' + L); else $('#ly' + L).classList.add('in'); stage.classList.add('has-' + L); };
    const dropIn = L => {
      if (gla) { gla.drop(L); return; }
      if (b3) {
        const fit = $('.b3d-fit', b3), dp = document.createElement('i'); dp.className = 'drp3'; dp.style.setProperty('--c', comp.layerColor[L]);
        dp.style.setProperty('--fall', (VS.Bottle3D.surfaceY(b3, L) - 66) + 'px'); fit.appendChild(dp);
        setTimeout(() => { dp.remove(); const t = $('.lq-' + L + ' .t', b3); if (t) { t.classList.remove('pulse'); void t.offsetWidth; t.classList.add('pulse'); } }, 620);
        return;
      }
      const svg = stage.querySelector('svg'), dp = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dp.setAttribute('class', 'drp'); dp.setAttribute('cx', 100); dp.setAttribute('cy', 66); dp.setAttribute('r', 3.4); dp.setAttribute('fill', comp.layerColor[L]);
      dp.style.setProperty('--fall', (parseFloat($('#rp' + L).getAttribute('cy')) - 66 + 4) + 'px');
      svg.appendChild(dp); setTimeout(() => { dp.remove(); const rp = $('#rp' + L); rp.classList.remove('go'); void rp.getBBox(); rp.classList.add('go'); }, 620);
    };

    phase('Évocation', comp.tag || 'On imagine l\'endroit…'); dot(0);
    await wait(1200 * quick);
    // le liquide monte : fond, puis cœur, puis tête
    const labels = { F: ['Notes de fond', 'La base se pose'], C: ['Notes de cœur', 'Le caractère se dessine'], T: ['Notes de tête', 'L\'éclat de l\'ouverture'] };
    for (const [li, L] of ['F', 'C', 'T'].entries()) {
      if (aborted) break;
      const ns = comp.byLayer[L]; if (!ns.length) continue;
      phase(labels[L][0], ns.map(n => n.n.toLowerCase()).join(' · ')); dot(li + 1);
      const sr = stage.getBoundingClientRect(), lr = lab.getBoundingClientRect();
      const tx = sr.left - lr.left + sr.width / 2, ty = sr.top - lr.top + sr.height * .06;
      let risen = false;
      const flights = ns.map((n, i) => new Promise(res => {
        const el = document.createElement('div'); el.className = 'fly'; el.innerHTML = `${n.e}<span>${n.n}</span>`;
        el.style.opacity = '0'; lab.appendChild(el);
        const w = el.offsetWidth / 2, h = el.offsetHeight / 2;
        const side = i % 2 ? 1 : -1, sx = tx + side * rnd(lr.width * .18, lr.width * .34), sy = rnd(lr.height * .2, lr.height * .5);
        setTimeout(() => {
          if (aborted) { el.remove(); return res(); }
          const a = el.animate([
            { transform: `translate(${sx - w}px,${sy - h + 24}px) scale(.8)`, opacity: 0 },
            { transform: `translate(${sx - w}px,${sy - h}px) scale(1)`, opacity: 1, offset: .32 },
            { transform: `translate(${(sx + tx) / 2 - w}px,${(sy + ty) / 2 - h - 26}px) scale(.8)`, opacity: .9, offset: .7 },
            { transform: `translate(${tx - w}px,${ty - h}px) scale(.35)`, opacity: 0 }
          ], { duration: 1200, easing: 'cubic-bezier(.45,.05,.25,1)', fill: 'forwards' });
          a.onfinish = () => {
            el.remove();
            if (!aborted) { if (!risen) { risen = true; rise(L); } dropIn(L); }   // une goutte de la couche tombe dans le flacon
            res();
          }; vibrate(6);
        }, i * 280 * quick);
      }));
      await Promise.all(flights);
      if (aborted) break;
      await wait(800 * quick);
    }
    if (!aborted) { phase('Mise en flacon', 'Le bouchon se referme, les notes s\'apprivoisent'); dot(3); stage.classList.add('closed'); if (gla) gla.close(); vibrate([10, 30, 10]); await wait(2300 * quick); }
    $$('.liq', stage).forEach(l => l.classList.add('in'));
    if (b3) b3.classList.add('inF', 'inC', 'inT');
    if (gla) gla.fillAll();
    wipe.classList.add('go');
    await sleep(aborted ? 450 : 950);
    labAbort = null;
    lab.classList.remove('show'); lab.setAttribute('aria-hidden', 'true');
    setTimeout(() => { lab.hidden = true; $$('.fly,.ringp', lab).forEach(n => n.remove()); }, 650);
  }

  /* ---------- résultat ---------- */
  const SEASON = { printemps: ['🌸', 'Printemps'], ete: ['☀️', 'Été'], automne: ['🍂', 'Automne'], hiver: ['❄️', 'Hiver'] };
  const TIERS = { T: ['Notes de tête', '0 – 30 min'], C: ['Notes de cœur', '30 min – 3 h'], F: ['Notes de fond', '3 h et plus'] };
  function relatedScenes(comp) {
    const vec = c => { const m = {}; c.families.forEach(f => m[f.f] = f.pct); return m; };
    const a = vec(comp), na = Math.sqrt(Object.values(a).reduce((s, v) => s + v * v, 0)) || 1;
    return VS.SCENES.filter(s => s.id !== comp.sceneId).map(s => {
      const b = vec(E.fromScene(s)), nb = Math.sqrt(Object.values(b).reduce((x, v) => x + v * v, 0)) || 1;
      let d = 0; Object.keys(a).forEach(k => d += a[k] * (b[k] || 0));
      return { s, v: d / (na * nb) };
    }).sort((x, y) => y.v - x.v).slice(0, 7).map(x => x.s);
  }
  function adaptHTML(comp) {
    let h = '';
    if (comp.swaps && comp.swaps.length) h += `<div class="adapt"><b>${comp.fmt === 'huile' ? comp.swaps.length + ' note' + (comp.swaps.length > 1 ? 's' : '') + ' sur ' + (comp.notes.length) + ' remplacée' + (comp.swaps.length > 1 ? 's' : '') + ' par une huile proche' : 'Adapté à tes préférences'}</b>${comp.swaps.map(w => `<span>${NOTES[w.from].n} → ${NOTES[w.to].n}</span>`).join('')}</div>`;
    if (comp.conflicts && comp.conflicts.length) h += `<div class="adapt warn"><b>Attention</b>Cette formule contient ${lst(comp.conflicts.map(id => NOTES[id].n.toLowerCase()))}, que tu as choisi d'éviter.</div>`;
    return h;
  }
  // mélange à diffuser : formule en gouttes + précautions
  function dropsHTML(comp) {
    const dr = VS.drops(comp.notes, 12), by = {}; comp.notes.forEach(n => { by[n.id] = n; });
    const rows = dr.list.map(x => `<div class="dr-row"><span class="ico">${by[x.id].e}</span><span class="nm"><b>${by[x.id].n}</b>${x.warn.length ? `<small>${x.warn.join(' · ')}</small>` : ''}</span><span class="dots" aria-hidden="true">${'<i></i>'.repeat(x.n)}</span><span class="dn2">${x.n} goutte${x.n > 1 ? 's' : ''}</span></div>`).join('');
    return `<section class="sec rv"><h2>Ton mélange à diffuser</h2><p class="sub">${dr.total} gouttes pour un diffuseur ultrasonique : verse-les dans l'eau, jamais sur la peau.</p><div class="drops">${rows}</div>` +
      `<div class="eo-note"><b>À savoir</b><p>Les huiles essentielles sont puissantes : aère la pièce, diffuse par séances courtes, et garde-les hors de portée des enfants. Beaucoup sont toxiques pour les chats et les chiens. Voyage des Sens est un jeu d'inspiration, pas un avis d'aromathérapie : demande conseil à un professionnel de santé si tu es enceinte, allergique ou asthmatique.</p></div></section>`;
  }
  function resultHTML(comp) {
    const st = comp.stats, maxP = Math.max.apply(null, comp.notes.map(n => n.pct));
    const catLabel = comp.cat && CAT[comp.cat] ? CAT[comp.cat].n : 'Création sur mesure';
    const tag = comp.tag || (comp.moods.length ? comp.moods.map(m => VS.MOODS.find(x => x[0] === m)[1].toLowerCase()).join(' · ') : 'Une composition rien que pour toi');
    const tags = [].concat(comp.extra || [], comp.dirs.map(d => VS.DIRECTIONS.find(y => y[0] === d)[1]), comp.moods.map(m => VS.MOODS.find(y => y[0] === m)[1]));
    const layers = ['T', 'C', 'F'].filter(l => comp.byLayer[l].length);
    const pyr = layers.map((L, i) => {
      const f1 = i / layers.length, f2 = (i + 1) / layers.length, c = comp.layerColor[L];
      const hw = f => 7 + 25 * f, pts = `${32 - hw(f1)},0 ${32 + hw(f1)},0 ${32 + hw(f2)},100 ${32 - hw(f2)},100`;
      const pct = comp.byLayer[L].reduce((a, n) => a + n.pct, 0);
      return `<div class="tier rv" style="--d:${i * .08}s"><div class="pyr"><svg viewBox="0 0 64 100" preserveAspectRatio="none"><polygon points="${pts}" fill="${c}" stroke="#f8eadf" stroke-width="2" vector-effect="non-scaling-stroke" style="--d:${.2 + i * .25}s"/></svg></div>` +
        `<div class="body"><h3>${TIERS[L][0]}<span>${TIERS[L][1]}</span></h3><div class="pct">${pct} % de la formule</div>` +
        comp.byLayer[L].map((n, k) => `<button class="ncard" data-note="${n.id}" style="--fc:${n.color};--w:${Math.max(6, Math.round(n.pct / maxP * 100))}%;--d:${(.25 + i * .2 + k * .08).toFixed(2)}s"><span class="ico">${n.e}</span><span><b>${n.n}</b><small>${n.d}</small></span><span class="p" data-count="${n.pct}" data-suf="%">0%</span><i class="bar"></i></button>`).join('') +
        `</div></div>`;
    }).join('');
    const C = 2 * Math.PI * 46; let cum = 0;
    const segs = comp.families.map((f, i) => { const len = Math.max(f.pct / 100 * C - 2.5, 1.5), s = `<circle class="seg" cx="60" cy="60" r="46" stroke="${f.c}" style="--len:${len.toFixed(2)};--d:${(i * .08).toFixed(2)}s" stroke-dashoffset="${(-cum).toFixed(2)}"/>`; cum += f.pct / 100 * C; return s; }).join('');
    const legend = comp.families.slice(0, 7).map(f => `<div><i style="--c:${f.c}"></i>${f.e} ${f.n}<span>${f.pct}%</span></div>`).join('');
    const seasonKeys = ['printemps', 'ete', 'automne', 'hiver'];
    const mom = { jour: ['☀️', 'Journée'], soir: ['🌙', 'Soirée'], 'jour & soir': ['🌗', 'Jour & soir'] }[st.moment];
    const rel = relatedScenes(comp);
    return `<div class="res-left"><div class="res-hero"><div class="art-bg" id="heroArt">${Art.scene(comp.spec)}</div><div class="res-top"><button class="round" id="rBack" aria-label="Retour">←</button><span class="top-actions"><button class="pill" id="rMix">Variation</button><button class="pill" id="rShare">Partager</button></span></div><div class="waves"><svg viewBox="0 0 400 70" preserveAspectRatio="none"><path class="w1" d="M-40,30 C40,0 120,60 220,28 S360,6 440,30 V70 H-40Z"/><path class="w2" d="M-40,50 C60,24 150,72 250,46 S380,32 440,50 V70 H-40Z"/></svg></div></div>` +
      `<div class="res-bottle${bottleKind !== 'flat' ? ' is3d' : ''}">${bottleHTML(comp, false)}</div>` +
      `<div class="res-title"><div class="badge">${catLabel}${comp.fmt === 'huile' ? ' · Huiles essentielles' : ''}</div><h1>${comp.name}</h1><p class="tg">${tag}</p><span class="accord">${comp.accord}</span></div>` +
      `</div><div class="res-right"><section class="sec rv"><h2>L'histoire</h2>${adaptHTML(comp)}<div class="story"><p>${comp.story}</p>${tags.length ? `<div class="tags">${tags.map(t => `<span>${t}</span>`).join('')}</div>` : ''}</div></section>` +
      `<section class="sec"><h2 class="rv">Pyramide olfactive</h2><p class="sub rv">Touche une note pour la découvrir.</p>${pyr}</section>` +
      (comp.fmt === 'huile' ? dropsHTML(comp) : '') +
      `<section class="sec rv"><h2>Palette de senteurs</h2><div class="donut-w"><div class="donut"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="46" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="15"/>${segs}</svg><div class="mid"><small>dominante</small><b style="font-size:${comp.families[0].n.length <= 6 ? 19 : comp.families[0].n.length <= 9 ? 16 : comp.families[0].n.length <= 11 ? 14 : 12.5}px">${comp.families[0].n}</b></div></div><div class="leg">${legend}</div></div></section>` +
      `<section class="sec rv"><h2>Signature</h2><div class="gauges"><div class="g"><div class="row"><span>Intensité</span><b>${st.intensity} / 10</b></div><div class="track"><div class="fill" style="--w:${st.intensity * 10}%"></div></div></div><div class="g"><div class="row"><span>Tenue</span><b>≈ ${st.hours} h</b></div><div class="track"><div class="fill" style="--w:${Math.round(st.hours / 14 * 100)}%"></div></div></div><div class="g"><div class="row"><span>Sillage</span><b>${st.sillage}</b></div><div class="track"><div class="fill" style="--w:${st.sillageV}%"></div></div></div></div>` +
      `<div class="sig2"><div class="box"><h4>Saisons</h4><div class="seasons">${seasonKeys.map(k => `<span class="${st.best.includes(k) ? 'on' : ''}">${SEASON[k][1]}</span>`).join('')}</div></div><div class="box"><h4>Moment</h4><div class="moment">${mom[1]}</div></div></div>` +
      `<div class="box" style="margin-top:12px"><h4>Cohérence de l'accord</h4><div class="harm"><div class="ring"><svg viewBox="0 0 80 80"><circle class="tr" cx="40" cy="40" r="34"/><circle class="pg" cx="40" cy="40" r="34" style="--hd:${(st.harmony / 100 * 213.6).toFixed(1)}"/></svg><b data-count="${st.harmony}" data-suf="%">0%</b></div><p>Les familles de cette formule s'accordent entre elles&nbsp;: aucune note ne vient contredire l'ensemble.</p></div></div></section>` +
      `<section class="sec rv"><h2>Dans la même veine</h2><div class="rel">${rel.map(s => `<button class="hcard" data-sc="${s.id}"><div class="pic"><div class="art-w" data-art="${s.id}"></div><span class="em">${s.e}</span></div><b>${s.n}</b></button>`).join('')}</div></section></div>`;
  }
  function openResult(comp, reveal) {
    comp.fmt = comp.fmt || mode;
    current = comp;
    const wrap = $('#result'), sc = $('#resScroll');
    wrap.hidden = false; wrap.setAttribute('aria-hidden', 'false');
    sc.innerHTML = resultHTML(comp); sc.scrollTop = 0;
    $$('.sec>h2', sc).forEach(Motion.splitWords); Motion.progress(wrap, sc);
    sc.classList.toggle('reveal', !!reveal);
    $('#resBar').innerHTML = `<button class="btn soft${isSaved(comp.key) ? ' on' : ''}" id="rSave">${isSaved(comp.key) ? 'Gardé' : 'Garder'}</button><button class="btn primary" id="rDest">Découvrir ma destination</button>`;
    lazyArt(sc); mountBottle(sc);
    void wrap.offsetWidth; wrap.classList.add('show');
    if (!resultOpen) { try { history.pushState({ r: 1 }, ''); } catch (e) { /* ignore */ } resultOpen = true; }
    // révélation au scroll
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); $$('[data-count]', e.target).forEach(countUp); io.unobserve(e.target); } }), { root: sc, threshold: .12 });
    $$('.rv', sc).forEach(el => io.observe(el));
    // parallaxe
    const art = $('#heroArt'); let tick = false;
    sc.onscroll = () => { if (tick) return; tick = true; requestAnimationFrame(() => { const y = sc.scrollTop; if (y < 700 && !document.documentElement.classList.contains('desktop')) art.style.transform = `translateY(${y * .38}px) scale(${1 + y / 2200})`; tick = false; }); };
    $('#rBack').onclick = () => closeResult();
    $('#rSave').onclick = e => { toggleSave(comp); const b = e.currentTarget; b.classList.toggle('on', isSaved(comp.key)); b.textContent = isSaved(comp.key) ? 'Gardé' : 'Garder'; vibrate(15); };
    $('#rShare').onclick = () => share(comp);
    $('#rMix').onclick = () => remix(comp);
    $('#rDest').onclick = () => openDest(comp);
    $$('.ncard', sc).forEach(b => b.addEventListener('click', () => openSheet(b.dataset.note, comp)));
    if (reveal) setTimeout(() => confetti(comp), 1500);
  }
  function countUp(el) {
    const to = +el.dataset.count, suf = el.dataset.suf || '', t0 = performance.now(), d = 1300, delay = 350;
    (function f(t) { const k = Math.max(0, Math.min(1, (t - t0 - delay) / d)), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(to * e) + suf; if (k < 1) requestAnimationFrame(f); })(t0);
  }
  function closeResult(fromPop) {
    const wrap = $('#result'); if (!resultOpen) return;
    resultOpen = false; wrap.classList.remove('show'); wrap.setAttribute('aria-hidden', 'true');
    setTimeout(() => { if (!resultOpen) { wrap.hidden = true; $('#resScroll').innerHTML = ''; } }, 420);
    closeSheet();
    if (!fromPop && history.state && history.state.r) { try { history.back(); } catch (e) { /* ignore */ } }
  }
  let skipPop = 0;
  window.addEventListener('popstate', () => { if (skipPop) { skipPop--; return; } if (prefsOpen) { closePrefs(true); return; } if (!$('#sheetWrap').hidden) { closeSheet(); return; } if (destOpen) { closeDest(true); return; } if (resultOpen) closeResult(true); });
  function confetti(comp) {
    const wrap = $('#result'); if (wrap.hidden) return;
    const r = $('.res-bottle', wrap); if (!r) return;
    const br = r.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
    const cx = br.left - wr.left + br.width / 2, cy = br.top - wr.top + br.height * .35;
    for (let i = 0; i < 20; i++) {
      const el = document.createElement('span'); el.className = 'conf';
      const a = rnd(0, Math.PI * 2), d = rnd(70, 200);
      el.style.cssText = `left:${cx}px;top:${cy}px;--sz:${rnd(8, 24).toFixed(0)}px;--cc:${comp.notes[i % comp.notes.length].color};--tx:${Math.cos(a) * d}px;--ty:${Math.sin(a) * d - 60}px;animation-delay:${i * 30}ms`;
      wrap.appendChild(el); setTimeout(() => el.remove(), 2800);
    }
    vibrate([12, 40, 12]);
  }
  function remix(comp) {
    vibrate(15);
    let opts = comp.opts;
    if (!opts) {
      const tally = {}; comp.notes.forEach(n => n.t.forEach(t => tally[t] = (tally[t] || 0) + n.pct));
      const tags = Object.keys(tally).sort((a, b) => tally[b] - tally[a]);
      const moods = tags.filter(t => VS.MOODS.some(m => m[0] === t)).slice(0, 3), dirs = tags.filter(t => VS.DIRECTIONS.some(d => d[0] === t)).slice(0, 1);
      const pk = ['C', 'F', 'T'].map(l => comp.byLayer[l][0]).filter(Boolean).map(n => n.id);
      opts = { moods, dirs, picks: pk.slice(0, 2), size: [3, 3, 3], spec: comp.spec };
    }
    const c = E.compose(Object.assign({}, opts, { seed: Math.floor(Math.random() * 1e9) }));
    c.opts = opts;
    if (comp.sceneId) { c.name = comp.name + ' · variation'; c.emoji = comp.emoji; c.cat = comp.cat; c.tag = 'Une autre lecture de « ' + comp.name + ' »'; }
    run(c);
  }
  async function share(comp) {
    const L = l => comp.byLayer[l].map(n => `${n.n} ${n.pct}%`).join(', ');
    const dst = E.destinations(comp)[0].d;
    const text = `${comp.name} — ${comp.accord}\n\nTête : ${L('T')}\nCœur : ${L('C')}\nFond : ${L('F')}\n\nMa destination : ${dst.n} (${dst.c})\n\nComposé avec Voyage des Sens`;
    try {
      if (navigator.share) { await navigator.share({ title: comp.name, text }); return; }
      await navigator.clipboard.writeText(text); toast('Formule copiée dans le presse-papiers');
    } catch (e) { if (e && e.name !== 'AbortError') toast('Partage indisponible sur cet appareil'); }
  }

  /* ---------- destination ---------- */
  let destOpen = false, destComp = null, destList = [], destIdx = 0;
  const lst = a => a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' et ' + a[a.length - 1];
  const tagLabel = t => (VS.MOODS.find(m => m[0] === t) || VS.DIRECTIONS.find(m => m[0] === t) || [0, t])[1].toLowerCase();
  function destHTML(comp, list, idx) {
    const x = list[idx], d = x.d, sc = SCENE[d.art];
    const spec = { id: 'd' + d.id, pal: sc.pal, art: sc.art, n: d.n };
    const hitNames = x.hits.map(id => NOTES[id].n.toLowerCase());
    const famNames = d.fams.filter(f => comp.families.some(c => c.f === f)).map(f => FAM[f].n.toLowerCase());
    const amb = lst(d.tags.slice(0, 3).map(tagLabel));
    const quiz = !!(comp.quiz || comp.fav), favm = !!comp.fav, exn = d.notes.some(id => VS.EXCL.has(id));
    const wn = comp.quiz && idx > 0 && x.parts ? '<p class="why-not">' + VS.Quiz.whyNot(list[0], x, comp.ans) + '</p>' : '';
    const why = quiz
      ? favm ? `Une destination que tu as gardée : son ambiance ${amb} t'avait plu.` : `Tu cherchais ${comp.text}. ${hitNames.length ? 'Tu y retrouveras ' + lst(hitNames) + ', des senteurs qui te correspondent.' : 'Son ambiance ' + amb + ' est celle de tes réponses.'}`
      : hitNames.length
      ? `Ta formule contient ${lst(hitNames)} : des senteurs qu'on respire partout à ${d.n}. Son accord ${comp.accord.toLowerCase()} rejoint l'ambiance ${amb} du lieu.`
      : famNames.length
        ? `Ton accord ${comp.accord.toLowerCase()} retrouve à ${d.n} les notes ${lst(famNames)} qui dominent l'air du lieu, dans une ambiance ${amb}.`
        : `L'ambiance ${amb} de ${d.n} est celle que ton parfum dessine.`;
    const chips = d.notes.map(id => `<span class="${(quiz ? x.hits : comp.ids).includes(id) ? 'on' : ''}${VS.EXCL.has(id) ? ' ex' : ''}"${VS.EXCL.has(id) ? ' title="' + (VS.EXCL_PREF.has(id) ? 'Écartée par tes préférences' : 'Pas d\'huile essentielle') + '"' : ''}>${NOTES[id].e} ${NOTES[id].n}</span>`).join('');
    const others = list.map((o, i) => [o, i]).filter(([, i]) => i !== idx).slice(0, 4);
    return `<div class="res-left"><div class="res-hero"><div class="art-bg" id="destArt">${Art.scene(spec)}</div><div class="res-top"><button class="round" id="dBack" aria-label="Retour">←</button><span></span></div><div class="waves"><svg viewBox="0 0 400 70" preserveAspectRatio="none"><path class="w1" d="M-40,30 C40,0 120,60 220,28 S360,6 440,30 V70 H-40Z"/><path class="w2" d="M-40,50 C60,24 150,72 250,46 S380,32 440,50 V70 H-40Z"/></svg></div></div>` +
      `<div class="res-title" style="padding-top:8px"><div class="badge">${favm ? 'Gardée' : 'Ta destination'} · ${d.c}</div><h1>${d.n}</h1><p class="tg">${d.tag}</p>${x.aff == null ? '' : '<span class="accord">' + x.aff + ' % d\'affinité ' + (comp.quiz ? 'avec tes réponses' : 'olfactive') + '</span>'}</div>` +
      `</div><div class="res-right"><section class="sec rv"><h2>Pourquoi ici</h2><div class="story"><p>${d.txt} ${why}</p>${wn}</div></section>` +
      `<section class="sec rv"><h2>Ce que tu y respireras</h2><p class="sub">${favm ? 'Les senteurs de l\'air du lieu.' : quiz ? 'Les notes en couleur correspondent à ton profil.' : 'Les notes en couleur sont déjà dans ta formule.'}${exn ? (mode === 'huile' ? ' Les notes barrées n\'existent pas en huile essentielle ou sont écartées par tes préférences.' : ' Les notes barrées sont écartées par tes préférences.') : ''}</p><div class="dn">${chips}</div></section>` +
      `<section class="sec rv"><h2>Bon à savoir</h2><div class="sig2" style="margin-top:0"><div class="box"><h4>Quand partir</h4><div class="moment" style="font-size:19px">${d.when}</div></div><div class="box"><h4>Durée idéale</h4><div class="moment" style="font-size:19px">${d.dur}</div></div></div><div class="box" style="margin-top:12px"><h4>Ambiance</h4><div class="tags" style="margin-top:0">${d.tags.map(t => `<span>${tagLabel(t)}</span>`).join('')}</div></div></section>` +
      `<section class="sec"><h2 class="rv">Ton itinéraire olfactif</h2><p class="sub rv">Trois moments à respirer.</p><div class="stops rv">${d.stops.map((s, i) => `<div class="stop" style="--d:${(.2 + i * .25).toFixed(2)}s"><b>${s.t}</b><span>${s.o}</span></div>`).join('')}</div></section>` +
      (quiz ? scentCard(d) : '') +
      `<section class="sec rv"${others.length ? '' : ' hidden'}><h2>Autres idées de voyage</h2><div class="rel">${others.map(([o, i]) => `<button class="hcard" data-di="${i}"><div class="pic"><div class="art-w" data-art="${o.d.art}"></div></div><b>${o.d.n}</b><small>${o.d.c}${o.aff == null ? '' : ' · ' + o.aff + ' %'}</small></button>`).join('')}</div></section></div>`;
  }
  // le parfum de la destination : le lieu préfait qui lui est rattaché, sinon une formule composée pour elle (stable)
  const hashStr = t => { let h = 7; for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 2654435761) >>> 0; return h; };
  function composeDest(d) {
    const per = {}, picks = d.notes.filter(id => { const l = NOTES[id].l; per[l] = (per[l] || 0) + 1; return per[l] <= 2; }).slice(0, 5);
    const fams = {}; d.fams.forEach((f, i) => { fams[f] = [1.4, 1, .6][i] || .5; });
    const tags = {}; d.tags.forEach((t, i) => { tags[t] = 1.2 - i * .2; });
    const sc = SCENE[d.art], art = E.compose({ picks, fams, tags, size: [3, 3, 3], seed: hashStr(d.id), tag: d.tag, extra: [d.c], spec: { id: 'dp' + d.id, pal: sc.pal, art: sc.art, n: d.n },
      nameFn: () => (/^(le |la |les |l')/i.test(d.n) ? ({ le: 'Air du ', la: 'Air de la ', les: 'Air des ' }[d.n.split(/[ ']/)[0].toLowerCase()] || 'Air de l\'') + d.n.replace(/^(le |la |les |l')/i, '') : (/^[AEIOUYÉÈH]/i.test(d.n) ? 'Air d\'' : 'Air de ') + d.n) });
    art.emoji = '🧳'; return art;
  }
  function scentInfo(d) {
    const sc = VS.SCENES.find(x => VS.SCENE_DEST[x.id] === d.id);
    if (sc) return { attr: `data-scene="${sc.id}"`, name: sc.n, tag: sc.tag, notes: E.adaptIds(sc.notes).ids.slice(0, 6), art: sc.id, em: sc.e };
    const c = composeDest(d), top = c.notes.slice().sort((a, b) => b.pct - a.pct).slice(0, 6).map(n => n.id);
    return { attr: `data-dperf="${d.id}"`, name: c.name, tag: d.tag, notes: top, art: d.art, em: '🧳' };
  }
  function scentCard(d) {
    const i = scentInfo(d);
    return `<section class="sec rv"><h2>Le parfum de ta destination</h2><button class="scent-card" ${i.attr}><div class="pic"><div class="art-w" data-art="${i.art}"></div><span class="em">${i.em}</span></div><div class="sc-t"><b>${i.name}</b><span>${i.tag}</span><em>${i.notes.map(id => NOTES[id].e).join(' ')}</em></div><span class="btn primary">Le sentir</span></button></section>`;
  }
  const favD = store.get('vs.favd', []);
  const isFavD = id => favD.includes(id);
  function toggleFavD(id) {
    const i = favD.indexOf(id);
    if (i >= 0) { favD.splice(i, 1); toast('Retirée de tes destinations'); } else { favD.unshift(id); toast('Destination gardée dans ta collection'); }
    store.set('vs.favd', favD); renderColl();
  }
  // image à partager : la destination, son affinité, ses notes
  async function shareDest(d, aff, text) {
    const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d'), sc = SCENE[d.art];
    const svg = Art.scene({ id: 'sh' + d.id, pal: sc.pal, art: sc.art, n: d.n }, { static: true }).replace('<svg ', '<svg width="1080" height="760" ');
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const img = await new Promise((ok, ko) => { const im = new Image(); im.onload = () => ok(im); im.onerror = ko; im.src = url; }).catch(() => null);
    g.fillStyle = '#fdf5ee'; g.fillRect(0, 0, W, H);
    if (img) g.drawImage(img, 0, 0, W, 760);
    URL.revokeObjectURL(url);
    const serif = '"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif', ink = '#6a331f';
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    const wrap = (t, x, y, w, lh) => { let line = ''; t.split(' ').forEach(wd => { const tt = line ? line + ' ' + wd : wd; if (g.measureText(tt).width > w && line) { g.fillText(line, x, y); y += lh; line = wd; } else line = tt; }); g.fillText(line, x, y); return y; };
    g.fillStyle = '#b9653d'; g.font = '700 26px system-ui,sans-serif'; g.fillText((aff == null ? 'DESTINATION' : 'MA DESTINATION') + ' · ' + d.c.toUpperCase(), W / 2, 830);
    g.fillStyle = ink; let fs = 104; do { g.font = '700 ' + fs + 'px ' + serif; fs -= 4; } while (g.measureText(d.n).width > 940 && fs > 48); g.fillText(d.n, W / 2, 940);
    g.fillStyle = '#8c5238'; g.font = 'italic 36px ' + serif; let y = wrap(d.tag, W / 2, 1010, 880, 48);
    if (aff != null) { const t = aff + ' % d\'affinité'; g.font = '700 30px system-ui,sans-serif'; const w = g.measureText(t).width + 60; g.fillStyle = '#e6b67f'; g.beginPath(); g.roundRect(W / 2 - w / 2, y + 28, w, 60, 30); g.fill(); g.fillStyle = ink; g.fillText(t, W / 2, y + 68); y += 88; }
    g.font = '500 34px system-ui,sans-serif'; g.fillStyle = ink;
    const chips = d.notes.slice(0, 4).map(id => NOTES[id].e + ' ' + NOTES[id].n); g.fillText(chips.slice(0, 2).join('    '), W / 2, y + 70); g.fillText(chips.slice(2).join('    '), W / 2, y + 122);
    g.fillStyle = '#a47b67'; g.font = '600 26px system-ui,sans-serif'; g.fillText('Voyage des Sens' + (text ? ' · ' + text : ''), W / 2, H - 46);
    const blob = await new Promise(ok => cv.toBlob(ok, 'image/png'));
    if (!blob) { toast('Image impossible à créer'); return; }
    const file = new File([blob], 'voyage-' + d.id + '.png', { type: 'image/png' });
    try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: d.n, text: d.tag }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('Image enregistrée');
  }
  function swapDest(sc) { vibrate(10); sc.classList.add('swap'); setTimeout(() => { renderDest(true); sc.classList.remove('swap'); }, 380); }
  function renderDest(reveal) {
    const sc = $('#destScroll'), d = destList[destIdx].d;
    sc.innerHTML = destHTML(destComp, destList, destIdx); sc.scrollTop = 0;
    $$('.sec>h2', sc).forEach(Motion.splitWords); Motion.progress($('#dest'), sc);
    sc.classList.toggle('reveal', !!reveal);
    const many = destList.length > 1, fv = isFavD(d.id);
    $('#destBar').innerHTML = `<button class="round fav${fv ? ' on' : ''}" id="dFav" aria-pressed="${fv}" aria-label="Garder cette destination"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z" fill="currentColor"/></svg></button><button class="round" id="dShare" aria-label="Partager"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 15V4m0 0L8 8m4-4 4 4M5 13v6h14v-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>${many ? '<button class="btn soft" id="dNext">Autre destination</button>' : ''}<a class="btn primary" id="dMap" target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat=${d.lat}&mlon=${d.lon}#map=8/${d.lat}/${d.lon}">Carte</a>`;
    lazyArt(sc);
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { root: sc, threshold: .12 });
    $$('.rv', sc).forEach(el => io.observe(el));
    const art = $('#destArt'); let tick = false;
    sc.onscroll = () => { if (tick) return; tick = true; requestAnimationFrame(() => { const y = sc.scrollTop; if (y < 700 && !document.documentElement.classList.contains('desktop')) art.style.transform = `translateY(${y * .38}px) scale(${1 + y / 2200})`; tick = false; }); };
    $('#dBack').onclick = () => closeDest();
    const nx = $('#dNext'); if (nx) nx.onclick = () => { destIdx = (destIdx + 1) % (destComp && destComp.fav ? destList.length : Math.min(4, destList.length)); swapDest(sc); };
    $('#dFav').onclick = e => { const b = e.currentTarget, on = !isFavD(d.id); toggleFavD(d.id); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); vibrate(on ? [8, 20, 8] : 8); };
    $('#dShare').onclick = () => { vibrate(8); shareDest(d, destList[destIdx].aff, destComp && destComp.text); };
    $$('[data-di]', sc).forEach(b => b.addEventListener('click', () => { destIdx = +b.dataset.di; swapDest(sc); }));
    $$('[data-scene]', sc).forEach(b => b.addEventListener('click', () => { const id = b.dataset.scene; closeDest(); setTimeout(() => openScene(id), 420); }));
    $$('[data-dperf]', sc).forEach(b => b.addEventListener('click', () => { const dd = VS.DESTS.find(z => z.id === b.dataset.dperf); closeDest(); setTimeout(() => run(composeDest(dd)), 420); }));
  }
  function openDest(comp, list, idx) {
    destComp = comp; destList = list || E.destinations(comp); destIdx = idx || 0;
    const w = $('#dest'); w.hidden = false; w.setAttribute('aria-hidden', 'false');
    renderDest(true); void w.offsetWidth; w.classList.add('show'); vibrate([10, 30, 10]);
    if (!destOpen) { try { history.pushState({ d: 1 }, ''); } catch (e) { /* ignore */ } destOpen = true; }
  }
  function closeDest(fromPop) {
    if (!destOpen) return;
    destOpen = false; const w = $('#dest'); w.classList.remove('show'); w.setAttribute('aria-hidden', 'true');
    setTimeout(() => { if (!destOpen) { w.hidden = true; $('#destScroll').innerHTML = ''; } }, 1300);
    if (!fromPop && history.state && history.state.d) { try { skipPop++; history.back(); } catch (e) { /* ignore */ } }
  }

  /* ---------- quiz : 9 questions, une destination ---------- */
  const QZ = { i: -1, ans: {}, busy: false, back: false };
  const QCOL = ['#e6b67f', '#adb78f', '#efcbbb', '#d9a18d', '#d3a2b5', '#9fc4cf', '#e0c46f', '#b9a1d6'];
  // le quiz aboutit à une destination : classement des 111 destinations d'après les réponses
  function quizDestination(ans) {
    const list = VS.Quiz.rank(ans);
    openDest({ quiz: true, ans, text: VS.Quiz.profileText(ans), ids: [], families: [], accord: '' }, list);
  }
  function quizWait(ans) {
    $('#quizBox').innerHTML = `<div class="qz-body"><div class="qz-wait"><div class="qz-orb" aria-hidden="true"><i></i><i></i><i></i><i></i></div><h2>Ta destination se dessine…</h2><p>${VS.Quiz.profileText(ans)}</p></div></div>`;
    QZ.busy = true;
    setTimeout(() => { QZ.i = -1; QZ.ans = {}; renderQuiz(); quizDestination(ans); }, reduce ? 300 : 2600);
  }
  function quizIntro() {
    const last = store.get('vs.quiz', null);
    return `<div class="qz-body${QZ.back ? ' back' : ''}"><header class="page-h"><div class="fmt-slot"></div><h2>Le quiz olfactif</h2><p>Neuf questions, une minute : on te trouve la destination qui te ressemble, avec son itinéraire olfactif et le parfum qui l\'accompagne.</p></header>` +
      `<div class="qz-intro"><div class="qz-orb" aria-hidden="true"><i></i><i></i><i></i><i></i></div>` +
      `<ul class="qz-points"><li><b>9</b> questions courtes</li><li><b>1</b> minute</li><li><b>111</b> destinations</li></ul>` +
      `<button class="btn primary big" data-q="start">Commencer le quiz</button></div>` +
      (last ? `<div class="qz-last"><div><small>Ton dernier profil</small><b>${VS.Quiz.summary(last) || 'Profil enregistré'}</b></div><div class="qz-last-b"><button class="btn soft" data-q="again">Revoir ma destination</button><button class="btn soft" data-q="start">Refaire</button></div></div>` : '') + `</div>`;
  }
  function quizQuestion() {
    const QS = VS.Quiz.questions(QZ.ans), q = QS[QZ.i], n = QS.length, sel = [].concat(QZ.ans[q.id] || []), multi = q.type === 'multi';
    const opts = q.opts.map((o, k) => `<button class="qo${sel.includes(o.id) ? ' on' : ''}" data-o="${o.id}" ${multi ? `aria-pressed="${sel.includes(o.id)}"` : ''} style="--oc:${QCOL[k % QCOL.length]};--k:${k}"><b>${o.label}</b><small>${o.sub || ''}</small></button>`).join('');
    return `<div class="qz-body${QZ.back ? ' back' : ''}" data-q-id="${q.id}">` +
      `<div class="qz-top"><button class="pill" data-q="prev">← ${QZ.i ? 'Précédent' : 'Accueil du quiz'}</button><span class="qz-count">Question ${QZ.i + 1} / ${n}</span></div>` +
      `<div class="qz-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${QZ.i + 1}"><i style="width:${QZ.i / n * 100}%" data-to="${(QZ.i + 1) / n * 100}"></i></div>` +
      `<h2 class="qz-q" id="qzQ" tabindex="-1">${q.q}</h2><p class="qz-sub">${q.sub}</p>` +
      `<div class="qz-opts${q.opts.length === 3 ? ' three' : ''}" role="group" aria-labelledby="qzQ">${opts}</div>` +
      (multi ? `<div class="qz-foot"><span class="qz-hint" aria-live="polite">${sel.length} / ${q.max}</span><button class="btn primary" data-q="next"${sel.length ? '' : ' disabled'}>Continuer</button></div>` : '') + `</div>`;
  }
  function renderQuiz() {
    const box = $('#quizBox'); box.innerHTML = QZ.i < 0 ? quizIntro() : quizQuestion();
    renderFmt();
    const bar = $('.qz-bar i', box); if (bar) requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = bar.dataset.to + '%'; }));
    QZ.back = false; QZ.busy = false;
    const h = $('#qzQ', box); if (h) { try { h.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
  }
  function quizSwap(back) {
    const b = $('#quizBox .qz-body'); QZ.back = !!back; QZ.busy = true;
    if (!b) { renderQuiz(); return; }
    b.classList.add('out'); setTimeout(renderQuiz, reduce ? 0 : 430);
  }
  function quizNext() {
    if (QZ.i >= VS.Quiz.questions(QZ.ans).length - 1) {
      const ans = QZ.ans; store.set('vs.quiz', ans); vibrate([10, 30, 10]);
      quizWait(ans);
    } else { QZ.i++; quizSwap(false); }
  }
  $('#quizBox').addEventListener('click', e => {
    if (QZ.busy) return;
    const t = e.target.closest('[data-q],[data-o]'); if (!t) return;
    if (t.dataset.q === 'start') { QZ.i = 0; QZ.ans = {}; vibrate(10); quizSwap(false); return; }
    if (t.dataset.q === 'again') { vibrate(10); const a = store.get('vs.quiz', null); if (a) quizWait(a); return; }
    if (t.dataset.q === 'prev') { vibrate(6); QZ.i--; quizSwap(true); return; }
    if (t.dataset.q === 'next') { vibrate(10); quizNext(); return; }
    const o = t.dataset.o; if (!o) return;
    const q = VS.Quiz.questions(QZ.ans)[QZ.i]; vibrate(8);
    if (q.type === 'multi') {
      const cur = [].concat(QZ.ans[q.id] || []), i = cur.indexOf(o);
      if (i >= 0) cur.splice(i, 1); else if (cur.length >= q.max) { toast(`${q.max} choix maximum`); return; } else cur.push(o);
      QZ.ans[q.id] = cur;
      $$('#quizBox .qo').forEach(b => { b.classList.toggle('on', cur.includes(b.dataset.o)); b.setAttribute('aria-pressed', cur.includes(b.dataset.o)); });
      $('.qz-hint').textContent = cur.length + ' / ' + q.max; $('[data-q="next"]').disabled = !cur.length;
    } else {
      QZ.ans[q.id] = o; QZ.busy = true; if (q.id === 'place') delete QZ.ans.detail;
      $$('#quizBox .qo').forEach(b => b.classList.toggle('on', b === t));
      setTimeout(quizNext, reduce ? 0 : 620);                         // laisse le temps de voir son choix
    }
  });

  $('#quizBox').addEventListener('keydown', e => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const bs = $$('#quizBox .qo'); if (!bs.length) return;
    const i = bs.indexOf(document.activeElement), d = (e.key === 'ArrowDown' || e.key === 'ArrowRight') ? 1 : -1;
    e.preventDefault(); bs[i < 0 ? 0 : (i + d + bs.length) % bs.length].focus();
  });

  /* ---------- format : parfum ou huiles essentielles ---------- */
  function fmtHTML() {
    return `<div class="fmt-switch" role="group" aria-label="Format"><button data-fmt="parfum" aria-pressed="${mode === 'parfum'}" class="${mode === 'parfum' ? 'on' : ''}"><i>✦</i>Parfum</button><button data-fmt="huile" aria-pressed="${mode === 'huile'}" class="${mode === 'huile' ? 'on' : ''}"><i>💧</i>Huiles essentielles</button></div>` +
      (mode === 'huile' ? '<p class="fmt-hint">Seules les senteurs qui existent en huile essentielle sont utilisées : les autres sont remplacées par la plus proche.</p>' : '');
  }
  function renderFmt() { $$('.fmt-slot').forEach(el => { el.innerHTML = fmtHTML(); }); }
  function setMode(m) {
    if (m === mode) return;
    mode = m; store.set('vs.mode', m); document.documentElement.classList.toggle('eo', m === 'huile');
    applyPrefs(); renderFmt(); renderHome(); renderPlaces(); renderCreate(); renderColl();
    toast(m === 'huile' ? 'Mode huiles essentielles : formules en gouttes pour diffuseur' : 'Mode parfum');
    vibrate(10);
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-fmt]'); if (b) setMode(b.dataset.fmt); });

  /* ---------- fiche d'une note ---------- */
  const ROLE = { T: 'Elle donne son éclat à l\'ouverture et accroche le nez dès les premières secondes, avant de s\'effacer doucement.', C: 'Elle construit le caractère du parfum : c\'est elle qu\'on reconnaît pendant la plus grande partie de la journée.', F: 'Elle ancre toute la formule et prolonge la trace sur la peau et les vêtements pendant des heures.' };
  function openSheet(id, comp) {
    const n = comp.notes.find(x => x.id === id); if (!n) return;
    const partners = comp.notes.filter(o => o.id !== id && VS.pairScore(n.f, o.f) > 0).sort((a, b) => VS.pairScore(n.f, b.f) - VS.pairScore(n.f, a.f) || b.pct - a.pct).slice(0, 4);
    const cousins = VS.NOTE_LIST.filter(o => o.f === n.f && o.id !== n.id && !comp.ids.includes(o.id)).slice(0, 8);
    const moods = n.t.map(t => (VS.MOODS.find(m => m[0] === t) || VS.DIRECTIONS.find(m => m[0] === t))).filter(Boolean);
    $('#sheet').innerHTML = `<div class="sh-head" style="--fc:${n.color}"><div class="sh-ico">${n.e}</div><div><h3>${n.n}</h3><small>${FAM[n.f].e} ${FAM[n.f].n} · ${TIERS[n.l][0].toLowerCase()}</small></div></div>` +
      `<div class="kv"><div><b>Dans la formule</b>${n.pct} %</div><div><b>Apparaît</b>${TIERS[n.l][1]}</div></div>` +
      `<p><b>${n.n}</b> : ${n.d}.</p><p>${ROLE[n.l]}</p>` +
      (partners.length ? `<h5>Se marie ici avec</h5><div class="tags">${partners.map(p => `<span>${p.e} ${p.n}</span>`).join('')}</div>` : '') +
      `<h5>Ambiances</h5><div class="tags">${moods.map(m => `<span>${m[1]}</span>`).join('')}</div>` +
      (cousins.length ? `<h5>Cousines olfactives (${FAM[n.f].n.toLowerCase()})</h5><div class="tags">${cousins.map(p => `<span>${p.e} ${p.n}</span>`).join('')}</div>` : '');
    const w = $('#sheetWrap'); w.hidden = false; void w.offsetWidth; w.classList.add('show'); vibrate(8);
  }
  function closeSheet() { const w = $('#sheetWrap'); if (w.hidden) return; w.classList.remove('show'); setTimeout(() => { if (!w.classList.contains('show')) w.hidden = true; }, 450); }
  $('#sheetBg').addEventListener('click', closeSheet);
  (function swipeSheet() {
    const sh = $('#sheet'); let y0 = null;
    sh.addEventListener('touchstart', e => { if (sh.scrollTop <= 0) y0 = e.touches[0].clientY; }, { passive: true });
    sh.addEventListener('touchmove', e => { if (y0 != null && e.touches[0].clientY - y0 > 90) { y0 = null; closeSheet(); } }, { passive: true });
  })();

  /* ---------- préférences : allergies et odeurs à éviter ---------- */
  const PREF_KEY = 'vs.prefs';
  let prefs = Object.assign({ allergies: [], fams: [], notes: [] }, store.get(PREF_KEY, {}));
  let prefsOpen = false;
  function computeExcl() {
    const ex = new Set();
    prefs.allergies.forEach(id => { const g = VS.ALLERGENS.find(x => x.id === id); if (!g) return; g.ids.forEach(i => ex.add(i)); VS.NOTE_LIST.forEach(n => { if (g.fams.includes(n.f)) ex.add(n.id); }); });
    prefs.fams.forEach(f => VS.NOTE_LIST.forEach(n => { if (n.f === f) ex.add(n.id); }));
    prefs.notes.forEach(i => ex.add(i));
    VS.EXCL_PREF = ex;
    VS.EXCL = mode === 'huile' ? new Set([...ex, ...VS.NOTE_LIST.filter(n => !VS.EO.has(n.id)).map(n => n.id)]) : ex;
  }
  function updateExclUI() {
    const g = prefs.allergies.length + prefs.fams.length + prefs.notes.length, n = VS.EXCL_PREF.size;
    const b = $('#prefBadge'); b.hidden = !g; b.textContent = g;
    const sb = $('#sidePrefBadge'); sb.hidden = !g; sb.textContent = g;
    const row = $('#exclRow'); row.classList.toggle('on', g > 0);
    row.innerHTML = g ? `<span><b>${n}</b> senteurs écartées de tes parfums</span><i>Modifier</i>` : `<span>Allergies, odeurs que tu ne supportes pas…</span><i>Définir</i>`;
  }
  function applyPrefs() {
    computeExcl(); store.set(PREF_KEY, prefs);
    state.picks = state.picks.filter(id => !VS.EXCL.has(id));
    updateExclUI();
  }
  const groupCount = g => { const s = new Set(g.ids); VS.NOTE_LIST.forEach(n => { if (g.fams.includes(n.f)) s.add(n.id); }); return s.size; };
  function prefsHTML() {
    const al = VS.ALLERGENS.map(g => `<button class="al${prefs.allergies.includes(g.id) ? ' on' : ''}" data-al="${g.id}"><b>${g.n}</b><small>${g.hint}</small><em>${groupCount(g)} senteurs</em></button>`).join('');
    const fams = Object.keys(FAM).map(f => `<button class="chip${prefs.fams.includes(f) ? ' on' : ''}" data-pf="${f}"><span class="dot" style="--fc:${FAM[f].c}"></span>${FAM[f].n} <em>${VS.NOTE_LIST.filter(n => n.f === f).length}</em></button>`).join('');
    return `<div class="pf-top"><button class="round" id="pfBack" aria-label="Retour">←</button><b>Mes préférences</b></div><div class="pf-in">` +
      `<section class="pf-sec" style="margin-top:0"><h4 style="margin-top:4px">Format</h4><div class="fmt-slot"></div></section><section class="pf-sec"><h4 style="margin-top:4px">Flacon</h4><div class="seg" id="botSeg">${[['flat', 'Plat'], ['css', '3D'], ['gl', '3D liquide']].map(v => `<button data-b="${v[0]}" class="${bottleKind === v[0] ? 'on' : ''}"${v[0] === 'gl' && !VS.BottleGL.ok() ? ' disabled' : ''}>${v[1]}</button>`).join('')}</div><p class="pf-hint">${VS.BottleGL.ok() ? '3D : il tourne du doigt. 3D liquide : verre, reflets et liquide qui ondule, penche et frémit.' : 'Le mode liquide demande WebGL, indisponible ici.'}</p></section><section class="pf-sec"><h4 style="margin-top:4px">Affichage</h4><div class="seg" id="viewSeg">${[['auto', 'Automatique'], ['mobile', 'Téléphone'], ['desktop', 'Ordinateur']].map(v => `<button data-v="${v[0]}" class="${store.get('vs.view', 'auto') === v[0] ? 'on' : ''}">${v[1]}</button>`).join('')}</div><p class="sub" style="margin:8px 2px 0">Automatique adapte la mise en page à ta fenêtre.</p></section>` +
      `<p class="pf-lead">Dis-nous ce que tu ne supportes pas : ces senteurs ne seront jamais utilisées dans tes parfums. Les lieux préfaits sont adaptés en remplaçant chaque note écartée par la plus proche.</p>` +
      `<div class="pf-sum" id="pfSum"></div>` +
      `<section class="pf-sec"><h2>Allergies & intolérances</h2><p class="sub">Touche un groupe : toutes les senteurs qui s'y rattachent sont écartées.</p><div class="al-grid">${al}</div></section>` +
      `<section class="pf-sec"><h2>Odeurs que je ne supporte pas</h2><h4>Familles entières</h4><div class="chips wrap">${fams}</div><h4>Senteurs précises</h4>` +
      `<label class="search"><span></span><input id="pfSearch" type="search" placeholder="Chercher une senteur à écarter…" autocomplete="off"></label><div class="chips wrap" id="pfRes"></div>` +
      `<h4>Écartées une par une</h4><div class="chips wrap" id="pfNotes"></div></section>` +
      `<div style="margin-top:26px"><button class="btn soft" id="pfReset">Tout réinitialiser</button></div>` +
      `<p class="pf-note">Voyage des Sens est un jeu d'inspiration, pas un avis médical : en cas d'allergie avérée, vérifie toujours la composition d'un vrai parfum et demande conseil à un professionnel de santé.</p></div>`;
  }
  function refreshPrefs() {
    const n = VS.EXCL_PREF.size, tot = VS.NOTE_LIST.length;
    $('#pfSum').innerHTML = n ? `<div class="n"><b>${n}</b> senteurs écartées <small>sur ${tot}</small></div><div class="bar"><i style="width:${Math.min(100, n / tot * 100).toFixed(1)}%"></i></div>` : `<div class="n">Aucune exclusion</div><div class="bar"><i></i></div>`;
    $('#pfNotes').innerHTML = prefs.notes.length ? prefs.notes.map(id => `<button class="chip note on" data-pd="${id}" style="--fc:${FAM[NOTES[id].f].c}">${NOTES[id].e} ${NOTES[id].n} <u>×</u></button>`).join('') : '<span class="pf-none">Aucune pour l\'instant.</span>';
    const q = strip(($('#pfSearch').value || '').trim());
    const res = q ? VS.NOTE_LIST.filter(x => !VS.EXCL_PREF.has(x.id) && strip(x.n).includes(q)).sort((a, b) => a.n.localeCompare(b.n, 'fr')).slice(0, 16) : [];
    $('#pfRes').innerHTML = q ? (res.length ? res.map(x => `<button class="chip note" data-pn="${x.id}" style="--fc:${FAM[x.f].c}">${x.e} ${x.n} <u>+</u></button>`).join('') : '<span class="pf-none">Rien à écarter avec ce mot.</span>') : '';
  }
  function togglePref(list, v) { const i = list.indexOf(v); i >= 0 ? list.splice(i, 1) : list.push(v); }
  function openPrefs() {
    const w = $('#prefs'), sc = $('#prefsScroll');
    sc.innerHTML = prefsHTML(); sc.scrollTop = 0; refreshPrefs(); renderFmt();
    Motion.watchEls(sc, $$('.pf-lead, .pf-sum, .pf-sec>h2, .al, .pf-sec h4', sc));
    sc.onclick = e => {
      const al = e.target.closest('[data-al]'), pf = e.target.closest('[data-pf]'), pn = e.target.closest('[data-pn]'), pd = e.target.closest('[data-pd]');
      const vb = e.target.closest('[data-v]');
      const bb = e.target.closest('#botSeg button');
      if (bb) { bottleKind = bb.dataset.b; store.set('vs.b3d', bottleKind); $$('#botSeg button').forEach(x => x.classList.toggle('on', x === bb)); vibrate(8); toast({ flat: 'Flacon plat', css: 'Flacon en 3D', gl: 'Flacon liquide en 3D' }[bottleKind]); return; }
      if (vb) { window.setView(vb.dataset.v); $$('#viewSeg button').forEach(x => x.classList.toggle('on', x === vb)); vibrate(8); return; }
      if (al) { togglePref(prefs.allergies, al.dataset.al); al.classList.toggle('on', prefs.allergies.includes(al.dataset.al)); }
      else if (pf) { togglePref(prefs.fams, pf.dataset.pf); pf.classList.toggle('on', prefs.fams.includes(pf.dataset.pf)); }
      else if (pn) { prefs.notes.push(pn.dataset.pn); }
      else if (pd) { prefs.notes = prefs.notes.filter(x => x !== pd.dataset.pd); }
      else if (e.target.closest('#pfReset')) { prefs = { allergies: [], fams: [], notes: [] }; applyPrefs(); sc.innerHTML = prefsHTML(); refreshPrefs(); toast('Préférences réinitialisées'); return; }
      else if (e.target.closest('#pfBack')) { closePrefs(); return; }
      else return;
      vibrate(8); applyPrefs(); refreshPrefs();
    };
    sc.addEventListener('input', e => { if (e.target.id === 'pfSearch') refreshPrefs(); });
    w.hidden = false; w.setAttribute('aria-hidden', 'false'); void w.offsetWidth; w.classList.add('show');
    if (!prefsOpen) { try { history.pushState({ p: 1 }, ''); } catch (err) { /* ignore */ } prefsOpen = true; }
  }
  function closePrefs(fromPop) {
    if (!prefsOpen) return;
    prefsOpen = false; const w = $('#prefs'); w.classList.remove('show'); w.setAttribute('aria-hidden', 'true');
    setTimeout(() => { if (!prefsOpen) { w.hidden = true; $('#prefsScroll').innerHTML = ''; } }, 800);
    if (!fromPop && history.state && history.state.p) { try { skipPop++; history.back(); } catch (err) { /* ignore */ } }
    // les exclusions changent ce qu'on voit partout
    renderPlaces(); renderMacros(); renderNotes(); refreshTray(); refreshSugg(); sync();
  }
  $('#btnPrefs').addEventListener('click', openPrefs);
  $('#sidePrefs').addEventListener('click', openPrefs);
  $('#exclRow').addEventListener('click', openPrefs);

  /* ---------- ordinateur : détection automatique, clavier, souris ---------- */
  (function desktop() {
    const fine = window.matchMedia('(pointer: fine)');
    const apply = () => {
      const v = store.get('vs.view', 'auto'), w = window.innerWidth;
      document.documentElement.classList.toggle('desktop', v === 'desktop' || (v === 'auto' && (w >= 960 || (w >= 720 && fine.matches))));
    };
    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(apply, 80); });
    window.setView = v => { store.set('vs.view', v); apply(); };
    apply();
    // clavier : Échap ferme la couche du dessus, / cherche, 1-4 changent d'onglet
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (!$('#sheetWrap').hidden) closeSheet(); else if (prefsOpen) closePrefs(); else if (destOpen) closeDest(); else if (resultOpen) closeResult(); else if (labAbort) labAbort();
        return;
      }
      if (e.target.matches && e.target.matches('input,textarea')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/' && (state.tab === 'places' || state.tab === 'create') && !resultOpen && !destOpen && !prefsOpen) { e.preventDefault(); $(state.tab === 'create' ? '#noteSearch' : '#placeSearch').focus(); return; }
      const n = ['1', '2', '3', '4', '5'].indexOf(e.key);
      if (n >= 0 && !resultOpen && !destOpen && !prefsOpen && $('#lab').hidden) go(['home', 'places', 'create', 'quiz', 'coll'][n]);
    });
    // glisser à la souris dans les carrousels et rangées de puces
    let el = null, x0 = 0, s0 = 0, moved = 0;
    document.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      const t = e.target.closest('.hscroll, .rel, .chips.scrollx'); if (!t || t.scrollWidth <= t.clientWidth) return;
      el = t; x0 = e.clientX; s0 = t.scrollLeft; moved = 0; t.style.scrollSnapType = 'none'; t.style.scrollBehavior = 'auto';
    });
    window.addEventListener('pointermove', e => { if (!el) return; const dx = e.clientX - x0; moved = Math.max(moved, Math.abs(dx)); el.scrollLeft = s0 - dx; });
    window.addEventListener('pointerup', () => {
      if (!el) return; const t = el; el = null; t.style.scrollSnapType = ''; t.style.scrollBehavior = '';
      if (moved > 6) t.addEventListener('click', ev => { ev.stopPropagation(); ev.preventDefault(); }, { capture: true, once: true });
    });
    // le décor suit très doucement le pointeur
    if (window.matchMedia('(pointer: fine)').matches && !reduce) {
      const app = $('#app'); let tick = false, x = 0, y = 0;
      window.addEventListener('pointermove', e => {
        if (e.pointerType !== 'mouse') return;
        x = e.clientX / innerWidth * 2 - 1; y = e.clientY / innerHeight * 2 - 1;
        if (tick) return; tick = true;
        requestAnimationFrame(() => { app.style.setProperty('--mx', x.toFixed(3)); app.style.setProperty('--my', y.toFixed(3)); tick = false; });
      }, { passive: true });
    }
  })();

  /* ---------- écran d'ouverture ---------- */
  function splash() {
    const s = document.createElement('div'); s.id = 'splash';
    s.innerHTML = `<div class="blobs">${blobsSVG()}</div><div class="sp-in">${Art.bottle({ cols: ['#f6c945', '#e88fb8', '#8a5a3b'], shares: [.25, .35, .4] })}<h1>Voyage des Sens</h1><p>Imagine un lieu. Respire-le.</p></div>`;
    $('#app').appendChild(s);
    setTimeout(() => { s.classList.add('out'); setTimeout(() => s.remove(), 1100); }, reduce ? 300 : 1900);
  }

  /* ---------- init ---------- */
  applyPrefs(); renderFmt(); renderHome(); renderPlaces(); renderCreate(); sync();
  $$('.hero h1, .page-h h2, .block h2').forEach(Motion.splitWords); Motion.watchScreens();
  $('#collBadge').hidden = !coll.length; $('#collBadge').textContent = coll.length;
  splash();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* hors-ligne indisponible */ }));
  }
  window.VSApp = { go, openScene, run };
})();
