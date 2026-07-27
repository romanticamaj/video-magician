# ADR-0005: Mix audio offline with ffmpeg, master after render

## Status

Accepted

## Context

The mix has four elements: voice (in the footage), one-shot SFX, background
music with sidechain ducking, and a final loudness target for social platforms.
Remotion can layer audio tracks with volume envelopes, but it has no loudness
measurement, no compressor, and re-rendering video to iterate on audio is slow.

## Decision

Do audio engineering outside the renderer:

- **SFX**: `loudnorm` each one-shot to ~voice −13 dB once, at import time.
- **BGM**: pre-bake `loudnorm` (voice −6 dB) plus `sidechaincompress`
  (~2 dB duck, keyed by the footage voice delayed by the cover offset) into
  `public/bgm.wav`. Remotion just plays the file with fade in/out.
- **Mastering**: after render, `-c:v copy` the video stream and process audio
  only: linear gain + true-peak limiter to −14 LUFS integrated. Ceiling is set
  to −2.5 dB because AAC encoding overshoots a −1.5 dB sample-peak ceiling to
  ~0 dBTP. Gain interacts non-linearly with the limiter, so the target is
  reached by measure → adjust → re-measure iteration.

Calibration is measured (LUFS of a dense-speech window vs a silent-gap window),
never guessed.

## Consequences

- Audio iterations take seconds (no video re-render); mastering never touches
  pixels.
- Ducking parameters are deterministic and documented, not DAW-session state.
- The BGM file is coupled to the footage's voice track and cover offset; a new
  edit that changes the cover length requires re-baking the BGM.
