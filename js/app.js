/* Voyage des Sens — interface */
(function () {
  'use strict';
  const VS = window.VS, E = VS.Engine, Art = VS.Art, NOTES = VS.NOTES, FAM = VS.FAMILIES;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const strip = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } }
  };
  const vibrate = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* ignore */ } };
  const SCENE = {}; VS.SCENES.forEach(s => SCENE[s.id] = s);
  const CAT = {}; VS.CATS.forEach(c => CAT[c.id] = c);
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const state = { tab: 'home', cat: 'all', q: '', dirs: new Set(), moods: new Set(), picks: [], sub: 'all', fam: 'all', nq: '', rich: 1, text: '' };
  let coll = store.get('vs.coll', []);
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

  /* ---------- navigation ---------- */
  function go(tab) {
    if (destOpen) closeDest(true);
    if (resultOpen) closeResult(true);
    state.tab = tab; $('#app').dataset.tab = tab;
    $('#tabbar').style.setProperty('--i', ['home', 'places', 'create', 'coll'].indexOf(tab));
    $$('.screen').forEach(s => s.classList.toggle('active', s.id === 's-' + tab));
    $$('#tabbar button').forEach(b => b.classList.toggle('on', b.dataset.go === tab));
    if (tab === 'coll') renderColl();
    const sc = $('#s-' + tab + ' .scroll'); if (sc) sc.scrollTop = 0;
  }
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-go]'); if (g) { vibrate(8); go(g.dataset.go); return; }
    const s = e.target.closest('[data-sc]'); if (s) { vibrate(10); openScene(s.dataset.sc); }
  });

  /* ---------- accueil ---------- */
  function renderHome() {
    const picks = shuffle(VS.SCENES).slice(0, 10);
    $('#homeCarousel').innerHTML = picks.map(s => `<button class="hcard" data-sc="${s.id}"><div class="pic"><div class="art-w" data-art="${s.id}"></div><span class="em">${s.e}</span></div><b>${s.n}</b><small>${s.tag}</small></button>`).join('');
    lazyArt($('#homeCarousel'));
    const tc = { int: ['#f4dcbf', '#e6b67f'], par: ['#f6d6c9', '#d9a18d'], voy: ['#dfe5c8', '#adb78f'], sou: ['#ecd5dd', '#d3a2b5'] };
    const desc = { int: 'Chalet, bibliothèque, hôpital…', par: 'Station-service, cirque, ferme…', voy: 'Marchés, plages, volcans…', sou: 'Grenier, rentrée, Noël…' };
    $('#catTiles').innerHTML = VS.CATS.map(c => `<button class="ctile" data-cat="${c.id}" style="--tb:${tc[c.id][0]};--tc:${tc[c.id][1]}"><b>${c.n}</b><small>${VS.SCENES.filter(s => s.cat === c.id).length} lieux · ${desc[c.id]}</small></button>`).join('');
    $$('#catTiles .ctile').forEach(b => b.addEventListener('click', () => { state.cat = b.dataset.cat; state.sub = 'all'; renderPlaces(); go('places'); }));
    $('#homeStats').innerHTML = `<div><b>${VS.NOTE_LIST.length}</b><span>senteurs</span></div><div><b>${VS.SCENES.length}</b><span>lieux</span></div><div><b>${Object.keys(FAM).length}</b><span>familles</span></div>`;
  }
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
    grid.innerHTML = list.length ? list.map((s, i) => `<button class="pcard" data-sc="${s.id}" style="--i:${Math.min(i, 14)}"><div class="pic"><div class="art-w" data-art="${s.id}"></div><span class="em">${s.e}</span></div><b>${s.n}</b><span class="t">${s.tag}</span><span class="ns">${noteIcons(s, 5)}</span></button>`).join('') : `<div class="empty"><span class="shape"></span>Aucun lieu ne répond à « ${state.q} ».<br>Essaie de le décrire dans <b>Créer</b>.</div>`;
    lazyArt(grid);
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

  function renderNotePicker() {
    const cnt = ids => VS.NOTE_LIST.filter(n => ids.includes(n.f)).length;
    $('#macroChips').innerHTML = [['all', 'Tout', Object.keys(FAM)]].concat(MACROS).map(m => `<button class="chip${state.macro === m[0] ? ' on' : ''}" data-m="${m[0]}"><span class="dot" style="--fc:${FAM[m[2][0]].c}"></span>${m[1]} <em>${cnt(m[2])}</em></button>`).join('');
    $$('#macroChips .chip').forEach(b => b.addEventListener('click', () => {
      state.macro = b.dataset.m; state.open = new Set(); vibrate(8);
      $$('#macroChips .chip').forEach(x => x.classList.toggle('on', x === b)); renderNotes();
    }));
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
      list = VS.NOTE_LIST.filter(n => !state.picks.includes(n.id)).map(n => {
        let sc = n.t.reduce((a, t) => a + (tw[t] || 0), 0);
        picks.forEach(p => { sc += VS.pairScore(n.f, p.f) * 1.1; });
        return { n, sc: sc + (ICONIC.includes(n.id) ? .4 : 0) };
      }).sort((a, b) => b.sc - a.sc).slice(0, 12).map(x => x.n);
    } else { label = 'Pour commencer'; list = ICONIC.map(id => NOTES[id]); }
    $('#suggL').textContent = label;
    $('#sugg').innerHTML = list.map(n => chipHTML(n, state.picks.includes(n.id))).join('');
  }
  function renderNotes() {
    const q = strip(state.nq.trim());
    const fams = state.macro === 'all' ? Object.keys(FAM) : MACROS.find(m => m[0] === state.macro)[2];
    let html = '';
    fams.forEach(f => {
      const ns = VS.NOTE_LIST.filter(n => n.f === f && (state.layer === 'all' || q || n.l === state.layer) && (!q || strip(n.n + ' ' + n.d).includes(q)));
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
  function sync() {
    const n = state.dirs.size + state.moods.size + state.picks.length, hasT = state.text.trim().length > 2;
    if (typeof refreshSugg === 'function' && $('#sugg')) refreshSugg();
    $('#moodCount').textContent = state.moods.size ? state.moods.size + ' / 5' : 'jusqu\'à 5';
    $('#pickCount').textContent = state.picks.length ? state.picks.length + ' / 5' : 'jusqu\'à 5';
    $('#btnCreate').disabled = !(n || hasT);
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
    an.picks.forEach(p => { if (!picks.includes(p) && picks.length < 5) picks.push(p); });
    if (an.scene && !picks.length) {
      const ns = an.scene.notes.map(id => NOTES[id]);
      ['C', 'F', 'T'].forEach(l => { const n = ns.find(x => x.l === l); if (n && picks.length < 3) picks.push(n.id); });
    }
    const spec = an.scene ? { id: 't' + an.scene.id, pal: an.scene.pal, art: an.scene.art } : null;
    const opts = { moods, dirs, picks, size: [[2, 2, 2], [3, 3, 3], [3, 4, 4]][state.rich], spec };
    const c = E.compose(opts); c.opts = opts;
    if (an.scene) c.tag = 'D\'après ton idée : « ' + t.replace(/\.+$/, '') + ' »';
    run(c);
  });

  /* ---------- collection ---------- */
  function renderColl() {
    const grid = $('#collGrid');
    $('#collBadge').hidden = !coll.length; $('#collBadge').textContent = coll.length;
    if (!coll.length) { grid.innerHTML = `<div class="empty"><span class="shape"></span>Ta collection est vide.<br>Compose un parfum et touche <b>Garder</b> pour le retrouver ici.</div>`; return; }
    grid.innerHTML = coll.map((c, i) => {
      const comp = rebuild(c);
      return `<button class="ccard" data-k="${c.key}" style="animation-delay:${i * 60}ms"><div class="th">${Art.scene(comp.spec, { static: true })}<span class="bt">${Art.bottle({ cols: [comp.layerColor.T, comp.layerColor.C, comp.layerColor.F], shares: shares(comp) })}</span></div><div><b>${comp.name}</b><div class="ac">${comp.accord}</div><div class="nn">${comp.notes.slice(0, 5).map(n => n.e + ' ' + n.n).join(' · ')}</div></div><span class="del" data-del="${c.key}" aria-label="Supprimer">✕</span></button>`;
    }).join('');
    $$('.ccard', grid).forEach(b => b.addEventListener('click', e => {
      const del = e.target.closest('[data-del]');
      if (del) { e.stopPropagation(); coll = coll.filter(x => x.key !== del.dataset.del); store.set('vs.coll', coll); renderColl(); toast('Parfum retiré de ta collection'); return; }
      const c = coll.find(x => x.key === b.dataset.k); if (c) openResult(rebuild(c), false);
    }));
  }
  function rebuild(c) { const comp = E.build(c.ids, { key: c.key, name: c.name, tag: c.tag, sceneId: c.sceneId, emoji: c.emoji, cat: c.cat, dirs: c.dirs, moods: c.moods, spec: c.spec }); comp.opts = c.opts; return comp; }
  const isSaved = k => coll.some(c => c.key === k);
  function toggleSave(comp) {
    if (isSaved(comp.key)) { coll = coll.filter(c => c.key !== comp.key); toast('Retiré de ta collection'); }
    else { coll.unshift({ key: comp.key, name: comp.name, tag: comp.tag, sceneId: comp.sceneId, emoji: comp.emoji, cat: comp.cat, dirs: comp.dirs, moods: comp.moods, ids: comp.ids, spec: comp.spec, opts: comp.opts || null, ts: Date.now() }); toast('Ajouté à ta collection 💜'); }
    store.set('vs.coll', coll); renderColl();
  }
  const shares = comp => { const s = comp.layerShare; return [s.T || 0, s.C || 0, s.F || 0]; };

  /* ---------- lancement : scène préfaite ou création ---------- */
  function openScene(id) { const sc = SCENE[id]; if (!sc) return; const c = E.fromScene(sc); run(c); }
  async function run(comp) { await runLab(comp); openResult(comp, true); }

  /* ---------- laboratoire (animation de création) ---------- */
  let labAbort = null;
  const FLASK = 'M82,20 H118 V84 C168,98 186,142 176,184 C168,226 136,246 100,246 C64,246 32,226 24,184 C14,142 32,98 82,84Z';
  function flaskSVG(cols) {
    const y = { T: 100, C: 146, F: 192 };
    const wave = yy => `<g class="wavy"><path d="M-100,${yy} q25,-9 50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 V300 H-100Z"/></g>`;
    const liq = L => `<g class="liq" id="ly${L}" style="--h:${300 - y[L]}px" fill="${cols[L]}">${wave(y[L])}</g>`;
    return `<svg viewBox="0 0 200 260" aria-hidden="true"><defs><clipPath id="lfc"><path d="${FLASK}"/></clipPath></defs>` +
      `<ellipse cx="100" cy="254" rx="62" ry="6" fill="#6a331f" opacity=".16"/>` +
      `<g class="flask"><path d="${FLASK}" fill="#fff" fill-opacity=".62"/><g clip-path="url(#lfc)">${liq('T')}${liq('C')}${liq('F')}</g>` +
      `<path d="${FLASK}" fill="none" stroke="#6a331f" stroke-opacity=".55" stroke-width="3" stroke-linejoin="round"/>` +
      `<path d="M44,150 C40,176 52,206 70,222" stroke="#fff" stroke-opacity=".75" stroke-width="6" stroke-linecap="round" fill="none"/>` +
      `<rect x="76" y="6" width="48" height="18" rx="5" fill="#d6a95a"/><rect x="76" y="16" width="48" height="8" rx="4" fill="#a97d34"/></g></svg>`;
  }
  async function runLab(comp) {
    const lab = $('#lab'), stage = $('#labStage'), wipe = $('#labWipe');
    let aborted = false; labAbort = () => { aborted = true; };
    const pastel = (c, t) => Art.mix(c, '#fff6ee', t);
    lab.style.setProperty('--lb0', pastel(comp.layerColor.C, .84)); lab.style.setProperty('--lb1', pastel(comp.layerColor.C, .7));
    lab.style.setProperty('--lb2', pastel(comp.layerColor.F, .6)); lab.style.setProperty('--lb3', pastel(comp.layerColor.T, .68));
    $('#labTitle').textContent = comp.name;
    stage.className = 'lab-stage'; stage.innerHTML = flaskSVG(comp.layerColor);
    wipe.className = 'wipe';
    $$('.lab-dots i', lab).forEach(d => d.classList.remove('on'));
    $$('.fly,.ringp', lab).forEach(n => n.remove());
    lab.hidden = false; lab.setAttribute('aria-hidden', 'false'); void lab.offsetWidth; lab.classList.add('show');

    const phase = (t, s) => { $('#labPhase').innerHTML = `<span class="ph">${t}<small>${s || ''}</small></span>`; };
    const dot = i => $$('.lab-dots i', lab)[i].classList.add('on');
    $('#labSkip').onclick = () => { aborted = true; };
    const wait = async ms => { const end = Date.now() + ms; while (Date.now() < end && !aborted) await sleep(40); };
    const quick = reduce ? .25 : 1;

    phase('Évocation', comp.tag || 'On imagine l\'endroit…'); dot(0);
    await wait(1200 * quick);
    // le liquide monte : fond, puis cœur, puis tête
    const labels = { F: ['Notes de fond', 'La base se pose'], C: ['Notes de cœur', 'Le caractère se dessine'], T: ['Notes de tête', 'L\'éclat de l\'ouverture'] };
    for (const [li, L] of ['F', 'C', 'T'].entries()) {
      if (aborted) break;
      const ns = comp.byLayer[L]; if (!ns.length) continue;
      phase(labels[L][0], ns.map(n => n.n.toLowerCase()).join(' · ')); dot(li + 1);
      const sr = stage.getBoundingClientRect(), lr = lab.getBoundingClientRect();
      const tx = sr.left - lr.left + sr.width / 2, ty = sr.top - lr.top + sr.height * .08;
      const flights = ns.map((n, i) => new Promise(res => {
        const el = document.createElement('div'); el.className = 'fly'; el.innerHTML = `${n.e}<span>${n.n}</span>`;
        el.style.opacity = '0'; lab.appendChild(el);
        const w = el.offsetWidth / 2, h = el.offsetHeight / 2;
        const side = i % 2 ? 1 : -1, sx = tx + side * rnd(lr.width * .2, lr.width * .38), sy = rnd(lr.height * .22, lr.height * .62);
        setTimeout(() => {
          if (aborted) { el.remove(); return res(); }
          const a = el.animate([
            { transform: `translate(${sx - w}px,${sy - h + 30}px) scale(.6)`, opacity: 0 },
            { transform: `translate(${sx - w}px,${sy - h}px) scale(1)`, opacity: 1, offset: .3 },
            { transform: `translate(${tx - w}px,${ty - h}px) scale(.4)`, opacity: 0 }
          ], { duration: 1000, easing: 'cubic-bezier(.5,0,.2,1)', fill: 'forwards' });
          a.onfinish = () => { el.remove(); res(); }; vibrate(6);
        }, i * 260 * quick);
      }));
      await Promise.all(flights);
      if (aborted) break;
      const ring = document.createElement('i'); ring.className = 'ringp'; ring.style.setProperty('--c', comp.layerColor[L]);
      ring.style.setProperty('--ry', (ty / lr.height * 100) + '%'); lab.appendChild(ring); setTimeout(() => ring.remove(), 1500);
      $('#ly' + L).classList.add('in');
      await wait(1100 * quick);
    }
    if (!aborted) { stage.classList.add('shake'); phase('Macération', 'Les notes s\'apprivoisent'); dot(3); vibrate([10, 30, 10]); await wait(1400 * quick); }
    $$('.liq', stage).forEach(l => l.classList.add('in'));
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
  function resultHTML(comp) {
    const st = comp.stats, maxP = Math.max.apply(null, comp.notes.map(n => n.pct));
    const catLabel = comp.cat && CAT[comp.cat] ? CAT[comp.cat].n : 'Création sur mesure';
    const tag = comp.tag || (comp.moods.length ? comp.moods.map(m => VS.MOODS.find(x => x[0] === m)[1].toLowerCase()).join(' · ') : 'Une composition rien que pour toi');
    const tags = [].concat(comp.dirs.map(d => VS.DIRECTIONS.find(y => y[0] === d)[1]), comp.moods.map(m => VS.MOODS.find(y => y[0] === m)[1]));
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
    return `<div class="res-hero"><div class="art-bg" id="heroArt">${Art.scene(comp.spec)}</div><div class="res-top"><button class="round" id="rBack" aria-label="Retour">←</button><span class="top-actions"><button class="pill" id="rMix">Variation</button><button class="pill" id="rShare">Partager</button></span></div><div class="waves"><svg viewBox="0 0 400 70" preserveAspectRatio="none"><path class="w1" d="M-40,30 C40,0 120,60 220,28 S360,6 440,30 V70 H-40Z"/><path class="w2" d="M-40,50 C60,24 150,72 250,46 S380,32 440,50 V70 H-40Z"/></svg></div></div>` +
      `<div class="res-bottle">${Art.bottle({ cols: [comp.layerColor.T, comp.layerColor.C, comp.layerColor.F], shares: shares(comp) })}</div>` +
      `<div class="res-title"><div class="badge">${catLabel}</div><h1>${comp.name}</h1><p class="tg">${tag}</p><span class="accord">${comp.accord}</span></div>` +
      `<section class="sec rv"><h2>L'histoire</h2><div class="story"><p>${comp.story}</p>${tags.length ? `<div class="tags">${tags.map(t => `<span>${t}</span>`).join('')}</div>` : ''}</div></section>` +
      `<section class="sec"><h2 class="rv">Pyramide olfactive</h2><p class="sub rv">Touche une note pour la découvrir.</p>${pyr}</section>` +
      `<section class="sec rv"><h2>Palette de senteurs</h2><div class="donut-w"><div class="donut"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="46" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="15"/>${segs}</svg><div class="mid"><small>dominante</small><b>${comp.families[0].n}</b></div></div><div class="leg">${legend}</div></div></section>` +
      `<section class="sec rv"><h2>Signature</h2><div class="gauges"><div class="g"><div class="row"><span>Intensité</span><b>${st.intensity} / 10</b></div><div class="track"><div class="fill" style="--w:${st.intensity * 10}%"></div></div></div><div class="g"><div class="row"><span>Tenue</span><b>≈ ${st.hours} h</b></div><div class="track"><div class="fill" style="--w:${Math.round(st.hours / 14 * 100)}%"></div></div></div><div class="g"><div class="row"><span>Sillage</span><b>${st.sillage}</b></div><div class="track"><div class="fill" style="--w:${st.sillageV}%"></div></div></div></div>` +
      `<div class="sig2"><div class="box"><h4>Saisons</h4><div class="seasons">${seasonKeys.map(k => `<span class="${st.best.includes(k) ? 'on' : ''}">${SEASON[k][1]}</span>`).join('')}</div></div><div class="box"><h4>Moment</h4><div class="moment">${mom[1]}</div></div></div>` +
      `<div class="box" style="margin-top:12px"><h4>Cohérence de l'accord</h4><div class="harm"><div class="ring"><svg viewBox="0 0 80 80"><circle class="tr" cx="40" cy="40" r="34"/><circle class="pg" cx="40" cy="40" r="34" style="--hd:${(st.harmony / 100 * 213.6).toFixed(1)}"/></svg><b data-count="${st.harmony}" data-suf="%">0%</b></div><p>Les familles de cette formule s'accordent entre elles&nbsp;: aucune note ne vient contredire l'ensemble.</p></div></div></section>` +
      `<section class="sec rv"><h2>Dans la même veine</h2><div class="rel">${rel.map(s => `<button class="hcard" data-sc="${s.id}"><div class="pic"><div class="art-w" data-art="${s.id}"></div><span class="em">${s.e}</span></div><b>${s.n}</b></button>`).join('')}</div></section>`;
  }
  function openResult(comp, reveal) {
    current = comp;
    const wrap = $('#result'), sc = $('#resScroll');
    wrap.hidden = false; wrap.setAttribute('aria-hidden', 'false');
    sc.innerHTML = resultHTML(comp); sc.scrollTop = 0;
    sc.classList.toggle('reveal', !!reveal);
    $('#resBar').innerHTML = `<button class="btn soft${isSaved(comp.key) ? ' on' : ''}" id="rSave">${isSaved(comp.key) ? 'Gardé' : 'Garder'}</button><button class="btn primary" id="rDest">Découvrir ma destination</button>`;
    lazyArt(sc);
    void wrap.offsetWidth; wrap.classList.add('show');
    if (!resultOpen) { try { history.pushState({ r: 1 }, ''); } catch (e) { /* ignore */ } resultOpen = true; }
    // révélation au scroll
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); $$('[data-count]', e.target).forEach(countUp); io.unobserve(e.target); } }), { root: sc, threshold: .12 });
    $$('.rv', sc).forEach(el => io.observe(el));
    // parallaxe
    const art = $('#heroArt'); let tick = false;
    sc.onscroll = () => { if (tick) return; tick = true; requestAnimationFrame(() => { const y = sc.scrollTop; if (y < 700) art.style.transform = `translateY(${y * .38}px) scale(${1 + y / 2200})`; tick = false; }); };
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
  window.addEventListener('popstate', () => { if (skipPop) { skipPop--; return; } if (!$('#sheetWrap').hidden) { closeSheet(); return; } if (destOpen) { closeDest(true); return; } if (resultOpen) closeResult(true); });
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
    const why = hitNames.length
      ? `Ta formule contient ${lst(hitNames)} : des senteurs qu'on respire partout à ${d.n}. Son accord ${comp.accord.toLowerCase()} rejoint l'ambiance ${amb} du lieu.`
      : famNames.length
        ? `Ton accord ${comp.accord.toLowerCase()} retrouve à ${d.n} les notes ${lst(famNames)} qui dominent l'air du lieu, dans une ambiance ${amb}.`
        : `L'ambiance ${amb} de ${d.n} est celle que ton parfum dessine.`;
    const chips = d.notes.map(id => `<span class="${comp.ids.includes(id) ? 'on' : ''}">${NOTES[id].e} ${NOTES[id].n}</span>`).join('');
    const others = list.map((o, i) => [o, i]).filter(([, i]) => i !== idx).slice(0, 4);
    return `<div class="res-hero"><div class="art-bg" id="destArt">${Art.scene(spec)}</div><div class="res-top"><button class="round" id="dBack" aria-label="Retour">←</button><span></span></div><div class="waves"><svg viewBox="0 0 400 70" preserveAspectRatio="none"><path class="w1" d="M-40,30 C40,0 120,60 220,28 S360,6 440,30 V70 H-40Z"/><path class="w2" d="M-40,50 C60,24 150,72 250,46 S380,32 440,50 V70 H-40Z"/></svg></div></div>` +
      `<div class="res-title" style="padding-top:8px"><div class="badge">Ta destination · ${d.c}</div><h1>${d.n}</h1><p class="tg">${d.tag}</p><span class="accord">${x.aff} % d'affinité olfactive</span></div>` +
      `<section class="sec rv"><h2>Pourquoi ici</h2><div class="story"><p>${d.txt} ${why}</p></div></section>` +
      `<section class="sec rv"><h2>Ce que tu y respireras</h2><p class="sub">Les notes en couleur sont déjà dans ta formule.</p><div class="dn">${chips}</div></section>` +
      `<section class="sec rv"><h2>Bon à savoir</h2><div class="sig2" style="margin-top:0"><div class="box"><h4>Quand partir</h4><div class="moment" style="font-size:19px">${d.when}</div></div><div class="box"><h4>Durée idéale</h4><div class="moment" style="font-size:19px">${d.dur}</div></div></div><div class="box" style="margin-top:12px"><h4>Ambiance</h4><div class="tags" style="margin-top:0">${d.tags.map(t => `<span>${tagLabel(t)}</span>`).join('')}</div></div></section>` +
      `<section class="sec"><h2 class="rv">Ton itinéraire olfactif</h2><p class="sub rv">Trois moments à respirer.</p><div class="stops rv">${d.stops.map((s, i) => `<div class="stop" style="--d:${(.2 + i * .25).toFixed(2)}s"><b>${s.t}</b><span>${s.o}</span></div>`).join('')}</div></section>` +
      `<section class="sec rv"><h2>Autres idées de voyage</h2><div class="rel">${others.map(([o, i]) => `<button class="hcard" data-di="${i}"><div class="pic"><div class="art-w" data-art="${o.d.art}"></div></div><b>${o.d.n}</b><small>${o.d.c} · ${o.aff} %</small></button>`).join('')}</div></section>`;
  }
  function swapDest(sc) { vibrate(10); sc.classList.add('swap'); setTimeout(() => { renderDest(true); sc.classList.remove('swap'); }, 380); }
  function renderDest(reveal) {
    const sc = $('#destScroll'), d = destList[destIdx].d;
    sc.innerHTML = destHTML(destComp, destList, destIdx); sc.scrollTop = 0;
    sc.classList.toggle('reveal', !!reveal);
    $('#destBar').innerHTML = `<button class="btn soft" id="dNext">Autre destination</button><a class="btn primary" id="dMap" target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat=${d.lat}&mlon=${d.lon}#map=8/${d.lat}/${d.lon}">Voir sur la carte</a>`;
    lazyArt(sc);
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { root: sc, threshold: .12 });
    $$('.rv', sc).forEach(el => io.observe(el));
    const art = $('#destArt'); let tick = false;
    sc.onscroll = () => { if (tick) return; tick = true; requestAnimationFrame(() => { const y = sc.scrollTop; if (y < 700) art.style.transform = `translateY(${y * .38}px) scale(${1 + y / 2200})`; tick = false; }); };
    $('#dBack').onclick = () => closeDest();
    $('#dNext').onclick = () => { destIdx = (destIdx + 1) % Math.min(4, destList.length); swapDest(sc); };
    $$('[data-di]', sc).forEach(b => b.addEventListener('click', () => { destIdx = +b.dataset.di; swapDest(sc); }));
  }
  function openDest(comp) {
    destComp = comp; destList = E.destinations(comp); destIdx = 0;
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

  /* ---------- écran d'ouverture ---------- */
  function splash() {
    const s = document.createElement('div'); s.id = 'splash';
    s.innerHTML = `<div class="blobs">${blobsSVG()}</div><div class="sp-in">${Art.bottle({ cols: ['#f6c945', '#e88fb8', '#8a5a3b'], shares: [.25, .35, .4] })}<h1>Voyage des Sens</h1><p>Imagine un lieu. Respire-le.</p></div>`;
    $('#app').appendChild(s);
    setTimeout(() => { s.classList.add('out'); setTimeout(() => s.remove(), 1100); }, reduce ? 300 : 1900);
  }

  /* ---------- init ---------- */
  renderHome(); renderPlaces(); renderCreate(); sync();
  $('#collBadge').hidden = !coll.length; $('#collBadge').textContent = coll.length;
  splash();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* hors-ligne indisponible */ }));
  }
  window.VSApp = { go, openScene, run };
})();
