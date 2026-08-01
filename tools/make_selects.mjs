// selects step 2: render the stringout index as a pull-selects page
// (out/selects.html). ASR sentences are checkable candidate spans; manual
// spans are drag-selected on a full-width zoomable timeline (ctrl+wheel zoom,
// shift+wheel pan), fine-tuned in a pending panel, then added to the export
// list. Exports selects.decisions.json for apply_selects.py.
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
main{max-width:1400px;margin:0 auto;padding:14px 16px 90px}
.clip{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px;margin-bottom:16px}
.clip h2{font-size:13px;margin:0 0 8px;display:flex;gap:10px;align-items:baseline}
.clip h2 .d{color:var(--dim);font-weight:400;font-size:12px}
.clip h2 .hint{margin-left:auto;color:var(--dim);font-weight:400;font-size:11px}
/* ---- full-width zoomable timeline ---- */
.tlview{position:relative;overflow-x:auto;overflow-y:hidden;border-radius:6px;background:var(--panel2);
margin-bottom:10px;cursor:crosshair;user-select:none;scrollbar-width:thin}
.tlview::-webkit-scrollbar{height:8px}
.tlview::-webkit-scrollbar-thumb{background:var(--line);border-radius:4px}
.tlcanvas{position:relative;height:72px}
.ruler-lab{position:absolute;top:1px;font-size:9.5px;color:color-mix(in srgb,var(--dim) 85%,transparent);transform:translateX(-50%);pointer-events:none}
.ruler-tick{position:absolute;top:12px;height:4px;width:1px;background:color-mix(in srgb,var(--dim) 30%,transparent);pointer-events:none}
.blk{position:absolute;border-radius:3px;min-width:3px;background:hsl(240 6% 32%);opacity:.9;cursor:pointer}
.blk.asr{top:18px;height:22px}
.blk.asr.on{background:var(--ok)}
.blk.man{top:44px;height:22px;background:hsl(210 30% 32%)}
.blk.man.on{background:var(--man)}
.blk.sel{box-shadow:0 0 0 2px var(--acc);z-index:3;opacity:1}
.blk .bl{font-size:9px;line-height:22px;padding:0 3px;color:#0e0e12;font-weight:700;
white-space:nowrap;overflow:hidden;display:block;pointer-events:none}
.ph{position:absolute;top:0;bottom:0;width:2px;background:var(--acc);pointer-events:none;z-index:5}
.ph::before{content:"";position:absolute;top:0;left:-3px;border:4px solid transparent;border-top-color:var(--acc)}
.selbox{position:absolute;top:0;bottom:0;background:color-mix(in srgb,var(--man) 22%,transparent);
border-left:1.5px solid var(--man);border-right:1.5px solid var(--man);pointer-events:none;z-index:4}
/* ---- two-pane body ---- */
.body{display:grid;grid-template-columns:minmax(280px,430px) minmax(0,1fr);gap:14px}
.lpane{position:sticky;top:58px;align-self:start;z-index:10}
video{width:100%;max-height:40vh;border-radius:8px;background:#000;margin-bottom:8px}
.tcnow{color:var(--dim);font-size:12px;text-align:right;margin-bottom:6px}
/* pending selection panel */
.pend{border:1px dashed var(--man);border-radius:10px;padding:10px;margin-bottom:8px}
.pend.off{opacity:.45;border-style:dotted}
.pend .ttl{font-size:11.5px;color:var(--man);letter-spacing:1px;margin-bottom:6px}
.pend .r{display:flex;gap:6px;align-items:center;margin-bottom:6px;flex-wrap:wrap}
.pend input[type=text]{flex:1;min-width:120px;background:var(--bg);border:1px solid var(--line);color:var(--txt);border-radius:6px;padding:5px 8px;font-size:12.5px}
.pend input.n{width:74px;background:var(--bg);border:1px solid var(--line);color:var(--txt);border-radius:6px;padding:5px 6px;font-size:12.5px;text-align:right}
.pend input:focus{outline:none;border-color:var(--acc)}
.pend .dur{color:var(--dim);font-size:11.5px}
.pend .add{background:var(--man);color:#0e1620;border:0;font-weight:700}
.rows{max-height:calc(100vh - 130px);overflow-y:auto;padding-right:6px;overscroll-behavior:contain}
.rows::-webkit-scrollbar{width:8px}
.rows::-webkit-scrollbar-thumb{background:var(--line);border-radius:4px}
@media(max-width:860px){.body{display:block}
.lpane{top:52px;background:var(--panel);padding-bottom:6px}
video{max-height:28vh}
.rows{max-height:none;overflow:visible;padding-right:0}}
/* rows */
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
<div id="keys"><b>時間軸：</b>滑鼠<b>拖曳＝圈選</b>（微調後按「加入」）· 點一下＝跳播 ·
<kbd>ctrl</kbd>+滾輪＝縮放 · <kbd>shift</kbd>+滾輪＝平移 ·
<b>鍵盤：</b><kbd>space</kbd> 播放 · <kbd>←</kbd><kbd>→</kbd> ±0.5s · <kbd>s</kbd> 播放頭切割 · <kbd>e</kbd> 勾/取消 · <kbd>↑</kbd><kbd>↓</kbd> 換段</div>
<div id="clips"></div>
</main>
<script>
const DATA=${JSON.stringify(DATA).replace(/</g, '\\u003c')};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=t=>{const m=Math.floor(t/60),s=Math.round((t%60)*10)/10;return s>=60?(m+1)+':00.0':m+':'+(s<10?'0':'')+s.toFixed(1)};
let seq=0;const newId=ci=>'m'+ci+'-'+(++seq);
let selId=null,activeClip=0;
const zoom={},pend={};  // per-clip zoom factor / pending manual selection
const root=document.getElementById('clips');

DATA.clips.forEach((clip,ci)=>{
  zoom[ci]=1;pend[ci]=null;
  const sec=document.createElement('section');sec.className='clip';sec.dataset.ci=ci;
  sec.innerHTML='<h2>'+esc(clip.file)+' <span class="d mono">'+fmt(clip.duration)+'</span>'+
    '<span class="hint">拖曳圈選 · ctrl+滾輪縮放 · shift+滾輪平移</span></h2>'+
    '<div class="tlview" id="tlv'+ci+'"><div class="tlcanvas" id="tlc'+ci+'"></div></div>'+
    '<div class="body"><div class="lpane">'+
    '<video id="v'+ci+'" src="'+esc(clip.fileUrl)+'" preload="metadata" controls playsinline onerror="this.style.display=\\'none\\'"></video>'+
    '<div class="tcnow mono" id="tc'+ci+'"></div>'+
    '<div class="pend off" id="pend'+ci+'"><div class="ttl">手動圈選</div>'+
    '<div class="r"><input class="n mono" data-p="start" placeholder="起"><span>–</span>'+
    '<input class="n mono" data-p="end" placeholder="訖"><span class="dur" id="pdur'+ci+'">在時間軸上拖曳一段</span></div>'+
    '<div class="r"><input type="text" data-p="label" placeholder="備註（要這段做什麼）">'+
    '<button data-prev>▶ 試聽</button><button class="add" data-add>加入 ↩</button><button data-clr>清除</button></div></div></div>'+
    '<div class="rows" id="rows'+ci+'"></div></div>';
  root.appendChild(sec);
  sec.addEventListener('pointerdown',()=>{activeClip=ci;});
  wireTimeline(ci);
  wirePend(ci);
  renderRows(ci);rebuildTl(ci);
  const v=document.getElementById('v'+ci);
  if(v){(function loop(){
    const t=v.currentTime||0;
    const ph=document.getElementById('ph'+ci);
    if(ph)ph.style.left=(t*pps(ci))+'px';
    document.getElementById('tc'+ci).textContent=fmt(t)+' / '+fmt(clip.duration);
    requestAnimationFrame(loop);})();}
});

const CLIPOF={};const reindex=()=>{for(const k in CLIPOF)delete CLIPOF[k];
  DATA.clips.forEach((c,ci)=>c.spans.forEach(s=>CLIPOF[s.id]={ci,s}));};
reindex();

// ---- timeline geometry ----
function viewW(ci){return document.getElementById('tlv'+ci).clientWidth||800;}
function pps(ci){return (viewW(ci)/DATA.clips[ci].duration)*zoom[ci];}
function xToT(ci,clientX){
  const tlv=document.getElementById('tlv'+ci);
  const r=tlv.getBoundingClientRect();
  return Math.min(Math.max(0,(clientX-r.left+tlv.scrollLeft)/pps(ci)),DATA.clips[ci].duration);}

function rebuildTl(ci){
  const clip=DATA.clips[ci];
  const c=document.getElementById('tlc'+ci);
  const P=pps(ci);
  c.style.width=(clip.duration*P)+'px';
  c.innerHTML='';
  const ladder=[0.2,0.5,1,2,5,10,15,30,60,120];
  const iv=ladder.find(i=>i*P>=70)||120;
  for(let t=0;t<=clip.duration;t+=iv){
    c.insertAdjacentHTML('beforeend','<span class="ruler-lab mono" style="left:'+(t*P)+'px">'+fmt(t)+'</span>');}
  for(let t=0;t<=clip.duration;t+=iv/5){
    c.insertAdjacentHTML('beforeend','<span class="ruler-tick" style="left:'+(t*P)+'px"></span>');}
  clip.spans.sort((a,b)=>a.start-b.start);
  for(const sp of clip.spans){
    const b=document.createElement('div');
    b.className='blk '+(sp.origin==='manual'?'man':'asr')+(sp.export?' on':'')+(sp.id===selId?' sel':'');
    b.id='blk-'+sp.id;
    b.style.left=(sp.start*P)+'px';
    b.style.width=Math.max((sp.end-sp.start)*P,3)+'px';
    b.title=fmt(sp.start)+'–'+fmt(sp.end)+' '+sp.label;
    if((sp.end-sp.start)*P>34)b.innerHTML='<span class="bl">'+esc(sp.label)+'</span>';
    b.onpointerdown=e=>e.stopPropagation();
    b.onclick=e=>{e.stopPropagation();select(sp.id,true);};
    b.ondblclick=e=>{e.stopPropagation();toggle(sp.id);};
    c.appendChild(b);
  }
  const p=pend[ci];
  if(p)c.insertAdjacentHTML('beforeend',
    '<div class="selbox" style="left:'+(p.start*P)+'px;width:'+((p.end-p.start)*P)+'px"></div>');
  c.insertAdjacentHTML('beforeend','<div class="ph" id="ph'+ci+'" style="left:0"></div>');
  const v=document.getElementById('v'+ci);
  if(v){const ph=document.getElementById('ph'+ci);if(ph)ph.style.left=((v.currentTime||0)*P)+'px';}
}

// ---- timeline interactions: drag-select / click-seek / zoom / pan ----
function wireTimeline(ci){
  const tlv=document.getElementById('tlv'+ci);
  let drag=null;
  tlv.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;
    drag={x0:e.clientX,t0:xToT(ci,e.clientX),moved:false};
    tlv.setPointerCapture(e.pointerId);
  });
  tlv.addEventListener('pointermove',e=>{
    if(!drag)return;
    if(Math.abs(e.clientX-drag.x0)>4)drag.moved=true;
    if(drag.moved){
      const t1=xToT(ci,e.clientX);
      pend[ci]={start:Math.round(Math.min(drag.t0,t1)*100)/100,
                end:Math.round(Math.max(drag.t0,t1)*100)/100,
                label:pend[ci]?pend[ci].label:''};
      rebuildTl(ci);paintPend(ci);
    }
  });
  tlv.addEventListener('pointerup',e=>{
    if(!drag)return;
    if(!drag.moved)seek(ci,drag.t0);
    else seek(ci,pend[ci].start);
    drag=null;
  });
  tlv.addEventListener('wheel',e=>{
    if(e.ctrlKey){
      e.preventDefault();
      const tCur=xToT(ci,e.clientX);
      const r=tlv.getBoundingClientRect();
      const maxZ=Math.max(1,250/(viewW(ci)/DATA.clips[ci].duration));
      zoom[ci]=Math.min(maxZ,Math.max(1,zoom[ci]*Math.exp(-e.deltaY/300)));
      rebuildTl(ci);
      tlv.scrollLeft=tCur*pps(ci)-(e.clientX-r.left);
    }else if(e.shiftKey){
      e.preventDefault();
      tlv.scrollLeft+=(e.deltaY||e.deltaX);
    }
  },{passive:false});
}

