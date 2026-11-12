/* Voyage des Sens — moteur de composition olfactive */
(function (G) {
  'use strict';
  const VS = G.VS, NOTES = VS.NOTES, FAM = VS.FAMILIES, Art = VS.Art;

  const LAYERS = ['T', 'C', 'F'];
  const LAYER_SHARE = { T: .24, C: .36, F: .40 };
  const RANK_W = [1, .78, .6, .46, .36, .3];
  const FIXATIVES = new Set(['bo', 'am', 'mu', 're', 'go', 'te', 'cr', 'co']);

  const strip = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const pick = (arr, r) => arr[Math.floor(r() * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const vowel = /^[aeiouyhàâäéèêëîïôöùûüœ]/i;
  const de = n => { const l = n.charAt(0).toLowerCase() + n.slice(1); return (vowel.test(n) ? 'd\'' : 'de ') + l; };
  const list = a => a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' et ' + a[a.length - 1];
  const low = s => s.charAt(0).toLowerCase() + s.slice(1);
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const firstDesc = n => n.d.split(',')[0].trim();

  function largestRemainder(vals, total) {
    const sum = vals.reduce((a, b) => a + b, 0) || 1;
    const raw = vals.map(v => v / sum * total), fl = raw.map(Math.floor);
    let rest = total - fl.reduce((a, b) => a + b, 0);
    raw.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (rest > 0) { fl[i]++; rest--; } });
    return fl;
  }

  /* ---------- construction d'une composition à partir d'identifiants ordonnés ---------- */
  function build(ids, meta) {
    meta = meta || {};
    const notes = ids.map(id => NOTES[id]).filter(Boolean);
    const byLayer = { T: [], C: [], F: [] };
    notes.forEach(n => byLayer[n.l].push(n));
    const present = LAYERS.filter(l => byLayer[l].length);
    const shareSum = present.reduce((a, l) => a + LAYER_SHARE[l], 0);
    const layerShare = {};
    present.forEach(l => layerShare[l] = LAYER_SHARE[l] / shareSum);

    // pourcentages
    const flat = [];
    present.forEach(l => {
      const ws = byLayer[l].map((n, i) => RANK_W[Math.min(i, RANK_W.length - 1)]);
      const ws2 = largestRemainder(ws, 1000);
      byLayer[l].forEach((n, i) => flat.push({ n, w: ws2[i] / 1000 * layerShare[l] }));
    });
    const pcts = largestRemainder(flat.map(x => x.w), 100);
    const out = { T: [], C: [], F: [] };
    flat.forEach((x, i) => {
      out[x.n.l].push(Object.assign({}, x.n, { pct: Math.max(pcts[i], 1), color: FAM[x.n.f].c }));
    });
    const all = [].concat(out.T, out.C, out.F);

    // familles
    const fm = {};
    all.forEach(n => fm[n.f] = (fm[n.f] || 0) + n.pct);
    const families = Object.keys(fm).map(f => ({ f, pct: fm[f], n: FAM[f].n, c: FAM[f].c, e: FAM[f].e })).sort((a, b) => b.pct - a.pct);

    // couleur par couche
    const layerColor = {};
    present.forEach(l => {
      const s = out[l].slice().sort((a, b) => b.pct - a.pct);
      layerColor[l] = s.length > 1 ? Art.mix(s[0].color, s[1].color, .32) : s[0].color;
    });
    LAYERS.forEach(l => { if (!layerColor[l]) layerColor[l] = '#888888'; });

    // statistiques
    const wavg = fn => all.reduce((a, n) => a + fn(n) * n.pct, 0) / 100;
    const tagVal = { int: 1.6, fum: 1, cha: .5, mys: .6, ene: .3, epi: .4, fra: -.8, apa: -.7, dou: -.4, lum: -.3 };
    const wscore = wavg(n => n.t.reduce((a, t) => a + (tagVal[t] || 0), 0));
    const intensity = clamp(Math.round(5 + wscore * 3.2), 2, 9);
    const fixPct = out.F.filter(n => FIXATIVES.has(n.f)).reduce((a, n) => a + n.pct, 0);
    const hours = clamp(Math.round(3 + fixPct * .12 + intensity * .45), 4, 14);
    const sillageLabels = ['Intime', 'Discret', 'Modéré', 'Affirmé', 'Enveloppant'];
    const sillageIdx = clamp(Math.floor((intensity - 2) / 1.6), 0, 4);

    const seasonDef = {
      printemps: { fam: ['fl', 've', 'ag', 'fr'], tags: ['dou', 'fra', 'rom', 'lum'] },
      ete: { fam: ['ag', 'ma', 'fr', 'ar', 'bv'], tags: ['fra', 'lum', 'sal', 'joy', 'exo'] },
      automne: { fam: ['bo', 'te', 'go', 'ep', 'cu'], tags: ['rec', 'nos', 'cha', 'dou'] },
      hiver: { fam: ['am', 're', 'cr', 'go', 'ep', 'co'], tags: ['cha', 'rec', 'mys', 'int', 'fum'] }
    };
    const seasons = Object.keys(seasonDef).map(k => {
      const d = seasonDef[k];
      return { k, v: wavg(n => (d.fam.includes(n.f) ? 1 : 0) + n.t.filter(t => d.tags.includes(t)).length * .5) };
    }).sort((a, b) => b.v - a.v);
    const best = seasons.slice(0, seasons[1].v > seasons[0].v * .8 ? 2 : 1).map(s => s.k);
    const night = wavg(n => n.t.filter(t => ['mys', 'int', 'fum', 'lux', 'rom', 'cha'].includes(t)).length);
    const day = wavg(n => n.t.filter(t => ['fra', 'lum', 'ene', 'joy', 'apa'].includes(t)).length);
    const moment = night > day * 1.25 ? 'soir' : day > night * 1.25 ? 'jour' : 'jour & soir';

    // harmonie
    let num = 0, den = 0;
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      const w = all[i].pct * all[j].pct; num += w * VS.pairScore(all[i].f, all[j].f); den += w;
    }
    const hs = den ? num / den : 0;
    const harmony = clamp(Math.round(70 + (hs + .25) * 30), 64, 99);

    // accord
    const top2 = families.slice(0, 2);
    const accord = top2.length > 1 && top2[1].pct >= top2[0].pct * .55 ? top2[0].n + ' · ' + top2[1].n : (top2[0] ? top2[0].n : '');

    const comp = {
      key: meta.key || ('x' + Date.now().toString(36)),
      name: meta.name || 'Création', tag: meta.tag || '', sceneId: meta.sceneId || null,
      emoji: meta.emoji || '', cat: meta.cat || '', dirs: meta.dirs || [], moods: meta.moods || [],
      ids: all.map(n => n.id), notes: all, byLayer: out, layerShare, layerColor, families, accord,
      stats: { intensity, hours, sillage: sillageLabels[sillageIdx], sillageV: clamp(Math.round((intensity - 1) * 11), 8, 100), seasons, best, moment, harmony },
      spec: meta.spec || null
    };
    const r = Art.rngf(Art.hash(comp.name + ids.join()));
    comp.story = story(comp, r, meta);
    if (!comp.spec) comp.spec = Art.customSpec(comp, (meta.dirs || [])[0], Art.hash(comp.name) % 9999);
    comp.spec.n = comp.name;
    return comp;
  }

  /* ---------- histoire ---------- */
  function story(c, r, meta) {
    const T = c.byLayer.T.slice().sort((a, b) => b.pct - a.pct), C = c.byLayer.C.slice().sort((a, b) => b.pct - a.pct), F = c.byLayer.F.slice().sort((a, b) => b.pct - a.pct);
    const nm = a => a.slice(0, 2).map(n => low(n.n));
    const s = [];
    if (meta.sceneId) s.push(pick(['Ferme les yeux : tu y es.', 'Le décor se dessine autour de toi.', 'Imagine-toi sur place, à l\'instant précis.', 'Tout commence par une image, et l\'odeur qui va avec.'], r));
    else if (meta.moods && meta.moods.length) {
      const m = meta.moods.slice(0, 3).map(id => low(VS.MOODS.find(x => x[0] === id)[1]));
      const d = (meta.dirs || []).map(id => low(VS.DIRECTIONS.find(x => x[0] === id)[1]));
      s.push('Un parfum ' + list(m) + (d.length ? ', aux accents de ' + list(d) : '') + '.');
    } else s.push('Un parfum composé pour toi, entre ' + low(c.families[0].n) + ' et ' + low(c.families[1] ? c.families[1].n : c.families[0].n) + '.');
    const nA = a => low(a[0].n), dA = a => firstDesc(a[0]);
    if (T.length) s.push(pick([
      `L'ouverture s'éveille sur ${list(nm(T))}. ${cap(nA(T))} y met sa signature (${dA(T)}).`,
      `Dès les premières secondes, ${list(nm(T))} se dévoilent : ${nA(T)} mène la danse (${dA(T)}).`,
      `On entre par ${list(nm(T))}, avec ${nA(T)} en éclaireur (${dA(T)}).`
    ], r));
    if (C.length) s.push(pick([
      `Au cœur, ${list(nm(C))} installent le décor. ${cap(nA(C))} (${dA(C)}) prend peu à peu toute la place.`,
      `Puis le cœur s'ouvre sur ${list(nm(C))} : ${nA(C)} donne son caractère à la scène (${dA(C)}).`,
      `${cap(list(nm(C)))} prennent le relais, avec ${nA(C)} en tête (${dA(C)}).`
    ], r));
    if (F.length) s.push(pick([
      `Le sillage s'attarde sur ${list(nm(F))}. ${cap(nA(F))} (${dA(F)}) reste longtemps après ton départ.`,
      `En fond, ${list(nm(F))} ancrent le souvenir, avec ${nA(F)} pour dernier mot (${dA(F)}).`,
      `La trace finale repose sur ${list(nm(F))} : ${nA(F)} (${dA(F)}) tient la note jusqu'au bout.`
    ], r));
    return s.join(' ');
  }

  /* ---------- à partir d'un lieu préfait ---------- */
  function fromScene(sc) {
    return build(sc.notes, { key: sc.id, name: sc.n, tag: sc.tag, sceneId: sc.id, emoji: sc.e, cat: sc.cat, spec: { id: sc.id, pal: sc.pal, art: sc.art, n: sc.n } });
  }

  /* ---------- création sur mesure ---------- */
  const PREFIX = {
    nos: ['Souvenir', 'Mémoire', 'Temps'], dec: ['Sentier', 'Éveil', 'Carnet'], voy: ['Escale', 'Cap', 'Route'], exo: ['Mirage', 'Île', 'Rêve'],
    mys: ['Nuit', 'Secret', 'Ombre'], lum: ['Éclat', 'Aube', 'Lumière'], apa: ['Souffle', 'Sieste', 'Calme'], cha: ['Chaleur', 'Foyer', 'Braise'],
    fra: ['Brise', 'Rosée', 'Fraîcheur'], rom: ['Murmure', 'Promesse', 'Aveu'], sau: ['Sauvage', 'Terre', 'Instinct'], lux: ['Écrin', 'Prestige', 'Velours'],
    joy: ['Éclat', 'Fête', 'Rire'], dou: ['Douceur', 'Caresse', 'Plume'], rec: ['Refuge', 'Cocon', 'Havre'], int: ['Élan', 'Feu', 'Orage'],
    suc: ['Gourmandise', 'Délice', 'Sucre'], epi: ['Piment', 'Souk', 'Braise'], fum: ['Fumée', 'Cendre', 'Brasier'], sal: ['Embrun', 'Marée', 'Rivage'],
    pou: ['Poudre', 'Voile', 'Nuage'], ene: ['Élan', 'Éclair', 'Souffle']
  };

  function compose(o) {
    o = o || {};
    const moods = (o.moods || []).slice(), dirs = (o.dirs || []).slice();
    const picks = (o.picks || []).map(id => NOTES[id]).filter(Boolean);
    const seed = o.seed != null ? o.seed : Math.floor(Math.random() * 1e9);
    const r = Art.rngf(seed);
    const size = o.size || [3, 3, 3];
    const tw = {};
    moods.forEach(t => tw[t] = (tw[t] || 0) + 1);
    dirs.forEach(t => tw[t] = (tw[t] || 0) + 1.7);
    // les senteurs choisies "teintent" aussi l'ambiance
    picks.forEach(p => p.t.forEach(t => tw[t] = (tw[t] || 0) + .25));

    const chosen = { T: [], C: [], F: [] };
    picks.forEach(p => { if (!chosen[p.l].includes(p)) chosen[p.l].push(p); });
    const all = () => [].concat(chosen.T, chosen.C, chosen.F);
    const noise = {};
    VS.NOTE_LIST.forEach(n => noise[n.id] = r() * 1.1);

    function score(n, layer) {
      if (all().includes(n)) return -99;
      let s = n.t.reduce((a, t) => a + (tw[t] || 0), 0) + noise[n.id];
      let coh = 0, bad = 0;
      all().forEach(c => { const p = VS.pairScore(n.f, c.f); coh += p; if (p < 0) bad++; });
      s += coh * .85 - bad * 2.6;
      picks.forEach(p => { s += VS.pairScore(n.f, p.f) * .9; });
      const same = chosen[layer].filter(c => c.f === n.f).length;
      s -= same * 1.6;
      const sameAll = all().filter(c => c.f === n.f).length;
      s -= Math.max(0, sameAll - 2) * 1.2;
      return s;
    }
    function fill(layer, count) {
      while (chosen[layer].length < count) {
        let best = null, bs = -1e9;
        VS.NOTE_LIST.forEach(n => { if (n.l !== layer) return; const sc = score(n, layer); if (sc > bs) { bs = sc; best = n; } });
        if (!best) break; chosen[layer].push(best);
      }
    }
    fill('C', size[1]); fill('F', size[2]); fill('T', size[0]);
    // ancrage obligatoire : un fond tenace
    if (!chosen.F.some(n => FIXATIVES.has(n.f))) {
      let best = null, bs = -1e9;
      VS.NOTE_LIST.forEach(n => { if (n.l !== 'F' || !FIXATIVES.has(n.f) || chosen.F.includes(n)) return; const sc = score(n, 'F'); if (sc > bs) { bs = sc; best = n; } });
      if (best) { const idx = chosen.F.findIndex(n => !picks.includes(n)); if (idx >= 0) chosen.F.splice(idx, 1); chosen.F.push(best); }
    }
    // tri par pertinence dans chaque couche (les choix de l'utilisateur d'abord)
    LAYERS.forEach(l => {
      chosen[l].sort((a, b) => {
        const pa = picks.includes(a) ? 100 : 0, pb = picks.includes(b) ? 100 : 0;
        const sa = a.t.reduce((x, t) => x + (tw[t] || 0), 0), sb = b.t.reduce((x, t) => x + (tw[t] || 0), 0);
        return (pb + sb) - (pa + sa);
      });
    });
    const ids = [].concat(chosen.T, chosen.C, chosen.F).map(n => n.id);

    // nom
    const all2 = build(ids, { dirs, moods });
    const lead = [].concat(all2.byLayer.C, all2.byLayer.T).sort((a, b) => b.pct - a.pct)[0];
    const key = dirs[0] || moods[0] || 'rec';
    const pref = pick(PREFIX[key] || PREFIX.rec, r);
    const name = o.name || (pref + ' ' + de(lead.n));
    return build(ids, { name, dirs, moods, key: 'c' + seed, emoji: '✨', spec: o.spec });
  }

  /* ---------- analyse d'un texte libre ---------- */
  const SYN = {
    rec: ['reconfort', 'cocon', 'douillet', 'cosy', 'foyer', 'refuge'], fra: ['frais', 'fraich', 'froid', 'glac', 'givre'], cha: ['chaud', 'chaleur', 'cheminee', 'feu'],
    mys: ['mystere', 'mysterieux', 'nuit', 'sombre', 'secret'], lum: ['lumi', 'soleil', 'clair', 'aube', 'ensoleil'], sau: ['sauvage', 'nature', 'brut', 'foret'],
    dou: ['doux', 'douce', 'tendre', 'velours'], int: ['intense', 'puissant', 'fort'], rom: ['amour', 'romantique', 'passion'], ene: ['energ', 'sport', 'tonique', 'vif'],
    apa: ['calme', 'paisible', 'zen', 'sieste', 'repos', 'apais'], lux: ['luxe', 'luxueux', 'precieux', 'chic', 'palace'], joy: ['joie', 'joyeux', 'fete', 'rire', 'enfant'],
    pou: ['poudre', 'talc'], fum: ['fume', 'fumee', 'cendre', 'brule'], sal: ['sel', 'mer ', 'ocean', 'plage', 'embrun', 'marin'], epi: ['epice', 'piment', 'poivre'],
    suc: ['sucre', 'gourmand', 'bonbon', 'dessert', 'gateau'], nos: ['nostalgi', 'souvenir', 'enfance', 'grand-mere', 'mamie', 'autrefois', 'vieux', 'ancien', 'retro'],
    dec: ['decouv', 'aventure', 'explor', 'inconnu'], voy: ['voyage', 'vacance', 'escale', 'train', 'avion', 'route', 'ailleurs'], exo: ['exoti', 'tropic', 'ile', 'jungle', 'lointain', 'orient']
  };
  const STOP = new Set('le la les un une des du de dans sur avec pour et ou au aux en d l un mon ma mes ton ta tes son sa ses ce cet cette qui que quoi comme tres plus pas est sont'.split(' '));
  const DIRS = ['nos', 'dec', 'voy', 'exo'];
  function analyzeText(text) {
    const t = ' ' + strip(text) + ' ';
    const tags = [], picks = [], dirs = [];
    Object.keys(SYN).forEach(k => { if (SYN[k].some(s => t.includes(s))) (DIRS.includes(k) ? dirs : tags).push(k); });
    const words = t.split(/[^a-z0-9]+/).filter(w => w.length > 2 && !STOP.has(w));
    VS.NOTE_LIST.forEach(n => {
      const nn = strip(n.n);
      if (nn.length > 3 && t.includes(' ' + nn + ' ') || (nn.length > 4 && words.includes(nn))) picks.push(n.id);
    });
    // lieu le plus proche
    let best = null, bs = 0;
    VS.SCENES.forEach(sc => {
      const hay = ' ' + strip(sc.n + ' ' + sc.tag) + ' ';
      let s = 0; words.forEach(w => { if (w.length > 3 && hay.includes(w.slice(0, Math.max(4, w.length - 2)))) s += 1; });
      if (s > bs) { bs = s; best = sc; }
    });
    return { tags: tags.slice(0, 5), dirs: dirs.slice(0, 2), picks: picks.slice(0, 3), scene: bs >= 1 ? best : null };
  }

  /* ---------- destinations : les plus proches de la formule ---------- */
  function destinations(comp) {
    const fam = {}; comp.families.forEach(f => fam[f.f] = f.pct);
    const tally = {}; comp.notes.forEach(n => n.t.forEach(t => tally[t] = (tally[t] || 0) + n.pct / 100));
    const forced = comp.sceneId && VS.SCENE_DEST[comp.sceneId];
    const list = VS.DESTS.map(d => {
      const fs = d.fams.reduce((a, f, i) => a + [3, 2, 1][i] * ((fam[f] || 0) / 100), 0);
      const hits = d.notes.filter(id => comp.ids.includes(id));
      const ts = d.tags.reduce((a, t) => a + (tally[t] || 0), 0) / Math.max(1, d.tags.length);
      return { d, raw: fs * 7 + hits.length * 4 + ts * 10, hits, forced: d.id === forced };
    }).sort((a, b) => (b.forced - a.forced) || (b.raw - a.raw));
    const top = Math.max(1, list.reduce((m, x) => Math.max(m, x.raw), 0));
    return list.slice(0, 6).map((x, i) => {
      let aff = clamp(Math.round(78 + x.raw / top * 17 - i * 1.5), 76, 98);
      if (x.forced) aff = Math.max(aff, 93);
      return { d: x.d, hits: x.hits, aff };
    });
  }

  VS.Engine = { build, fromScene, compose, analyzeText, de, destinations };
})(typeof window !== 'undefined' ? window : globalThis);
