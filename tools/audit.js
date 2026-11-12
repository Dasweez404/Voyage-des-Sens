const fs=require('fs'),path=require('path'),vm=require('vm');global.window=global;
for(const f of ['notes_extra','notes','scenes','destinations','prefs','art','engine'])vm.runInThisContext(fs.readFileSync(path.join(__dirname,'..','js',f+'.js'),'utf8'));
const VS=global.VS;module.exports=VS;
if(require.main===module){
  const mode=process.argv[2];
  if(mode==='notes'){
    const by={};VS.NOTE_LIST.forEach(n=>(by[n.f]=by[n.f]||[]).push(n));
    for(const f in by){console.log('\n## '+f+' '+VS.FAMILIES[f].n+' ('+by[f].length+')');
      ['T','C','F'].forEach(L=>{const l=by[f].filter(n=>n.l===L);if(l.length)console.log(' '+L+': '+l.map(n=>n.n+' ['+n.t.join('')+']').join(' | '));});}
  }
}
if(require.main===module&&process.argv[2]==='scenes'){
  const E=VS.Engine;const rows=[];
  VS.SCENES.forEach(s=>{const c=E.fromScene(s);const cnt=['T','C','F'].map(l=>c.byLayer[l].length).join('/');
    const mx=c.notes.reduce((m,n)=>n.pct>m.pct?n:m,c.notes[0]);
    console.log(s.id.padEnd(15),cnt,'h'+c.stats.harmony,'i'+c.stats.intensity,'max',mx.n+' '+mx.pct+'%','|',['T','C','F'].map(l=>c.byLayer[l].map(n=>n.n).join(', ')).join(' || '));});
}