// ---- pending panel ----
function paintPend(ci){
  const box=document.getElementById('pend'+ci);
  const p=pend[ci];
  box.classList.toggle('off',!p);
  const S=box.querySelector('[data-p=start]'),E=box.querySelector('[data-p=end]');
  const L=box.querySelector('[data-p=label]');
  if(p){
    if(document.activeElement!==S)S.value=p.start.toFixed(2);
    if(document.activeElement!==E)E.value=p.end.toFixed(2);
    if(document.activeElement!==L)L.value=p.label||'';
    document.getElementById('pdur'+ci).textContent='長度 '+(p.end-p.start).toFixed(2)+'s';
  }else{
    S.value='';E.value='';L.value='';
    document.getElementById('pdur'+ci).textContent='在時間軸上拖曳一段';
  }
}
function wirePend(ci){
  const box=document.getElementById('pend'+ci);
  const clip=DATA.clips[ci];
  box.querySelectorAll('input.n').forEach(inp=>{
    inp.onchange=()=>{
      const p=pend[ci]||{start:0,end:Math.min(2,clip.duration),label:''};
      const v=Number(inp.value);
      if(Number.isFinite(v))p[inp.dataset.p]=Math.min(Math.max(0,v),clip.duration);
      if(p.end<=p.start)p.end=Math.min(p.start+0.2,clip.duration);
      pend[ci]=p;rebuildTl(ci);paintPend(ci);};});
  box.querySelector('[data-p=label]').oninput=e=>{if(pend[ci])pend[ci].label=e.target.value;};
  box.querySelector('[data-add]').onclick=()=>{
    const p=pend[ci];if(!p)return;
    const sp={id:newId(ci),start:p.start,end:p.end,label:p.label||'',origin:'manual',export:true,img:''};
    clip.spans.push(sp);reindex();
    pend[ci]=null;
    rebuildTl(ci);renderRows(ci);paintPend(ci);stats();
    select(sp.id,false);};
  box.querySelector('[data-clr]').onclick=()=>{pend[ci]=null;rebuildTl(ci);paintPend(ci);};
  box.querySelector('[data-prev]').onclick=()=>{
    const p=pend[ci];if(!p)return;
    playRange(ci,p.start,p.end);};
}

