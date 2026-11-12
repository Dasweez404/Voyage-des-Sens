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
uniform vec2 uTilt;uniform vec2 uRip;uniform vec2 uView;
uniform sampler2D uLab;
float sdRBox(vec3 p,vec3 b,float r){vec3 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-r;}
float sdCyl(vec3 p,float r,float h){vec2 d=abs(vec2(length(p.xz),p.y))-vec2(r,h);return min(max(d.x,d.y),0.)+length(max(d,0.));}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float glass(vec3 p){float b=sdRBox(p-vec3(0.,-.1,0.),vec3(.5,.62,.5),.15);float n=sdCyl(p-vec3(0.,.64,0.),.15,.13);return smin(b,n,.07);}
float gold(vec3 p){float lift=(1.-uCap)*(.30+.03*sin(uTime*1.6));float c=sdRBox(p-vec3(0.,.995+lift,0.),vec3(.215,.17,.215),.05);float k=sdCyl(p-vec3(0.,.8,0.),.2,.04);return min(c,k);}
float cav(vec3 p){return sdRBox(p-vec3(0.,-.09,0.),vec3(.43,.53,.43),.09);}
float wave(vec2 xz,float k,float ph){
  float t=uTime;
  float w=sin(xz.x*6.+t*1.5+ph)*.010+sin(xz.y*5.-t*1.2+ph*1.7)*.008+sin((xz.x+xz.y)*9.+t*2.1)*.004;
  float r=length(xz);
  float rip=uRip.y*sin(r*26.-uRip.x*9.)*exp(-r*3.5)*exp(-uRip.x*1.6)*step(0.,uRip.x);
  return (w+rip)*k+dot(xz,uTilt);
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

  const NAMES = ['uRes', 'uTime', 'uRotY', 'uCap', 'uColT', 'uColC', 'uColF', 'uLvl', 'uTilt', 'uRip', 'uView', 'uLab'];
  const hex = c => { c = c.replace('#', ''); const n = parseInt(c.length === 3 ? c.split('').map(x => x + x).join('') : c, 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
  const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
  const Y0 = -.62, HMAX = .9, FILL = .86;

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
    let ry = -.42, vel = 0, drag = false, lx = 0, tilt = [0, 0], tv = [0, 0], rip0 = -1e9, ripAmp = 0, scale = Math.min(window.devicePixelRatio || 1, 1.6), slow = 0, frames = 0, tPrev = performance.now(), visible = true, dead = false;
    const api = {
      rise(L) { tween(S.p, L, 1, reduce ? 300 : 2600); },
      drop(L) { rip0 = performance.now(); ripAmp = .9; },
      close() { tween(S, 'cap', 1, reduce ? 300 : 2200); },
      fillAll() { ['F', 'C', 'T'].forEach(L => tween(S.p, L, 1, 900)); tween(S, 'cap', 1, 900); }
    };
    el._api = api;
    function size() {
      const w = Math.max(40, el.clientWidth), h = Math.max(52, el.clientHeight || w * 1.3);
      cv.width = Math.round(w * scale); cv.height = Math.round(h * scale); gl.viewport(0, 0, cv.width, cv.height);
    }
    size(); window.addEventListener('resize', size);
    if (window.ResizeObserver) new ResizeObserver(size).observe(el);   // le laboratoire est monté avant d'être affiché
    el.addEventListener('pointerdown', e => { drag = true; lx = e.clientX; vel = 0; try { el.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } el.classList.add('grab'); });
    el.addEventListener('pointermove', e => {
      if (!drag) return; const dx = e.clientX - lx; lx = e.clientX; ry += dx * .011; vel = dx * .011;
      const rx = Math.cos(ry), rz = -Math.sin(ry);       // la droite de l'écran, dans le repère du flacon : le liquide « traîne »
      tv[0] -= dx * .0016 * rx; tv[1] -= dx * .0016 * rz;
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
      // rotation, balancement et ressac du liquide (ressort amorti)
      if (!drag) { ry += vel; vel *= .95; }
      const sway = reduce || drag ? 0 : Math.sin((now - t0) / 2900) * .24, swayV = reduce || drag ? 0 : Math.cos((now - t0) / 2900) * .24 / 2900 * 1000;
      if (!drag && !reduce) { tv[0] -= swayV * dt * .18 * Math.cos(ry + sway); tv[1] += swayV * dt * .18 * Math.sin(ry + sway); }
      for (let k = 0; k < 2; k++) { tv[k] += (-tilt[k] * 38 - tv[k] * 3.4) * dt; tilt[k] += tv[k] * dt; tilt[k] = Math.max(-.26, Math.min(.26, tilt[k])); }
      const iF = Y0 + H.F * S.p.F, iC = iF + H.C * S.p.C, iT = iC + H.T * S.p.T;
      gl.uniform2f(U.uRes, cv.width, cv.height); gl.uniform1f(U.uTime, (now - t0) / 1000); gl.uniform1f(U.uRotY, ry + sway); gl.uniform1f(U.uCap, S.cap);
      gl.uniform3f(U.uColT, cols[0][0], cols[0][1], cols[0][2]); gl.uniform3f(U.uColC, cols[1][0], cols[1][1], cols[1][2]); gl.uniform3f(U.uColF, cols[2][0], cols[2][1], cols[2][2]);
      gl.uniform3f(U.uLvl, iF, iC, iT); gl.uniform2f(U.uTilt, tilt[0], tilt[1]);
      gl.uniform2f(U.uRip, (now - rip0) / 1000, ripAmp); gl.uniform2f(U.uView, lab ? 1.75 : 2.05, lab ? .3 : .2);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
      // résolution adaptative : si l'appareil peine, on réduit doucement
      if (++frames % 40 === 0) { const avg = (now - (el._f0 || now)) / 40; el._f0 = now; if (frames > 80 && avg > 34 && scale > .7 && !navigator.webdriver) { scale *= .8; size(); } }
    })(t0);
    return api;
  }

  VS.BottleGL = { ok, html, mount };
})(typeof window !== 'undefined' ? window : globalThis);
