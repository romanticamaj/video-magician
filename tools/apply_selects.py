# -*- coding: utf-8 -*-
"""selects step 3: cut every exported span out of the source clips.

Reads selects.decisions.json and extracts each checked span with ffmpeg
(precise re-encode, not keyframe-snapped stream copy), producing a folder of
clips plus a manifest — ready to feed into rough-cut (or straight to concat).

Usage: python tools/apply_selects.py <decisions.json>
         [--outdir local/selects] [--pad 0.0]
"""
import io, json, os, re, subprocess, sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

args = sys.argv[1:]
def opt(k, d):
    if k in args:
        i = args.index(k)
        v = args[i + 1]
        del args[i:i + 2]
        return v
    return d

OUTDIR = opt("--outdir", "local/selects")
PAD = float(opt("--pad", "0.0"))
DECISIONS = args[0]

dec = json.load(open(DECISIONS, encoding="utf-8"))
os.makedirs(OUTDIR, exist_ok=True)

def slug(s, n=24):
    s = re.sub(r"[\\/:*?\"<>|\s]+", "_", s.strip())
    return s[:n].strip("_") or "clip"

manifest = []
k = 0
for clip in dec["clips"]:
    src = clip["path"]
    dur = None
    base = os.path.splitext(os.path.basename(clip["file"]))[0]
    for sp in sorted(clip["spans"], key=lambda s: s["start"]):
        if not sp.get("export"):
            continue
        k += 1
        f = max(0.0, sp["start"] - PAD)
        t = sp["end"] + PAD
        name = f"{k:02d}_{slug(base, 16)}_{f:.1f}-{t:.1f}"
        if sp.get("label"):
            name += "_" + slug(sp["label"])
        out = os.path.join(OUTDIR, name + ".mp4")
        subprocess.run(
            ["ffmpeg", "-y", "-v", "error", "-ss", str(f), "-to", str(t),
             "-i", src, "-c:v", "libx264", "-crf", "18", "-preset", "fast",
             "-c:a", "aac", "-b:a", "192k", out],
            check=True)
        manifest.append({
            "n": k, "out": out, "src": src,
            "start": f, "end": t, "duration": round(t - f, 3),
            "label": sp.get("label", ""), "origin": sp.get("origin", ""),
            "id": sp.get("id", ""),
        })
        print(f"[{k:02d}] {f:7.2f}-{t:7.2f}  {sp.get('label','')[:40]}  -> {os.path.basename(out)}")

assert manifest, "no spans checked for export"
json.dump({"clips": manifest}, open(os.path.join(OUTDIR, "manifest.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)
total = sum(m["duration"] for m in manifest)
print(f"DONE {len(manifest)} clips, {total:.1f}s -> {OUTDIR}/")
print(f"next (rough-cut): python tools/stringout.py local/stringout.json {OUTDIR}/*.mp4")
