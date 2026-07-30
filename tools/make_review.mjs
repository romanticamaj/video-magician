// Generate a self-contained human-review page (out/review.html) from the
// project config + subtitles. Each reviewable item gets a thumbnail from the
// rendered video, editable fields, and an approve / request-changes status.
// The page exports review.feedback.json for the agent to apply.
//
// Usage: node tools/make_review.mjs [--video out/final.mp4] [--revision 1]
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';

const args = process.argv.slice(2);
const argOf = (k, d) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : d;
};
const VIDEO = argOf('--video', 'out/final.mp4');
const REVISION = Number(argOf('--revision', '1'));
const FPS = 30;

// --- load config (transpile the TS file, type-only imports vanish) ---
const src = fs.readFileSync('src/videoConfig.ts', 'utf8');
const js = ts.transpileModule(src, {
  compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022},
}).outputText;
fs.mkdirSync('local', {recursive: true});
const tmpMod = path.resolve('local/_videoConfig.review.mjs');
fs.writeFileSync(tmpMod, js);
const {CONFIG} = await import(pathToFileURL(tmpMod).href);
const subs = JSON.parse(fs.readFileSync('src/subtitles.json', 'utf8'));

// --- cut mapping (mirror of src/engine/cuts.ts) ---
const cuts = [...CONFIG.cuts].sort((a, b) => a[0] - b[0]);
const coverOff = CONFIG.cover ? CONFIG.coverFrames / FPS : 0;
const isRemoved = (t) => cuts.some(([f, to]) => t >= f && t < to);
const srcToOut = (t) => {
  let removed = 0;
  for (const [f, to] of cuts) {
    if (t >= to) removed += to - f;
    else if (t > f) removed += t - f;
  }
  return t - removed;
};

// --- thumbnail extraction ---
const haveVideo = fs.existsSync(VIDEO);
const thumbSrc = haveVideo ? VIDEO : `public/${CONFIG.videoFile}`;
const thumb = (tSrc) => {
  // rendered video includes cover offset + cuts; raw footage does not
  const t = haveVideo ? srcToOut(Math.min(tSrc, CONFIG.srcDurationSec - 0.1)) + coverOff : tSrc;
  const tmp = path.resolve('local/_rev_thumb.jpg');
  try {
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss', String(Math.max(0, t)), '-i', thumbSrc, '-frames:v', '1', '-vf', 'scale=180:-1', '-q:v', '6', tmp]);
    return 'data:image/jpeg;base64,' + fs.readFileSync(tmp).toString('base64');
  } catch {
    return '';
  }
};

// --- flatten reviewable items ---
const cutLen = cuts.reduce((a, [f, t]) => a + (t - f), 0);
const totalOut = coverOff + (CONFIG.srcDurationSec - cutLen) + CONFIG.outroFrames / FPS;
const o = (tSrc) => srcToOut(Math.min(tSrc, CONFIG.srcDurationSec)) + coverOff;

const items = [];
// tl = [start, end] in OUTPUT-video seconds (what the player shows); null = not on timeline
const add = (id, group, desc, tSrc, fields, tl) =>
  items.push({id, group, desc, t: tSrc, img: tSrc == null ? '' : thumb(tSrc), fields, tl: tl ?? null});

