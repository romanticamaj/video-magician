# ADR-0010: rough-cut — transcript stringout as the multi-clip entry point

## Status

Accepted

## Context

ADR-0007 proposed an index-then-decide layer for "here is a pile of clips,
edit it" workflows. The missing piece was the decide surface: a reviewer needs
to see every clip's speech laid out, choose what survives, and fix the
transcript — without scrubbing hours of footage in an NLE. This is the
documentary *paper edit* / *stringout + selects* workflow, and it pairs
naturally with the existing review-page pattern (ADR-0008): a self-contained
HTML artifact whose export is a machine-applicable decision file.

## Decision

A separate upstream skill, **rough-cut**, with three tools:

1. `tools/stringout.py` — index every clip: probe + whisper word-timestamp
   transcription into `local/stringout.json`. On-screen text is read by the
   agent from sampled frames (multimodal), not OCR tooling.
2. `tools/make_stringout.mjs` — render the index as a stringout page: one
   section per clip with an embedded player, a keep/delete-colored timeline
   strip, and per-sentence rows (thumbnail, time, editable transcript,
   keep/delete toggle; keyboard-first). Exports `stringout.decisions.json`.
3. `tools/apply_stringout.py` — assemble kept spans (padding + gap-merge to
   avoid choppy cuts) into a single re-encoded master clip, and remap word
   timestamps plus reviewer-corrected text onto the master timeline, emitting
   the exact inputs the subtitle aligner already consumes.

The output contract is the handoff: `master.mp4` + `master_whisper.json` +
canonical `captions.json` feed directly into the video-magician pipeline
(align → videoConfig → overlays), with `cuts` starting empty because the
master is already a clean rough cut.

Edits are destructive by design at this stage (dropped sentence = dropped
picture and sound); fine-grained non-destructive trimming remains the job of
`cuts` downstream (ADR-0004).

## Consequences

- Multi-clip projects get a text-speed selection pass; the reviewer reads and
  toggles instead of scrubbing, and transcript fixes happen in the same pass.
- The decisions file is the single source of truth — re-running apply
  reproduces the master deterministically, and revised decisions just re-run.
- Assembly re-encodes once (uniform stream for the concat), costing some
  generation loss and requiring same-resolution sources; mixed-resolution
  piles need a normalization step first.
- Silent b-roll produces no segments and needs an explicit keep/drop prompt —
  the transcript index is blind to footage without speech.
