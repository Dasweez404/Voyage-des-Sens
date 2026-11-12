/* Voyage des Sens — moteur d'illustration (SVG embarqués, animés, 100 % hors-ligne) */
(function (G) {
  'use strict';

  /* ---------- utilitaires ---------- */
  const rngf = seed => { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const h2r = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(x => x + x).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const r2h = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const A = h2r(a), B = h2r(b); return r2h(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); };
  const shade = (c, t) => t >= 0 ? mix(c, '#ffffff', t) : mix(c, '#000000', -t);
  let UID = 0;

  // halo en paliers : trois disques plats concentriques (aucun dégradé)
  const glow = (c, r, cx, cy, op) => { op = op == null ? 1 : op; return `<g transform="translate(${cx || 0} ${cy || 0})"><circle r="${r}" fill="${c}" opacity="${(.16 * op).toFixed(2)}"/><circle r="${(r * .55).toFixed(0)}" fill="${c}" opacity="${(.34 * op).toFixed(2)}"/></g>`; };

  /* ---------- motifs ---------- */
  // Convention : ancrage en bas-centre (0,0) sauf mention contraire ; X = contexte, c = couleur, t = texte/option
  const M = {};

  M.sun = (X, c) => { c = c || '#ffcf4a'; let r = ''; for (let i = 0; i < 8; i++) r += `<rect x="-3" y="-66" width="6" height="16" rx="3" transform="rotate(${i * 45})"/>`; return `<circle r="66" fill="${c}" opacity=".16"/><g class="ro" fill="${c}" opacity=".75">${r}</g><circle r="38" fill="${c}"/>`; };
  M.moon = (X, c) => { c = c || '#fff4d6'; return `<circle r="84" fill="${c}" opacity=".07"/><circle r="56" fill="${c}" opacity=".12"/><path d="M10,-30 A32 32 0 1 0 30 12 A25 25 0 1 1 10 -30Z" fill="${c}"/>`; };
  M.stars = (X, c) => { c = c || '#ffffff'; let o = ''; for (let i = 0; i < 9; i++) { o += `<circle class="tw" style="animation-delay:${(X.r() * 3).toFixed(1)}s" cx="${X.r() * 400 | 0}" cy="${X.r() * 270 | 0}" r="${(1.3 + X.r() * 1.7).toFixed(1)}" fill="${c}"/>`; } return o; };
  M.cloud = (X, c) => { c = c || '#ffffff'; return `<g class="dr"><g fill="${c}" opacity=".88"><ellipse rx="52" ry="16"/><ellipse cx="-22" cy="-12" rx="26" ry="18"/><ellipse cx="16" cy="-18" rx="30" ry="22"/></g></g>`; };
  const mtnShape = (X, c, snow) => {
    const back = mix(c, X.b, .45);
    let o = `<path d="M0,-70 L55,-120 L105,-80 L165,-165 L235,-90 L290,-140 L350,-80 L400,-110 V230 H0Z" fill="${back}"/>`;
    if (snow) o += `<path d="M165,-165 L145,-132 L158,-138 L168,-126 L180,-138 L190,-130Z M55,-120 L42,-98 L52,-103 L60,-95 L68,-104 L74,-99Z M290,-140 L274,-112 L285,-118 L294,-108 L303,-119 L309,-113Z" fill="#fff" opacity=".9"/>`;
    o += `<path d="M0,-25 L70,-100 L130,-50 L205,-135 L275,-60 L335,-105 L400,-35 V230 H0Z" fill="${c}"/>`;
    if (snow) o += `<path d="M205,-135 L183,-100 L196,-107 L207,-93 L220,-106 L231,-99Z M70,-100 L55,-78 L66,-84 L74,-74 L84,-85 L90,-80Z M335,-105 L320,-80 L330,-86 L340,-76 L350,-88 L355,-82Z" fill="#fff"/>`;
    return o;
  };
  M.mtn = (X, c) => mtnShape(X, c || X.d, false);
  M.mtnsnow = (X, c) => mtnShape(X, c || X.d, true);
  M.hills = (X, c) => { c = c || X.d; return `<path d="M0,-22 C90,-52 180,-40 250,-22 S350,0 400,-30 V320 H0Z" fill="${shade(c, .18)}" opacity=".75"/><path d="M0,0 C80,-34 170,-34 230,-12 S340,22 400,-14 V320 H0Z" fill="${c}"/>`; };
  M.dune = (X, c) => { c = c || X.d; return `<path d="M0,0 C60,-44 140,-56 215,-22 S340,-34 400,-8 V280 H0Z" fill="${c}"/><path d="M215,-22 C260,-30 300,-30 340,-26 S380,-14 400,-8 V280 H215Z" fill="${shade(c, -.12)}" opacity=".5"/>`; };
  const pineS = c => `<path d="M0,-78 L18,-50 H8 L24,-26 H10 L28,0 H-28 L-10,-26 H-24 L-8,-50 H-18Z" fill="${c}"/><rect x="-3" y="0" width="6" height="10" fill="${shade(c, -.5)}"/>`;
  M.pine = (X, c) => pineS(c || '#2c6a46');
  M.pines = (X, c) => { c = c || '#2c6a46'; let o = ''; const n = 6; for (let i = 0; i < n; i++) { const px = i * (400 / (n - 1)) + (X.r() - .5) * 26, sc = .8 + X.r() * .7; o += `<g transform="translate(${px | 0} ${X.r() * 14 | 0}) scale(${sc.toFixed(2)})"><g class="sw" style="animation-delay:${(X.r() * 3).toFixed(1)}s">${pineS(shade(c, (X.r() - .5) * .25))}</g></g>`; } return o; };
  M.tree = (X, c, t) => {
    c = c || '#4f9a3a';
    let o = `<rect x="-6" y="-64" width="12" height="66" rx="4" fill="#5a3a22"/><g class="sw"><circle cy="-98" r="44" fill="${c}"/><circle cx="-31" cy="-72" r="31" fill="${shade(c, -.14)}"/><circle cx="31" cy="-74" r="31" fill="${shade(c, .1)}"/>`;
    if (t) for (let i = 0; i < 6; i++) o += `<circle cx="${X.r() * 80 - 40 | 0}" cy="${-125 + X.r() * 66 | 0}" r="7" fill="${t}"/>`;
    return o + '</g>';
  };
  M.acacia = (X, c) => { c = c || '#2a2410'; return `<path d="M-4,0 C-2,-40 -14,-70 -34,-96 L-26,-100 C-16,-84 -6,-72 2,-62 C8,-76 20,-90 38,-102 L44,-96 C26,-84 12,-64 8,-40 C8,-24 8,-10 8,0Z" fill="${c}"/><ellipse cy="-108" rx="82" ry="16" fill="${c}"/><ellipse cx="-34" cy="-98" rx="38" ry="11" fill="${c}"/><ellipse cx="40" cy="-100" rx="38" ry="11" fill="${c}"/>`; };
  M.palm = (X, c) => {
    c = c || '#2f8f4e';
    const leaf = a => `<g transform="rotate(${a})"><path d="M0,0 C26,-38 76,-34 110,12 C74,-8 36,-10 0,0Z" fill="${c}"/><path d="M0,0 C30,-20 70,-14 100,10" stroke="${shade(c, -.3)}" stroke-width="1.5" fill="none"/></g>`;
    let f = '';[-72, -38, -8, 22].forEach(a => { f += leaf(a); f += `<g transform="scale(-1 1)">${leaf(a)}</g>`; });
    return `<path d="M-6,0 C-12,-80 10,-150 6,-208 L-5,-208 C0,-150 -24,-80 -17,0Z" fill="#8a5a33"/><g transform="translate(0 -206)"><g class="sw">${f}<circle cx="-5" cy="6" r="6" fill="#5a3820"/><circle cx="6" cy="8" r="6" fill="#5a3820"/></g></g>`;
  };
  M.waves = (X, c) => { c = c || X.b; let o = ''; [[0, .6, 14, 'wv1'], [26, 1, 11, 'wv3']].forEach(([dy, op, amp, cl], i) => { o += `<g class="${cl}"><path transform="translate(-200 ${dy})" d="M0,0 q50,-${amp} 100,0 t100,0 t100,0 t100,0 t100,0 t100,0 t100,0 t100,0 t100,0 V260 H0Z" fill="${shade(c, i * -.1)}" opacity="${op}"/></g>`; }); return o; };
  M.ground = (X, c) => { c = c || X.d; return `<rect width="400" height="220" fill="${c}"/>`; };
  M.planks = (X, c) => { c = c || X.d; let o = ''; for (let i = 0; i < 12; i++) o += `<rect x="${i * 34}" width="34" height="500" fill="${i % 2 ? shade(c, .06) : shade(c, -.1)}" opacity=".55"/><path d="M${i * 34} 0 V500" stroke="#000" stroke-opacity=".18" stroke-width="1.5"/>`; return o; };
  M.rays = (X, c) => { c = c || '#fff'; return `<g class="rayg" fill="${c}"><path d="M-20,0 L-130,520 L-50,520Z" opacity=".10"/><path d="M0,0 L-20,520 L70,520Z" opacity=".12"/><path d="M20,0 L110,520 L190,520Z" opacity=".09"/></g>`; };
  M.snow = (X, c) => { c = c || '#fff'; let o = ''; for (let i = 0; i < 14; i++) o += `<circle class="fa" style="--sy:${X.r() * 500 | 0}px;animation-duration:${(6 + X.r() * 7).toFixed(1)}s;animation-delay:-${(X.r() * 10).toFixed(1)}s" cx="${X.r() * 420 | 0}" cy="-10" r="${(2.2 + X.r() * 2.6).toFixed(1)}" fill="${c}" opacity="${(.6 + X.r() * .4).toFixed(2)}"/>`; return o; };
  M.rain = (X, c) => { c = c || '#cfe3ff'; let o = ''; for (let i = 0; i < 16; i++) { const x = X.r() * 420 | 0; o += `<line class="fa" style="--sy:${X.r() * 500 | 0}px;animation-duration:${(.8 + X.r() * .7).toFixed(2)}s;animation-delay:-${(X.r() * 2).toFixed(1)}s" x1="${x}" y1="-20" x2="${x - 5}" y2="2" stroke="${c}" stroke-width="2.2" stroke-linecap="round" opacity=".6"/>`; } return o; };
  M.fireflies = (X, c) => { c = c || '#ffe36b'; let o = ''; for (let i = 0; i < 5; i++) o += `<circle class="ff" style="--dx:${(X.r() * 60 - 30) | 0}px;--dy:${(X.r() * 60 - 30) | 0}px;animation-delay:-${(X.r() * 6).toFixed(1)}s;animation-duration:${(5 + X.r() * 5).toFixed(1)}s" cx="${X.r() * 220 - 110 | 0}" cy="${X.r() * 160 - 100 | 0}" r="${(2.6 + X.r() * 2.4).toFixed(1)}" fill="${c}"/>`; return o; };
  M.steam = (X, c) => { c = c || '#ffffff'; let o = ''; for (let i = 0; i < 3; i++) o += `<path class="rs" style="animation-delay:-${i * 1.6}s" d="M${(i - 1) * 12},0 c-12,-20 12,-30 0,-50 c-10,-18 10,-30 0,-48" stroke="${c}" stroke-width="6" stroke-linecap="round" fill="none" opacity=".5"/>`; return o; };
  M.mist = (X, c) => { c = c || '#ffffff'; return `<g class="dr" fill="${c}"><ellipse cx="90" cy="0" rx="190" ry="26" opacity=".22"/><ellipse cx="320" cy="-24" rx="200" ry="30" opacity=".18"/></g>`; };
  M.fire = (X, c) => `<g class="fk2">${glow('#ff8a2a', 100, 0, -30)}</g><ellipse cy="2" rx="46" ry="8" fill="#000" opacity=".3"/><g class="fk"><path d="M0,-6 C-34,-10 -30,-50 -8,-72 C-10,-52 4,-48 6,-64 C26,-46 36,-14 0,-6Z" fill="#ff7a1a"/><path d="M0,-6 C-20,-8 -18,-34 -2,-46 C-2,-32 8,-30 8,-40 C20,-28 22,-10 0,-6Z" fill="#ffc83d"/><path d="M0,-6 C-8,-8 -8,-20 0,-26 C8,-20 8,-8 0,-6Z" fill="#fff3b0"/></g><rect x="-38" y="-8" width="76" height="9" rx="4" fill="#5a3418" transform="rotate(-6)"/><rect x="-36" y="-6" width="72" height="9" rx="4" fill="#3d210e" transform="rotate(8)"/>`;
  M.lamp = (X, c) => { c = c || X.c; return `<g class="fk2">${glow(X.c, 130, 0, -86)}</g><ellipse cy="-2" rx="26" ry="6" fill="#000" opacity=".3"/><rect x="-3" y="-76" width="6" height="74" fill="#3a2a22"/><ellipse cy="-4" rx="20" ry="5" fill="#3a2a22"/><path d="M-30,-82 L-18,-122 H18 L30,-82Z" fill="${c}"/><path d="M-30,-82 L-18,-122 H18 L30,-82Z" fill="#fff" opacity=".28"/>`; };
  M.lantern = (X, c) => { c = c || X.c; return `<line y1="-520" y2="-26" stroke="#000" stroke-opacity=".5" stroke-width="2"/><g class="fk2">${glow(X.c, 70, 0, 0)}</g><rect x="-14" y="-28" width="28" height="6" rx="2" fill="#2b2b2b"/><rect x="-12" y="-22" width="24" height="40" rx="3" fill="${c}" opacity=".95" class="fk2"/><rect x="-14" y="18" width="28" height="6" rx="2" fill="#2b2b2b"/><path d="M-12,-28 L0,-38 L12,-28Z" fill="#2b2b2b"/>`; };
  M.win = (X, c) => { c = c || X.d; return `<rect x="-84" y="-214" width="168" height="218" rx="6" fill="${c}"/><rect x="-72" y="-202" width="144" height="194" rx="3" fill="${X.gl}"/><path d="M0,-202 V-8 M-72,-110 H72" stroke="${c}" stroke-width="7"/><rect x="-94" y="-6" width="188" height="10" rx="3" fill="${shade(c, .15)}"/>`; };
  M.shelf = (X, c) => {
    c = c || shade(X.d, .1); let o = `<rect x="-110" y="-300" width="220" height="300" rx="4" fill="${c}"/><rect x="-102" y="-292" width="204" height="284" fill="${shade(c, -.4)}"/>`;
    const cols = ['#9b3b2e', '#c98b3a', '#2f5d62', '#6a3d6b', '#d7c9a3', '#3d6b3a', '#a9543a', '#2d3e6b'];
    for (let r = 0; r < 3; r++) { const y = -292 + (r + 1) * 95; let x = -98; while (x < 92) { const w = 16 + X.r() * 12, h = 52 + X.r() * 34; o += `<rect x="${x.toFixed(1)}" y="${(y - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="1.5" fill="${cols[X.r() * cols.length | 0]}"/>`; x += w + 1; } o += `<rect x="-102" y="${y}" width="204" height="5" fill="${c}"/>`; }
    return o;
  };
  M.books = (X) => `<rect x="-52" y="-16" width="104" height="16" rx="2" fill="#7a3b2e"/><rect x="-48" y="-32" width="92" height="16" rx="2" fill="#2f5d62"/><rect x="-44" y="-48" width="86" height="16" rx="2" fill="#c98b3a"/><rect x="-40" y="-62" width="76" height="14" rx="2" fill="#6a3d6b"/><path d="M-50,-12 H50 M-46,-28 H42 M-42,-44 H40" stroke="#f3e9cf" stroke-width="2" opacity=".7"/>`;
  M.fireplace = (X) => { let b = ''; for (let r = 0; r < 5; r++) { const ev = r % 2 === 0; const xs = ev ? [-86, -42, 2, 46] : [-86, -64, -20, 24, 68]; const ws = ev ? [40, 40, 40, 40] : [18, 40, 40, 40, 18]; xs.forEach((x, k) => { b += `<rect x="${x}" y="${-190 + r * 38}" width="${ws[k]}" height="34" rx="5" fill="${(r + k) % 2 ? '#7a4030' : '#8a4a38'}"/>`; }); } return `<rect x="-90" y="-196" width="180" height="196" fill="#4a2a20"/>${b}<rect x="-104" y="-210" width="208" height="18" rx="4" fill="#2e1a12"/><path d="M-52,0 V-96 A52 52 0 0 1 52,-96 V0Z" fill="#120804"/><g transform="translate(0 -2) scale(.8)">${M.fire(X)}</g>`; };

  M.chalet = (X, c) => { c = c || '#8a5a33'; return `<ellipse cy="2" rx="86" ry="7" fill="#000" opacity=".28"/><rect x="-62" y="-76" width="124" height="76" fill="${c}"/><path d="M-60,-62 H60 M-60,-46 H60 M-60,-30 H60 M-60,-14 H60" stroke="#000" stroke-opacity=".2" stroke-width="2"/><path d="M-80,-72 L0,-136 L80,-72Z" fill="${shade(X.d, -.2)}"/><path d="M-80,-72 L0,-136 L80,-72 L70,-72 L0,-124 L-70,-72Z" fill="#fff" opacity=".92"/><rect x="26" y="-132" width="14" height="30" fill="#5a3a30"/><rect x="24" y="-136" width="18" height="6" fill="#fff"/><g class="steam-s"><path class="rs" d="M33,-138 c-8,-14 8,-20 0,-34" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".5"/></g><rect x="-46" y="-56" width="26" height="26" rx="2" fill="${X.c}"/><g class="fk2">${glow(X.c, 30, -33, -43)}</g><rect x="-46" y="-56" width="26" height="26" rx="2" fill="none" stroke="#3a2418" stroke-width="3"/><path d="M-33,-56 V-30 M-46,-43 H-20" stroke="#3a2418" stroke-width="2"/><rect x="14" y="-50" width="30" height="50" rx="2" fill="#4a2a18"/><circle cx="38" cy="-26" r="2" fill="#e8c15a"/>`; };
  M.board = (X) => `<rect x="-140" y="-168" width="280" height="168" rx="6" fill="#8a5a33"/><rect x="-128" y="-156" width="256" height="140" rx="3" fill="#264235"/><path d="M-128,-156 L-60,-16 M-90,-156 L-30,-90" stroke="#fff" stroke-opacity=".05" stroke-width="22"/><text x="-110" y="-100" font-size="40" fill="#f5f5e8" font-family="'Comic Sans MS','Segoe Print',cursive,sans-serif" opacity=".9">A B C</text><text x="-110" y="-52" font-size="30" fill="#f5f5e8" font-family="'Comic Sans MS','Segoe Print',cursive,sans-serif" opacity=".85">1 + 1 = 2</text><g stroke="#f5f5e8" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"><circle cx="82" cy="-100" r="18"/><path d="M82,-82 V-50 M64,-70 H100 M82,-50 L70,-30 M82,-50 L94,-30"/></g><rect x="-132" y="-18" width="264" height="10" rx="3" fill="#6b4425"/><rect x="-60" y="-24" width="30" height="6" rx="2" fill="#f5f5e8"/><rect x="40" y="-22" width="22" height="5" rx="2" fill="#e8b0b0"/>`;
  M.screen = (X, c) => { c = c || '#8a1c2b'; return `<rect x="-132" y="-176" width="264" height="168" fill="#f4efe0"/><rect x="-132" y="-176" width="264" height="168" fill="${X.c}" opacity=".22" class="fk2"/><circle cx="0" cy="-92" r="26" fill="${X.c}" opacity=".85"/><path d="M-10,-106 L16,-92 L-10,-78Z" fill="#fff"/><path d="M-150,-190 H-120 C-100,-140 -126,-70 -118,0 H-150Z M150,-190 H120 C100,-140 126,-70 118,0 H150Z" fill="${c}"/><path d="M-140,-190 C-134,-120 -138,-60 -140,0 M-128,-190 C-120,-110 -126,-50 -124,0 M140,-190 C134,-120 138,-60 140,0 M128,-190 C120,-110 126,-50 124,0" stroke="#000" stroke-opacity=".25" stroke-width="3" fill="none"/><rect x="-160" y="-198" width="320" height="16" rx="4" fill="${shade(c, -.45)}"/>`; };
  M.bolt = (X, c) => { c = c || '#fff2a8'; return `<g class="bl"><path d="M-6,-120 L-34,-30 L-8,-30 L-30,60 L26,-48 L0,-48 L22,-120Z" fill="${c}" style="filter:drop-shadow(0 0 10px ${c}) drop-shadow(0 0 26px ${c})"/></g>`; };
  M.cross = (X) => `<g class="fl"><circle r="82" fill="${X.c}" opacity=".12"/><rect x="-42" y="-42" width="84" height="84" rx="18" fill="#fff"/><path d="M-11,-30 h22 v19 h19 v22 h-19 v19 h-22 v-19 h-19 v-22 h19Z" fill="${X.c}"/></g>`;
  M.bed = (X, c) => { c = c || X.c; return `<rect x="-108" y="-100" width="216" height="100" rx="12" fill="${shade(X.d, .12)}"/><rect x="-100" y="-56" width="200" height="42" rx="9" fill="#f4f1ea"/><rect x="-100" y="-36" width="200" height="34" rx="7" fill="${c}"/><rect x="-86" y="-70" width="64" height="26" rx="13" fill="#fff"/><rect x="22" y="-70" width="64" height="26" rx="13" fill="#fff"/><rect x="-104" y="-6" width="10" height="16" fill="${shade(X.d, -.2)}"/><rect x="94" y="-6" width="10" height="16" fill="${shade(X.d, -.2)}"/>`; };
  M.train = (X, c) => {
    c = c || shade(X.d, .35);
    let wheels = ''; [[-80, 17], [-34, 17], [14, 17], [76, 21]].forEach(([x, r]) => { wheels += `<g transform="translate(${x} -${r})"><circle r="${r}" fill="#1a1a1a"/><circle r="${r - 4}" fill="none" stroke="#8a8a8a" stroke-width="2"/><g class="ro"><path d="M-${r - 4},0 H${r - 4} M0,-${r - 4} V${r - 4}" stroke="#8a8a8a" stroke-width="2"/></g></g>`; });
    return `<g transform="translate(-30 0)"><rect x="-130" y="-30" width="240" height="10" rx="3" fill="#161616"/><rect x="-124" y="-76" width="154" height="48" rx="16" fill="${c}"/><path d="M-112,-76 v-26 h-6 l-4,-8 h28 l-4,8 h-6 v26z" fill="${shade(c, -.3)}"/><rect x="30" y="-104" width="74" height="76" rx="4" fill="${shade(c, -.1)}"/><rect x="24" y="-110" width="86" height="9" rx="3" fill="${shade(c, -.45)}"/><rect x="42" y="-92" width="32" height="26" rx="3" fill="${X.c}"/><circle cx="-124" cy="-52" r="8" fill="${X.c}"/><g class="fk2">${glow(X.c, 40, -124, -52)}</g><rect x="108" y="-64" width="74" height="40" rx="3" fill="#2a2a2a"/><path d="M112,-64 C122,-84 166,-84 178,-64Z" fill="#111"/>${wheels}</g>`;
  };
  M.bulbs = (X, c) => { c = c || X.c; let o = `<path d="M-4,0 Q200,56 404,0" stroke="#000" stroke-opacity=".55" stroke-width="2" fill="none"/>`; const N = 7; for (let i = 0; i < N; i++) { const t = (i + .5) / N, x = -4 + 408 * t, y = 2 * t * (1 - t) * 56; const col = i % 3 === 1 ? '#ffffff' : c; o += `<circle class="tw" style="animation-delay:${(i * .23).toFixed(2)}s" cx="${x.toFixed(1)}" cy="${(y + 6).toFixed(1)}" r="5" fill="${col}"/>`; } return o; };
  M.lanterns = (X, c) => { c = c || '#d62828'; let o = `<path d="M-4,0 Q200,28 404,0" stroke="#000" stroke-opacity=".5" stroke-width="2" fill="none"/>`; for (let i = 0; i < 7; i++) { const t = (i + .5) / 7, x = -4 + 408 * t, y = 2 * t * (1 - t) * 28, sz = .8 + (i % 3) * .18; o += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${sz})"><g class="sw" style="animation-delay:${(i * .4).toFixed(1)}s"><line y2="14" stroke="#000" stroke-opacity=".5"/><circle cy="40" r="30" fill="${c}" opacity=".18"/><ellipse cy="40" rx="15" ry="19" fill="${c}"/><rect x="-7" y="14" width="14" height="5" fill="#e0b030"/><rect x="-7" y="59" width="14" height="5" fill="#e0b030"/><path d="M0,64 v14" stroke="#e0b030" stroke-width="2"/></g></g>`; } return o; };
  M.awning = (X, c) => { c = c || X.c; let o = '', n = 10; for (let i = 0; i < n; i++) { const col = i % 2 ? '#f6f1e6' : c; o += `<rect x="${i * 40}" y="-4" width="40" height="42" fill="${col}"/><path d="M${i * 40} 38 a20 20 0 0 0 40 0Z" fill="${col}"/>`; } return `<rect y="-4" width="400" height="6" fill="#000" opacity=".2"/>${o}<rect y="56" width="400" height="14" fill="#000" opacity=".12"/>`; };
  M.bread = (X) => { let o = ''; [[-28, -16], [-8, -5], [12, 6], [32, 17]].forEach(([x, a], i) => { o += `<g transform="translate(${x} -24) rotate(${a})"><rect x="-9" y="-92" width="18" height="100" rx="9" fill="${i % 2 ? '#d9a05b' : '#c98f48'}"/><path d="M-5,-78 l10,6 M-5,-58 l10,6 M-5,-38 l10,6" stroke="#8a5a26" stroke-width="2.2" stroke-linecap="round"/></g>`; }); return `${o}<path d="M-62,-34 H62 L52,0 H-52Z" fill="#8a5a33"/><path d="M-58,-22 H58 M-54,-10 H54 M-40,-34 L-34,0 M-14,-34 V0 M14,-34 V0 M40,-34 L34,0" stroke="#5a3820" stroke-width="2" opacity=".6"/>`; };
  M.barrel = (X) => `<ellipse cy="2" rx="52" ry="8" fill="#000" opacity=".3"/><path d="M-46,-118 C-64,-80 -64,-38 -46,0 H46 C64,-38 64,-80 46,-118Z" fill="#6b3d1f"/><path d="M-22,-118 C-30,-80 -30,-38 -22,0 M0,-118 V0 M22,-118 C30,-80 30,-38 22,0" stroke="#3d210e" stroke-width="2" fill="none"/><path d="M-58,-92 C-20,-84 20,-84 58,-92 V-82 C20,-74 -20,-74 -58,-82Z M-58,-38 C-20,-30 20,-30 58,-38 V-28 C20,-20 -20,-20 -58,-28Z" fill="#4a4a52"/><ellipse cy="-118" rx="46" ry="9" fill="#8a5a33"/>`;
  M.arch = (X, c) => { c = c || X.c; return `<path d="M-104,0 V-176 A104 104 0 0 1 104,-176 V0Z" fill="${shade(c, -.1)}"/><path d="M-74,0 V-166 A74 74 0 0 1 74,-166 V0Z" fill="${X.gl}"/><path d="M-90,0 V-170 A90 90 0 0 1 90,-170 V0" fill="none" stroke="${shade(c, .35)}" stroke-width="3" stroke-dasharray="2 8" stroke-linecap="round"/><rect x="-110" y="-8" width="220" height="10" rx="3" fill="${shade(c, -.3)}"/>`; };
  M.church = (X) => { const panes = ['#3a4fa8', '#c0392b', '#e0b030', '#2e8b57', '#7a3fa0']; let g = ''; for (let i = 0; i < 5; i++) g += `<rect x="${-56 + i * 22.4}" y="-300" width="23" height="300" fill="${panes[i]}" opacity=".85"/>`; return `<clipPath id="${X.u}ch"><path d="M-56,0 V-170 Q-56,-250 0,-282 Q56,-250 56,-170 V0Z"/></clipPath><path d="M-72,0 V-172 Q-72,-262 0,-300 Q72,-262 72,-172 V0Z" fill="#2b2744"/><g clip-path="url(#${X.u}ch)">${g}<g stroke="#15122a" stroke-width="3" fill="none"><path d="M0,-300 V0 M-56,-120 H56 M-56,-210 H56 M-28,-300 V0 M28,-300 V0"/><circle cy="-232" r="20"/></g><rect y="-300" width="120" height="300" x="-60" fill="${X.c}" opacity=".16" class="fk2"/></g><rect x="-84" y="-6" width="168" height="10" rx="3" fill="#15122a"/>`; };
  M.pole = (X) => { let s = ''; for (let i = -2; i < 8; i++) s += `<path d="M-14,${i * 26} L14,${i * 26 - 20} V${i * 26 - 6} L-14,${i * 26 + 14}Z" fill="${i % 2 ? '#d62828' : '#2b5ccf'}"/>`; return `<clipPath id="${X.u}po"><rect x="-14" y="-110" width="28" height="104" rx="6"/></clipPath><rect x="-14" y="-110" width="28" height="104" rx="6" fill="#f6f6f6"/><g clip-path="url(#${X.u}po)"><g class="ps" transform="translate(0 -104)">${s}</g></g><rect x="-18" y="-120" width="36" height="12" rx="5" fill="#d9b24c"/><rect x="-18" y="-8" width="36" height="12" rx="5" fill="#d9b24c"/><rect x="-14" y="-110" width="9" height="104" fill="#fff" opacity=".35"/>`; };
  M.neon = (X, c, t) => { c = c || '#ff6b9d'; return `<text class="nn" text-anchor="middle" font-size="46" font-weight="800" letter-spacing="5" font-family="'Arial Black',Impact,system-ui,sans-serif" fill="${shade(c, .6)}" stroke="${c}" stroke-width="2.2" style="filter:drop-shadow(0 0 5px ${c}) drop-shadow(0 0 16px ${c})">${t || 'OPEN'}</text>`; };
  M.pump = (X, c) => { c = c || X.c; return `<ellipse cy="2" rx="44" ry="6" fill="#000" opacity=".35"/><rect x="-32" y="-118" width="64" height="116" rx="8" fill="${c}"/><rect x="-24" y="-108" width="48" height="30" rx="4" fill="#0b1a14"/><text x="0" y="-86" text-anchor="middle" font-size="16" font-family="monospace" fill="#46ff9a" class="nn">0.00</text><rect x="-24" y="-70" width="48" height="8" rx="3" fill="#fff" opacity=".85"/><rect x="-36" y="-124" width="72" height="10" rx="4" fill="${shade(c, -.3)}"/><path d="M32,-50 C54,-50 54,-6 44,-6" stroke="#222" stroke-width="5" fill="none" stroke-linecap="round"/><rect x="-26" y="-8" width="52" height="8" fill="${shade(c, -.4)}"/>`; };
  M.wheel = (X, c) => {
    c = c || X.c; const cab = [c, '#ff6b9d', '#35e0ff', '#7bed9f']; let sp = '', cb = '', ld = '';
    for (let i = 0; i < 8; i++) { const a = i * 45, r = a * Math.PI / 180; sp += `<line x2="${(Math.cos(r) * 100).toFixed(1)}" y2="${(Math.sin(r) * 100).toFixed(1)}"/>`; cb += `<g transform="translate(${(Math.cos(r) * 100).toFixed(1)} ${(Math.sin(r) * 100).toFixed(1)}) rotate(${-a})"><rect x="-9" y="-6" width="18" height="16" rx="4" fill="${cab[i % 4]}"/></g>`; }
    for (let i = 0; i < 16; i++) { const r = i * Math.PI / 8; ld += `<circle class="tw" style="animation-delay:${(i * .15).toFixed(2)}s" cx="${(Math.cos(r) * 100).toFixed(1)}" cy="${(Math.sin(r) * 100).toFixed(1)}" r="2.6" fill="#fff"/>`; }
    return `<path d="M-60,0 L0,-120 L60,0" fill="none" stroke="${shade(X.d, .4)}" stroke-width="6" stroke-linejoin="round"/><g transform="translate(0 -120)"><circle r="120" fill="${c}" opacity=".08"/><g class="ro"><g stroke="${shade(c, .2)}" stroke-width="2.2">${sp}</g><circle r="100" fill="none" stroke="${c}" stroke-width="4"/>${cb}${ld}</g><circle r="8" fill="${shade(X.d, .5)}"/></g>`;
  };
  M.carousel = (X, c) => {
    c = c || X.c; let roof = '', poles = '';
    for (let i = 0; i < 8; i++) roof += `<path d="M${-110 + i * 27.5},-124 L0,-186 L${-110 + (i + 1) * 27.5},-124Z" fill="${i % 2 ? '#fff' : c}"/>`;
    [-80, -28, 28, 80].forEach((x, i) => { poles += `<line x1="${x}" y1="-124" x2="${x}" y2="-14" stroke="#e8c15a" stroke-width="3"/><g class="bob" style="animation-delay:${(i % 2) * -1.1}s"><ellipse cx="${x}" cy="-70" rx="15" ry="9" fill="${['#fff', '#ffb3d1', '#b8f0ff', '#ffe28a'][i]}"/><circle cx="${x + 12}" cy="-80" r="6" fill="${['#fff', '#ffb3d1', '#b8f0ff', '#ffe28a'][i]}"/></g>`; });
    return `<ellipse cy="-6" rx="118" ry="14" fill="${shade(X.d, .3)}"/><rect x="-116" y="-14" width="232" height="14" rx="5" fill="${shade(X.d, .5)}"/>${poles}${roof}<rect x="-114" y="-128" width="228" height="8" rx="3" fill="#e8c15a"/><circle cy="-190" r="6" fill="#ffe28a" class="tw"/>`;
  };
  M.tent = (X, c) => {
    c = c || X.c; let top = '', walls = '';
    for (let i = 0; i < 10; i++) { const x0 = -110 + i * 22; top += `<path d="M${x0},-70 L0,-176 L${x0 + 22},-70Z" fill="${i % 2 ? '#fff' : c}"/>`; walls += `<rect x="${x0}" y="-72" width="22" height="72" fill="${i % 2 ? '#f1e6d0' : shade(c, -.15)}"/>`; }
    let sc = ''; for (let i = 0; i < 10; i++) sc += `<path d="M${-110 + i * 22},-72 a11 11 0 0 0 22 0Z" fill="${i % 2 ? '#fff' : c}"/>`;
    return `${walls}${top}${sc}<path d="M-26,0 V-34 A26 34 0 0 1 26,-34 V0Z" fill="#1a0a14"/><line y1="-176" y2="-206" stroke="#e8c15a" stroke-width="3"/><path class="sw" d="M0,-206 l28,8 l-28,8Z" fill="#ffcf5c"/>`;
  };
  M.xtree = (X) => { const cl = ['#ff5a5a', '#ffd166', '#6bd6ff', '#fff']; let o = '<rect x="-8" y="-20" width="16" height="22" fill="#5a3a22"/><path d="M0,-196 L40,-120 H18 L52,-62 H24 L62,-18 H-62 L-24,-62 H-52 L-18,-120 H-40Z" fill="#1f7a4a"/><path d="M0,-196 L40,-120 H18 L52,-62 H24 L62,-18 H-62 L-24,-62 H-52 L-18,-120 H-40Z" fill="#fff" opacity=".07"/><path d="M-30,-110 Q0,-90 30,-110 M-44,-62 Q0,-38 44,-62" fill="none" stroke="#ffd166" stroke-width="2.4" stroke-dasharray="1 6" stroke-linecap="round"/>'; for (let i = 0; i < 8; i++) { const y = -40 - X.r() * 130, w = (200 + y) * .26; o += `<circle class="tw" style="animation-delay:${(X.r() * 2).toFixed(1)}s" cx="${(X.r() * 2 - 1) * w | 0}" cy="${y | 0}" r="4" fill="${cl[i % 4]}"/>`; } o += '<path class="tw" d="M0,-216 l6,14 l15,1 l-12,10 l4,15 l-13,-8 l-13,8 l4,-15 l-12,-10 l15,-1Z" fill="#ffe36b"/>'; o += '<rect x="-50" y="-14" width="26" height="16" fill="#ff5a5a"/><rect x="-39" y="-14" width="4" height="16" fill="#ffd166"/><rect x="26" y="-12" width="22" height="14" fill="#6bd6ff"/><rect x="35" y="-12" width="4" height="14" fill="#fff"/>'; return o; };
  M.barn = (X, c) => { c = c || '#b5392b'; return `<rect x="-86" y="-96" width="132" height="96" fill="${c}"/><path d="M-96,-96 L-20,-150 L56,-96Z" fill="${shade(c, -.35)}"/><rect x="-50" y="-60" width="60" height="60" fill="${shade(c, -.2)}" stroke="#f6efe0" stroke-width="4"/><path d="M-50,-60 L10,0 M10,-60 L-50,0" stroke="#f6efe0" stroke-width="4"/><circle cx="-20" cy="-100" r="9" fill="#f6efe0"/><rect x="56" y="-130" width="34" height="130" fill="#d9d2c2"/><path d="M52,-130 A21 21 0 0 1 94,-130Z" fill="#8a8a92"/><path d="M56,-100 H90 M56,-70 H90 M56,-40 H90" stroke="#000" stroke-opacity=".15" stroke-width="2"/>`; };
  M.fence = (X, c) => { c = c || '#d6b07a'; let o = `<rect y="-34" width="400" height="7" fill="${c}"/><rect y="-16" width="400" height="7" fill="${c}"/>`; for (let i = 0; i < 11; i++) o += `<rect x="${i * 40 + 6}" y="-48" width="9" height="52" rx="2" fill="${shade(c, -.12)}"/>`; return o; };
  M.parasol = (X, c) => { c = c || X.c; let o = ''; for (let i = 0; i < 6; i++) o += `<path d="M${-70 + i * 23.3},-120 Q${-70 + i * 23.3 + 12},-168 0,-170 Q${-70 + (i + 1) * 23.3 - 12},-168 ${-70 + (i + 1) * 23.3},-120Z" fill="${i % 2 ? '#fff' : c}"/>`; return `<g class="sw"><line y1="-170" y2="0" stroke="#7a5a3a" stroke-width="5"/>${o}<path d="M-70,-120 q11.6,12 23.3,0 q11.6,12 23.3,0 q11.6,12 23.3,0 q11.6,12 23.3,0 q11.6,12 23.3,0 q11.6,12 23.3,0" fill="${c}" opacity=".9"/></g>`; };
  M.pool = (X, c) => { c = c || '#2fb4e8'; let o = `<rect width="400" height="20" fill="#efe5d2"/><rect y="20" width="400" height="320" fill="${c}"/><rect y="20" width="400" height="90" fill="${shade(c, .25)}" opacity=".35"/>`; for (let i = 0; i < 4; i++) o += `<line x1="0" x2="400" y1="${60 + i * 54}" y2="${60 + i * 54}" stroke="#fff" stroke-opacity=".5" stroke-width="3" stroke-dasharray="14 10"/>`; o += `<g class="wv2" opacity=".5" fill="none" stroke="#fff" stroke-width="2"><path transform="translate(-200 40)" d="M0,0 q25,-8 50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0"/><path transform="translate(-200 120)" d="M0,0 q25,-8 50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0 t50,0"/></g>`; return o; };
  M.flowers = (X, c) => {
    const cols = [c || X.c, '#ffffff', '#ff6b9d', '#ffd23f', '#a07be8', '#ff7a45']; let o = `<rect y="0" width="400" height="120" fill="#3f7a35" opacity=".5"/>`;
    for (let i = 0; i < 10; i++) { const x = 20 + i * 39 + X.r() * 10, h = 46 + X.r() * 78, col = cols[X.r() * cols.length | 0]; o += `<g class="sw" style="animation-delay:${(X.r() * 3).toFixed(1)}s"><path d="M${x.toFixed(1)} 6 Q${(x + 4).toFixed(1)} ${-h / 2} ${x.toFixed(1)} ${-h}" stroke="#3a8a3a" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="${x.toFixed(1)}" cy="${-h}" r="11" fill="${col}"/><circle cx="${x.toFixed(1)}" cy="${-h}" r="4.5" fill="#ffe27a"/></g>`; }
    return o;
  };
  M.vines = (X, c) => { c = c || '#4f9a3a'; let o = `<rect width="400" height="320" fill="${shade(c, -.5)}"/>`;[[22, 22, .6], [86, 32, .9], [166, 46, 1.2]].forEach(([y, w, k], r) => { const step = w * 1.5; for (let x = -10; x < 420; x += step) { o += `<ellipse cx="${(x + (r % 2) * step / 2).toFixed(1)}" cy="${y}" rx="${w}" ry="${(w * .55 + 5 * k).toFixed(1)}" fill="${shade(c, -.1 + (X.r() - .5) * .25)}"/><ellipse cx="${(x + (r % 2) * step / 2).toFixed(1)}" cy="${y - w * .25}" rx="${w * .55}" ry="${w * .3}" fill="${shade(c, .22)}" opacity=".7"/>`; } }); return o; };
  M.leaves = (X, c) => { const cols = [c || X.c, '#e0602a', '#d1352b', '#f2a33a']; let o = ''; for (let i = 0; i < 6; i++) o += `<g class="fa2" style="--sy:${X.r() * 500 | 0}px;animation-duration:${(7 + X.r() * 6).toFixed(1)}s;animation-delay:-${(X.r() * 12).toFixed(1)}s"><path transform="translate(${X.r() * 400 | 0} -20) rotate(${X.r() * 360 | 0})" d="M0,-8 C8,-6 8,6 0,10 C-8,6 -8,-6 0,-8Z" fill="${cols[i % 4]}"/></g>`; return o; };
  M.washers = (X, c) => { c = c || X.c; let o = ''; [-112, 0, 112].forEach((x, i) => { o += `<g transform="translate(${x} 0)"><rect x="-50" y="-150" width="100" height="150" rx="9" fill="#f4f6f8"/><rect x="-50" y="-150" width="100" height="26" rx="9" fill="#dfe6ec"/><circle cx="-30" cy="-137" r="4" fill="${c}"/><rect x="-6" y="-141" width="38" height="8" rx="3" fill="#8fa0ad"/><circle cy="-70" r="36" fill="#9aa8b3"/><circle cy="-70" r="30" fill="#bfe6ff"/><g class="ro" style="animation-duration:${4 + i}s"><circle cx="-10" cy="-78" r="9" fill="${['#ff8fb1', '#ffd166', '#7bd3ff'][i]}"/><circle cx="11" cy="-62" r="10" fill="${['#fff', '#ff8fb1', '#fff'][i]}"/></g><circle cy="-70" r="30" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3"/><rect x="-50" y="-4" width="100" height="6" fill="#c2cbd2"/></g>`; }); return o; };
  M.goal = (X) => { let n = ''; for (let i = 1; i < 12; i++) n += `<line x1="${-110 + i * 18.3}" y1="-100" x2="${-110 + i * 18.3}" y2="0"/>`; for (let i = 1; i < 6; i++) n += `<line x1="-110" y1="${-100 + i * 17}" x2="110" y2="${-100 + i * 17}"/>`; return `<g stroke="#fff" stroke-opacity=".35" stroke-width="1">${n}</g><path d="M-110,0 V-100 H110 V0" stroke="#fff" stroke-width="6" fill="none" stroke-linejoin="round"/>`; };
  M.tipi = (X, c) => { c = c || '#e8d3a8'; return `<path d="M0,-116 L-62,0 H62Z" fill="${c}"/><path d="M0,-116 L-14,0 H62Z" fill="${shade(c, -.12)}"/><path d="M-14,0 L0,-52 L14,0Z" fill="#241408"/><path d="M-6,-120 L-28,-148 M6,-120 L28,-148" stroke="#6b4a2a" stroke-width="4" stroke-linecap="round"/><path d="M-50,-24 H50" stroke="${X.c}" stroke-width="5" stroke-dasharray="6 4" opacity=".7"/>`; };
  M.jar = (X, c) => { c = c || X.c; const cc = ['#ff5c8a', '#ffd23f', '#42d392', '#4cc9f0', '#f08aff', '#ff9a3c', '#fff']; let o = `<rect x="-36" y="-110" width="72" height="108" rx="16" fill="#fff" opacity=".18"/>`; for (let i = 0; i < 11; i++) o += `<circle cx="${X.r() * 52 - 26 | 0}" cy="${-16 - X.r() * 78 | 0}" r="${(8 + X.r() * 4).toFixed(1)}" fill="${cc[X.r() * cc.length | 0]}"/>`; return `${o}<rect x="-36" y="-110" width="72" height="108" rx="16" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="3"/><rect x="-42" y="-128" width="84" height="20" rx="8" fill="${c}"/><rect x="-26" y="-100" width="7" height="84" rx="3" fill="#fff" opacity=".35"/>`; };
  M.sacks = (X) => { let o = '<rect x="-150" y="-8" width="300" height="14" rx="4" fill="#6b3d1f"/>'; [['#e08a1e', -112], ['#b5301f', -56], ['#e8c13a', 0], ['#7a4a24', 56], ['#6b8e3a', 112]].forEach(([c, x]) => { o += `<g transform="translate(${x} -8)"><ellipse rx="34" ry="8" fill="#3d210e" opacity=".6"/><path d="M-34,0 Q-18,-66 0,-70 Q18,-66 34,0Z" fill="${c}"/><path d="M-20,-6 Q-8,-40 0,-60" stroke="#fff" stroke-opacity=".3" stroke-width="3" fill="none"/></g>`; }); return o; };
  M.dome = (X, c) => {
    c = c || shade(X.d, .1);
    const minaret = x => `<rect x="${x - 7}" y="-210" width="14" height="210" fill="${c}"/><rect x="${x - 11}" y="-170" width="22" height="7" fill="${c}"/><path d="M${x - 9},-210 Q${x},-240 ${x + 9},-210Z" fill="${c}"/><line x1="${x}" y1="-238" x2="${x}" y2="-250" stroke="${c}" stroke-width="2"/>`;
    return `<rect x="-170" y="-50" width="340" height="50" fill="${c}"/><path d="M-64,-50 A64 64 0 0 1 64,-50Z" fill="${c}"/><path d="M-100,-50 A32 32 0 0 1 -36,-50Z M36,-50 A32 32 0 0 1 100,-50Z" fill="${c}"/><line y1="-114" y2="-136" stroke="${c}" stroke-width="3"/>${minaret(-150)}${minaret(150)}<g fill="${X.c}" opacity=".85"><rect x="-120" y="-34" width="10" height="18" rx="5"/><rect x="-60" y="-34" width="10" height="18" rx="5"/><rect x="50" y="-34" width="10" height="18" rx="5"/><rect x="110" y="-34" width="10" height="18" rx="5"/><rect x="-5" y="-40" width="10" height="24" rx="5"/></g>`;
  };
  M.ship = (X, c) => { c = c || '#fff'; return `<g class="rk"><path d="M-34,0 H34 L24,12 H-24Z" fill="${shade(X.d, .2)}"/><line y1="0" y2="-92" stroke="#5a3a22" stroke-width="3"/><path d="M2,-88 L2,-10 L30,-10Z" fill="${c}"/><path d="M-2,-80 L-2,-10 L-26,-10Z" fill="${shade(c, -.1)}"/><path d="M0,-92 l12,4 l-12,4Z" fill="${X.c}"/></g>`; };
  M.lighthouse = (X) => `<g class="ro" style="animation-duration:8s"><path d="M0,-196 L-300,-230 V-162Z" fill="#fff6c8" opacity=".22"/><path d="M0,-196 L300,-230 V-162Z" fill="#fff6c8" opacity=".22"/></g><path d="M-26,0 L-17,-168 H17 L26,0Z" fill="#f4f1ea"/><path d="M-23,-30 L-21,-62 H21 L23,-30Z M-20,-92 L-18,-124 H18 L20,-92Z" fill="#d62828"/><rect x="-24" y="-178" width="48" height="10" rx="3" fill="#2b2b2b"/><rect x="-14" y="-206" width="28" height="28" fill="#ffe27a" class="fk2"/><g class="fk2">${glow(X.c, 34, 0, -192)}</g><path d="M-18,-206 L0,-228 L18,-206Z" fill="#2b2b2b"/>`;
  M.volcano = (X, c) => { c = c || '#3b1a16'; return `<g class="fk2">${glow('#ff8a2a', 150, 0, -230)}</g><path d="M-190,0 L-48,-228 Q0,-244 48,-228 L190,0Z" fill="${c}"/><path d="M-48,-228 Q0,-212 48,-228 Q0,-244 -48,-228Z" fill="#ff7a1a"/><g class="fk2" stroke="#ff7a1a" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M-10,-220 L-20,-160 L-8,-120 L-34,-60 L-26,-10"/><path d="M14,-218 L30,-170 L20,-130 L48,-80 L40,-10"/><path d="M0,-214 L2,-150 L-4,-90"/></g><path d="M-190,0 L-48,-228" stroke="#fff" stroke-opacity=".08" stroke-width="6"/>`; };
  M.bowl = (X, c) => { c = c || '#f4efe6'; return `<ellipse cy="-4" rx="62" ry="8" fill="#000" opacity=".3"/><path d="M-62,-52 H62 C62,-18 36,-2 0,-2 C-36,-2 -62,-18 -62,-52Z" fill="${c}"/><path d="M-50,-30 H50" stroke="${X.c}" stroke-width="4" opacity=".6"/><ellipse cy="-52" rx="62" ry="12" fill="#c9792e"/><path d="M-40,-52 q8,-10 16,0 t16,0 t16,0 t16,0 t16,0" stroke="#f3dfa0" stroke-width="3" fill="none"/><path d="M-30,-48 q10,-8 20,0 t20,0 t20,0" stroke="#f3dfa0" stroke-width="3" fill="none"/><ellipse cx="-18" cy="-56" rx="11" ry="8" fill="#fff"/><circle cx="-18" cy="-56" r="4" fill="#ffb02e"/><g fill="#5fbf5a"><circle cx="20" cy="-58" r="2.6"/><circle cx="30" cy="-54" r="2.6"/><circle cx="12" cy="-52" r="2.6"/><circle cx="26" cy="-62" r="2.6"/></g><path d="M20,-120 L-8,-50 M30,-118 L2,-48" stroke="#8a5a33" stroke-width="3" stroke-linecap="round"/>`; };
  M.pagoda = (X, c) => { c = c || X.c; let o = ''; for (let i = 0; i < 4; i++) { const y = -i * 52, w = 62 - i * 11; o += `<rect x="${-w + 10}" y="${y - 40}" width="${2 * w - 20}" height="40" fill="${shade(X.d, .15)}"/><rect x="${-w + 26}" y="${y - 30}" width="8" height="18" fill="${X.c}" opacity=".8"/><rect x="${w - 34}" y="${y - 30}" width="8" height="18" fill="${X.c}" opacity=".8"/><path d="M${-w - 14},${y - 38} Q${-w + 8},${y - 40} 0,${y - 58} Q${w - 8},${y - 40} ${w + 14},${y - 38} Q${w - 8},${y - 34} 0,${y - 44} Q${-w + 8},${y - 34} ${-w - 14},${y - 38}Z" fill="${c}"/>`; } return `${o}<line y1="-210" y2="-238" stroke="${c}" stroke-width="3"/>`; };
  M.torii = (X, c) => { c = c || '#d62828'; return `<rect x="-62" y="-150" width="12" height="150" fill="${c}"/><rect x="50" y="-150" width="12" height="150" fill="${c}"/><rect x="-62" y="-116" width="124" height="9" fill="${c}"/><path d="M-96,-150 Q0,-134 96,-150 L88,-168 Q0,-152 -88,-168Z" fill="${shade(c, -.1)}"/><path d="M-96,-168 Q-88,-160 -82,-166 L82,-166 Q88,-160 96,-168 L90,-172 H-90Z" fill="#1b1b1b"/>`; };
  M.gondola = (X) => { let o = `<line x1="-10" y1="10" x2="410" y2="-110" stroke="#2b2b2b" stroke-width="2.5"/>`; [0, -4.5].forEach(d => { o += `<g class="gd" style="animation-delay:${d}s"><line y2="14" stroke="#2b2b2b" stroke-width="2"/><rect x="-14" y="14" width="28" height="22" rx="5" fill="${X.c}"/><rect x="-10" y="19" width="20" height="10" rx="2" fill="#dff4ff"/></g>`; }); return o + `<path d="M60,-26 V70 M300,-92 V10" stroke="#2b2b2b" stroke-width="4"/>`; };
  M.cup = (X, c) => { c = c || '#fbf6ee'; return `<ellipse cy="-3" rx="56" ry="9" fill="#000" opacity=".3"/><ellipse cy="-8" rx="50" ry="9" fill="${shade(c, -.1)}"/><path d="M-32,-56 H32 C32,-22 20,-8 0,-8 C-20,-8 -32,-22 -32,-56Z" fill="${c}"/><ellipse cy="-56" rx="32" ry="7" fill="#4a2a18"/><ellipse cy="-57" rx="22" ry="4" fill="#7a4a2a" opacity=".7"/><path d="M32,-48 c20,-2 20,26 -6,26" stroke="${c}" stroke-width="6" fill="none"/>`; };
  M.skyline = (X, c) => { c = c || X.d; let o = ''; let x = -6; while (x < 410) { const w = 22 + X.r() * 24, h = 70 + X.r() * 150, col = shade(c, .05 + X.r() * .12); o += `<rect x="${x.toFixed(1)}" y="${-h.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${col}"/>`; for (let wy = -h + 10; wy < -10; wy += 14) for (let wx = x + 4; wx < x + w - 6; wx += 9) if (X.r() < .07) o += `<rect ${X.r() < .15 ? 'class="tw" ' : ''}x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="6" height="8" fill="${X.c}" opacity=".85"/>`; x += w + 2; } return o; };
  M.pizza = (X) => { let pep = ''; for (let i = 0; i < 6; i++) { const a = i * 1.05 + .3, r = 16 + (i % 2) * 22; pep += `<circle cx="${(Math.cos(a) * r).toFixed(1)}" cy="${(Math.sin(a) * r).toFixed(1)}" r="7" fill="#b5301f"/>`; } return `<ellipse cy="-2" rx="72" ry="9" fill="#000" opacity=".35"/><g transform="translate(0 -66)"><g class="ro" style="animation-duration:60s"><circle r="68" fill="#d9a05b"/><circle r="60" fill="#c0392b"/><circle r="56" fill="#f2c94c"/>${pep}<g fill="#3f9a4a"><circle cx="-20" cy="30" r="4"/><circle cx="36" cy="-6" r="4"/><circle cx="-34" cy="-18" r="4"/></g><path d="M-68,0 H68 M0,-68 V68 M-48,-48 L48,48 M48,-48 L-48,48" stroke="#8a5a26" stroke-width="1.4" opacity=".6"/></g></g>`; };
  M.rice = (X, c) => { c = c || '#6cbf5a'; let o = ''; [[0, 0], [38, .12], [82, .24], [132, .08]].forEach(([dy, k], i) => { o += `<path d="M0,${dy - 10} C100,${dy - 40} 250,${dy + 10} 400,${dy - 26} V340 H0Z" fill="${shade(c, k - .12)}"/><path d="M0,${dy - 6} C100,${dy - 36} 250,${dy + 14} 400,${dy - 22}" fill="none" stroke="${X.b}" stroke-width="5" opacity=".55"/>`; }); return o; };
  M.cubes = (X) => { const house = (x, y, w, h, blue) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff"/><rect x="${x + w}" y="${y + 4}" width="7" height="${h - 4}" fill="#cfd9e6"/><rect x="${x + w * .3}" y="${y + h * .35}" width="${w * .22}" height="${h * .65}" fill="#1f6fc9"/><rect x="${x + w * .66}" y="${y + h * .2}" width="${w * .16}" height="${h * .22}" fill="#1f6fc9"/>${blue ? `<path d="M${x + 4},${y} A${w / 2 - 4} ${w / 2 - 4} 0 0 1 ${x + w - 4},${y}Z" fill="#1f6fc9"/>` : ''}`; return `<path d="M-170,0 L-110,-60 H140 L190,0Z" fill="#d6dbc9"/>${house(-150, -50, 50, 44)}${house(-90, -92, 56, 50, true)}${house(-20, -66, 48, 48)}${house(40, -112, 54, 56)}${house(100, -62, 50, 46)}${house(-60, -36, 40, 32)}`; };
  M.grass = (X, c) => { c = c || '#4f9a3a'; let o = `<rect width="400" height="120" fill="${shade(c, -.1)}"/>`; for (let i = 0; i < 16; i++) { const x = X.r() * 410 - 5, h = 22 + X.r() * 34; o += `<path class="sw" style="animation-delay:${(X.r() * 3).toFixed(1)}s" d="M${x.toFixed(1)} 4 Q${(x + 2).toFixed(1)} ${-h / 2} ${(x + (X.r() - .5) * 8).toFixed(1)} ${-h}" stroke="${shade(c, (X.r() - .4) * .35)}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`; } return o; };
  M.plane = (X, c) => { c = c || '#fff'; return `<g class="dr"><path d="M-70,-10 H-20" stroke="#fff" stroke-opacity=".4" stroke-width="3" stroke-dasharray="8 6"/><path d="M-10,0 C0,-10 50,-10 60,0 C50,8 0,8 -10,0Z" fill="${c}"/><path d="M14,-3 L-6,-26 L4,-26 L34,-3Z M14,3 L-6,22 L4,22 L34,3Z" fill="${shade(c, -.12)}"/><path d="M-8,-1 L-18,-14 L-12,-14 L2,-2Z" fill="${shade(c, -.12)}"/></g>`; };

  const BAND = new Set(['mtn', 'mtnsnow', 'hills', 'waves', 'dune', 'vines', 'rice', 'mist', 'grass', 'pool', 'flowers', 'ground']);


  /* ---------- palette analogue : toutes les teintes sont rapprochées de la teinte dominante du lieu ---------- */
  function toHsl(hex) {
    const [r, g, b] = h2r(hex).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    if (!d) return { h: 0, s: 0, l };
    const s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
    const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return { h: h * 60, s, l };
  }
  function fromHsl(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    if (!s) return r2h(l * 255, l * 255, l * 255);
    const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    return r2h(f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255);
  }
  const wrapD = d => ((d % 360) + 540) % 360 - 180;
  const KEEP = new Set(['#ffcf4a', '#fff4d6', '#ffe36b']);
  function analogize(svg, pal) {
    const P = pal.map(toHsl);
    const chroma = c => c.s * (1 - Math.abs(2 * c.l - 1));          // vraie intensité de couleur (ni blanc ni noir)
    const base = [P[0], P[1], P[3]].sort((a, b) => chroma(b) - chroma(a))[0];
    const H0 = chroma(base) < .08 ? P[2].h : base.h, A = P[2].h, keepAccent = P[2].s > .25;
    return svg.replace(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g, m => {
      if (KEEP.has(m.toLowerCase())) return m;                         // soleil, lune, lucioles : couleurs protégées
      const c = toHsl(m.length === 4 ? '#' + m.slice(1).split('').map(x => x + x).join('') : m);
      if (c.s < .1) {                                                    // neutres : teintés très légèrement vers la dominante
        return c.l > .1 && c.l < .9 ? fromHsl(H0, .16, Math.round(c.l * 6) / 6) : m;
      }
      let h;
      if (keepAccent && Math.abs(wrapD(c.h - A)) < 30) h = A + wrapD(c.h - A) * .5;   // l'accent reste lui-même
      else h = H0 + Math.max(-40, Math.min(40, wrapD(c.h - H0) * .26));                // le reste se rapproche de la teinte dominante
      const l = Math.min(.93, Math.max(.12, Math.round(c.l * 6) / 6));                 // 6 paliers de clarté : formes franches
      const sat = Math.min(.92, c.s * 1.22 + .1);                                      // plus vibrant
      return fromHsl(h, sat, l);
    });
  }

  /* ---------- rendu d'une scène ---------- */
  function resolve(X, k) {
    if (!k) return undefined;
    const m = { a: X.a, b: X.b, c: X.c, d: X.d, w: '#ffffff', k: '#000000' };
    return m[k] || (k[0] === '#' ? k : undefined);
  }

  function scene(spec, o) {
    o = o || {};
    const u = 'u' + (++UID);
    const pal = spec.pal;
    const X = { pal, a: pal[0], b: pal[1], c: pal[2], d: pal[3], u, r: rngf(hash(spec.id || 'x')), gl: mix(pal[1], '#ffffff', .3) };
    let body = '';
    (spec.art || '').split(';').forEach(tok => {
      if (!tok) return;
      const i = tok.indexOf(':'), name = tok.slice(0, i), a = tok.slice(i + 1).split(',');
      const fn = M[name]; if (!fn) return;
      const x = parseFloat(a[0]) || 0, y = parseFloat(a[1]) || 0, s = parseFloat(a[2]) || 1;
      const col = resolve(X, a[3]);
      const t = a[4];
      const tr = BAND.has(name) ? `translate(${x} ${y}) scale(1 ${s})` : `translate(${x} ${y}) scale(${s})`;
      body += `<g transform="${tr}">${fn(X, col, t)}</g>`;
    });
    const sky = [0, .5, 1].map(t => mix(pal[0], pal[1], t));
    const band = (y, c, i) => `<g class="dr" style="animation-duration:${22 + i * 6}s;animation-delay:-${i * 5}s"><path d="M-70,${y} C60,${y - 34} 190,${y + 30} 300,${y - 6} S430,${y - 20} 480,${y} V520 H-70Z" fill="${c}"/></g>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" class="art${o.static ? ' static' : ''}" viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${(spec.n || 'Illustration').replace(/"/g, '')}">` +
      analogize(`<rect width="400" height="500" fill="${sky[0]}"/>${band(170, sky[1], 0)}${band(300, sky[2], 1)}${body}</svg>`, pal);
  }

  /* ---------- flacon de parfum ---------- */
  function bottle(o) {
    const u = 'b' + (++UID);
    const cols = o.cols || ['#f6c945', '#e88fb8', '#8a5a3b'];
    const sh = o.shares || [.25, .35, .4];
    const y0 = 206, H = 112, level = .82, liqH = H * level;
    const hB = liqH * sh[2], hC = liqH * sh[1], hT = liqH * sh[0];
    const yB = y0 - hB, yC = yB - hC, yT = yC - hT;
    const gold = '#d6a95a';
    const wave = y => `<path d="M-30,${y} q10,-4 20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 V${y + 12} H-30Z"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" class="bottle" viewBox="0 0 140 230" aria-hidden="true"><defs><clipPath id="${u}c"><rect x="28" y="92" width="84" height="114" rx="13"/></clipPath></defs>` +
      `<ellipse cx="70" cy="222" rx="50" ry="6" fill="#6a331f" opacity=".16"/>` +
      `<rect x="22" y="84" width="96" height="128" rx="18" fill="#fff" fill-opacity=".6" stroke="#6a331f" stroke-opacity=".35" stroke-width="2"/>` +
      `<g clip-path="url(#${u}c)"><rect x="20" y="${yB}" width="100" height="${hB + 4}" fill="${cols[2]}"/><rect x="20" y="${yC}" width="100" height="${hC + .5}" fill="${cols[1]}"/><rect x="20" y="${yT}" width="100" height="${hT + .5}" fill="${cols[0]}"/>` +
      `<g class="wv2" fill="${cols[0]}">${wave(yT - 3)}</g></g>` +
      `<rect x="31" y="96" width="7" height="100" rx="3.5" fill="#fff" opacity=".45"/>` +
      `<rect x="44" y="132" width="52" height="40" rx="6" fill="#fdf5ee"/><text x="70" y="153" text-anchor="middle" font-family="Georgia,serif" font-size="14" font-weight="700" fill="#6a331f" letter-spacing="2">VS</text><text x="70" y="165" text-anchor="middle" font-family="system-ui,sans-serif" font-size="5.5" fill="#a47b67" letter-spacing="1.4">VOYAGE DES SENS</text>` +
      `<rect x="54" y="62" width="32" height="26" rx="4" fill="#fff" fill-opacity=".6" stroke="#6a331f" stroke-opacity=".3"/>` +
      `<rect x="48" y="56" width="44" height="10" rx="3" fill="${gold}"/><rect x="48" y="62" width="44" height="4" rx="2" fill="#a97d34"/>` +
      `<rect x="44" y="14" width="52" height="44" rx="9" fill="${gold}"/><rect x="44" y="46" width="52" height="12" rx="6" fill="#a97d34"/><rect x="49" y="19" width="7" height="30" rx="3.5" fill="#f3d9a0"/></svg>`;
  }

  /* ---------- scène procédurale (parfums créés sur mesure) ---------- */
  function customSpec(comp, dir, seed) {
    const F = G.VS.FAMILIES;
    const colOf = k => (comp.layerColor && comp.layerColor[k]) || '#888';
    const ct = colOf('T'), cc = colOf('C'), cf = colOf('F');
    const pal = [mix(cf, '#140f2e', .72), mix(cc, '#2a1e4a', .45), shade(ct, .3), mix(cf, '#000000', .72)];
    const dom = comp.families[0] ? comp.families[0].f : 'fl';
    const sets = {
      nos: 'stars:0,0,1;moon:300,100,.8;hills:0,380,.6,d;win:110,400,1;lamp:290,420,.9;ground:0,420,1,d;fireflies:200,300,1.5,c',
      dec: 'sun:100,130,.9;mtn:0,370,1.5,d;mist:0,390,1,w;pines:0,430,1.4,d;fireflies:200,330,1.5,c',
      voy: 'sun:300,120,1;cloud:90,130,1;plane:150,200,1;waves:0,360,.9,d;ship:240,360,.6;cloud:320,260,.8',
      exo: 'sun:300,120,1.1;cloud:100,100,.9;waves:0,350,.7,d;dune:0,410,.6,c;palm:80,440,1.2;palm:330,450,1.05'
    };
    const byFam = {
      ma: sets.voy, bo: sets.dec, te: sets.dec, ve: 'sun:300,100,.9;hills:0,330,.7,d;flowers:0,440,1.3;grass:0,450,1,d',
      fl: 'sun:90,110,.9;cloud:300,100,.9;hills:0,330,.7,d;flowers:0,440,1.5;grass:0,455,1,d',
      go: 'stars:0,0,1;lamp:290,420,.9;cup:130,420,1.6;steam:130,350,1.3;ground:0,420,1,d;fireflies:200,300,1.4,c',
      ep: sets.exo, fr: sets.exo, ag: 'sun:300,100,1;hills:0,330,.6,d;waves:0,360,.7,c;tree:100,440,1.2,d,c',
      cr: 'stars:0,0,1;moon:90,100,.7;pines:0,380,1.3,d;ground:0,420,1,d;fire:230,432,1.3;fireflies:230,300,1.5,c',
      mu: sets.nos, am: sets.nos, re: 'rays:200,60,1.4,c;church:200,430,1.1;ground:0,420,1,d;fireflies:200,260,1.1,c',
      mi: sets.dec, ar: sets.dec
    };
    const art = (dir && sets[dir]) || byFam[dom] || sets.dec;
    return { id: 'c' + (seed || 0), pal, art, n: comp.name || 'Création' };
  }

  G.VS = G.VS || {};
  G.VS.Art = { scene, bottle, customSpec, mix, shade, hash, rngf };
})(typeof window !== 'undefined' ? window : globalThis);