if (CONFIG.cover) {
  add('cover', '特效', '封面：徽章＋主標題', 0.01, {
    badge: CONFIG.cover.badge,
    titleLines: CONFIG.cover.titleLines.join(' / '),
  }, [0, coverOff || 0.9]);
}
if (CONFIG.liquidTitle) {
  const c = CONFIG.liquidTitle;
  add('liquidTitle', '特效', 'Liquid Glass 頂部標題', (c.from + c.to) / 2, {
    text: c.text, from: c.from, to: c.to,
  }, [o(c.from), o(c.to)]);
}
if (CONFIG.bigBang) {
  const c = CONFIG.bigBang;
  add('bigBang', '特效', '逐字誇張大字（對齊語音）', (c.start + c.end) / 2, {
    text: c.text, start: c.start, end: c.end,
  }, [o(c.start), o(c.end)]);
}
CONFIG.chips.forEach((c, i) =>
  add(`chip-${i}`, '章節', `章節提示 #${i + 1}（icon: ${c.icon}）`, (c.from + c.to) / 2, {
    label: c.label, from: c.from, to: c.to,
  }, [o(c.from), o(c.to)])
);
if (CONFIG.stamp) {
  const c = CONFIG.stamp;
  add('stamp', '特效', '完成印章＋彩帶', (c.from + c.to) / 2, {text: c.text, from: c.from, to: c.to}, [o(c.from), o(c.to)]);
}
if (CONFIG.counter) {
  const c = CONFIG.counter;
  add('counter', '特效', '數字滾動', (c.from + c.to) / 2, {value: c.value, label: c.label, from: c.from, to: c.to}, [o(c.from), o(c.to)]);
}
if (CONFIG.endCard) {
  const c = CONFIG.endCard;
  add('endCard', '特效', '片尾 CTA 卡', c.from + 1, {title: c.title, url: c.url, cta: c.cta, from: c.from}, [o(c.from), totalOut]);
}
cuts.forEach((c, i) =>
  add(`cut-${i}`, '剪輯', `剪掉 ${c[0]}s – ${c[1]}s（${(c[1] - c[0]).toFixed(2)}s）`, c[0] - 0.5, {from: c[0], to: c[1]}, [o(c[0]), o(c[0])])
);
CONFIG.sfx.cues.forEach((c, i) =>
  add(`sfx-${i}`, '音效', `音效 ${c.file}`, c.at, {at: c.at, volume: c.volume ?? 1}, [o(c.at), o(c.at) + (c.durationSec ?? 1.5)])
);
if (CONFIG.bgm) add('bgm', '音效', `BGM：${CONFIG.bgm.file}（全片）`, null, {file: CONFIG.bgm.file}, [0, totalOut]);
subs.forEach((s, i) => {
  const removed = isRemoved(s.start) && isRemoved(s.end - 0.01);
  add(`sub-${i}`, '字幕', removed ? '（在剪掉區間內，不會出現）' : `${s.speaker}`, removed ? null : (s.start + s.end) / 2, {
    text: s.text, start: s.start, end: s.end, speaker: s.speaker,
  }, removed ? null : [o(s.start), o(s.end)]);
});

// --- emit page ---
const DATA = {revision: REVISION, generatedAt: new Date().toISOString(), video: haveVideo ? path.basename(VIDEO) : null, items};
DATA.totalOut = Math.round(totalOut * 100) / 100;

