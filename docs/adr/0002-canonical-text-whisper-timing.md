# ADR-0002: Merge canonical caption text with whisper word timestamps

## Status

Accepted

## Context

Subtitles need two things: correct text and precise timing. ASR (faster-whisper)
gives excellent word-level timestamps but makes transcription errors on Chinese,
especially proper nouns and brand names. Raw footage normally has no captions at
all, so the canonical text has to be produced inside the pipeline; occasionally a
human-made caption list already exists (e.g. from a mobile caption editor) with
correct text but only coarse integer-second start times.

## Decision

Separate text from timing, and merge them (`tools/align.py`):

1. faster-whisper (`word_timestamps=True`, domain-term `initial_prompt`) produces
   a character-level time stream.
2. Canonical text comes from a **proofread pass**: by default the ASR draft is
   bootstrapped into a caption list (`tools/whisper_to_captions.py`) and
   corrected line by line (agent first, then user confirmation); if a human-made
   caption list already exists it is used directly. Proofreading edits text
   only, never timing.
3. The canonical caption list is diffed against the whisper stream with a
   character-level `SequenceMatcher` (punctuation/whitespace normalized away).
4. Each caption line gets the timing of its matched characters; unmatched lines
   (interjections ASR missed) fall back to their listed integer second. A guard
   rejects alignments that drift > 1.6 s from the listed time.
5. Post-pass enforces monotonic, non-overlapping intervals with readable linger.

ASR text is never shown; it contributes timing only.

## Consequences

- Subtitle timing is accurate to ~0.02 s while text stays human-verified.
- Timing complaints ("this line appears late") are resolved by inspecting the
  whisper word stream rather than guessing.
- Requires the caption text to actually match the audio; heavy paraphrasing
  degrades alignment (falls back to integer seconds).
