# ADR-0004: Keep all cues in source time; jump cuts as a mapping

## Status

Accepted

## Context

Editing feedback frequently changes which segments of the footage are kept
("trim that section, keep the story part"). Subtitles, overlays, and SFX cues
are all timed against the footage. If cues were stored in output-timeline time,
every cut change would invalidate every cue — the classic NLE ripple problem.

## Decision

All cue times (subtitles, chips, stamp, counter, CTA, SFX) are expressed in
**source-video seconds** and never rewritten. Cuts are a list of source-time
intervals in config. `src/engine/cuts.ts` derives:

- kept segments, rendered as sequenced `<OffthreadVideo trimBefore>` blocks;
- `outToSrc()` — components ask "what source moment is on screen now";
- `srcToOut()` — declarative sequences (SFX) place themselves on the output
  timeline.

Cues that fall inside a removed interval simply never render (the source time
never occurs).

## Consequences

- Changing `cuts` re-aligns the entire production automatically; a trimmed and
  a full-length edit are the same project with different config.
- Cuts must land on sentence boundaries for clean audio; the mapping does not
  hide bad cut placement.
- Overlays that should end exactly at a cut boundary must use the cut point as
  their end time (a visible chip can otherwise straddle the splice).
