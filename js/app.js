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

  const state = { tab: 'home', cat: 'all', q: '', dirs: new Set(), moods: new Set(), picks: [], fam: 'all', nq: '', rich: 1, text: '' };
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

  /* ---------- navigation ---------- */
  function go(tab) {
    if (resultOpen) closeResult();
    state.tab = tab;
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
    const icons = $('#riseIcons');
    const pool = shuffle(VS.NOTE_LIST.filter(n => n.e.length <= 2)).slice(0, 14);
    icons.innerHTML = pool.map((n, i) => `<span style="left:${rnd(4, 94).toFixed(0)}%;animation-duration:${rnd(9, 17).toFixed(1)}s;animation-delay:-${rnd(0, 14).toFixed(1)}s;--sx:${rnd(-40, 40).toFixed(0)}px;--rot:${rnd(-40, 40).toFixed(0)}deg;font-size:${rnd(18, 30).toFixed(0)}px">${n.e}</span>`).join('');
    const picks = shuffle(VS.SCENES).slice(0, 10);
    $('#homeCarousel').innerHTML = picks.map(s => `<button class="hcard" data-sc="${s.id}"><div class="art-w" data-art="${s.id}"></div><span class="em">${s.e}</span><div class="cap">${s.n}<small>${s.tag}</small></div></button>`).join('');
    lazyArt($('#homeCarousel'));
    const tc = { int: '#ffb25b', par: '#ff6b9d', voy: '#35c8ff', sou: '#a07be8' };
    const desc = { int: 'Chalet, bibliothèque, hôpital…', par: 'Station-service, cirque, ferme…', voy: 'Marchés, plages, volcans…', sou: 'Grenier, rentrée, Noël…' };
    $('#catTiles').innerHTML = VS.CATS.map(c => `<button class="ctile" data-cat="${c.id}" style="--tc:${tc[c.id]}"><span class="big">${c.e}</span><b>${c.n}</b><small>${VS.SCENES.filter(s => s.cat === c.id).length} lieux · ${desc[c.id]}</small></button>`).join('');
    $$('#catTiles .ctile').forEach(b => b.addEventListener('click', () => { state.cat = b.dataset.cat; renderPlaces(); go('places'); }));
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
    $('#catChips').innerHTML = [{ id: 'all', n: 'Tous', e: '✨' }].concat(VS.CATS).map(c => `<button class="chip${state.cat === c.id ? ' on' : ''}" data-c="${c.id}">${c.e} ${c.n}</button>`).join('');
    $$('#catChips .chip').forEach(b => b.addEventListener('click', () => { state.cat = b.dataset.c; renderPlaces(); }));
    const q = strip(state.q.trim());
    const list = VS.SCENES.filter(s => (state.cat === 'all' || s.cat === state.cat) && (!q || strip(s.n + ' ' + s.tag + ' ' + s.notes.map(id => NOTES[id].n).join(' ')).includes(q)));
    const grid = $('#placeGrid');
    grid.innerHTML = list.length ? list.map((s, i) => `<button class="pcard" data-sc="${s.id}" style="--i:${Math.min(i, 14)}"><div class="art-w" data-art="${s.id}"></div><span class="em">${s.e}</span><div class="meta"><b>${s.n}</b><span class="t">${s.tag}</span><span class="ns">${noteIcons(s, 5)}</span></div></button>`).join('') : `<div class="empty"><big>🫧</big>Aucun lieu ne répond à « ${state.q} ».<br>Essaie de le décrire dans <b>Créer</b>.</div>`;
    lazyArt(grid);
  }
  $('#placeSearch').addEventListener('input', e => { state.q = e.target.value; renderPlaces(); });

  /* ---------- création ---------- */
  function renderCreate() {
    $('#dirGrid').innerHTML = VS.DIRECTIONS.map(d => `<button class="dir" data-d="${d[0]}"><span class="e">${d[2]}</span><b>${d[1]}</b><small>${d[3]}</small></button>`).join('');
    $$('#dirGrid .dir').forEach(b => b.addEventListener('click', () => { toggleSet(state.dirs, b.dataset.d, 2); b.classList.toggle('on', state.dirs.has(b.dataset.d)); vibrate(8); sync(); }));
    $('#moodChips').innerHTML = VS.MOODS.map(m => `<button class="chip" data-m="${m[0]}">${m[2]} ${m[1]}</button>`).join('');
    $$('#moodChips .chip').forEach(b => b.addEventListener('click', () => { toggleSet(state.moods, b.dataset.m, 5); b.classList.toggle('on', state.moods.has(b.dataset.m)); vibrate(8); sync(); }));
    $('#famChips').innerHTML = `<button class="chip on" data-f="all">Toutes</button>` + Object.keys(FAM).map(f => `<button class="chip" data-f="${f}"><span class="dot" style="--fc:${FAM[f].c}"></span>${FAM[f].n}</button>`).join('');
    $$('#famChips .chip').forEach(b => b.addEventListener('click', () => { state.fam = b.dataset.f; $$('#famChips .chip').forEach(x => x.classList.toggle('on', x === b)); renderNotes(); }));
    renderNotes();
    $$('#richSeg button').forEach(b => b.addEventListener('click', () => { state.rich = +b.dataset.r; $$('#richSeg button').forEach(x => x.classList.toggle('on', x === b)); vibrate(8); }));
  }
  function toggleSet(set, v, max) {
    if (set.has(v)) set.delete(v);
    else if (set.size >= max) toast(`${max} choix maximum — retire-en un d'abord`);
    else set.add(v);
  }
  function renderNotes() {
    const q = strip(state.nq.trim());
    const list = VS.NOTE_LIST.filter(n => (state.fam === 'all' || n.f === state.fam) && (!q || strip(n.n + ' ' + n.d).includes(q))).sort((a, b) => a.n.localeCompare(b.n, 'fr'));
    const box = $('#noteChips');
    box.innerHTML = list.map(n => `<button class="chip note${state.picks.includes(n.id) ? ' on' : ''}" data-n="${n.id}" style="--fc:${FAM[n.f].c}">${n.e} ${n.n}</button>`).join('') || '<div class="empty" style="padding:20px">Aucune senteur trouvée.</div>';
    $$('.chip', box).forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.n, i = state.picks.indexOf(id);
      if (i >= 0) state.picks.splice(i, 1);
      else if (state.picks.length >= 5) { toast('5 senteurs maximum'); return; }
      else state.picks.push(id);
      b.classList.toggle('on', state.picks.includes(id)); vibrate(8); sync();
    }));
  }
  $('#noteSearch').addEventListener('input', e => { state.nq = e.target.value; renderNotes(); });
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
    if (!coll.length) { grid.innerHTML = `<div class="empty"><big>🫙</big>Ta collection est vide.<br>Compose un parfum et touche <b>♡</b> pour le garder ici.</div>`; return; }
    grid.innerHTML = coll.map((c, i) => {
      const comp = rebuild(c);
      return `<button class="ccard" data-k="${c.key}" style="animation-delay:${i * 60}ms"><div class="th">${Art.scene(comp.spec, { static: true })}<span class="bt">${Art.bottle({ cols: [comp.layerColor.T, comp.layerColor.C, comp.layerColor.F], shares: shares(comp) })}</span></div><div><b>${comp.name}</b><div class="ac">${comp.accord}</div><div class="nn">${comp.notes.slice(0, 5).map(n => n.e + ' ' + n.n).join(' · ')}</div></div><span class="del" data-del="${c.key}" aria-label="Supprimer">🗑️</span></button>`;
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
  function flaskSVG(cols) {
    return `<svg viewBox="0 0 200 260" aria-hidden="true"><defs><clipPath id="lfc"><path d="M82,20 H118 V84 C168,98 186,142 176,184 C168,226 136,246 100,246 C64,246 32,226 24,184 C14,142 32,98 82,84Z"/></clipPath>` +
      `<linearGradient id="lfg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".35" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#fff" stop-opacity=".25"/></linearGradient></defs>` +
      `<ellipse cx="100" cy="254" rx="62" ry="6" fill="#000" opacity=".35"/>` +
      `<g clip-path="url(#lfc)"><rect class="layer" id="lyF" x="0" y="188" width="200" height="60" fill="${cols.F}"/><rect class="layer" id="lyC" x="0" y="136" width="200" height="54" fill="${cols.C}"/><rect class="layer" id="lyT" x="0" y="88" width="200" height="50" fill="${cols.T}"/><rect x="0" y="88" width="200" height="160" fill="url(#lfg)" opacity=".5"/></g>` +
      `<path d="M82,20 H118 V84 C168,98 186,142 176,184 C168,226 136,246 100,246 C64,246 32,226 24,184 C14,142 32,98 82,84Z" fill="#fff" fill-opacity=".07" stroke="#fff" stroke-opacity=".7" stroke-width="2.4" stroke-linejoin="round"/>` +
      `<path d="M44,150 C40,176 52,206 70,222" stroke="#fff" stroke-opacity=".6" stroke-width="5" stroke-linecap="round" fill="none"/>` +
      `<rect x="76" y="6" width="48" height="18" rx="5" fill="#c9a06a"/><rect x="76" y="6" width="48" height="5" rx="2.5" fill="#fff" opacity=".35"/></svg>`;
  }
  async function runLab(comp) {
    const lab = $('#lab'), stage = $('#labStage');
    let aborted = false; labAbort = () => { aborted = true; };
    const pal = comp.spec.pal;
    lab.style.setProperty('--l1', Art.mix(pal[3], '#000', .35)); lab.style.setProperty('--l2', Art.mix(pal[1], pal[0], .4));
    lab.style.setProperty('--l3', Art.shade(pal[2], -.1)); lab.style.setProperty('--l4', comp.layerColor.C);
    $('#labEmoji').textContent = comp.emoji || '✨'; $('#labTitle').textContent = comp.name;
    $('.lab-stars', lab).innerHTML = Array.from({ length: 36 }, () => `<i style="left:${rnd(0, 100).toFixed(1)}%;top:${rnd(0, 100).toFixed(1)}%;width:${rnd(1, 3).toFixed(1)}px;height:${rnd(1, 3).toFixed(1)}px;animation-delay:-${rnd(0, 3).toFixed(1)}s"></i>`).join('');
    stage.className = 'lab-stage'; stage.innerHTML = flaskSVG(comp.layerColor);
    $$('.lab-dots i', lab).forEach(d => d.classList.remove('on'));
    $$('.fly,.ringp,.bubble', lab).forEach(n => n.remove());
    lab.hidden = false; lab.setAttribute('aria-hidden', 'false'); void lab.offsetWidth; lab.classList.add('show');

    const phase = (t, s) => { $('#labPhase').innerHTML = `${t}<small>${s || ''}</small>`; };
    const dot = i => $$('.lab-dots i', lab)[i].classList.add('on');
    const skip = $('#labSkip'); skip.onclick = () => { aborted = true; };
    const wait = async ms => { const end = Date.now() + ms; while (Date.now() < end && !aborted) await sleep(40); };
    const quick = reduce ? .25 : 1;

    // bulles continues
    const bubbleTimer = setInterval(() => {
      const r = stage.getBoundingClientRect(), lr = lab.getBoundingClientRect();
      const b = document.createElement('i'); b.className = 'bubble';
      const sz = rnd(4, 11);
      b.style.cssText = `width:${sz}px;height:${sz}px;left:${r.left - lr.left + r.width * rnd(.3, .7)}px;top:${r.top - lr.top + r.height * rnd(.62, .9)}px;animation-duration:${rnd(1.6, 3).toFixed(1)}s;--bx:${rnd(-20, 20).toFixed(0)}px`;
      lab.appendChild(b); setTimeout(() => b.remove(), 3200);
    }, 260);

    phase('Évocation', comp.tag || 'On imagine l\'endroit…'); dot(0);
    await wait(1100 * quick);
    const labels = { T: ['Notes de tête', 'Les premières secondes'], C: ['Notes de cœur', 'Le caractère se dessine'], F: ['Notes de fond', 'La trace qui reste'] };
    const ids = { T: 'lyT', C: 'lyC', F: 'lyF' };
    for (const [li, L] of ['T', 'C', 'F'].entries()) {
      if (aborted) break;
      const ns = comp.byLayer[L]; if (!ns.length) continue;
      phase(labels[L][0], ns.map(n => n.n.toLowerCase()).join(' · ')); dot(li + 1);
      const sr = stage.getBoundingClientRect(), lr = lab.getBoundingClientRect();
      const tx = sr.left - lr.left + sr.width / 2, ty = sr.top - lr.top + sr.height * (L === 'T' ? .3 : L === 'C' ? .5 : .66);
      const flights = ns.map((n, i) => new Promise(res => {
        const el = document.createElement('div'); el.className = 'fly'; el.innerHTML = `${n.e}<span>${n.n}</span>`;
        const side = i % 2 ? 1 : -1, sx = tx + side * rnd(lr.width * .22, lr.width * .42), sy = rnd(lr.height * .12, lr.height * .75);
        el.style.left = '0px'; el.style.top = '0px'; el.style.opacity = '0'; lab.appendChild(el);
        setTimeout(() => {
          if (aborted) { el.remove(); return res(); }
          const a = el.animate([
            { transform: `translate(${sx - 30}px,${sy}px) scale(.5)`, opacity: 0 },
            { transform: `translate(${sx - 30}px,${sy - 20}px) scale(1.15)`, opacity: 1, offset: .25 },
            { transform: `translate(${tx - 30}px,${ty - 20}px) scale(.35)`, opacity: .1 }
          ], { duration: 820, easing: 'cubic-bezier(.55,0,.25,1)', fill: 'forwards' });
          a.onfinish = () => { el.remove(); res(); }; vibrate(6);
        }, i * 240 * quick);
      }));
      await Promise.all(flights);
      if (aborted) break;
      const ring = document.createElement('i'); ring.className = 'ringp'; ring.style.setProperty('--c', comp.layerColor[L]); ring.style.setProperty('--ry', ty / lr.height * 100 + '%'); lab.appendChild(ring); setTimeout(() => ring.remove(), 1100);
      $('#' + ids[L]).classList.add('in');
      await wait(750 * quick);
    }
    if (!aborted) { stage.classList.add('shake'); phase('Macération', 'Les notes s\'apprivoisent'); dot(3); vibrate([10, 30, 10]); await wait(1300 * quick); }
    // finale
    clearInterval(bubbleTimer);
    $$('.layer', stage).forEach(l => l.classList.add('in'));
    const fl = $('#labFlash'); fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go');
    await sleep(aborted ? 120 : 380);
    labAbort = null;
    lab.classList.remove('show'); lab.setAttribute('aria-hidden', 'true');
    setTimeout(() => { lab.hidden = true; $$('.fly,.ringp,.bubble', lab).forEach(n => n.remove()); }, 520);
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
    const tags = [].concat(comp.dirs.map(d => { const x = VS.DIRECTIONS.find(y => y[0] === d); return x[2] + ' ' + x[1]; }), comp.moods.map(m => { const x = VS.MOODS.find(y => y[0] === m); return x[2] + ' ' + x[1]; }));
    const layers = ['T', 'C', 'F'].filter(l => comp.byLayer[l].length);
    const pyr = layers.map((L, i) => {
      const f1 = i / layers.length, f2 = (i + 1) / layers.length, c = comp.layerColor[L];
      const hw = f => 7 + 25 * f, pts = `${32 - hw(f1)},0 ${32 + hw(f1)},0 ${32 + hw(f2)},100 ${32 - hw(f2)},100`;
      const pct = comp.byLayer[L].reduce((a, n) => a + n.pct, 0);
      return `<div class="tier rv" style="--d:${i * .08}s"><div class="pyr"><svg viewBox="0 0 64 100" preserveAspectRatio="none"><polygon points="${pts}" fill="${c}" stroke="#0d0a18" stroke-width="2" vector-effect="non-scaling-stroke" style="--d:${.2 + i * .25}s"/></svg></div>` +
        `<div class="body"><h3>${TIERS[L][0]}<span>${TIERS[L][1]}</span></h3><div class="pct">${pct} % de la formule</div>` +
        comp.byLayer[L].map((n, k) => `<button class="ncard" data-note="${n.id}" style="--fc:${n.color};--w:${Math.max(6, Math.round(n.pct / maxP * 100))}%;--d:${(.25 + i * .2 + k * .08).toFixed(2)}s"><span class="ico">${n.e}</span><span><b>${n.n}</b><small>${n.d}</small></span><span class="p">${n.pct}%</span><i class="bar"></i></button>`).join('') +
        `</div></div>`;
    }).join('');
    const C = 2 * Math.PI * 46; let cum = 0;
    const segs = comp.families.map((f, i) => { const len = Math.max(f.pct / 100 * C - 2.5, 1.5), s = `<circle class="seg" cx="60" cy="60" r="46" stroke="${f.c}" style="--len:${len.toFixed(2)};--d:${(i * .08).toFixed(2)}s" stroke-dashoffset="${(-cum).toFixed(2)}"/>`; cum += f.pct / 100 * C; return s; }).join('');
    const legend = comp.families.slice(0, 7).map(f => `<div><i style="--c:${f.c}"></i>${f.e} ${f.n}<span>${f.pct}%</span></div>`).join('');
    const seasonKeys = ['printemps', 'ete', 'automne', 'hiver'];
    const mom = { jour: ['☀️', 'Journée'], soir: ['🌙', 'Soirée'], 'jour & soir': ['🌗', 'Jour & soir'] }[st.moment];
    const rel = relatedScenes(comp);
    return `<div class="res-hero"><div class="art-bg" id="heroArt">${Art.scene(comp.spec)}</div><div class="res-top"><button class="round" id="rBack" aria-label="Retour">←</button><span></span></div></div>` +
      `<div class="res-bottle">${Art.bottle({ cols: [comp.layerColor.T, comp.layerColor.C, comp.layerColor.F], shares: shares(comp) })}</div>` +
      `<div class="res-title"><div class="badge">${comp.emoji || '✨'} ${catLabel}</div><h1>${comp.name}</h1><p class="tg">${tag}</p><span class="accord">${comp.accord}</span></div>` +
      `<section class="sec rv"><h2>L'histoire</h2><div class="story"><p>${comp.story}</p>${tags.length ? `<div class="tags">${tags.map(t => `<span>${t}</span>`).join('')}</div>` : ''}</div></section>` +
      `<section class="sec"><h2 class="rv">Pyramide olfactive</h2><p class="sub rv">Touche une note pour la découvrir.</p>${pyr}</section>` +
      `<section class="sec rv"><h2>Palette de senteurs</h2><div class="donut-w"><div class="donut"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="46" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="15"/>${segs}</svg><div class="mid"><small>dominante</small><b>${comp.families[0].n}</b></div></div><div class="leg">${legend}</div></div></section>` +
      `<section class="sec rv"><h2>Signature</h2><div class="gauges"><div class="g"><div class="row"><span>Intensité</span><b>${st.intensity} / 10</b></div><div class="track"><div class="fill" style="--w:${st.intensity * 10}%"></div></div></div><div class="g"><div class="row"><span>Tenue</span><b>≈ ${st.hours} h</b></div><div class="track"><div class="fill" style="--w:${Math.round(st.hours / 14 * 100)}%"></div></div></div><div class="g"><div class="row"><span>Sillage</span><b>${st.sillage}</b></div><div class="track"><div class="fill" style="--w:${st.sillageV}%"></div></div></div></div>` +
      `<div class="sig2"><div class="box"><h4>Saisons</h4><div class="seasons">${seasonKeys.map(k => `<span class="${st.best.includes(k) ? 'on' : ''}"><i>${SEASON[k][0]}</i>${SEASON[k][1]}</span>`).join('')}</div></div><div class="box"><h4>Moment</h4><div class="moment"><span>${mom[0]}</span>${mom[1]}</div></div></div>` +
      `<div class="box" style="margin-top:12px"><h4>Cohérence de l'accord</h4><div class="harm"><div class="ring"><svg viewBox="0 0 80 80"><circle class="tr" cx="40" cy="40" r="34"/><circle class="pg" cx="40" cy="40" r="34" style="--hd:${(st.harmony / 100 * 213.6).toFixed(1)}"/></svg><b>${st.harmony}%</b></div><p>Les familles de cette formule s'accordent entre elles&nbsp;: aucune note ne vient contredire l'ensemble.</p></div></div></section>` +
      `<section class="sec rv"><h2>Dans la même veine</h2><div class="rel">${rel.map(s => `<button class="hcard" data-sc="${s.id}"><div class="art-w" data-art="${s.id}"></div><span class="em">${s.e}</span><div class="cap">${s.n}</div></button>`).join('')}</div></section>`;
  }
  function openResult(comp, reveal) {
    current = comp;
    const wrap = $('#result'), sc = $('#resScroll');
    wrap.hidden = false; wrap.setAttribute('aria-hidden', 'false');
    sc.innerHTML = resultHTML(comp); sc.scrollTop = 0;
    sc.classList.toggle('reveal', !!reveal);
    $('#resBar').innerHTML = `<button class="round save${isSaved(comp.key) ? ' on' : ''}" id="rSave" aria-label="Enregistrer">${isSaved(comp.key) ? '♥' : '♡'}</button><button class="btn glass" id="rMix">🎲 Variation</button><button class="btn primary" id="rShare">↗ Partager</button>`;
    lazyArt(sc);
    void wrap.offsetWidth; wrap.classList.add('show');
    if (!resultOpen) { try { history.pushState({ r: 1 }, ''); } catch (e) { /* ignore */ } resultOpen = true; }
    // révélation au scroll
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { root: sc, threshold: .12 });
    $$('.rv', sc).forEach(el => io.observe(el));
    // parallaxe
    const art = $('#heroArt'); let tick = false;
    sc.onscroll = () => { if (tick) return; tick = true; requestAnimationFrame(() => { const y = sc.scrollTop; if (y < 700) art.style.transform = `translateY(${y * .38}px) scale(${1 + y / 2200})`; tick = false; }); };
    $('#rBack').onclick = () => closeResult();
    $('#rSave').onclick = e => { toggleSave(comp); const b = e.currentTarget; b.classList.remove('on'); void b.offsetWidth; b.classList.toggle('on', isSaved(comp.key)); b.textContent = isSaved(comp.key) ? '♥' : '♡'; vibrate(15); };
    $('#rShare').onclick = () => share(comp);
    $('#rMix').onclick = () => remix(comp);
    $$('.ncard', sc).forEach(b => b.addEventListener('click', () => openSheet(b.dataset.note, comp)));
    if (reveal) setTimeout(() => confetti(comp), 1500);
  }
  function closeResult(fromPop) {
    const wrap = $('#result'); if (!resultOpen) return;
    resultOpen = false; wrap.classList.remove('show'); wrap.setAttribute('aria-hidden', 'true');
    setTimeout(() => { if (!resultOpen) { wrap.hidden = true; $('#resScroll').innerHTML = ''; } }, 420);
    closeSheet();
    if (!fromPop && history.state && history.state.r) { try { history.back(); } catch (e) { /* ignore */ } }
  }
  window.addEventListener('popstate', () => { if (!$('#sheetWrap').hidden) closeSheet(); if (resultOpen) closeResult(true); });
  function confetti(comp) {
    const wrap = $('#result'); if (wrap.hidden) return;
    const r = $('.res-bottle', wrap); if (!r) return;
    const br = r.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
    const cx = br.left - wr.left + br.width / 2, cy = br.top - wr.top + br.height * .35;
    const em = comp.notes.map(n => n.e);
    for (let i = 0; i < 18; i++) {
      const el = document.createElement('span'); el.className = 'conf'; el.textContent = em[i % em.length];
      const a = rnd(0, Math.PI * 2), d = rnd(70, 190);
      el.style.cssText = `left:${cx}px;top:${cy}px;--tx:${Math.cos(a) * d}px;--ty:${Math.sin(a) * d - 60}px;--rot:${rnd(-80, 80)}deg;animation-delay:${i * 25}ms`;
      wrap.appendChild(el); setTimeout(() => el.remove(), 2600);
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
    const text = `${comp.emoji || '✨'} ${comp.name} — ${comp.accord}\n\nTête : ${L('T')}\nCœur : ${L('C')}\nFond : ${L('F')}\n\nComposé avec Voyage des Sens`;
    try {
      if (navigator.share) { await navigator.share({ title: comp.name, text }); return; }
      await navigator.clipboard.writeText(text); toast('Formule copiée dans le presse-papiers');
    } catch (e) { if (e && e.name !== 'AbortError') toast('Partage indisponible sur cet appareil'); }
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
      `<h5>Ambiances</h5><div class="tags">${moods.map(m => `<span>${m[2]} ${m[1]}</span>`).join('')}</div>` +
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
    s.innerHTML = `<div class="sp-in">${Art.bottle({ cols: ['#f6c945', '#e88fb8', '#8a5a3b'], shares: [.25, .35, .4] })}<h1>Voyage des Sens</h1><p>Imagine un lieu. Respire-le.</p></div>`;
    $('#app').appendChild(s);
    setTimeout(() => { s.classList.add('out'); setTimeout(() => s.remove(), 800); }, reduce ? 300 : 1700);
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
