/* Voyage des Sens — flacon en 3D (CSS 3D, aucune bibliothèque, 100 % hors-ligne)
   Un flacon de verre épais, col et bouchon dorés, trois couches de liquide à la hauteur réelle de la formule.
   On le fait tourner du doigt ; sinon il se balance très doucement. */
(function (G) {
  'use strict';
  const VS = G.VS = G.VS || {};
  const shade = (c, t) => VS.Art.shade(c, t);
  const GOLD = '#c9a05a', GOLD_D = '#a47b36';

  // une boîte : 4 faces latérales + dessus, teintes plates (aucun dégradé)
  const faces = c => ({ '--c0': c, '--c1': shade(c, -.14), '--c2': shade(c, -.06), '--c3': shade(c, -.2), '--ct': shade(c, .2) });
  const styleOf = o => Object.keys(o).map(k => `${k}:${o[k]}`).join(';');
  const box = (cls, x, y, w, d, h, extra) => `<div class="bx ${cls}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;--w:${w}px;--d:${d}px;${extra || ''}"><i class="f"></i><i class="b"></i><i class="r"></i><i class="l"></i><i class="t"></i></div>`;

  function html(o) {
    const cols = o.cols || ['#f6c945', '#e88fb8', '#8a5a3b'], sh = o.shares || [.25, .35, .4], lab = !!o.lab;
    const FLOOR = 238, HMAX = 112, lvl = lab ? 1 : .84;
    const hT = HMAX * lvl * sh[0], hC = HMAX * lvl * sh[1], hF = HMAX * lvl * sh[2];
    const sy = { F: FLOOR - hF, C: FLOOR - hF - hC, T: FLOOR - hF - hC - hT };
    const liq = (L, c) => `<div class="bx lq lq-${L}" style="left:54px;width:92px;--w:92px;--d:92px;${styleOf(faces(c))}"><i class="f"></i><i class="b"></i><i class="r"></i><i class="l"></i><i class="t"></i></div>`;
    const glass = styleOf({ '--c0': 'rgba(255,255,255,.26)', '--c1': 'rgba(255,255,255,.2)', '--c2': 'rgba(255,255,255,.3)', '--c3': 'rgba(255,255,255,.22)', '--ct': 'rgba(255,255,255,.5)' });
    const goldBox = (x, y, w, h, c) => box('gld', x, y, w, w, h, styleOf(faces(c)));
    const halo = lab ? `<i class="halo3 h3F" style="--c:${cols[2]}"></i><i class="halo3 h3C" style="--c:${cols[1]}"></i><i class="halo3 h3T" style="--c:${cols[0]}"></i>` : '';
    return `<div class="b3d${lab ? ' b3d-lab' : ''}" data-syf="${sy.F}" data-syc="${sy.C}" data-syt="${sy.T}" style="--HF:${hF.toFixed(1)}px;--HC:${hC.toFixed(1)}px;--HT:${hT.toFixed(1)}px${lab ? '' : ';--hf:var(--HF);--hc:var(--HC);--ht:var(--HT)'}" aria-hidden="true">` +
      `<div class="b3d-fit">${halo}<i class="sh3"></i><div class="b3d-rot">` +
      box('glass', 48, 106, 104, 104, 140, glass) +
      liq('F', cols[2]) + liq('C', cols[1]) + liq('T', cols[0]) +
      box('glass neck', 85, 84, 30, 30, 22, glass) +
      `<div class="lab3" style="transform:translateZ(53px)"><b>VS</b><u></u></div><i class="hl3" style="left:56px;top:118px;height:100px;transform:translateZ(52.6px)"></i><i class="hl3 hl3b" style="left:66px;top:118px;height:48px;transform:translateZ(52.6px)"></i>` +
      goldBox(82, 74, 36, 10, GOLD_D).replace('class="bx gld"', 'class="bx gld collar"') +
      `<div class="cap3">${goldBox(78, 38, 44, 36, GOLD)}</div>` +
      `</div></div></div>`;
  }

  // rotation au doigt + léger balancement ; une seule boucle par flacon, arrêtée quand il quitte la page
  function mount(root) {
    (root.querySelectorAll ? Array.from(root.querySelectorAll('.b3d')) : []).forEach(el => {
      if (el._m) return; el._m = 1;
      const rot = el.querySelector('.b3d-rot'), fit = el.querySelector('.b3d-fit');
      const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      let ry = -24, vel = 0, drag = false, lx = 0, t0 = performance.now(), last = 0;
      const size = () => { const k = el.clientWidth / 200 || 1; fit.style.setProperty('--k', k.toFixed(3)); };
      size(); setTimeout(size, 60); window.addEventListener('resize', size);
      el.addEventListener('pointerdown', e => { drag = true; lx = e.clientX; vel = 0; try { el.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } el.classList.add('grab'); });
      el.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - lx; lx = e.clientX; ry += dx * .7; vel = dx * .7; });
      const up = () => { drag = false; el.classList.remove('grab'); };
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
      (function loop(t) {
        if (!document.body.contains(el)) { window.removeEventListener('resize', size); return; }
        if (!drag) { ry += vel; vel *= .94; }
        const sway = reduce || drag ? 0 : Math.sin((t - t0) / 2600) * 14;
        rot.style.setProperty('--ry', (ry + sway).toFixed(2) + 'deg');
        requestAnimationFrame(loop);
      })(t0);
    });
  }
  const surfaceY = (el, L) => parseFloat(el.dataset['sy' + L.toLowerCase()]);
  VS.Bottle3D = { html, mount, surfaceY };
})(typeof window !== 'undefined' ? window : globalThis);