const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>video-magician 校驗 · rev ${REVISION}</title>
<style>
:root{--bg:hsl(240 8% 5%);--panel:hsl(240 8% 10%);--panel2:hsl(240 8% 14%);--line:hsl(240 8% 18%);
--txt:hsl(240 10% 92%);--dim:hsl(240 6% 55%);--acc:#ffc53d;--ok:hsl(141 71% 48%);--warn:hsl(0 83% 62%)}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--txt);font:14px/1.55 "Noto Sans TC",Inter,system-ui,sans-serif}
.mono{font-family:ui-monospace,SFMono-Regular,monospace;font-variant-numeric:tabular-nums}
header{position:sticky;top:0;background:color-mix(in srgb,var(--bg) 92%,transparent);backdrop-filter:blur(10px);
border-bottom:1px solid var(--line);padding:10px 16px;display:flex;gap:12px;align-items:center;z-index:20}
h1{font-size:15px;margin:0;font-weight:700}#stats{color:var(--dim);font-size:12px}
button{cursor:pointer;border:1px solid var(--line);background:var(--panel);color:var(--txt);border-radius:7px;padding:6px 12px;font-size:12.5px}
#export{background:var(--acc);color:#1a1206;border:0;font-weight:700}
#densityWrap{height:6px;background:var(--panel);cursor:pointer}
#density{display:flex;height:100%}
main{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:14px;max-width:1180px;margin:0 auto;padding:14px 16px 90px}
@media(max-width:900px){main{grid-template-columns:1fr}#detail{position:fixed;left:0;right:0;bottom:0;max-height:46vh;overflow:auto;
border-radius:14px 14px 0 0;box-shadow:0 -12px 40px rgba(0,0,0,.6);z-index:30;margin:0}}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:10px}
#player{display:flex;justify-content:center;padding:10px}
video{max-height:300px;max-width:100%;border-radius:8px;background:#000}
#tlwrap{padding:10px 12px 12px;user-select:none}
#ruler{position:relative;height:18px;margin-left:52px}
#ruler .tick{position:absolute;top:10px;bottom:0;width:1px;background:color-mix(in srgb,var(--dim) 25%,transparent)}
#ruler .lab{position:absolute;top:0;font-size:10px;color:color-mix(in srgb,var(--dim) 85%,transparent);transform:translateX(-50%)}
#lanes{position:relative;cursor:pointer}
.lane{display:flex;align-items:center;height:24px;margin-bottom:4px}
.lane .hd{width:52px;flex:none;font-size:10.5px;color:var(--dim);letter-spacing:1px}
.lane .strip{position:relative;flex:1;height:100%;background:var(--panel2);border-radius:4px;overflow:hidden}
.blk{position:absolute;top:2px;bottom:2px;border-radius:3px;min-width:4px;opacity:.92;overflow:hidden;
font-size:9.5px;line-height:18px;padding:0 3px;white-space:nowrap;color:#0e0e12;font-weight:700;cursor:pointer}
.blk.cutm{min-width:2px;width:3px!important;background:var(--warn)!important;top:0;bottom:0}
.blk.sel{box-shadow:0 0 0 2px var(--acc);z-index:3;opacity:1}
#ph{position:absolute;top:0;bottom:0;left:52px;width:2px;background:var(--acc);pointer-events:none;z-index:5}
#ph::before{content:"";position:absolute;top:-4px;left:-4px;width:10px;height:10px;border-radius:50%;background:var(--acc)}
#list{margin-top:14px}
.grp{font-size:11.5px;color:var(--acc);letter-spacing:2px;margin:14px 4px 6px}
.row{display:flex;gap:10px;align-items:center;padding:6px 10px;border-left:3px solid var(--rowc,var(--line));
border-radius:6px;cursor:pointer;margin-bottom:2px}
.row:hover{background:var(--panel2)}.row.sel{background:var(--panel2);box-shadow:0 0 0 1.5px var(--acc)}
.row .tc{width:74px;flex:none;font-size:11px;color:var(--dim)}
.row .tx{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}
.row .dot{width:8px;height:8px;border-radius:50%;flex:none;background:var(--rowc,var(--dim))}
#detail{padding:14px;margin-top:0;align-self:start;position:sticky;top:64px}
#detail h3{margin:0 0 2px;font-size:13px}#detail .desc{color:var(--dim);font-size:12px;margin-bottom:10px}
#detail img{width:100%;max-width:200px;border-radius:8px;margin-bottom:10px}
.f{margin-bottom:8px}.f label{display:block;font-size:10.5px;color:var(--dim);margin-bottom:2px}
.f input{width:100%;background:var(--bg);border:1px solid var(--line);color:var(--txt);border-radius:6px;padding:6px 8px;font-size:13px}
.f input:focus{outline:none;border-color:var(--acc)}
.acts{display:flex;gap:6px;margin:10px 0}
.acts button{flex:1;padding:7px 0;font-size:12.5px}
.acts .on-ok{background:color-mix(in srgb,var(--ok) 18%,transparent);border-color:var(--ok);color:var(--ok)}
.acts .on-chg{background:color-mix(in srgb,var(--warn) 15%,transparent);border-color:var(--warn);color:var(--warn)}
.acts .on-del{background:var(--panel2)}
textarea{width:100%;background:var(--bg);border:1px solid var(--line);color:var(--txt);border-radius:6px;padding:6px 8px;font-size:13px;min-height:52px}
#nav{display:flex;gap:6px;margin-top:10px}#nav button{flex:1}
kbd{background:var(--panel2);border:1px solid var(--line);border-radius:4px;padding:0 5px;font-size:10.5px;font-family:ui-monospace,monospace}
#keys{color:var(--dim);font-size:11px;margin-top:10px;line-height:1.9}
#empty{color:var(--dim);font-size:13px;text-align:center;padding:30px 0}
</style></head><body>
<header><h1>🎬 rev ${REVISION}</h1><span id="stats" class="mono"></span><span style="flex:1"></span>
<span id="tcnow" class="mono" style="color:var(--dim);font-size:12px"></span>
<button id="export">匯出 feedback</button></header>
<div id="densityWrap"><div id="density"></div></div>
<main>
<section>
${haveVideo ? `<div class="panel" id="player"><video id="vid" src="${path.basename(VIDEO)}" playsinline preload="metadata" onerror="this.closest('#player').style.display='none'"></video></div>` : ''}
<div class="panel" id="tlwrap" style="margin-top:10px">
  <div id="ruler"></div>
  <div id="lanes"><div id="ph" style="display:none"></div></div>
</div>
<div id="list"></div>
</section>
<aside class="panel" id="detail"><div id="empty">點時間軸方塊或清單列開始審核</div><div id="body" style="display:none">
<h3 id="d-id" class="mono"></h3><div class="desc" id="d-desc"></div>
<img id="d-img" alt="" style="display:none">
<div id="d-fields"></div>
<div class="acts">
<button data-a="approved">✅ 通過</button><button data-a="changes_requested">✏️ 要改</button><button data-a="removed">🗑️ 移除</button></div>
<textarea id="d-note" placeholder="要怎麼改？（自由描述，AI 會處理）"></textarea>
<div id="nav"><button id="prev">↑ 上一項</button><button id="next">↓ 下一項</button></div>
<div id="keys"><kbd>space</kbd> 播放 · <kbd>←</kbd><kbd>→</kbd> ±1s · <kbd>↑</kbd><kbd>↓</kbd> 換項 · <kbd>a</kbd> 通過 · <kbd>r</kbd> 要改 · <kbd>x</kbd> 移除</div>
</div></aside>
</main>
<script>
const DATA=${JSON.stringify(DATA).replace(/</g, '\\u003c')};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const T=DATA.totalOut;
const STATUS={pending:'hsl(240 6% 40%)',approved:'var(--ok)',changes_requested:'var(--warn)',removed:'hsl(240 6% 28%)'};
const LANES=['特效','章節','字幕','音效','剪輯'];
const LANEC={'特效':'#5d93ba','章節':'#5dbaa0','字幕':'#ffc53d','音效':'#8f5dba','剪輯':'#ba5d7a'};
const state={};DATA.items.forEach(it=>state[it.id]={status:'pending',note:'',orig:{...it.fields},cur:{...it.fields}});
const ordered=DATA.items.filter(i=>i.tl).sort((a,b)=>a.tl[0]-b.tl[0]).concat(DATA.items.filter(i=>!i.tl));
let selId=null;
const vid=document.getElementById('vid');
function seekTo(t){if(!vid)return;const tt=Math.min(Math.max(0,t),T-0.05);
  if(vid.readyState===0){vid.load();vid.addEventListener('loadedmetadata',()=>{vid.currentTime=tt},{once:true});}
  else vid.currentTime=tt;}
const fmt=t=>{const m=Math.floor(t/60),s=Math.round((t%60)*10)/10;return s>=60?(m+1)+':00.0':m+':'+(s<10?'0':'')+s.toFixed(1)};

// ---- timeline ----
const lanesEl=document.getElementById('lanes');
for(const ln of LANES){
  const row=document.createElement('div');row.className='lane';
  row.innerHTML='<span class="hd">'+ln+'</span><div class="strip" data-lane="'+ln+'"></div>';
  lanesEl.appendChild(row);
  const strip=row.querySelector('.strip');
  for(const it of DATA.items.filter(i=>i.group===ln&&i.tl)){
    const b=document.createElement('div');
    const isCut=it.id.startsWith('cut-');
    b.className='blk'+(isCut?' cutm':'');b.id='blk-'+it.id;
    const l=it.tl[0]/T*100,w=Math.max((it.tl[1]-it.tl[0])/T*100,.35);
    b.style.left=l+'%';b.style.width=w+'%';b.style.background=LANEC[ln];
    const label=it.fields.text||it.fields.label||it.fields.title||'';
    b.textContent=label;b.title=it.id+' '+label;
    b.onclick=e=>{e.stopPropagation();select(it.id,true)};
    strip.appendChild(b);
  }
}
document.getElementById('lanes').onclick=e=>{
  const strip=e.target.closest('.strip');if(!strip||!vid)return;
  const r=strip.getBoundingClientRect();
  seekTo((e.clientX-r.left)/r.width*T);
};
// ruler
(function ruler(){
  const el=document.getElementById('ruler');el.innerHTML='';
  const w=el.clientWidth||600;
  const iv=[1,2,5,10,15,30,60].find(i=>i/T*w>=56)||60;
  for(let t=0;t<=T;t+=iv){
    const x=t/T*100;
    el.insertAdjacentHTML('beforeend','<span class="lab mono" style="left:'+x+'%">'+fmt(t)+'</span>');
  }
  for(let t=0;t<=T;t+=iv/5)el.insertAdjacentHTML('beforeend','<span class="tick" style="left:'+(t/T*100)+'%"></span>');
})();
// playhead
const ph=document.getElementById('ph');
if(vid){ph.style.display='block';
  (function loop(){const stripW=lanesEl.querySelector('.strip').getBoundingClientRect().width;
    ph.style.left=(52+vid.currentTime/T*stripW)+'px';
    document.getElementById('tcnow').textContent=fmt(vid.currentTime)+' / '+fmt(T);
    requestAnimationFrame(loop)})();}

// ---- density strip ----
function density(){
  const d=document.getElementById('density');d.innerHTML='';
  for(const it of ordered.filter(i=>i.tl)){
    const s=document.createElement('span');
    s.style.cssText='position:absolute;height:100%;left:'+(it.tl[0]/T*100)+'%;width:'+Math.max((it.tl[1]-it.tl[0])/T*100,.3)+'%;background:'+STATUS[state[it.id].status];
    d.appendChild(s);}
  d.style.position='relative';
}
document.getElementById('densityWrap').onclick=e=>{if(!vid)return;
  const r=e.currentTarget.getBoundingClientRect();seekTo((e.clientX-r.left)/r.width*T);};

// ---- list ----
const list=document.getElementById('list');
for(const g of LANES){
  const its=ordered.filter(i=>i.group===g);if(!its.length)continue;
  list.insertAdjacentHTML('beforeend','<div class="grp">'+g+'</div>');
  for(const it of its){
    const r=document.createElement('div');r.className='row';r.id='row-'+it.id;
    const label=it.fields.text||it.fields.label||it.fields.title||it.desc;
    r.innerHTML='<span class="dot"></span><span class="tc mono">'+(it.tl?fmt(it.tl[0]):'—')+'</span><span class="tx">'+esc(label)+'</span>';
    r.onclick=()=>select(it.id,true);
    list.appendChild(r);
  }
}

// ---- detail ----
const D=id=>document.getElementById(id);
function select(id,seek){
  selId=id;const it=DATA.items.find(i=>i.id===id);const s=state[id];
  document.querySelectorAll('.blk.sel,.row.sel').forEach(e=>e.classList.remove('sel'));
  const blk=D('blk-'+id);if(blk)blk.classList.add('sel');
  const row=D('row-'+id);if(row){row.classList.add('sel');row.scrollIntoView({block:'nearest'});}
  D('empty').style.display='none';D('body').style.display='block';
  D('d-id').textContent=id;D('d-desc').textContent=it.desc+(it.tl?'　@ '+fmt(it.tl[0]):'');
  D('d-img').style.display=it.img?'block':'none';D('d-img').src=it.img||'';
  const f=D('d-fields');f.innerHTML='';
  for(const[k,v]of Object.entries(s.cur)){
    const num=typeof s.orig[k]==='number';
    f.insertAdjacentHTML('beforeend','<div class="f"><label>'+esc(k)+'</label><input data-k="'+esc(k)+'" value="'+esc(v)+'"'+(num?' inputmode="decimal"':'')+'></div>');
  }
  f.querySelectorAll('input').forEach(inp=>{
    inp.onblur=inp.onchange=()=>{const k=inp.dataset.k;
      s.cur[k]=typeof s.orig[k]==='number'?Number(inp.value):inp.value;
      if(s.status==='pending'&&JSON.stringify(s.cur)!==JSON.stringify(s.orig)){s.status='changes_requested';}
      paint(id);stats();};
  });
  D('d-note').value=s.note;D('d-note').oninput=e=>{s.note=e.target.value;
    if(s.status==='pending'&&s.note){s.status='changes_requested';paint(id);stats();}};
  document.querySelectorAll('.acts button').forEach(b=>{
    b.onclick=()=>{s.status=b.dataset.a;paint(id);stats();};});
  paint(id);
  if(seek&&vid&&it.tl)seekTo(it.tl[0]+0.05);
}
function paint(id){
  const s=state[id];
  const row=D('row-'+id);if(row)row.style.setProperty('--rowc',STATUS[s.status]);
  const blk=D('blk-'+id);if(blk&&!blk.classList.contains('cutm'))blk.style.opacity=s.status==='removed'?.25:.92;
  if(id===selId)document.querySelectorAll('.acts button').forEach(b=>
    b.classList.toggle('on-'+({approved:'ok',changes_requested:'chg',removed:'del'})[b.dataset.a],s.status===b.dataset.a));
  density();
}
function stats(){const v=Object.values(state);
  D('stats').textContent=v.length+' 項 · 待審 '+v.filter(s=>s.status==='pending').length+' · 要改 '+v.filter(s=>s.status==='changes_requested').length;}
function move(d){
  const idx=ordered.findIndex(i=>i.id===selId);
  const nxt=ordered[Math.min(ordered.length-1,Math.max(0,idx+d))];
  if(nxt)select(nxt.id,true);
}
D('prev').onclick=()=>move(-1);D('next').onclick=()=>move(1);

// ---- keyboard ----
document.addEventListener('keydown',e=>{
  const tag=document.activeElement.tagName;
  if(tag==='INPUT'||tag==='TEXTAREA'){if(e.key==='Escape')document.activeElement.blur();return;}
  const s=selId&&state[selId];
  if(e.key===' '){e.preventDefault();if(vid)vid.paused?vid.play():vid.pause();}
  else if(e.key==='ArrowLeft'&&vid)vid.currentTime-=1;
  else if(e.key==='ArrowRight'&&vid)vid.currentTime+=1;
  else if(e.key==='ArrowUp'){e.preventDefault();move(-1);}
  else if(e.key==='ArrowDown'){e.preventDefault();move(1);}
  else if(e.key==='a'&&s){s.status='approved';paint(selId);stats();move(1);}
  else if(e.key==='r'&&s){s.status='changes_requested';paint(selId);stats();D('d-note').focus();}
  else if(e.key==='x'&&s){s.status='removed';paint(selId);stats();move(1);}
});

// ---- export ----
document.getElementById('export').onclick=()=>{
  const fb={revision:DATA.revision,exportedAt:new Date().toISOString(),items:[]};
  for(const it of DATA.items){const s=state[it.id];
    const edits={};for(const k in s.cur)if(JSON.stringify(s.cur[k])!==JSON.stringify(s.orig[k]))edits[k]=s.cur[k];
    if(s.status!=='pending'||Object.keys(edits).length)fb.items.push({id:it.id,status:s.status,
      ...(Object.keys(edits).length?{edits}:{}),...(s.note?{feedback:s.note}:{})});}
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(fb,null,1)],{type:'application/json'}));
  a.download='review.feedback.json';a.click();};
stats();density();
if(ordered.length)select(ordered[0].id,false);
</script></body></html>`;

fs.mkdirSync('out', {recursive: true});
fs.writeFileSync('out/review.html', html);
fs.unlinkSync(tmpMod);
console.log(`out/review.html — ${items.length} items, rev ${REVISION}, ${totalOut.toFixed(1)}s timeline, thumbs from ${thumbSrc}`);
