<div align="center">

# 🎬 video-magician

**A config-driven video post-production pipeline that uses the browser as its rendering engine.**

Turn a raw vertical video into a fully-produced short — subtitles, motion overlays, SFX, ducked BGM, cover frame — by editing one config file and hitting render.

[![Remotion](https://img.shields.io/badge/Remotion-4.x-blue?logo=react)](https://remotion.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Powered by ffmpeg](https://img.shields.io/badge/audio-ffmpeg-007808?logo=ffmpeg)](https://ffmpeg.org)
[![Claude Code Skill](https://img.shields.io/badge/Claude%20Code-skill%20included-D97757)](.claude/skills/video-post/SKILL.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## Why a frontend stack for video?

Every frame is a React render. Remotion drives a headless browser frame-by-frame and stitches the screenshots into a video — which means **the entire CSS/SVG/typography engine becomes your VFX toolkit**:

- *Liquid glass* titles are one line of `backdrop-filter`
- Subtitle outlines, keyword highlighting, and CJK line-breaking are just the browser's text engine
- Springs, glassmorphism chips, and confetti are plain components

And because a frame is a pure function of time (`frame → UI`), the whole timeline is **code**: deterministic, diffable, and re-renderable after every tweak.

## Architecture

```
┌────────────────────────── data (per project, gitignored) ─────────────────────────┐
│  src/videoConfig.ts     cover · titles · chips · stamp · counter · CTA · cuts     │
│  src/subtitles.json     text + precise timing (whisper-aligned)                   │
└──────────────────────────────────────┬────────────────────────────────────────────┘
                                       │ pure data in
┌──────────────────────────────────────▼────────────────────────────────────────────┐
│  src/engine/            the rendering engine — never edited per project           │
│  ├─ Main.tsx            composition: video segments · BGM · freeze outro · fade   │
│  ├─ cuts.ts             non-destructive jump cuts (src ⇄ output time mapping)     │
│  ├─ Subtitles / BigBang / Cover / overlays / Sfx                                  │
│  └─ icons · theme · fonts · ThickText                                             │
└──────────────────────────────────────┬────────────────────────────────────────────┘
                                       │ headless Chrome, frame by frame
                              Remotion render → out/final.mp4
                                       │
                     ffmpeg mastering (−14 LUFS, true-peak safe)
```

**Offline pipeline** (`tools/`): `transcribe.py` (faster-whisper word timestamps) → `align.py` (character-level diff against canonical caption text) → `subtitles.json` → `make_srt.py`.

## Features

| | |
|---|---|
| 🕐 **Whisper-aligned subtitles** | Canonical caption text matched to word-level ASR timestamps via character diff — accurate to ~0.02 s |
| ✂️ **Non-destructive jump cuts** | All cues live in *source* time; change `cuts` and every subtitle, overlay, and SFX re-aligns automatically |
| 🧊 **Liquid-glass overlays** | Frosted titles, glassmorphism chapter chips, stamp + confetti, count-up numbers, end-card CTA |
| 💥 **Per-character text bang** | One spoken line rendered as huge per-glyph animated type, timed to the words |
| 🔊 **Broadcast-grade audio** | SFX normalized to voice −13 dB, BGM at voice −6 dB with 2 dB sidechain ducking, final master −14 LUFS |
| 🖼️ **Cover frame** | First-frame cover with badge stamp-in and 0.3 s split-open title, doubles as the platform thumbnail |
| 🤖 **Claude Code skill** | The full production workflow ships in-repo — open the project and say *"add subtitles and effects to this video"* |

## Quick start

```bash
npm install

# create your project data from the samples
cp src/videoConfig.sample.ts  src/videoConfig.ts
cp src/subtitles.sample.json  src/subtitles.json
cp tools/captions.sample.json tools/captions.json
```

Drop assets into `public/` (all gitignored):

| Path | What |
|---|---|
| `public/<videoFile>` | source footage (matches `videoConfig.videoFile`) |
| `public/cover_bg.png` | cover background — frame 0 of the footage |
| `public/last_frame.png` | freeze-outro image — last frame of the footage |
| `public/bgm.wav` | pre-mixed background music |
| `public/sfx/*.wav` | one-shot sound effects |
| `public/fonts/ChenYuluoyan-2.0-Thin.ttf` | handwriting display font ([download](https://github.com/Chenyu-otf/chenyuluoyan_thin)) |

```bash
ffmpeg -i footage.mov -frames:v 1 public/cover_bg.png
ffmpeg -sseof -0.1 -i footage.mov -frames:v 1 public/last_frame.png

npm run dev      # Remotion Studio — live preview
npm run render   # → out/final.mp4
```

## Subtitle pipeline

```bash
pip install faster-whisper

python tools/transcribe.py footage.mov whisper.json "domain terms hint"
python tools/align.py whisper.json tools/captions.json src/subtitles.json 90.3
python tools/make_srt.py src/subtitles.json out/subtitles.srt 0.867   # offset = cover length
```

`captions.json` holds the *canonical* text (from your manually-edited caption list); whisper contributes only the timing. The two are merged with a character-level `SequenceMatcher`, so ASR transcription errors never leak into the final subtitles.

## Audio recipes

Mixing ratios, sidechain-compression parameters, and the −14 LUFS mastering chain (including the AAC true-peak overshoot pitfall) are documented in
[`.claude/skills/video-post/references/audio-mixing.md`](.claude/skills/video-post/references/audio-mixing.md).

## License

[MIT](LICENSE)

---

<div align="center">

🤖 Built with [Claude Code](https://claude.com/claude-code) · Rendered with [Remotion](https://remotion.dev)

*Note: Remotion itself has a [special license](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md) — free for individuals and small teams, paid for larger companies.*

</div>
