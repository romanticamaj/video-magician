# ADR-0001: Use the browser (Remotion) as the rendering engine

## Status

Accepted

## Context

The pipeline needs subtitles with outlines and per-keyword coloring, frosted-glass
("liquid glass") overlays, glassmorphism chips, spring animations, and CJK-correct
text layout — iterated many times per video. Candidate approaches:

- **ffmpeg filters** (`drawtext`, overlays): very limited expressiveness; complex
  styled overlays are impractical.
- **Python compositing** (moviepy/PIL): primitive typography, no CSS effects,
  weak CJK handling.
- **NLE software** (After Effects / Premiere): not scriptable end-to-end, not
  diffable, every revision is manual work.
- **Remotion**: every frame is a React render executed in headless Chrome and
  stitched into a video by ffmpeg.

## Decision

Use Remotion. The browser's CSS/SVG/typography engine becomes the VFX toolkit
(`backdrop-filter` for liquid glass, `-webkit-text-stroke` + `paint-order` for
subtitle outlines, native CJK line-breaking), and the timeline becomes code: a
frame is a pure function of time, so output is deterministic, reviewable, and
re-renderable after every tweak.

## Consequences

- Revisions are cheap: change config/code, re-render (~5 min for a 90 s vertical
  video on CPU).
- Everything is version-controllable; an AI agent can iterate on the video by
  editing code.
- Rendering requires Node + headless Chrome; render time is slower than a pure
  ffmpeg filter graph.
- Remotion has a company-size-dependent license that adopters must review.
