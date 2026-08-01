# ADR-0011: selects — dual-mode span marking upstream of rough-cut

## Status

Accepted

## Context

rough-cut (ADR-0010) assumes every clip in the pile belongs in the edit — its
unit of decision is the transcript sentence, and deletion is the exception.
Real piles are the opposite: hours of material where only scattered moments
matter, many of them silent (b-roll, screen actions, reactions) and therefore
invisible to a transcript-only surface. What's needed upstream is the classic
*pull selects* pass: mark the wanted spans, cut them out, then rough-cut the
survivors.

## Decision

A third skill, **selects**, sharing the rough-cut index (`stringout.py`) and
review-page pattern, with two marking modes on one timeline:

1. **Speech spans** — every ASR sentence is a pre-placed candidate: jump to
   it, check it for export, nudge its edges, annotate it.
2. **Manual spans** — mark in/out at the playhead to circle any stretch of
   picture, speech or not; any span can be **split at the playhead** so halves
   toggle independently.

Both modes produce the same span records (`origin: 'asr' | 'manual'`) in one
exported decisions file. `apply_selects.py` cuts every checked span with a
precise re-encode (stream copy would snap to keyframes) into a clip folder
plus manifest — which is exactly the input shape rough-cut ingests, closing
the chain: **selects → rough-cut → video-magician**.

## Consequences

- Silent footage is now first-class: the transcript accelerates navigation
  but no longer bounds what can be kept, resolving ADR-0010's b-roll blind
  spot at the correct stage.
- The decisions file remains the single source of truth; re-running apply
  rebuilds the clip folder deterministically.
- Each selected span is re-encoded once here and again at rough-cut assembly
  — two generations of loss before the final render, acceptable at crf 18
  but worth revisiting if the chain grows another stage.
- Span edge precision is bounded by the review page's nudge granularity
  (0.01 s inputs, 0.5 s seek steps); frame-exact trimming stays downstream
  in `cuts`.
