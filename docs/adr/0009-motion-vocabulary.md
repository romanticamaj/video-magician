# ADR-0009: Curated motion vocabulary with config-driven camera moves

## Status

Accepted

## Context

The pipeline's overlays animated well, but the footage layer itself was static
and cut points were hard splices — edits lacked the directorial texture
(camera energy, transition momentum) that distinguishes produced shorts from
subtitled raw footage. Two external references cover this ground:
[aicameramovements.com](https://aicameramovements.com) catalogues 46 camera
movements with their emotional intent, and
[transitions.dev](https://github.com/Jakubantalik/transitions.dev) ships 27
tuned UI transitions whose parameter philosophy (blur, distance, easing,
stagger) encodes a coherent motion taste.

Linking to references is not enough: an agent mid-edit needs to know which
moves are *achievable in a 2D overlay pipeline*, what each is *for*, and what
parameters look tasteful — without re-deriving that per video.

## Decision

Distill both sources into a skill reference
(`.claude/skills/video-magician/references/motion-library.md`) rather than
depending on them at runtime:

- **Camera moves**: the feasible subset (punch-in, slow/crash zoom, pan,
  handheld sway, whip-pan) with emotional intent, intensity ranges, and
  source-resolution limits (≤1.3x magnification on 1080-wide vertical
  footage; pans imply overscan). Infeasible moves (orbit, dolly parallax,
  drone, FPV) are listed explicitly with the instruction to source generated
  b-roll instead of faking them.
- **Object animation DNA** from transitions.dev, reduced to constants:
  blur-in entrances (2–3 px), small travel (8–16 px), overshoot
  `cubic-bezier(.34,1.45,.64,1)` vs settle `cubic-bezier(.22,1,.36,1)`,
  40–90 ms stagger, open-slow/close-fast — with CSS→Remotion conversion
  guidance and a per-overlay mapping of the useful snippets.

To make the vocabulary executable, the engine gains `CameraRig`, applying
`CONFIG.cameraMoves` (source-time intervals, per ADR-0004) as transforms over
the footage layer. A whip-pan spanning a jump cut plays continuously on the
output timeline with its blur peak over the splice — turning hard cuts into
motivated transitions. Usage discipline lives in the skill: 2–4 moves per
~90 s video, placed on story beats.

## Consequences

- Camera energy and transition momentum are one config line each, reviewable
  through the standard review manifest like any other cue.
- The distilled reference is self-contained; upstream sites changing or
  disappearing does not affect the pipeline.
- Digital moves crop into the frame; the library's intensity caps guard
  sharpness, but true parallax/orbit shots remain out of scope by design.
- Curation is opinionated: the library records one taste (small, blurred,
  spring-settled motion), which is the point — but expanding it means
  editing the reference, not just dropping in a link.
