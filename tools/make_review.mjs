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
const items = [];
const add = (id, group, desc, tSrc, fields) =>
  items.push({id, group, desc, t: tSrc, img: tSrc == null ? '' : thumb(tSrc), fields});

if (CONFIG.cover) {
  add('cover', '整體', '封面：徽章＋主標題', 0.01, {
    badge: CONFIG.cover.badge,
    titleLines: CONFIG.cover.titleLines.join(' / '),
  });
}
if (CONFIG.liquidTitle) {
  const c = CONFIG.liquidTitle;
  add('liquidTitle', '整體', 'Liquid Glass 頂部標題', (c.from + c.to) / 2, {
    text: c.text, from: c.from, to: c.to,
  });
}
if (CONFIG.bigBang) {
  const c = CONFIG.bigBang;
  add('bigBang', '整體', '逐字誇張大字（對齊語音）', (c.start + c.end) / 2, {
    text: c.text, start: c.start, end: c.end,
  });
}
CONFIG.chips.forEach((c, i) =>
  add(`chip-${i}`, '章節 Chips', `章節提示 #${i + 1}（icon: ${c.icon}）`, (c.from + c.to) / 2, {
    label: c.label, from: c.from, to: c.to,
  })
);
if (CONFIG.stamp) {
  const c = CONFIG.stamp;
  add('stamp', '重點特效', '完成印章＋彩帶', (c.from + c.to) / 2, {text: c.text, from: c.from, to: c.to});
}
if (CONFIG.counter) {
  const c = CONFIG.counter;
  add('counter', '重點特效', '數字滾動', (c.from + c.to) / 2, {value: c.value, label: c.label, from: c.from, to: c.to});
}
if (CONFIG.endCard) {
  const c = CONFIG.endCard;
  add('endCard', '重點特效', '片尾 CTA 卡', c.from + 1, {title: c.title, url: c.url, cta: c.cta, from: c.from});
}
cuts.forEach((c, i) =>
  add(`cut-${i}`, '剪輯', `剪掉區間 ${c[0]}s – ${c[1]}s（${(c[1] - c[0]).toFixed(2)}s）`, c[0] - 0.5, {from: c[0], to: c[1]})
);
CONFIG.sfx.cues.forEach((c, i) =>
  add(`sfx-${i}`, '音效', `音效 ${c.file}`, c.at, {at: c.at, volume: c.volume ?? 1})
);
if (CONFIG.bgm) add('bgm', '音效', `BGM：${CONFIG.bgm.file}`, null, {file: CONFIG.bgm.file});
subs.forEach((s, i) => {
  const removed = isRemoved(s.start) && isRemoved(s.end - 0.01);
  add(`sub-${i}`, '字幕', removed ? '（在剪掉區間內，不會出現）' : `${s.speaker}`, removed ? null : (s.start + s.end) / 2, {
    text: s.text, start: s.start, end: s.end, speaker: s.speaker,
  });
});

