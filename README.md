<div align="center">

# 🎬 video-magician

**An agent-driven video post-production pipeline that uses the browser as its rendering engine.**

Drop in raw footage, say *"add subtitles and effects to this video"* — the bundled Claude Code skill runs the whole pipeline: transcription, subtitle alignment, motion overlays, SFX, ducked BGM, cover frame, loudness mastering.

[![Claude Code Skill](https://img.shields.io/badge/Claude%20Code-skill%20driven-D97757)](.claude/skills/video-magician/SKILL.md)
[![Remotion](https://img.shields.io/badge/Remotion-4.x-blue?logo=react)](https://remotion.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Powered by ffmpeg](https://img.shields.io/badge/audio-ffmpeg-007808?logo=ffmpeg)](https://ffmpeg.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## Usage

This repo is operated by an agent, not by hand:

```bash
git clone https://github.com/romanticamaj/video-magician && cd video-magician
claude   # open in Claude Code
```

> 幫這支影片上字幕、上特效：`C:\path\to\footage.mov`

That's it. The in-repo skill ([`.claude/skills/video-magician`](.claude/skills/video-magician/SKILL.md)) takes over: it probes the footage, transcribes and aligns subtitles, fills in the video config, sources and normalizes audio, renders, verifies frames against the result, and masters the output — iterating with you in plain language ("字太小" / "這段剪掉" / "BGM 小聲一點").

The skill also **self-learns**: corrections you make are distilled into reusable rules ([`references/learnings.md`](.claude/skills/video-magician/references/learnings.md)) that shape the next video.

## Why a frontend stack for video?

Every frame is a React render. Remotion drives a headless browser frame-by-frame and stitches the screenshots into a video — which means **the entire CSS/SVG/typography engine becomes the VFX toolkit**:

- *Liquid glass* titles are one line of `backdrop-filter`
- Subtitle outlines, keyword highlighting, and CJK line-breaking are just the browser's text engine
- Springs, glassmorphism chips, and confetti are plain components

And because a frame is a pure function of time (`frame → UI`), the whole timeline is **code**: deterministic, diffable, and re-renderable — which is exactly what lets an agent iterate on a video the way it iterates on software.

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

Design rationale lives in [`docs/adr/`](docs/adr/README.md).

## Features

| | |
|---|---|
| 🕐 **Whisper-aligned subtitles** | Canonical caption text matched to word-level ASR timestamps via character diff — accurate to ~0.02 s |
| ✂️ **Non-destructive jump cuts** | All cues live in *source* time; change `cuts` and every subtitle, overlay, and SFX re-aligns automatically |
| 🧊 **Liquid-glass overlays** | Frosted titles, glassmorphism chapter chips, stamp + confetti, count-up numbers, end-card CTA |
| 💥 **Per-character text bang** | One spoken line rendered as huge per-glyph animated type, timed to the words |
| 🔊 **Broadcast-grade audio** | SFX normalized to voice −13 dB, BGM at voice −6 dB with 2 dB sidechain ducking, final master −14 LUFS |
| 🖼️ **Cover frame** | First-frame cover with badge stamp-in and 0.3 s split-open title, doubles as the platform thumbnail |
| 🧠 **Self-learning skill** | User corrections become reusable rules that persist across videos |

## Under the hood

<details>
<summary><b>What the skill actually runs</b> (manual reference — you normally never type these)</summary>

### Project data

```bash
cp src/videoConfig.sample.ts  src/videoConfig.ts     # everything project-specific
cp src/subtitles.sample.json  src/subtitles.json
cp tools/captions.sample.json tools/captions.json
```

System prerequisites: Node 18+, Python 3.10+, and `ffmpeg`/`ffprobe` on PATH.

Assets in `public/` (all gitignored): the footage, `cover_bg.png` / `last_frame.png`
(first/last frame extracts), pre-mixed `bgm.wav`, `sfx/*.wav`, and the
[handwriting font](https://github.com/Chenyu-otf/chenyuluoyan_thin) — **required**
at exactly `public/fonts/ChenYuluoyan-2.0-Thin.ttf`; renders stall without it.

### Subtitle pipeline

```bash
pip install faster-whisper
python tools/transcribe.py footage.mov local/whisper.json "domain terms hint"
python tools/whisper_to_captions.py local/whisper.json tools/captions.json   # draft → proofread it
python tools/align.py local/whisper.json tools/captions.json src/subtitles.json 90.3
python tools/make_srt.py src/subtitles.json out/subtitles.srt 0.867 "[[57.68,62.06]]"  # offset, cuts
```

Text and timing are separated: `captions.json` holds the *canonical* text — an
ASR draft proofread line by line (or an existing human caption list, if you have
one) — while whisper contributes word-level timing only. The two are merged with
a character-level diff, so ASR errors never reach the screen.

### Render & audio

```bash
npm run dev      # Remotion Studio — live preview
npm run render   # → out/final.mp4
```

Mixing ratios, sidechain ducking, and the −14 LUFS mastering chain (including the
AAC true-peak overshoot pitfall) are documented in
[`references/audio-mixing.md`](.claude/skills/video-magician/references/audio-mixing.md).

</details>

## License

[MIT](LICENSE)

---

<div align="center">

🤖 Built with [Claude Code](https://claude.com/claude-code) · Rendered with [Remotion](https://remotion.dev)

*Note: Remotion itself has a [special license](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md) — free for individuals and small teams, paid for larger companies.*

</div>
