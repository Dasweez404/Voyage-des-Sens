/* Voyage des Sens — flacon « liquide » en WebGL (sans bibliothèque, 100 % hors-ligne)
   Un flacon de verre rendu par lancer de rayons dans un shader : verre épais qui reflète et réfracte,
   trois couches de liquide dont les interfaces ondulent, penchent quand on tourne le flacon, et frémissent quand une goutte tombe.
   Si WebGL n'est pas disponible, l'appli retombe sur le flacon 3D CSS. */
(function (G) {
  'use strict';
  const VS = G.VS = G.VS || {};

  const VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  const FRAG = `precision highp float;
uniform vec2 uRes;uniform float uTime,uRotY,uCap;
uniform vec3 uColT,uColC,uColF,uLvl;
uniform float uM[8];uniform vec2 uRip;uniform vec2 uView;
uniform sampler2D uLab;
float sdRBox(vec3 p,vec3 b,float r){vec3 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-r;}
float sdCyl(vec3 p,float r,float h){vec2 d=abs(vec2(length(p.xz),p.y))-vec2(r,h);return min(max(d.x,d.y),0.)+length(max(d,0.));}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float glass(vec3 p){float b=sdRBox(p-vec3(0.,-.1,0.),vec3(.5,.62,.5),.15);float n=sdCyl(p-vec3(0.,.64,0.),.15,.13);return smin(b,n,.07);}
float gold(vec3 p){float lift=(1.-uCap)*(.30+.03*sin(uTime*1.6));float c=sdRBox(p-vec3(0.,.995+lift,0.),vec3(.215,.17,.215),.05);float k=sdCyl(p-vec3(0.,.8,0.),.2,.04);return min(c,k);}
float cav(vec3 p){return sdRBox(p-vec3(0.,-.09,0.),vec3(.43,.53,.43),.09);}
float wave(vec2 xz,float k,float ph){
  float t=uTime;
  vec2 u=(xz+.43)/.86*3.14159265;
  float cx1=cos(u.x),cx2=cos(2.*u.x),cx3=cos(3.*u.x),cz1=cos(u.y),cz2=cos(2.*u.y);
  float md=uM[0]*cx1+uM[1]*cz1+uM[2]*cx1*cz1+uM[3]*cx2+uM[4]*cz2+uM[5]*cx2*cz1+uM[6]*cx1*cz2+uM[7]*cx3;
  float w=sin(xz.x*6.+t*1.5+ph)*.003+sin(xz.y*5.-t*1.2+ph*1.7)*.0025;
  float r=length(xz);
  float rip=uRip.y*sin(r*26.-uRip.x*9.)*exp(-r*3.5)*exp(-uRip.x*1.6)*step(0.,uRip.x);
  return (w+rip+md)*k;
}
float liq(vec3 p){return max(cav(p),p.y-(uLvl.z+wave(p.xz,1.,0.)));}
vec3 layerCol(vec3 p){
  float a=uLvl.x+wave(p.xz,.6,1.3),b=uLvl.y+wave(p.xz,.8,2.4);
  return p.y<a?uColF:(p.y<b?uColC:uColT);
}
vec3 env(vec3 d){
  float up=smoothstep(-.3,.9,d.y);
  vec3 c=mix(vec3(.60,.48,.42),vec3(.99,.95,.90),up);
  c+=vec3(1.)*smoothstep(.93,.975,dot(d,normalize(vec3(-.55,.45,.7))))*1.1;
  c+=vec3(.92,.96,1.)*smoothstep(.96,.985,dot(d,normalize(vec3(.85,.15,.45))))*.6;
  c+=vec3(1.)*smoothstep(.93,.999,d.y)*.22;
  return c;
}
vec2 mapS(vec3 p){float g=glass(p),c=gold(p);return c<g?vec2(c,2.):vec2(g,1.);}
vec3 nrmG(vec3 p){vec2 e=vec2(.002,0.);return normalize(vec3(glass(p+e.xyy)-glass(p-e.xyy),glass(p+e.yxy)-glass(p-e.yxy),glass(p+e.yyx)-glass(p-e.yyx)));}
vec3 nrmA(vec3 p){vec2 e=vec2(.002,0.);return normalize(vec3(gold(p+e.xyy)-gold(p-e.xyy),gold(p+e.yxy)-gold(p-e.yxy),gold(p+e.yyx)-gold(p-e.yyx)));}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;
  float ca=cos(uRotY),sa=sin(uRotY),ce=.978,se=.208,D=4.6;
  vec3 ro=vec3(sa*ce*D,se*D+.22,ca*ce*D);
  vec3 ta=vec3(0.,uView.y,0.);
  vec3 fw=normalize(ta-ro),rt=normalize(cross(fw,vec3(0.,1.,0.))),upv=cross(rt,fw);
  vec3 rd=normalize(fw*uView.x+uv.x*rt+uv.y*upv);
  vec3 L=normalize(vec3(-.45,.8,.55));
  float t=0.,id=0.;
  for(int i=0;i<72;i++){vec3 p=ro+rd*t;vec2 h=mapS(p);if(h.x<.0015){id=h.y;break;}t+=h.x*.92;if(t>8.)break;}
  if(id<.5){gl_FragColor=vec4(0.);return;}
  vec3 p=ro+rd*t;
  if(id>1.5){
    vec3 n=nrmA(p);
    float diff=.5+.5*dot(n,L),spec=pow(max(dot(reflect(rd,n),L),0.),36.);
    vec3 base=vec3(.80,.62,.34);
    vec3 col=base*(.42+.58*diff)+env(reflect(rd,n))*vec3(1.,.82,.5)*.30+spec*.55;
    gl_FragColor=vec4(col,1.);return;
  }
  vec3 n=nrmG(p);
  float cosv=max(dot(n,-rd),0.);
  float f=.04+.96*pow(1.-cosv,4.);
  vec3 refl=env(reflect(rd,n))*f;
  // étiquette collée sur la face avant
  if(rd.z<0.){
    float tp=(.505-ro.z)/rd.z;
    if(tp>0.&&tp<t+.03){
      vec3 q=ro+rd*tp;vec2 lu=vec2(q.x/.23,(q.y+.2)/.17);
      if(abs(lu.x)<1.&&abs(lu.y)<1.){
        vec4 tx=texture2D(uLab,vec2(lu.x*.5+.5,.5-lu.y*.5));
        gl_FragColor=vec4(tx.rgb*(.92+.08*dot(vec3(0.,0.,1.),L)),1.);return;
      }
    }
  }
  vec3 rd2=refract(rd,n,1./1.5);
  vec3 ro2=p+rd2*.03;
  float tl=0.;bool hit=false;
  for(int i=0;i<52;i++){float d=liq(ro2+rd2*tl);if(d<.0025){hit=true;break;}tl+=max(d,.004)*.9;if(tl>3.5)break;}
  float aL=0.;vec3 lc=vec3(0.);
  if(hit){
    vec3 q=ro2+rd2*tl;
    vec3 acc=vec3(0.);float cnt=0.;
    for(int i=0;i<40;i++){vec3 s=q+rd2*(float(i)*.04+.02);if(liq(s)>0.)break;acc+=layerCol(s);cnt+=1.;}
    vec3 avg=cnt>0.?acc/cnt:layerCol(q);
    float th=max(cnt*.04,.04);
    lc=avg*mix(1.14,.66,smoothstep(0.,1.0,th));
    aL=1.-exp(-th*8.);
    float top=uLvl.z+wave(q.xz,1.,0.);
    if(abs(q.y-top)<.012){
      vec2 e=vec2(.01,0.);
      float wx=wave(q.xz+e.xy,1.,0.)-wave(q.xz-e.xy,1.,0.),wz=wave(q.xz+e.yx,1.,0.)-wave(q.xz-e.yx,1.,0.);
      vec3 sn=normalize(vec3(-wx/.02,1.,-wz/.02));
      float sp=pow(max(dot(reflect(rd2,sn),L),0.),50.);
      lc=lc*1.12+env(reflect(rd2,sn))*.14+sp*.5;aL=1.;
    }
  }
  vec3 col=lc*aL*(1.-f)+refl+vec3(.9,.86,.83)*.05;
  float al=clamp(aL*(1.-f)+f*.9+.06,0.,1.);
  gl_FragColor=vec4(col,al);
}`;

  const NAMES = ['uRes', 'uTime', 'uRotY', 'uCap', 'uColT', 'uColC', 'uColF', 'uLvl', 'uM', 'uRip', 'uView', 'uLab'];
  const hex = c => { c = c.replace('#', ''); const n = parseInt(c.length === 3 ? c.split('').map(x => x + x).join('') : c, 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
  const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
  const Y0 = -.62, HMAX = .9, FILL = .86;
  // modes de ressac [m, n] ; pulsation du mode (1,0) : c·π / largeur de la cavité
  const MODES = [[1, 0], [0, 1], [1, 1], [2, 0], [0, 2], [2, 1], [1, 2], [3, 0]], OM = 3.6, KF = .05;
  const OMG = MODES.map(m => OM * Math.sqrt(m[0] * m[0] + m[1] * m[1])), GAM = OMG.map(w => .9 + .3 * w / OM);
  // force du liquide (réglable à la main) : 0 = presque immobile, 1 = très vif
  let force = .5; try { const v = parseFloat(localStorage.getItem('vs.glf')); if (v >= 0 && v <= 1) force = v; } catch (e) { /* ignore */ }

  let supported = null;
  function ok() {
    if (supported !== null) return supported;
    try { const c = document.createElement('canvas'), g = c.getContext('webgl'); supported = !!g && !!compile(g); const x = g && g.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); } catch (e) { supported = false; }
    return supported;
  }
  function compile(gl) {
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null; };
    const v = sh(gl.VERTEX_SHADER, VERT), f = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!v || !f) return null;
    const pr = gl.createProgram(); gl.attachShader(pr, v); gl.attachShader(pr, f); gl.linkProgram(pr);
    return gl.getProgramParameter(pr, gl.LINK_STATUS) ? pr : null;
  }

  function html(o) {
    const cols = o.cols || ['#f6c945', '#e88fb8', '#8a5a3b'], sh = o.shares || [.25, .35, .4];
    const halo = o.lab ? `<i class="halo3 h3F" style="--c:${cols[2]}"></i><i class="halo3 h3C" style="--c:${cols[1]}"></i><i class="halo3 h3T" style="--c:${cols[0]}"></i>` : '';
    return `<div class="b3w${o.lab ? ' b3w-lab' : ''}" data-cols="${cols.join(',')}" data-sh="${sh.join(',')}" aria-hidden="true">${halo}<i class="sh3"></i><canvas></canvas></div>`;
  }

  function labelTexture(gl) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 192; const g = c.getContext('2d');
    g.fillStyle = '#fdf5ee'; g.fillRect(0, 0, 256, 192);
    g.fillStyle = '#6a331f'; g.textAlign = 'center'; g.font = '700 92px "Iowan Old Style","Palatino Linotype",Georgia,serif'; g.fillText('VS', 128 + 6, 114);
    g.fillStyle = '#c9a05a'; g.fillRect(84, 138, 88, 6);
    const tx = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tx);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tx;
  }

  // retourne l'API du flacon (rise, drop, close) ou null si WebGL échoue
  function mount(root) {
    const el = root.querySelector ? root.querySelector('.b3w') : null; if (!el) return null;
    if (el._api) return el._api;
    const cv = el.querySelector('canvas');
    const gl = cv.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false });
    const pr = gl && compile(gl); if (!pr) return null;
    gl.useProgram(pr);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {}; NAMES.forEach(n => { U[n] = gl.getUniformLocation(pr, n); });
    gl.activeTexture(gl.TEXTURE0); labelTexture(gl); gl.uniform1i(U.uLab, 0);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const cols = el.dataset.cols.split(',').map(hex), sh = el.dataset.sh.split(',').map(Number);   // T, C, F
    const lab = el.classList.contains('b3w-lab');
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const H = { T: HMAX * FILL * sh[0], C: HMAX * FILL * sh[1], F: HMAX * FILL * sh[2] };
    const S = { p: lab ? { F: 0, C: 0, T: 0 } : { F: 1, C: 1, T: 1 }, cap: lab ? 0 : 1 };
    const tw = [];                                       // animations en cours : { k, to, t0, d }
    const tween = (obj, k, to, d) => { const i = tw.findIndex(x => x.obj === obj && x.k === k); if (i >= 0) tw.splice(i, 1); tw.push({ obj, k, from: obj[k], to, t0: performance.now(), d }); };
    const A = new Float32Array(8), V = new Float32Array(8), pulses = [];
    let pv = 0, pvT = 0, lastMove = 0, pvPrev = 0;
    let ry = -.42, vel = 0, drag = false, lx = 0, rip0 = -1e9, ripAmp = 0, scale = Math.min(window.devicePixelRatio || 1, 1.6), slow = 0, frames = 0, tPrev = performance.now(), visible = true, dead = false;
    const api = {
      rise(L) { tween(S.p, L, 1, reduce ? 300 : 2600); },
      drop(L) { rip0 = performance.now(); ripAmp = .003 + .010 * force; V[3] += .05 * force; V[4] += .05 * force; },   // une goutte ne fait qu'une ride : proportionnelle à la force, presque nulle à 0
      shake() {                                           // trois impulsions qui s'inversent : le liquide va et vient et cogne les parois
        const a = Math.random() * 6.283, now = performance.now(), M = 1 + 7 * force;
        [[0, 1], [280, -.8], [560, .5], [820, -.3]].forEach(([d, g]) => pulses.push({ t0: now + d, ax: Math.cos(a) * M * g, az: Math.sin(a) * M * g }));
        for (let i = 2; i < 7; i++) V[i] += (Math.random() - .5) * .9 * force;
      },
      setForce(f) { force = f; },
      close() { tween(S, 'cap', 1, reduce ? 300 : 2200); },
      fillAll() { ['F', 'C', 'T'].forEach(L => tween(S.p, L, 1, 900)); tween(S, 'cap', 1, 900); }
    };
    el._api = api;
    const ctl = document.createElement('div'); ctl.className = 'gl-ctl';
    ctl.innerHTML = `<button class="pill" type="button">Secouer</button><label><span>Force</span><input type="range" min="0" max="100" step="1" value="${Math.round(force * 100)}" aria-label="Force du liquide"><output>${Math.round(force * 100)}</output></label>`;
    el.insertAdjacentElement('afterend', ctl);
    const rng = ctl.querySelector('input'), out = ctl.querySelector('output');
    rng.addEventListener('input', () => { force = rng.value / 100; out.textContent = rng.value; try { localStorage.setItem('vs.glf', String(force)); } catch (e) { /* ignore */ } });
    ctl.querySelector('button').addEventListener('click', () => api.shake());
    function size() {
      const w = Math.max(40, el.clientWidth), h = Math.max(52, el.clientHeight || w * 1.3);
      cv.width = Math.round(w * scale); cv.height = Math.round(h * scale); gl.viewport(0, 0, cv.width, cv.height);
    }
    size(); window.addEventListener('resize', size);
    if (window.ResizeObserver) new ResizeObserver(size).observe(el);   // le laboratoire est monté avant d'être affiché
    el.addEventListener('pointerdown', e => { drag = true; lx = e.clientX; vel = 0; try { el.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } el.classList.add('grab'); });
    el.addEventListener('pointermove', e => {
      if (!drag) return; const dx = e.clientX - lx, dts = Math.max(.008, (e.timeStamp - lastMove) / 1000); lx = e.clientX; lastMove = e.timeStamp; ry += dx * .011; vel = dx * .011;
      pvT = Math.max(-2500, Math.min(2500, dx / dts));   // vitesse du doigt : son accélération fait bouger le liquide
    });
    const up = () => { drag = false; el.classList.remove('grab'); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    if (window.IntersectionObserver) new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(el);
    const t0 = performance.now();
    (function frame(now) {
      if (!document.body.contains(el)) { window.removeEventListener('resize', size); dead = true; const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); return; }
      requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      const dt = Math.min(.05, (now - tPrev) / 1000); tPrev = now;
      // animations
      for (let i = tw.length - 1; i >= 0; i--) { const a = tw[i], k = (now - a.t0) / a.d; a.obj[a.k] = a.from + (a.to - a.from) * ease(k); if (k >= 1) tw.splice(i, 1); }
      // rotation, balancement
      if (!drag) { ry += vel; vel *= .95; }
      const sway = reduce || drag ? 0 : Math.sin((now - t0) / 2900) * .24, swayA = reduce || drag ? 0 : -Math.sin((now - t0) / 2900) * .24 * 1.2;
      // ressac : modes stationnaires (parois = nœuds de vitesse, ventres de hauteur) forcés par l'accélération du flacon
      pv += (pvT - pv) * .45; pvT *= drag ? .8 : .5;
      const acc = (pv - pvPrev) / Math.max(dt, .008); pvPrev = pv;
      const th = ry + sway, G = .00042 * force * 2;
      let ax = acc * Math.cos(th) * G + swayA * .05 * force, az = -acc * Math.sin(th) * G;
      pulses.forEach(p => { const k = (now - p.t0) / 1000; if (k >= 0 && k < .2) { ax += p.ax; az += p.az; } });
      for (let i = pulses.length - 1; i >= 0; i--) if (now - pulses[i].t0 > 400) pulses.splice(i, 1);
      ax = Math.max(-9, Math.min(9, ax)); az = Math.max(-9, Math.min(9, az));
      const LIM = .05 + .13 * Math.min(1, .35 + force);
      for (let n = 0; n < 4; n++) {
        const h = dt / 4;
        for (let i = 0; i < 8; i++) {
          const f = i === 0 ? ax : i === 1 ? az : i === 7 ? ax * .3 : 0;
          V[i] += (-OMG[i] * OMG[i] * (A[i] - KF * f) - GAM[i] * V[i]) * h; A[i] += V[i] * h;
          if (A[i] > LIM) { A[i] = LIM; if (V[i] > 0) V[i] *= -.45; } else if (A[i] < -LIM) { A[i] = -LIM; if (V[i] < 0) V[i] *= -.45; }   // la vague bute sur la paroi
        }
      }
      const iF = Y0 + H.F * S.p.F, iC = iF + H.C * S.p.C, iT = iC + H.T * S.p.T;
      gl.uniform2f(U.uRes, cv.width, cv.height); gl.uniform1f(U.uTime, (now - t0) / 1000); gl.uniform1f(U.uRotY, ry + sway); gl.uniform1f(U.uCap, S.cap);
      gl.uniform3f(U.uColT, cols[0][0], cols[0][1], cols[0][2]); gl.uniform3f(U.uColC, cols[1][0], cols[1][1], cols[1][2]); gl.uniform3f(U.uColF, cols[2][0], cols[2][1], cols[2][2]);
      gl.uniform3f(U.uLvl, iF, iC, iT); gl.uniform1fv(U.uM, A);
      gl.uniform2f(U.uRip, (now - rip0) / 1000, ripAmp); gl.uniform2f(U.uView, lab ? 1.75 : 2.05, lab ? .3 : .2);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
      // résolution adaptative : si l'appareil peine, on réduit doucement
      if (++frames % 40 === 0) { const avg = (now - (el._f0 || now)) / 40; el._f0 = now; if (frames > 80 && avg > 34 && scale > .7 && !navigator.webdriver) { scale *= .8; size(); } }
    })(t0);
    return api;
  }

  VS.BottleGL = { ok, html, mount };
})(typeof window !== 'undefined' ? window : globalThis);