// ---- rows ----
function renderRows(ci){
  const clip=DATA.clips[ci];
  clip.spans.sort((a,b)=>a.start-b.start);
  const rows=document.getElementById('rows'+ci);rows.innerHTML='';
  for(const sp of clip.spans){
    const r=document.createElement('div');
    r.className='seg'+(sp.origin==='manual'?' man':'')+(sp.export?' on':'')+(sp.id===selId?' sel':'');
    r.id='seg-'+sp.id;
    r.innerHTML='<input type="checkbox"'+(sp.export?' checked':'')+'>'+
      (sp.img?'<img src="'+sp.img+'" data-seek>':'')+
      (sp.origin==='manual'?'<span class="badge">手動</span>':'')+
      '<span class="t"><input value="'+sp.start.toFixed(2)+'" data-f="start"></span>'+
      '<span class="t"><input value="'+sp.end.toFixed(2)+'" data-f="end"></span>'+
      '<input class="lb" value="'+esc(sp.label)+'" placeholder="（備註）">'+
      '<button class="op" data-play title="試聽這段">▶</button>'+
      '<button class="op" data-del>✕</button>';
    rows.appendChild(r);
    r.querySelector('input[type=checkbox]').onchange=()=>toggle(sp.id);
    const im=r.querySelector('[data-seek]');if(im)im.onclick=()=>select(sp.id,true);
    r.querySelectorAll('.t input').forEach(inp=>{
      inp.onfocus=()=>select(sp.id,false);
      inp.onchange=()=>{const v=Number(inp.value);
        if(Number.isFinite(v))sp[inp.dataset.f]=Math.min(Math.max(0,v),clip.duration);
        if(sp.end<=sp.start)sp.end=sp.start+0.2;
        renderRows(ci);rebuildTl(ci);stats();};});
    const lb=r.querySelector('.lb');
    lb.onfocus=()=>select(sp.id,false);
    lb.oninput=e=>{sp.label=e.target.value;};
    r.querySelector('[data-play]').onclick=()=>{
      select(sp.id,false);playRange(ci,sp.start,sp.end);};
    r.querySelector('[data-del]').onclick=()=>{
      clip.spans=clip.spans.filter(x=>x.id!==sp.id);reindex();
      if(selId===sp.id)selId=null;
      renderRows(ci);rebuildTl(ci);stats();};
  }
}

