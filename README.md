# video-magician

用 Remotion 幫剪好的直式短影音（Reels / Shorts / TikTok）上字幕、overlay 特效、音效與 BGM 的後製管線。所有專案內容集中在一個設定檔——改影片不用改元件。

## 管線總覽

```
毛片 .mov
  ├─ faster-whisper 逐字時間戳 ──────┐
  ├─ 字幕清單文字（正典）────────────┤→ tools/align.py 字級對齊 → src/subtitles.json
  ├─ SFX（loudnorm 人聲 -13 dB）
  ├─ BGM（loudnorm 人聲 -6 dB ＋ sidechain ducking 2 dB）
  └─ Remotion 合成渲染 → ffmpeg mastering（-14 LUFS / TP -2）→ 上傳檔
```

## 快速開始

```bash
npm install
cp src/videoConfig.sample.ts src/videoConfig.ts
cp src/subtitles.sample.json src/subtitles.json
cp tools/captions.sample.json tools/captions.json
```

素材放 `public/`（皆不進版控）：

| 檔案 | 說明 |
|---|---|
| `public/<毛片>` | 來源影片，檔名對應 `videoConfig.videoFile` |
| `public/cover_bg.png` | 封面底圖（毛片第 0 幀） |
| `public/last_frame.png` | 結尾定格圖（毛片最後一幀） |
| `public/bgm.wav` | 預混好的 BGM（見下方混音） |
| `public/sfx/*.wav` | 音效 one-shots |
| `public/fonts/ChenYuluoyan-2.0-Thin.ttf` | 手寫字型（[下載](https://github.com/Chenyu-otf/chenyuluoyan_thin)） |

```bash
npm run dev      # Remotion Studio 預覽
npm run render   # 渲染 out/final.mp4
```

## 設定驅動

`src/videoConfig.ts` 定義整支影片：封面、標題、逐字大字、章節 chips、印章、計數動畫、片尾 CTA、音效 cue、剪輯段落。所有時間都用**來源影片秒數**——`cuts` 改變時，字幕、overlay、音效全部自動重新對位（非破壞性 jump-cut，見 `src/cuts.ts`）。

## 元件（`src/`）

- `Subtitles.tsx` — 字幕：關鍵字上色、彈入動畫、多講者配色
- `BigBang.tsx` — 一句台詞逐字誇張進場的大字（對齊語音逐字時間）
- `overlays.tsx` — Liquid Glass 標題、玻璃擬態章節 chips、印章＋彩帶、數字滾動、片尾 CTA、進度條
- `Cover.tsx` — 封面（0.3s 左右展開＋徽章蓋章動畫）
- `Sfx.tsx` — 設定驅動的音效 cue 表
- `icons.tsx` — 手繪 SVG icon 集（config 以字串引用）

## 字幕製作

```bash
pip install faster-whisper
python tools/transcribe.py 毛片.mov whisper.json "專有名詞提示"
python tools/align.py whisper.json tools/captions.json src/subtitles.json 90.3
python tools/make_srt.py src/subtitles.json out/subtitles.srt 0.867   # 位移=封面秒數
```

`captions.json` 的文字是正典（來自人工字幕清單），whisper 只負責精確時間——兩者以字元級 diff 對齊。

## 音訊

混音配比、sidechain ducking、-14 LUFS mastering 的完整 ffmpeg 指令見
[`.claude/skills/video-post/references/audio-mixing.md`](.claude/skills/video-post/references/audio-mixing.md)。

## Claude Code Skill

repo 內建 project-level skill（`.claude/skills/video-post/`）：用 Claude Code 開啟本專案後，直接說「幫這支影片上字幕上特效」即可按完整流程執行。

🤖 Generated with [Claude Code](https://claude.com/claude-code)
