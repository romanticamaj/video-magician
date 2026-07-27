# ADR-0003: Split rendering engine from per-project data

## Status

Accepted

## Context

The same effects stack (cover, chips, stamp, counter, CTA, subtitles, SFX) is
reused across videos, but every video has different text, timings, and assets.
Early versions hard-coded project content inside components, which made reuse
impossible and risked leaking project-specific content into the public repo.

## Decision

Two layers with a hard boundary:

- `src/engine/` — components, the jump-cut timeline system, icons, fonts,
  theme. Never edited for an individual video.
- `src/videoConfig.ts` + `src/subtitles.json` — the only per-video inputs.
  Gitignored; committed `.sample` files document the shape (`.env.example`
  pattern). Icons are referenced by string name so config stays serializable.

Media (footage, BGM, SFX, fonts, extracted frames) lives in `public/` and is
excluded from version control entirely.

## Consequences

- A new video is "copy samples, fill in config, drop assets, render" — no
  component edits.
- The public repo contains zero personal or copyrighted content; a fresh clone
  needs a documented two-command setup step before it builds.
- Feature flags are expressed as nullable config sections (`cover: null`
  disables the cover) rather than code branches per project.