// ---- shared actions ----
const rangeStop={};
function playRange(ci,start,end){
  const v=document.getElementById('v'+ci);
  if(!v||v.style.display==='none')return;
  if(rangeStop[ci]){cancelAnimationFrame(rangeStop[ci]);rangeStop[ci]=null;}
  seek(ci,start);v.play();
  // frame-accurate stop: rAF watcher (timeupdate is too coarse — overshoots
  // up to 250ms), and snap to the exact end so the playhead lands on the
  // selection's right edge instead of a few frames past it
  let started=false;
  const tick=()=>{
    if(v.seeking){rangeStop[ci]=requestAnimationFrame(tick);return;}
    if(!v.paused)started=true;
    if(started&&v.paused){rangeStop[ci]=null;return;}
    if(v.currentTime>=end-1/60){v.pause();v.currentTime=end;rangeStop[ci]=null;return;}
    rangeStop[ci]=requestAnimationFrame(tick);
  };
  rangeStop[ci]=requestAnimationFrame(tick);
}
function seek(ci,t){const v=document.getElementById('v'+ci);
  if(!v||v.style.display==='none')return;
  const tt=Math.min(Math.max(0,t),DATA.clips[ci].duration-0.05);
  if(v.readyState===0){v.load();v.addEventListener('loadedmetadata',()=>{v.currentTime=tt},{once:true});}
  else v.currentTime=tt;}