// --- emit page ---
const DATA = {revision: REVISION, generatedAt: new Date().toISOString(), video: haveVideo ? path.basename(VIDEO) : null, items};
const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>video-magician 校驗 · rev ${REVISION}</title>
<style>
:root{--bg:#101014;--card:#1a1a22;--line:#2c2c38;--txt:#ececf2;--dim:#9a9aad;--acc:#ffc53d;--ok:#5af08f;--warn:#ff8fa3}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--txt);font:15px/1.6 "Noto Sans TC",system-ui,sans-serif}
header{position:sticky;top:0;background:rgba(16,16,20,.92);backdrop-filter:blur(10px);border-bottom:1px solid var(--line);padding:14px 20px;display:flex;gap:16px;align-items:center;z-index:9}
h1{font-size:17px;margin:0}#stats{color:var(--dim);font-size:13px}
button{cursor:pointer;border:1px solid var(--line);background:var(--card);color:var(--txt);border-radius:8px;padding:7px 14px;font-size:13px}
#export{background:var(--acc);color:#1a1206;border:0;font-weight:700}
main{max-width:860px;margin:0 auto;padding:16px 20px 80px}
h2{font-size:14px;color:var(--acc);letter-spacing:2px;margin:26px 0 10px;border-bottom:1px solid var(--line);padding-bottom:6px}
.card{display:flex;gap:14px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px;margin-bottom:10px}
.card.ok{border-color:rgba(90,240,143,.4)}.card.chg{border-color:rgba(255,143,163,.5)}.card.del{opacity:.45}
.card img{width:92px;height:auto;border-radius:8px;align-self:flex-start;background:#000}
.body{flex:1;min-width:0}.top{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}
.id{font:12px ui-monospace,monospace;color:var(--acc)}.desc{color:var(--dim);font-size:13px}
.fields{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}
.fields label{font-size:11px;color:var(--dim);display:block}
.fields input{background:#101016;border:1px solid var(--line);color:var(--txt);border-radius:6px;padding:5px 8px;font-size:13px}
input.num{width:76px}input.txt{width:min(360px,72vw)}
.acts{display:flex;gap:6px}.acts button{padding:4px 12px;font-size:12px}
.acts .on-ok{background:rgba(90,240,143,.15);border-color:var(--ok);color:var(--ok)}
.acts .on-chg{background:rgba(255,143,163,.12);border-color:var(--warn);color:var(--warn)}
.acts .on-del{background:rgba(255,255,255,.08)}
textarea{width:100%;margin-top:8px;background:#101016;border:1px solid var(--warn);color:var(--txt);border-radius:6px;padding:6px 8px;font-size:13px;display:none}
.card.chg textarea{display:block}
video{width:100%;max-width:320px;border-radius:12px;margin:10px 0}
</style></head><body>
<header><h1>🎬 校驗 rev ${REVISION}</h1><span id="stats"></span>
<span style="flex:1"></span><button id="export">匯出 review.feedback.json</button></header>
<main>
${haveVideo ? `<video src="${path.basename(VIDEO)}" controls preload="metadata" onerror="this.style.display='none'"></video>` : ''}
<p style="color:var(--dim);font-size:13px">每一項：✅ 通過｜✏️ 要改（寫備註，可直接改欄位值）｜🗑️ 移除。改完按右上角匯出，把檔案丟回給 AI。</p>
<div id="list"></div>
</main>
<script>
const DATA=${JSON.stringify(DATA).replace(/</g, '\\u003c')};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const state={};DATA.items.forEach(it=>state[it.id]={status:'pending',note:'',orig:{...it.fields},cur:{...it.fields}});
const groups=[...new Set(DATA.items.map(i=>i.group))];
const list=document.getElementById('list');
for(const g of groups){
  const h=document.createElement('h2');h.textContent=g;list.appendChild(h);
  for(const it of DATA.items.filter(i=>i.group===g)){
    const c=document.createElement('div');c.className='card';c.id='c-'+it.id;
    c.innerHTML=(it.img?'<img src="'+it.img+'">':'')+'<div class="body"><div class="top"><span class="id">'+esc(it.id)+'</span>'+
      (it.t!=null?'<span class="desc">@ '+it.t.toFixed(1)+'s</span>':'')+'<span class="desc">'+esc(it.desc)+'</span></div>'+
      '<div class="fields">'+Object.entries(it.fields).map(([k,v])=>'<span><label>'+esc(k)+'</label><input class="'+(typeof v==='number'?'num':'txt')+'" data-id="'+esc(it.id)+'" data-k="'+esc(k)+'" value="'+esc(v)+'"></span>').join('')+'</div>'+
      '<div class="acts"><button data-a="approved">✅ 通過</button><button data-a="changes_requested">✏️ 要改</button><button data-a="removed">🗑️ 移除</button></div>'+
      '<textarea rows="2" placeholder="要怎麼改？（自由描述，AI 會處理）" data-note="'+it.id+'"></textarea></div>';
    list.appendChild(c);
    c.querySelectorAll('.acts button').forEach(b=>b.onclick=()=>{state[it.id].status=b.dataset.a;paint(it.id);stats();});
    c.querySelector('textarea').oninput=e=>state[it.id].note=e.target.value;
  }
}
document.querySelectorAll('.fields input').forEach(inp=>inp.oninput=e=>{
  const s=state[e.target.dataset.id];const k=e.target.dataset.k;
  s.cur[k]=typeof s.orig[k]==='number'?Number(e.target.value):e.target.value;
  if(s.status==='pending'&&JSON.stringify(s.cur)!==JSON.stringify(s.orig)){s.status='changes_requested';paint(e.target.dataset.id);}
  stats();
});
function paint(id){const c=document.getElementById('c-'+id);c.className='card '+({approved:'ok',changes_requested:'chg',removed:'del',pending:''})[state[id].status];
  c.querySelectorAll('.acts button').forEach(b=>b.classList.toggle('on-'+({approved:'ok',changes_requested:'chg',removed:'del'})[b.dataset.a],state[id].status===b.dataset.a));}
function stats(){const v=Object.values(state);const p=v.filter(s=>s.status==='pending').length,c=v.filter(s=>s.status==='changes_requested').length;
  document.getElementById('stats').textContent=v.length+' 項 · 待審 '+p+' · 要改 '+c;}
stats();
document.getElementById('export').onclick=()=>{
  const fb={revision:DATA.revision,exportedAt:new Date().toISOString(),items:[]};
  for(const it of DATA.items){const s=state[it.id];
    const edits={};for(const k in s.cur)if(JSON.stringify(s.cur[k])!==JSON.stringify(s.orig[k]))edits[k]=s.cur[k];
    if(s.status!=='pending'||Object.keys(edits).length)fb.items.push({id:it.id,status:s.status,...(Object.keys(edits).length?{edits}:{}),...(s.note?{feedback:s.note}:{})});}
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(fb,null,1)],{type:'application/json'}));
  a.download='review.feedback.json';a.click();};
</script></body></html>`;

fs.mkdirSync('out', {recursive: true});
fs.writeFileSync('out/review.html', html);
fs.unlinkSync(tmpMod);
console.log(`out/review.html — ${items.length} items, rev ${REVISION}, thumbs from ${thumbSrc}`);
