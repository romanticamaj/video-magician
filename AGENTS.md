# AGENTS.md — how to work in this repo

This repo is a **video post-production pipeline operated by an agent**. It is not
a library you import; every session is "someone has footage and wants a finished
short". Read this before doing anything else.

---

## 1. Intake — run this first, every time

When a session starts with any editing request (or the user just says hi and
gestures at this repo), **do not start editing**. Run intake:

1. **Ask where the raw footage is.** One path, several paths, or a folder —
   accept whatever they give. If they already named a path in their message,
   skip the question and use it.
2. **Ask (or propose) a short project slug** — kebab-case, e.g.
   `mom-car-parts`, `ai-sfx-reaction`. If the user doesn't care, derive one from
   the topic and say what you picked.
3. **Create the project workspace and stage it:**
   ```bash
   python tools/project.py new <slug> <raw path> [more paths...]
   ```
   This copies the footage into `projects/<slug>/raw/`, archives whatever
   project was active before, and stages the new one into the working
   locations. It refuses to clobber anything.
4. **Show the menu below** and ask what they want to do.

If the working tree already has a project loaded but no project folder (a
session from before this protocol), the script stops you and tells you to run
`python tools/project.py adopt <slug>` first. Do that — never overwrite.

### The menu to show after intake

> 素材已收進 `projects/<slug>/`，接下來可以：
>
> - **圈選片段**（素材多、只要零星段落）→ `selects`
> - **粗剪**（素材都要用，只是刪廢話、修字幕）→ `rough-cut`
> - **直接後製**（已經是剪好的一支）→ `video-magician`
> - **成效審查**（片子做完了想看會不會爆）→ `video-performance-review`

Pick for them if the answer is obvious from the footage (one already-edited
clip → go straight to `video-magician`; twelve clips totalling an hour →
`selects`). Say which you picked and why, then start.

---

## 2. Project workspace

One folder per video. **`projects/` is gitignored** — it holds personal footage
and per-project data.

```
projects/<slug>/
  raw/            original footage — source of truth, never edited in place
  assets/         staged into public/: bgm.wav, sfx/, cover_bg.png, last_frame.png
  work/           intermediates: whisper.json, stringout.json, decisions files, master.mp4
  out/            deliverables: final.mp4, review.html, subtitles.srt
  videoConfig.ts  \
  subtitles.json   > the three gitignored files the engine reads
  captions.json   /
  NOTES.md        brief, decisions, what shipped
```

**Exactly one project is active.** Its data sits at `src/videoConfig.ts`,
`src/subtitles.json`, `tools/captions.json` and its assets in `public/`.
Those working locations are *staging*, not storage — the project folder owns
the real copy.

```bash
python tools/project.py list             # projects, * = active
python tools/project.py activate <slug>  # archive current, stage this one
python tools/project.py save             # archive active project without switching
python tools/project.py adopt <slug>     # give an unnamed working state a home
```

During a session the tools keep writing to their usual places — `local/` for
intermediates, `out/` for renders and review pages. `save` and `activate` sweep
those into the project's `work/` and `out/` (skipping `_`-prefixed scratch), so
**run `save` before ending a session or after a milestone render** and the
project folder holds the current truth.

`public/fonts/` is shared across projects and is never archived or cleared.

---

## 3. The four skills

Full instructions live in each skill; this is just the routing table. The
chain runs left to right — most projects only need part of it.

| Skill | Use when | Produces |
|---|---|---|
| **`selects`** | Hours of material, only scattered moments matter | Cut clips in `work/selects/` |
| **`rough-cut`** | A pile of clips that all belong, needs trimming | `master.mp4` + canonical captions |
| **`video-magician`** | One edited master → finished short | Subtitles, overlays, camera moves, SFX/BGM, mastered `final.mp4` |
| **`video-performance-review`** | Before delivering | Hook / pacing / platform verdict + fix list |

Silent b-roll is invisible to a transcript, so piles with lots of it start at
`selects` (it can circle any stretch of picture), not `rough-cut`.

---

## 4. Standing rules

- **Never overwrite another project's data.** The three working files and
  `public/` belong to whichever project is active. Switch with the script.
- **Raw footage is read-only.** Every cut is non-destructive config
  (`cuts`, decisions files), never an edit to the original file.
- **Verify before claiming.** Render stills and *look at them*; measure audio
  with `ebur128` / `astats` rather than asserting. See each skill's
  verification steps.
- **The review gate is mandatory** before delivery — `make_review.mjs` →
  user approval → mastering. Details in
  `.claude/skills/video-magician/references/review-loop.md`.
- **Skills self-learn.** When the user corrects something reusable, distil it
  into that skill's `references/learnings.md` (rules that break the cut when
  violated go to `editing-principles.md`).
- Architecture decisions are recorded in `docs/adr/` — read the index before
  changing how the pipeline is structured.

## 5. System requirements

Node 18+, Python 3.10+, `ffmpeg`/`ffprobe` on PATH, `pip install faster-whisper`,
and the handwriting font at `public/fonts/ChenYuluoyan-2.0-Thin.ttf`
(renders stall without it).
