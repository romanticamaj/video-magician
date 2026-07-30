# -*- coding: utf-8 -*-
"""rough-cut step 3: apply stringout decisions.

Reads the index + the reviewer's decisions, assembles the kept spans into a
single master clip (ffmpeg trim+concat), and emits pipeline-ready inputs:
whisper word timestamps remapped onto the master timeline, and a canonical
captions draft carrying the reviewer's text edits.

Usage: python tools/apply_stringout.py <index.json> <decisions.json>
         [--out local/master.mp4] [--pad 0.12] [--merge-gap 0.6]

Outputs: master video, local/master_whisper.json, tools/captions.json,
         local/master_plan.json (span map for traceability).
Next:    python tools/align.py local/master_whisper.json tools/captions.json src/subtitles.json <master_dur>
"""
import io, json, os, subprocess, sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

args = sys.argv[1:]
def opt(k, d):
    if k in args:
        i = args.index(k)
        v = args[i + 1]
        del args[i:i + 2]
        return v
    return d

OUT = opt("--out", "local/master.mp4")
PAD = float(opt("--pad", "0.12"))       # breathing room around speech
GAP = float(opt("--merge-gap", "0.6"))  # merge kept spans closer than this
INDEX, DECISIONS = args[0], args[1]

index = json.load(open(INDEX, encoding="utf-8"))
dec = json.load(open(DECISIONS, encoding="utf-8"))
dmap = {}
for c in dec["clips"]:
    for s in c["segments"]:
        dmap[s["id"]] = s

# 1. kept spans per clip (padded, merged, clamped)
plan = []  # {path, from, to, segs:[segment dicts]}
for clip in index["clips"]:
    spans = []
    for seg in clip["segments"]:
        d = dmap.get(seg["id"], {"keep": True})
        if not d.get("keep", True):
            continue
        seg = {**seg, "text": d.get("text", seg["text"])}
        f = max(0.0, seg["start"] - PAD)
        t = min(clip["duration"], seg["end"] + PAD)
        if spans and f - spans[-1]["to"] <= GAP:
            spans[-1]["to"] = t
            spans[-1]["segs"].append(seg)
        else:
            spans.append({"path": clip["path"], "from": f, "to": t, "segs": [seg]})
    plan.extend(spans)

assert plan, "nothing kept — aborting"

# 2. assemble master (re-encode for uniform stream; sizes must match)
sizes = {(c["width"], c["height"]) for c in index["clips"]}
assert len(sizes) == 1, f"clips have mixed resolutions {sizes}; normalize first"
inputs, filters, pairs = [], [], []
for i, sp in enumerate(plan):
    inputs += ["-ss", str(sp["from"]), "-to", str(sp["to"]), "-i", sp["path"]]
    filters.append(f"[{i}:v]setpts=PTS-STARTPTS[v{i}];[{i}:a]asetpts=PTS-STARTPTS[a{i}]")
    pairs.append(f"[v{i}][a{i}]")
fc = ";".join(filters) + f";{''.join(pairs)}concat=n={len(plan)}:v=1:a=1[v][a]"
os.makedirs(os.path.dirname(OUT) or ".", exist_ok=True)
subprocess.run(
    ["ffmpeg", "-y", "-v", "error", *inputs, "-filter_complex", fc,
     "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-crf", "18",
     "-preset", "fast", "-c:a", "aac", "-b:a", "192k", OUT],
    check=True)

# 3. remap words + captions onto master timeline
whisper_out, captions = [], []
offset = 0.0
for sp in plan:
    shift = offset - sp["from"]
    for seg in sp["segs"]:
        words = [{"w": w["w"], "s": round(w["s"] + shift, 3), "e": round(w["e"] + shift, 3)}
                 for w in seg["words"]]
        whisper_out.append({
            "text": seg["text"],
            "start": round(seg["start"] + shift, 3),
            "end": round(seg["end"] + shift, 3),
            "words": words,
        })
        captions.append({"t": round(seg["start"] + shift, 2), "text": seg["text"]})
    offset += sp["to"] - sp["from"]

json.dump(whisper_out, open("local/master_whisper.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump(captions, open("tools/captions.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump({"master": OUT, "duration": round(offset, 3), "spans": [
    {"path": p["path"], "from": p["from"], "to": p["to"]} for p in plan]},
    open("local/master_plan.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)

print(f"master: {OUT}  ({offset:.1f}s, {len(plan)} spans, {len(captions)} lines)")
print("next: python tools/align.py local/master_whisper.json tools/captions.json "
      f"src/subtitles.json {offset:.2f}")
