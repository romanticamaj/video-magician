// Mechanical measurement pass for the video-performance-review skill.
// Computes ONLY what the artifacts can prove. Every number printed here is
// tier [A]: derived from out/*.mp4 + src/videoConfig.ts + src/subtitles.json.
// It deliberately does NOT score, rank, or predict anything — locating windows
// worth watching is the whole job. Judgement happens in the skill, not here.
//
// Usage: node tools/analyze_signals.mjs [--video out/final_mastered.mp4] [--json]
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(k);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const VIDEO = arg('--video', 'out/final_mastered.mp4');
const AS_JSON = argv.includes('--json');
const FPS = 30;

// --- load config (same transpile trick as make_review.mjs) ---
const srcTs = fs.readFileSync('src/videoConfig.ts', 'utf8');
const js = ts.transpileModule(srcTs, {
  compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022},
}).outputText;
fs.mkdirSync('local', {recursive: true});
const tmp = path.resolve('local/_videoConfig.signals.mjs');
fs.writeFileSync(tmp, js);
const {CONFIG} = await import(pathToFileURL(tmp).href + `?t=${fs.statSync(tmp).mtimeMs}`);
const subs = JSON.parse(fs.readFileSync('src/subtitles.json', 'utf8'));

// --- timeline maths (mirror of src/engine/cuts.ts) ---
const CUTS = [...CONFIG.cuts].sort((a, b) => a[0] - b[0]);
const SPEED = CONFIG.speed ?? 1;
const COVER = (CONFIG.cover ? CONFIG.coverFrames : 0) / FPS;
const srcToOut = (t) => {
  let removed = 0;
  for (const [f, to] of CUTS) {
    if (t >= to) removed += to - f;
    else if (t > f) removed += t - f;
  }
  return (t - removed) / SPEED + COVER;
};
const cutLen = CUTS.reduce((a, [f, t]) => a + (t - f), 0);
const keptOut = (CONFIG.srcDurationSec - cutLen) / SPEED;
const totalOut = COVER + keptOut + CONFIG.outroFrames / FPS;

// --- rendered file facts ---
let render = {path: VIDEO, exists: fs.existsSync(VIDEO)};
if (render.exists) {
  const probe = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,r_frame_rate', '-show_entries',
    'format=duration', '-of', 'default=nw=1:nk=1', VIDEO], {encoding: 'utf8'})
    .trim().split('\n');
  render = {...render, width: +probe[0], height: +probe[1], fps: probe[2],
    duration: +probe[3]};
  try {
    render.audio = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'a:0',
      '-show_entries', 'stream=codec_name,channels,sample_rate', '-of',
      'default=nw=1:nk=1', VIDEO], {encoding: 'utf8'}).trim().split('\n').join('/');
  } catch { render.audio = null; }
}

// --- subtitles on the output timeline ---
const lines = subs.map((s, i) => ({
  i, text: s.text,
  srcStart: s.start, srcEnd: s.end,
  a: srcToOut(s.start), b: srcToOut(s.end),
})).filter((l) => l.b > l.a);
const chars = (t) => [...t.replace(/[\s，。、…？！?!,.—～~「」()（）]/gu, '')].length;

// Hook windows: everything the viewer has actually received by T seconds —
// the cover counts, it is usually the only thing on screen in the first second.
const coverText = CONFIG.cover
  ? [{t: 0, text: `[封面] ${CONFIG.cover.badge} / ${CONFIG.cover.titleLines.join(' ')}`}]
  : [];
const hookWindows = [0.8, 1.5, 3, 5].map((T) => ({
  by: T,
  onScreen: [
    ...coverText.filter(() => T > 0),
    ...lines.filter((l) => l.a < T).map((l) => ({t: +l.a.toFixed(2), text: l.text})),
  ],
}));

// reading load
const rates = lines.map((l) => ({text: l.text, cps: chars(l.text) / (l.b - l.a),
  a: +l.a.toFixed(2)}));
const cps = rates.map((r) => r.cps).sort((x, y) => x - y);
const pct = (p) => cps.length ? cps[Math.min(cps.length - 1, Math.floor(p * cps.length))] : 0;

