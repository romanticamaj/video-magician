---
name: video-post
description: 用這個 repo 的 Remotion 管線幫剪好的直式短影音上字幕、overlay 特效、音效與 BGM。當使用者要求「上字幕」「上特效」「配樂/混音」「做封面」「剪掉某段」時使用。
---

# 短影音後製管線（本 repo）

架構分兩層：`src/engine/` 是渲染引擎（元件、jump-cut 時間軸系統、icon、字型），
**永遠不需要為單支影片修改**；所有專案內容集中在 `src/videoConfig.ts` 與
`src/subtitles.json`（皆 gitignored）。改影片 = 改 config。

## 初始化（fresh clone）

```bash
npm install
cp src/videoConfig.sample.ts src/videoConfig.ts
cp src/subtitles.sample.json src/subtitles.json
cp tools/captions.sample.json tools/captions.json
# 素材放 public/：毛片、bgm.wav、sfx/*.wav、fonts/、cover_bg.png、last_frame.png
```

`public/cover_bg.png` = 毛片第 0 幀；`public/last_frame.png` = 最後一幀：

```bash
ffmpeg -i 毛片.mov -frames:v 1 public/cover_bg.png
ffmpeg -sseof -0.1 -i 毛片.mov -frames:v 1 public/last_frame.png
```

## 工作流程

### 1. 素材盤點
`ffprobe` 毛片規格；`ffmpeg -af ebur128` 量人聲 LUFS（之後所有音量以此為基準）；抽畫格確認場景 cut 秒數。

### 2. 字幕
- 有字幕清單（剪映/CapCut 螢幕錄影）→ 抽格讀出文字＋起始秒寫進 `tools/captions.json`（文字正典）。
- `python tools/transcribe.py <毛片> whisper.json "<專有名詞提示>"` 拿逐字時間戳。
- `python tools/align.py whisper.json tools/captions.json src/subtitles.json <總長>` 字級對齊。
- 使用者說某句太早/太晚 → 查 whisper.json 該時段逐字時間，不要猜。

### 3. 設定 videoConfig
所有 overlay（封面、liquid glass 標題、逐字大字、章節 chips、印章、計數、片尾 CTA）、
音效 cue、剪輯段落都在 `src/videoConfig.ts`。時間一律用**來源影片秒數**——
`cuts` 改變時所有 cue 自動重新對位（見 `src/engine/cuts.ts`）。
chips 的 from/to 必須對齊畫面 cut（先抽格確認）。

### 4. 音效與 BGM
- SFX：一律 loudnorm 到人聲 -13 dB 左右再放進 `public/sfx/`。
- BGM 預先混好（loudnorm 人聲 -6 dB ＋ sidechain ducking 壓 2 dB）再放 `public/bgm.wav`，
  完整指令見 `references/audio-mixing.md`。key 要 `adelay=<封面幀數/30*1000>ms` 對齊封面位移。

### 5. 驗證循環
- 每次改動先 `npx remotion still Main out/chk.png --frame <N>` 抽關鍵幀讀圖確認，再整支渲染。
- `npx remotion render Main out/final.mp4 --concurrency 8`（背景跑）。
- 成品抽格驗證每個 overlay 出現/消失的邊界時刻。

### 6. 成品響度
mastering 到 -14 LUFS / TP ≤ -1.5 dB，`-c:v copy` 不重渲染，
limiter ceiling 設 -2.5 dB 防 AAC overshoot——指令與迭代方法見 `references/audio-mixing.md`。

## 設計慣例
- icon 用 `src/engine/icons.tsx` 的 SVG（config 以字串引用），不用 emoji。
- 封面主標：乾淨白色正體字、不加粗、無複雜動畫（0.3s 展開＋徽章蓋章已內建）。
- 手寫字型只當點綴；大字強調用黑描邊（`ThickText` outline，fatten=0）。
- 所有 overlay 不遮臉；封面要露出表情。
- 狀態類 overlay（印章/計數）事件結束畫面切走就退場。
