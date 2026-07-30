# ADR-0007: Index-then-decide layer for multi-clip autonomous editing

## Status

Accepted — implemented by [ADR-0010](0010-rough-cut-stringout.md) (rough-cut skill)

## Context

Today the pipeline starts from an already-cut master: the agent knows what
happens at every second and reads frames on demand. A future mode — "here is a
pile of raw clips, edit it yourself" — changes the economics: hours of footage
must be reduced to ~90 seconds, and inspecting pixels for every decision does
not scale (in time or tokens).

Off-the-shelf video-understanding frameworks (frame captioning / video-to-text
indexing) target exactly this, but a captioning layer loses the pixel-level
detail this pipeline's quality bar depends on (see ADR-0002's lesson: a
translation layer drops the information decisions need), and their sampling
strategies are not under our control.

## Decision

When multi-clip editing is needed, build a thin **footage index** first and make
edit decisions on the index, not on pixels:

1. **Transcript index** (primary): whisper word-level transcripts per clip.
   For talking footage the transcript *is* the edit map — take selection,
   dedupe, and reordering are text operations.
2. **Scene index**: ffmpeg scene-change detection extracts one keyframe per
   shot; subagents batch-describe them into structured entries
   (`{clip, time, scene, subjects, usability}`), run once per ingest.
3. **Decision layer**: the agent drafts the edit (an EDL of source-time spans)
   against the text index, spot-checking actual frames only at decision points.
   The EDL feeds the existing source-time cue system (ADR-0004) unchanged.

External indexing frameworks are reconsidered only if scale demands it
(tens of hours, embedding retrieval); even then they would supply the index
while edit decisions and rendering stay in this engine.

## Consequences

- Indexing cost is paid once per ingest instead of per decision; token spend
  moves from repeated frame reads to a single structured pass.
- The index is lossy by design; final quality checks still read real frames.
- Requires a new `tools/` ingest script and an EDL-shaped intermediate format,
  both compatible with `videoConfig.cuts` semantics.