// subtitle-gap CANDIDATES — explicitly not "dead air"; the footage may carry
// its own audio (game capture, SFX audition) or an intentional punchline beat.
const gaps = [];
for (let i = 0; i < lines.length - 1; i++) {
  const g = lines[i + 1].a - lines[i].b;
  if (g > 0.05) gaps.push({sec: +g.toFixed(2), at: +lines[i].b.toFixed(2),
    after: lines[i].text, before: lines[i + 1].text});
}
gaps.sort((x, y) => y.sec - x.sec);

// subtitle coverage (sound-off legibility proxy)
const covered = lines.reduce((a, l) => a + (Math.min(l.b, totalOut) - l.a), 0);

// kept-segment durations on the output timeline (NOT visual shot count)
const bounds = [0];
for (const [f, t] of CUTS) { bounds.push(f); bounds.push(t); }
bounds.push(CONFIG.srcDurationSec);
const kept = [];
for (let i = 0; i < bounds.length; i += 2) {
  const a = bounds[i], b = bounds[i + 1];
  if (b > a) kept.push(+((b - a) / SPEED).toFixed(2));
}

// overlay / motion / SFX inventory on the output timeline
const events = [];
if (CONFIG.cover) events.push({kind: 'cover', a: 0, b: COVER});
if (CONFIG.liquidTitle) events.push({kind: 'liquidTitle', a: srcToOut(CONFIG.liquidTitle.from), b: srcToOut(CONFIG.liquidTitle.to)});
if (CONFIG.bigBang) events.push({kind: 'bigBang', a: srcToOut(CONFIG.bigBang.start), b: srcToOut(CONFIG.bigBang.end)});
(CONFIG.chips ?? []).forEach((c, i) => events.push({kind: `chip[${i}]`, a: srcToOut(c.from), b: srcToOut(c.to)}));
if (CONFIG.stamp) events.push({kind: 'stamp', a: srcToOut(CONFIG.stamp.from), b: srcToOut(CONFIG.stamp.to)});
if (CONFIG.counter) events.push({kind: 'counter', a: srcToOut(CONFIG.counter.from), b: srcToOut(CONFIG.counter.to)});
if (CONFIG.endCard) events.push({kind: 'endCard', a: srcToOut(CONFIG.endCard.from), b: totalOut});
(CONFIG.cameraMoves ?? []).forEach((m) => events.push({kind: `cam:${m.type}`, a: srcToOut(m.from), b: srcToOut(m.to)}));
(CONFIG.sfx?.cues ?? []).forEach((c, i) => events.push({kind: `sfx[${i}]:${path.basename(c.file)}`, a: srcToOut(c.at), b: srcToOut(c.at) + (c.durationSec ?? 2) / SPEED}));
events.forEach((e) => { e.a = +e.a.toFixed(2); e.b = +e.b.toFixed(2); });
events.sort((x, y) => x.a - y.a);

// simultaneous-reinforcement windows (3+ overlapping non-subtitle events)
const dense = [];
for (const e of events) {
  const over = events.filter((o) => o.a < e.b && o.b > e.a);
  if (over.length >= 3) dense.push({at: e.a, kinds: over.map((o) => o.kind)});
}

// loop continuity: first vs last frame, reported as a fact only.
// No claim is made that a seamless loop earns algorithmic preference.
let loop = null;
if (render.exists) {
  try {
    const grab = (t, out) => execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss',
      String(t), '-i', VIDEO, '-frames:v', '1', '-vf', 'scale=32:57,format=gray',
      '-f', 'rawvideo', out], {encoding: 'buffer'});
    const f1 = path.resolve('local/_loop_a.raw'), f2 = path.resolve('local/_loop_b.raw');
    grab(0.05, f1); grab(Math.max(0, render.duration - 0.12), f2);
    const A = fs.readFileSync(f1), B = fs.readFileSync(f2);
    let diff = 0;
    for (let i = 0; i < Math.min(A.length, B.length); i++) diff += Math.abs(A[i] - B[i]);
    loop = {meanAbsDiff: +(diff / Math.min(A.length, B.length)).toFixed(1)};
  } catch { loop = null; }
}