function curT(ci){const v=document.getElementById('v'+ci);return v?v.currentTime||0:0;}
function select(id,seekTo){
  selId=id;const hit=CLIPOF[id];if(!hit)return;
  activeClip=hit.ci;
  DATA.clips.forEach((_,ci)=>{renderRows(ci);rebuildTl(ci);});
  const row=document.getElementById('seg-'+id);
  if(row)row.scrollIntoView({block:'nearest'});
  const blk=document.getElementById('blk-'+id);
  if(blk)blk.scrollIntoView({block:'nearest',inline:'nearest'});
  if(seekTo)seek(hit.ci,hit.s.start+0.02);}
function toggle(id){const hit=CLIPOF[id];if(!hit)return;
  hit.s.export=!hit.s.export;renderRows(hit.ci);rebuildTl(hit.ci);stats();}
function splitAt(ci){
  const t=curT(ci);
  const clip=DATA.clips[ci];
  const sp=clip.spans.find(s=>t>s.start+0.05&&t<s.end-0.05&&(selId?s.id===selId:true))
    ||clip.spans.find(s=>t>s.start+0.05&&t<s.end-0.05);
  if(!sp)return;
  const right={...sp,id:newId(ci),start:Math.round(t*100)/100,img:''};
  sp.end=Math.round(t*100)/100;
  clip.spans.push(right);reindex();
  renderRows(ci);rebuildTl(ci);stats();select(right.id,false);}
function move(d){
  const list=DATA.clips.flatMap(c=>c.spans);
  const i=list.findIndex(s=>s.id===selId);
  const n=list[Math.min(list.length-1,Math.max(0,i+d))];
  if(n)select(n.id,true);}
function stats(){
  const spans=DATA.clips.flatMap(c=>c.spans);
  const on=spans.filter(s=>s.export);
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
  else if(e.key==='s')splitAt(ci);
  else if(e.key==='e'&&selId)toggle(selId);
  else if(e.key==='ArrowUp'){e.preventDefault();move(-1);}
  else if(e.key==='ArrowDown'){e.preventDefault();move(1);}
});

window.addEventListener('resize',()=>DATA.clips.forEach((_,ci)=>rebuildTl(ci)));

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
