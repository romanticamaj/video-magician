# ADR-0002: Merge canonical caption text with whisper word timestamps

## Status

Accepted

## Context

Subtitles need two things: correct text and precise timing. ASR (faster-whisper)
gives excellent word-level timestamps but makes transcription errors on Chinese,
especially proper nouns and brand names. Manually edited caption lists (e.g. from
a mobile caption editor) have canonical text but only coarse start times
(integer seconds) and no durations.

## Decision

Use both sources and merge them (`tools/align.py`):

1. faster-whisper (`word_timestamps=True`, domain-term `initial_prompt`) produces
   a character-level time stream.
2. The canonical caption list is diffed against that stream with a character-level
   `SequenceMatcher` (punctuation/whitespace normalized away).
3. Each caption line gets the timing of its matched characters; unmatched lines
   (interjections ASR missed) fall back to their listed integer second. A guard
   rejects alignments that drift > 1.6 s from the listed time.
4. Post-pass enforces monotonic, non-overlapping intervals with readable linger.

ASR text is never shown; it contributes timing only.

## Consequences

- Subtitle timing is accurate to ~0.02 s while text stays human-verified.
- Timing complaints ("this line appears late") are resolved by inspecting the
  whisper word stream rather than guessing.
- Requires the caption text to actually match the audio; heavy paraphrasing
  degrades alignment (falls back to integer seconds).
