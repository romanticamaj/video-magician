# CLAUDE.md

@AGENTS.md

## TL;DR (the one thing not to get wrong)

Every session starts with **intake**, before any editing:

1. Ask where the raw footage is (skip if the user already gave a path).
2. Agree on a short project slug.
3. `python tools/project.py new <slug> <raw paths...>` — copies footage into
   `projects/<slug>/`, archives the previously active project, stages this one.
4. Offer the four skills and start.

If the script says the working state belongs to an unnamed project, run
`python tools/project.py adopt <slug>` — never overwrite it.

## Claude Code specifics

- The four pipeline skills live in `.claude/skills/` and are invoked with the
  Skill tool: `selects`, `rough-cut`, `video-magician`,
  `video-performance-review`. Routing table is in AGENTS.md §3.
- Renders take minutes — run them with `run_in_background` and keep working.
- Verification is visual: `npx remotion still Main out/chk.png --frame N` and
  **read the PNG** before claiming a change looks right.
- Deliverables over 30 MB can't be sent in chat. Copy the full-quality file to
  `Downloads\` and send a 720p CRF 26 preview alongside it.
- The review page and stringout/selects pages are self-contained HTML; hand
  them over with SendUserFile and put a copy next to the video so their
  embedded players work.
