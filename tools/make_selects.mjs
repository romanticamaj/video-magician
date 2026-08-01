// selects step 2: render the stringout index as a pull-selects page
// (out/selects.html). Every ASR sentence is a candidate span; the reviewer
// checks spans to export, marks manual in/out ranges over any part of the
// picture, splits spans at the playhead, and nudges edges — then exports
// selects.decisions.json for apply_selects.py to cut with ffmpeg.
//
// Usage: node tools/make_selects.mjs [--index local/stringout.json]
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const args = process.argv.slice(2);
const argOf = (k, d) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : d;
};
const INDEX = argOf('--index', 'local/stringout.json');
const index = JSON.parse(fs.readFileSync(INDEX, 'utf8'));

const tmp = path.resolve('local/_sel_thumb.jpg');
const thumb = (clipPath, t) => {
  try {
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss', String(Math.max(0, t)), '-i', clipPath, '-frames:v', '1', '-vf', 'scale=140:-1', '-q:v', '7', tmp]);
    return 'data:image/jpeg;base64,' + fs.readFileSync(tmp).toString('base64');
  } catch {
    return '';
  }
};

const DATA = {generatedAt: new Date().toISOString(), clips: index.clips.map((c, ci) => ({
  file: c.file, path: c.path, duration: c.duration,
  fileUrl: 'file:///' + c.path.replace(/\\/g, '/').replace(/^\//, ''),
  spans: c.segments.map((s) => ({
    id: s.id, start: s.start, end: s.end, label: s.text,
    origin: 'asr', export: false, img: thumb(c.path, (s.start + s.end) / 2),
  })),
}))};

const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>selects 圈選 · ${index.clips.length} clips</title>
<style>
:root{--bg:hsl(240 8% 5%);--panel:hsl(240 8% 10%);--panel2:hsl(240 8% 14%);--line:hsl(240 8% 18%);
--txt:hsl(240 10% 92%);--dim:hsl(240 6% 55%);--acc:#ffc53d;--ok:hsl(141 71% 48%);--man:#5d93ba;--warn:hsl(0 83% 62%)}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--txt);font:14px/1.55 "Noto Sans TC",Inter,system-ui,sans-serif}
.mono{font-family:ui-monospace,monospace;font-variant-numeric:tabular-nums}
header{position:sticky;top:0;background:color-mix(in srgb,var(--bg) 92%,transparent);backdrop-filter:blur(10px);
border-bottom:1px solid var(--line);padding:10px 16px;display:flex;gap:12px;align-items:center;z-index:20}
h1{font-size:15px;margin:0}#stats{color:var(--dim);font-size:12px}
button{cursor:pointer;border:1px solid var(--line);background:var(--panel);color:var(--txt);border-radius:7px;padding:6px 12px;font-size:12.5px}
#export{background:var(--acc);color:#1a1206;border:0;font-weight:700}
main{max-width:920px;margin:0 auto;padding:14px 16px 90px}
.clip{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px;margin-bottom:16px}
.clip h2{font-size:13px;margin:0 0 8px;display:flex;gap:10px;align-items:baseline}
.clip h2 .d{color:var(--dim);font-weight:400;font-size:12px}
video{width:100%;max-height:250px;border-radius:8px;background:#000;margin-bottom:6px}
.ctl{display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;align-items:center}
.ctl .tcnow{margin-left:auto;color:var(--dim);font-size:12px}
.strip{position:relative;height:34px;background:var(--panel2);border-radius:5px;margin-bottom:10px;cursor:pointer;overflow:hidden}
.blk{position:absolute;top:3px;bottom:3px;border-radius:3px;min-width:3px;background:hsl(240 6% 30%);opacity:.85;cursor:pointer}
.blk.on{background:var(--ok)}
.blk.man{top:19px;background:hsl(210 30% 30%)}.blk.man.on{background:var(--man)}
.blk.sel{box-shadow:0 0 0 2px var(--acc);z-index:3;opacity:1}
.ph{position:absolute;top:0;bottom:0;width:2px;background:var(--acc);pointer-events:none;z-index:5}
.inmark{position:absolute;top:0;bottom:0;width:2px;background:var(--man);pointer-events:none;z-index:4;border-left:2px dashed var(--man)}
.seg{display:flex;gap:8px;align-items:center;padding:4px 8px;border-left:3px solid transparent;border-radius:6px;margin-bottom:2px}
.seg:hover{background:var(--panel2)}.seg.sel{background:var(--panel2);box-shadow:0 0 0 1.5px var(--acc)}
.seg.on{border-left-color:var(--ok)}.seg.man.on{border-left-color:var(--man)}
.seg:not(.on){opacity:.55}
.seg img{width:46px;border-radius:5px;flex:none;cursor:pointer}
.seg input[type=checkbox]{width:16px;height:16px;accent-color:var(--ok);flex:none;cursor:pointer}
.seg .t{width:64px;flex:none}
.seg .t input{width:100%;background:transparent;border:1px solid transparent;color:var(--dim);border-radius:5px;padding:3px 4px;font-size:11.5px;text-align:right}
.seg .t input:hover{border-color:var(--line)}.seg .t input:focus{outline:none;border-color:var(--acc);background:var(--bg);color:var(--txt)}
.seg .lb{flex:1;background:transparent;border:1px solid transparent;color:var(--txt);border-radius:6px;padding:4px 8px;font-size:13px;min-width:0}
.seg .lb:hover{border-color:var(--line)}.seg .lb:focus{outline:none;border-color:var(--acc);background:var(--bg)}
.seg .op{flex:none;font-size:11px;padding:3px 8px}
.badge{flex:none;font-size:9.5px;color:var(--man);border:1px solid var(--man);border-radius:4px;padding:0 4px}
#keys{color:var(--dim);font-size:11px;padding:6px 2px}
kbd{background:var(--panel2);border:1px solid var(--line);border-radius:4px;padding:0 5px;font-size:10.5px;font-family:ui-monospace,monospace}
</style></head><body>
<header><h1>⭕ selects</h1><span id="stats" class="mono"></span><span style="flex:1"></span>
<button id="export">匯出 decisions</button></header>
<main>
<div id="keys"><kbd>space</kbd> 播放 · <kbd>←</kbd><kbd>→</kbd> ±0.5s · <kbd>i</kbd> 標入點 · <kbd>o</kbd> 標出點成段 ·
<kbd>s</kbd> 在播放頭切割 · <kbd>e</kbd> 勾/取消 · <kbd>↑</kbd><kbd>↓</kbd> 換段 · 上排=語音段、下排=手動圈選</div>
<div id="clips"></div>
</main>
<script>
const DATA=${JSON.stringify(DATA).replace(/</g, '\\u003c')};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=t=>{const m=Math.floor(t/60),s=Math.round((t%60)*10)/10;return s>=60?(m+1)+':00.0':m+':'+(s<10?'0':'')+s.toFixed(1)};
let seq=0;const newId=ci=>'m'+ci+'-'+(++seq);
let selId=null,activeClip=0;
const inPoint={};  // pending in-mark per clip
const root=document.getElementById('clips');

DATA.clips.forEach((clip,ci)=>{
  const sec=document.createElement('section');sec.className='clip';sec.dataset.ci=ci;
  sec.innerHTML='<h2>'+esc(clip.file)+' <span class="d mono">'+fmt(clip.duration)+'</span></h2>'+
    '<video id="v'+ci+'" src="'+esc(clip.fileUrl)+'" preload="metadata" controls playsinline onerror="this.style.display=\\'none\\'"></video>'+
    '<div class="ctl"><button data-i>標入點 (i)</button><button data-o>標出點成段 (o)</button>'+
    '<button data-s>切割 (s)</button><span class="tcnow mono" id="tc'+ci+'"></span></div>'+
    '<div class="strip" id="strip'+ci+'"><div class="ph" id="ph'+ci+'" style="left:0"></div></div>'+
    '<div id="rows'+ci+'"></div>';
  root.appendChild(sec);
  sec.addEventListener('pointerdown',()=>{activeClip=ci;});
  sec.querySelector('[data-i]').onclick=()=>markIn(ci);
  sec.querySelector('[data-o]').onclick=()=>markOut(ci);
  sec.querySelector('[data-s]').onclick=()=>splitAt(ci);
  const strip=sec.querySelector('#strip'+ci);
  strip.onclick=e=>{if(e.target.classList.contains('blk'))return;
    const r=strip.getBoundingClientRect();seek(ci,(e.clientX-r.left)/r.width*clip.duration);};
  render(ci);
  const v=document.getElementById('v'+ci);
  if(v){(function loop(){
    const t=v.currentTime||0;
    document.getElementById('ph'+ci).style.left=(t/clip.duration*100)+'%';
    document.getElementById('tc'+ci).textContent=fmt(t)+' / '+fmt(clip.duration)+(inPoint[ci]!=null?'　in@'+fmt(inPoint[ci]):'');
    requestAnimationFrame(loop);})();}
});

function seek(ci,t){const v=document.getElementById('v'+ci);
  if(!v||v.style.display==='none')return;
  const tt=Math.min(Math.max(0,t),DATA.clips[ci].duration-0.05);
  if(v.readyState===0){v.load();v.addEventListener('loadedmetadata',()=>{v.currentTime=tt},{once:true});}
  else v.currentTime=tt;}
function curT(ci){const v=document.getElementById('v'+ci);return v?v.currentTime||0:0;}

function render(ci){
  const clip=DATA.clips[ci];
  clip.spans.sort((a,b)=>a.start-b.start);
  const strip=document.getElementById('strip'+ci);
  strip.querySelectorAll('.blk,.inmark').forEach(e=>e.remove());
  const rows=document.getElementById('rows'+ci);rows.innerHTML='';
  for(const sp of clip.spans){
    const b=document.createElement('div');
    b.className='blk'+(sp.origin==='manual'?' man':'')+(sp.export?' on':'')+(sp.id===selId?' sel':'');
    b.id='blk-'+sp.id;
    b.style.left=(sp.start/clip.duration*100)+'%';
    b.style.width=Math.max((sp.end-sp.start)/clip.duration*100,.4)+'%';
    b.title=sp.label;
    b.onclick=e=>{e.stopPropagation();select(sp.id,true);};
    b.ondblclick=e=>{e.stopPropagation();toggle(sp.id);};
    strip.appendChild(b);
    const r=document.createElement('div');
    r.className='seg'+(sp.origin==='manual'?' man':'')+(sp.export?' on':'')+(sp.id===selId?' sel':'');
    r.id='seg-'+sp.id;
    r.innerHTML='<input type="checkbox"'+(sp.export?' checked':'')+'>'+
      (sp.img?'<img src="'+sp.img+'" data-seek>':'')+
      (sp.origin==='manual'?'<span class="badge">手動</span>':'')+
      '<span class="t"><input value="'+sp.start.toFixed(2)+'" data-f="start"></span>'+
      '<span class="t"><input value="'+sp.end.toFixed(2)+'" data-f="end"></span>'+
      '<input class="lb" value="'+esc(sp.label)+'" placeholder="（備註）">'+
      '<button class="op" data-del>✕</button>';
    rows.appendChild(r);
    r.querySelector('input[type=checkbox]').onchange=()=>toggle(sp.id);
    const im=r.querySelector('[data-seek]');if(im)im.onclick=()=>select(sp.id,true);
    r.querySelectorAll('.t input').forEach(inp=>{
      inp.onfocus=()=>select(sp.id,false);
      inp.onchange=()=>{const v=Number(inp.value);
        if(Number.isFinite(v))sp[inp.dataset.f]=Math.min(Math.max(0,v),clip.duration);
        if(sp.end<=sp.start)sp.end=sp.start+0.2;
        render(ci);stats();};});
    const lb=r.querySelector('.lb');
    lb.onfocus=()=>select(sp.id,false);
    lb.oninput=e=>{sp.label=e.target.value;};
    r.querySelector('[data-del]').onclick=()=>{
      clip.spans=clip.spans.filter(x=>x.id!==sp.id);
      if(selId===sp.id)selId=null;
      render(ci);stats();};
  }
  if(inPoint[ci]!=null){
    const m=document.createElement('div');m.className='inmark';
    m.style.left=(inPoint[ci]/clip.duration*100)+'%';strip.appendChild(m);}
}

const ALL=()=>DATA.clips.flatMap((c,ci)=>c.spans.map(s=>({ci,s})));
function findSpan(id){for(const {ci,s} of ALL())if(s.id===id)return{ci,s};return null;}
function select(id,seekTo){
  selId=id;const hit=findSpan(id);if(!hit)return;
  activeClip=hit.ci;
  DATA.clips.forEach((_,ci)=>render(ci));
  const row=document.getElementById('seg-'+id);
  if(row)row.scrollIntoView({block:'nearest'});
  if(seekTo)seek(hit.ci,hit.s.start+0.02);
}
function toggle(id){const hit=findSpan(id);if(!hit)return;
  hit.s.export=!hit.s.export;render(hit.ci);stats();}
function markIn(ci){inPoint[ci]=curT(ci);render(ci);}
function markOut(ci){
  const t=curT(ci);
  if(inPoint[ci]==null||t<=inPoint[ci])return;
  const sp={id:newId(ci),start:Math.round(inPoint[ci]*100)/100,end:Math.round(t*100)/100,
    label:'',origin:'manual',export:true,img:''};
  DATA.clips[ci].spans.push(sp);
  inPoint[ci]=null;render(ci);stats();select(sp.id,false);}
function splitAt(ci){
  const t=curT(ci);
  const clip=DATA.clips[ci];
  const sp=clip.spans.find(s=>t>s.start+0.05&&t<s.end-0.05&&(selId?s.id===selId:true))
    ||clip.spans.find(s=>t>s.start+0.05&&t<s.end-0.05);
  if(!sp)return;
  const right={...sp,id:newId(ci),start:Math.round(t*100)/100,img:''};
  sp.end=Math.round(t*100)/100;
  clip.spans.push(right);
  render(ci);stats();select(right.id,false);}
function move(d){
  const list=ALL();const i=list.findIndex(x=>x.s.id===selId);
  const n=list[Math.min(list.length-1,Math.max(0,i+d))];
  if(n)select(n.s.id,true);}
function stats(){
  const spans=ALL().map(x=>x.s);const on=spans.filter(s=>s.export);
  const dur=on.reduce((a,s)=>a+(s.end-s.start),0);
  document.getElementById('stats').textContent=spans.length+' 段 · 勾選 '+on.length+' · 匯出約 '+fmt(dur);}

document.addEventListener('keydown',e=>{
  const tag=document.activeElement.tagName;
  if(tag==='INPUT'){if(e.key==='Escape'||e.key==='Enter')document.activeElement.blur();return;}
  const ci=activeClip;
  if(e.key===' '){e.preventDefault();const v=document.getElementById('v'+ci);
    if(v)v.paused?v.play():v.pause();}
  else if(e.key==='ArrowLeft')seek(ci,curT(ci)-0.5);
  else if(e.key==='ArrowRight')seek(ci,curT(ci)+0.5);
  else if(e.key==='i')markIn(ci);
  else if(e.key==='o')markOut(ci);
  else if(e.key==='s')splitAt(ci);
  else if(e.key==='e'&&selId)toggle(selId);
  else if(e.key==='ArrowUp'){e.preventDefault();move(-1);}
  else if(e.key==='ArrowDown'){e.preventDefault();move(1);}
});

document.getElementById('export').onclick=()=>{
  const out={generatedAt:new Date().toISOString(),clips:DATA.clips.map(c=>({
    file:c.file,path:c.path,
    spans:c.spans.map(({img,...s})=>s)}))};
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(out,null,1)],{type:'application/json'}));
  a.download='selects.decisions.json';a.click();};
stats();
</script></body></html>`;

fs.mkdirSync('out', {recursive: true});
fs.writeFileSync('out/selects.html', html);
const n = index.clips.reduce((a, c) => a + c.segments.length, 0);
console.log(`out/selects.html — ${index.clips.length} clips, ${n} ASR spans`);