const out = {
  tier: 'A — mechanically derived; no judgement, no prediction',
  render,
  timeline: {
    coverSec: +COVER.toFixed(2),
    keptFootageSec: +keptOut.toFixed(2),
    outroSec: +(CONFIG.outroFrames / FPS).toFixed(2),
    totalSec: +totalOut.toFixed(2),
    speed: SPEED,
  },
  hook: {
    firstSpeechOutSec: lines.length ? +lines[0].a.toFixed(2) : null,
    windows: hookWindows,
  },
  soundOff: {
    subtitleCoveragePct: +((covered / totalOut) * 100).toFixed(1),
    uncoveredSec: +(totalOut - covered).toFixed(2),
  },
  readingLoad: {
    cpsMedian: +pct(0.5).toFixed(1),
    cpsP75: +pct(0.75).toFixed(1),
    cpsMax: +(cps[cps.length - 1] ?? 0).toFixed(1),
    fastest: rates.sort((x, y) => y.cps - x.cps).slice(0, 3)
      .map((r) => ({at: r.a, cps: +r.cps.toFixed(1), text: r.text})),
  },
  gapCandidates: {
    note: 'Gaps between subtitles. NOT confirmed dead air — footage may carry its own audio or an intentional beat. Watch before proposing a cut.',
    totalSec: +gaps.reduce((a, g) => a + g.sec, 0).toFixed(2),
    longest: gaps.slice(0, 5),
  },
  splices: {
    note: 'CONFIG.cuts counts REMOVED source intervals, not visual shots.',
    count: CUTS.length,
    keptSegmentSecOut: kept,
    medianSegmentSec: kept.length ? +[...kept].sort((a, b) => a - b)[Math.floor(kept.length / 2)].toFixed(2) : null,
    longestSegmentSec: kept.length ? Math.max(...kept) : null,
  },
  events,
  denseWindows: dense,
  loopContinuity: loop,
};

if (AS_JSON) {
  console.log(JSON.stringify(out, null, 1));
} else {
  const L = (s) => console.log(s);
  L(`\n=== 機械量測 [A] ${VIDEO} ===`);
  L(`規格      ${render.width}x${render.height} @${render.fps} ${render.audio ?? 'no-audio'}  實測 ${render.duration?.toFixed(2)}s`);
  L(`時間軸    封面 ${out.timeline.coverSec}s + 正片 ${out.timeline.keptFootageSec}s + 片尾 ${out.timeline.outroSec}s = ${out.timeline.totalSec}s (speed ${SPEED}x)`);
  L(`\n--- Hook 視窗（觀眾到第 N 秒為止收到什麼）---`);
  L(`第一句人聲 ${out.hook.firstSpeechOutSec}s`);
  for (const w of hookWindows) {
    const txt = w.onScreen.length ? w.onScreen.map((s) => `${s.t}s「${s.text}」`).join('  ') : '(畫面上無文字)';
    L(`  到 ${w.by}s: ${txt}`);
  }
  L(`\n--- 無聲可讀性 ---`);
  L(`字幕覆蓋 ${out.soundOff.subtitleCoveragePct}%（無字幕 ${out.soundOff.uncoveredSec}s）`);
  L(`\n--- 閱讀負荷（字/秒）---`);
  L(`中位 ${out.readingLoad.cpsMedian}  P75 ${out.readingLoad.cpsP75}  最高 ${out.readingLoad.cpsMax}`);
  out.readingLoad.fastest.forEach((r) => L(`  ${r.cps} 字/秒 @${r.at}s「${r.text}」`));
  L(`\n--- 空檔候選（${out.gapCandidates.totalSec}s，需親耳確認）---`);
  out.gapCandidates.longest.forEach((g) => L(`  ${g.sec}s @${g.at}s（${g.after} → ${g.before}）`));
  L(`\n--- 剪點 ---`);
  L(`${out.splices.count} 個移除區間；保留段長度 中位 ${out.splices.medianSegmentSec}s 最長 ${out.splices.longestSegmentSec}s`);
  L(`  ${out.splices.keptSegmentSecOut.join(' / ')}`);
  L(`\n--- overlay / 運鏡 / SFX ---`);
  events.forEach((e) => L(`  ${String(e.a).padStart(6)}s-${String(e.b).padEnd(6)}s ${e.kind}`));
  if (dense.length) L(`  ⚠ 同時 3 項以上疊加: ${dense.map((d) => d.at + 's').join(', ')}`);
  if (loop) L(`\n--- 循環連續性 ---\n首尾幀平均差 ${loop.meanAbsDiff}（0=相同；僅陳述事實，不主張演算法偏好）`);
  L('');
}
