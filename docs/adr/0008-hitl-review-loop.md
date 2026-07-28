# ADR-0008: Gated human review via a flattened item manifest

## Status

Accepted

## Context

Agent-produced videos were reviewed by watching a preview and describing
problems in chat ("the chip appears too early", "that subtitle is wrong").
This is lossy in both directions: the human must describe *which* element they
mean, and the agent must guess the mapping back to config fields. Iterations
burn tokens and patience on disambiguation rather than on the actual fix.
The config-driven architecture (ADR-0003) means every visible element already
corresponds to an addressable piece of data — the missing piece is a review
surface over those addresses.

## Decision

A generator (`tools/make_review.mjs`) flattens the project into a **review
manifest**: one item per overlay, subtitle line, cut, and SFX cue, each with a
stable id, a thumbnail extracted from the rendered video, and its editable
field values. The manifest renders as a single self-contained HTML page
(inline thumbnails, no server) where the reviewer sets a status per item —
approved / changes-requested / removed — edits field values directly, and
attaches free-text notes. Export produces `review.feedback.json`.

The agent applies feedback deterministically: `edits` map 1:1 onto config and
subtitle fields; free-text `feedback` is interpreted, with timing claims
verified against whisper timestamps or extracted frames rather than guessed.

**Gate rule:** while any item is changes-requested, the pipeline must not
proceed to mastering or delivery. Each apply-and-re-render increments the
revision and regenerates the page. Corrections recurring across revisions are
distilled into the skill's learnings file.

## Consequences

- Feedback arrives pre-addressed (item id + concrete field deltas), so an
  iteration is "apply, re-render, re-issue" with no disambiguation round-trips.
- Structured edits and free-text coexist: trivial tweaks skip the agent's
  judgment entirely; nuanced requests still get it.
- The review page is a build artifact of the render, not a served app — no
  hosting, works from the filesystem, safe to hand to a non-technical reviewer.
- One more generation step per revision, and the manifest schema must grow in
  lockstep with any new config sections.
