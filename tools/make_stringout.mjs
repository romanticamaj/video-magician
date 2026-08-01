// rough-cut step 2: turn the stringout index into a self-contained review
// timeline (out/stringout.html). Every transcript sentence is a block on the
// clip's timeline and an editable row: toggle keep/delete, fix the text,
// export stringout.decisions.json for apply_stringout.py.
//
// Usage: node tools/make_stringout.mjs [--index local/stringout.json]
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

const tmp = path.resolve('local/_so_thumb.jpg');
const thumb = (clipPath, t) => {
  try {
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss', String(Math.max(0, t)), '-i', clipPath, '-frames:v', '1', '-vf', 'scale=140:-1', '-q:v', '7', tmp]);
    return 'data:image/jpeg;base64,' + fs.readFileSync(tmp).toString('base64');
  } catch {
    return '';
  }
};

for (const clip of index.clips) {
  for (const seg of clip.segments) {
    seg.img = thumb(clip.path, (seg.start + seg.end) / 2);
  }
  clip.fileUrl = 'file:///' + clip.path.replace(/\\/g, '/').replace(/^\//, '');
}

const DATA = {generatedAt: new Date().toISOString(), clips: index.clips.map((c) => ({
  file: c.file, fileUrl: c.fileUrl, duration: c.duration,
  segments: c.segments.map(({words, ...s}) => s),
}))};

const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>rough-cut 粗剪 · ${index.clips.length} clips</title>
<style>
:root{--bg:hsl(240 8% 5%);--panel:hsl(240 8% 10%);--panel2:hsl(240 8% 14%);--line:hsl(240 8% 18%);
--txt:hsl(240 10% 92%);--dim:hsl(240 6% 55%);--acc:#ffc53d;--ok:hsl(141 71% 48%);--warn:hsl(0 83% 62%)}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--txt);font:14px/1.55 "Noto Sans TC",Inter,system-ui,sans-serif}
.mono{font-family:ui-monospace,monospace;font-variant-numeric:tabular-nums}
header{position:sticky;top:0;background:color-mix(in srgb,var(--bg) 92%,transparent);backdrop-filter:blur(10px);
border-bottom:1px solid var(--line);padding:10px 16px;display:flex;gap:12px;align-items:center;z-index:20}
h1{font-size:15px;margin:0}#stats{color:var(--dim);font-size:12px}
button{cursor:pointer;border:1px solid var(--line);background:var(--panel);color:var(--txt);border-radius:7px;padding:6px 12px;font-size:12.5px}
#export{background:var(--acc);color:#1a1206;border:0;font-weight:700}
main{max-width:1240px;margin:0 auto;padding:14px 16px 90px}
.clip{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px;margin-bottom:16px}
.clip h2{font-size:13px;margin:0 0 8px;display:flex;gap:10px;align-items:baseline}
.clip h2 .d{color:var(--dim);font-weight:400;font-size:12px}
video{width:100%;max-height:46vh;border-radius:8px;background:#000;margin-bottom:8px}
.body{display:grid;grid-template-columns:minmax(280px,430px) minmax(0,1fr);gap:14px}
.lpane{position:sticky;top:58px;align-self:start;z-index:10}
.rows{max-height:calc(100vh - 130px);overflow-y:auto;padding-right:6px;overscroll-behavior:contain}
.rows::-webkit-scrollbar{width:8px}
.rows::-webkit-scrollbar-thumb{background:var(--line);border-radius:4px}
.rows::-webkit-scrollbar-thumb:hover{background:hsl(240 8% 28%)}
@media(max-width:860px){.body{display:block}
.lpane{top:52px;background:var(--panel);padding-bottom:6px}
video{max-height:30vh}
.rows{max-height:none;overflow:visible;padding-right:0}}
.strip{position:relative;height:20px;background:var(--panel2);border-radius:4px;margin-bottom:10px;cursor:pointer}
.blk{position:absolute;top:2px;bottom:2px;border-radius:3px;min-width:3px;background:var(--ok);opacity:.85;cursor:pointer}
.blk.del{background:var(--warn);opacity:.35}
.blk.sel{box-shadow:0 0 0 2px var(--acc);z-index:2;opacity:1}
.seg{display:flex;gap:10px;align-items:center;padding:5px 8px;border-left:3px solid var(--ok);border-radius:6px;margin-bottom:2px}
.seg:hover{background:var(--panel2)}.seg.sel{background:var(--panel2);box-shadow:0 0 0 1.5px var(--acc)}
.seg.del{border-left-color:var(--warn);opacity:.45}
.seg.del input{text-decoration:line-through}
.seg img{width:50px;border-radius:5px;flex:none;cursor:pointer}
.seg .tc{width:96px;flex:none;font-size:11px;color:var(--dim);cursor:pointer}
.seg input{flex:1;background:transparent;border:1px solid transparent;color:var(--txt);border-radius:6px;padding:5px 8px;font-size:13.5px}
.seg input:hover{border-color:var(--line)}.seg input:focus{outline:none;border-color:var(--acc);background:var(--bg)}
.seg .tog{flex:none;width:60px;font-size:11.5px;padding:4px 0}
.seg.del .tog{border-color:var(--warn);color:var(--warn)}
#keys{color:var(--dim);font-size:11px;padding:6px 2px}
kbd{background:var(--panel2);border:1px solid var(--line);border-radius:4px;padding:0 5px;font-size:10.5px;font-family:ui-monospace,monospace}
</style></head><body>
<header><h1>✂️ rough-cut</h1><span id="stats" class="mono"></span><span style="flex:1"></span>
<button id="export">匯出 decisions</button></header>
<main>
<div id="keys"><kbd>↑</kbd><kbd>↓</kbd> 換句 · <kbd>d</kbd> 刪/留 · <kbd>enter</kbd> 改字 · <kbd>space</kbd> 播放該句 · 點縮圖/時間 = 跳播</div>
<div id="clips"></div>
</main>
<script>
const DATA=${JSON.stringify(DATA).replace(/</g, '\\u003c')};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=t=>{const m=Math.floor(t/60),s=Math.round((t%60)*10)/10;return s>=60?(m+1)+':00.0':m+':'+(s<10?'0':'')+s.toFixed(1)};
const state={};const order=[];
const root=document.getElementById('clips');
DATA.clips.forEach((clip,ci)=>{
  clip.segments.forEach(s=>{state[s.id]={keep:true,text:s.text,orig:s.text};order.push(s.id);});
  const sec=document.createElement('section');sec.className='clip';
  sec.innerHTML='<h2>'+esc(clip.file)+' <span class="d mono">'+fmt(clip.duration)+' · '+clip.segments.length+' 句</span></h2>'+
    '<div class="body"><div class="lpane">'+
    '<video id="v'+ci+'" src="'+esc(clip.fileUrl)+'" preload="metadata" controls playsinline onerror="this.style.display=\\'none\\'"></video>'+
    '<div class="strip" id="strip'+ci+'"></div></div>'+
    '<div class="rows" id="rows'+ci+'"></div></div>';
  root.appendChild(sec);
  const strip=sec.querySelector('#strip'+ci);
  strip.onclick=e=>{const r=strip.getBoundingClientRect();seekClip(ci,(e.clientX-r.left)/r.width*clip.duration);};
  const rows=sec.querySelector('#rows'+ci);
  clip.segments.forEach(seg=>{
    const b=document.createElement('div');b.className='blk';b.id='blk-'+seg.id;
    b.style.left=(seg.start/clip.duration*100)+'%';
    b.style.width=Math.max((seg.end-seg.start)/clip.duration*100,.4)+'%';
    b.title=seg.text;b.onclick=e=>{e.stopPropagation();select(seg.id,true);};
    strip.appendChild(b);
    const r=document.createElement('div');r.className='seg';r.id='seg-'+seg.id;
    r.innerHTML=(seg.img?'<img src="'+seg.img+'" data-seek>':'')+
      '<span class="tc mono" data-seek>'+fmt(seg.start)+'–'+fmt(seg.end)+'</span>'+
      '<input value="'+esc(seg.text)+'"><button class="tog">刪除</button>';
    rows.appendChild(r);
    r.querySelectorAll('[data-seek]').forEach(el=>el.onclick=()=>select(seg.id,true));
    r.querySelector('input').oninput=e=>{state[seg.id].text=e.target.value;};
    r.querySelector('input').onfocus=()=>select(seg.id,false);
    r.querySelector('.tog').onclick=()=>toggle(seg.id);
  });
});
const CLIPOF={};DATA.clips.forEach((c,ci)=>c.segments.forEach(s=>CLIPOF[s.id]={ci,seg:s}));
let selId=null;
function seekClip(ci,t){const v=document.getElementById('v'+ci);
  if(!v||v.style.display==='none')return;
  if(v.readyState===0){v.load();v.addEventListener('loadedmetadata',()=>{v.currentTime=t},{once:true});}
  else v.currentTime=t;}
function select(id,seek){
  document.querySelectorAll('.blk.sel,.seg.sel').forEach(e=>e.classList.remove('sel'));
  selId=id;const {ci,seg}=CLIPOF[id];
  document.getElementById('blk-'+id).classList.add('sel');
  const row=document.getElementById('seg-'+id);row.classList.add('sel');
  row.scrollIntoView({block:'nearest'});
  if(seek)seekClip(ci,seg.start+0.02);
}
function toggle(id){const s=state[id];s.keep=!s.keep;paint(id);stats();}
function paint(id){const del=!state[id].keep;
  document.getElementById('blk-'+id).classList.toggle('del',del);
  const row=document.getElementById('seg-'+id);row.classList.toggle('del',del);
  row.querySelector('.tog').textContent=del?'恢復':'刪除';}
function stats(){const v=Object.values(state);const del=v.filter(s=>!s.keep).length;
  const kept=order.filter(id=>state[id].keep).reduce((a,id)=>a+(CLIPOF[id].seg.end-CLIPOF[id].seg.start),0);
  document.getElementById('stats').textContent=v.length+' 句 · 刪 '+del+' · 保留約 '+fmt(kept);}
function move(d){const i=order.indexOf(selId);const n=order[Math.min(order.length-1,Math.max(0,i+d))];if(n)select(n,true);}
document.addEventListener('keydown',e=>{
  const tag=document.activeElement.tagName;
  if(tag==='INPUT'){if(e.key==='Escape'||e.key==='Enter')document.activeElement.blur();return;}
  if(e.key==='ArrowUp'){e.preventDefault();move(-1);}
  else if(e.key==='ArrowDown'){e.preventDefault();move(1);}
  else if(e.key==='d'&&selId){toggle(selId);move(1);}
  else if(e.key==='Enter'&&selId){e.preventDefault();document.querySelector('#seg-'+selId+' input').focus();}
  else if(e.key===' '&&selId){e.preventDefault();const{ci,seg}=CLIPOF[selId];
    const v=document.getElementById('v'+ci);if(v){seekClip(ci,seg.start+0.02);v.play();
      const stop=()=>{if(v.currentTime>=seg.end){v.pause();v.removeEventListener('timeupdate',stop);}};
      v.addEventListener('timeupdate',stop);}}
});
document.getElementById('export').onclick=()=>{
  const out={generatedAt:new Date().toISOString(),clips:DATA.clips.map(c=>({file:c.file,
    segments:c.segments.map(s=>({id:s.id,keep:state[s.id].keep,
      ...(state[s.id].text!==state[s.id].orig?{text:state[s.id].text}:{})}))}))};
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(out,null,1)],{type:'application/json'}));
  a.download='stringout.decisions.json';a.click();};
stats();if(order.length)select(order[0],false);
</script></body></html>`;

fs.mkdirSync('out', {recursive: true});
fs.writeFileSync('out/stringout.html', html);
const nseg = index.clips.reduce((a, c) => a + c.segments.length, 0);
console.log(`out/stringout.html — ${index.clips.length} clips, ${nseg} segments`);
