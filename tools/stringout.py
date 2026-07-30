# -*- coding: utf-8 -*-
"""rough-cut step 1: index a pile of raw clips.

Transcribes every clip (word timestamps) and probes duration, producing the
stringout index that make_stringout.mjs turns into a review timeline.

Usage: python tools/stringout.py <out index.json> <clip1> [clip2 ...] [--prompt "domain terms"]
"""
import io, json, os, subprocess, sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

args = sys.argv[1:]
prompt = "繁體中文。"
if "--prompt" in args:
    i = args.index("--prompt")
    prompt = args[i + 1]
    args = args[:i] + args[i + 2:]
OUT, clips = args[0], args[1:]
assert clips, "no clips given"

from faster_whisper import WhisperModel

model = WhisperModel("small", device="cpu", compute_type="int8")


def probe(path):
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-select_streams", "v", "-show_entries", "stream=width,height,r_frame_rate",
         "-of", "json", path],
        capture_output=True, text=True)
    d = json.loads(r.stdout)
    st = (d.get("streams") or [{}])[0]
    return {
        "duration": round(float(d["format"]["duration"]), 3),
        "width": st.get("width"), "height": st.get("height"),
        "fps": st.get("r_frame_rate"),
    }


index = {"clips": []}
for ci, path in enumerate(clips):
    path = os.path.abspath(path)
    meta = probe(path)
    print(f"[{ci}] {os.path.basename(path)}  {meta['duration']}s {meta['width']}x{meta['height']}", flush=True)
    segments, _ = model.transcribe(
        path, language="zh", word_timestamps=True, vad_filter=True,
        initial_prompt=prompt)
    segs = []
    for si, seg in enumerate(segments):
        words = [{"w": w.word, "s": round(w.start, 3), "e": round(w.end, 3)}
                 for w in (seg.words or [])]
        segs.append({
            "id": f"c{ci}-s{si}",
            "start": round(seg.start, 3), "end": round(seg.end, 3),
            "text": seg.text.strip(), "words": words,
        })
        print(f"  [{seg.start:7.2f}-{seg.end:7.2f}] {seg.text.strip()}", flush=True)
    index["clips"].append({"file": os.path.basename(path), "path": path, **meta, "segments": segs})

os.makedirs(os.path.dirname(OUT) or ".", exist_ok=True)
json.dump(index, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
total = sum(c["duration"] for c in index["clips"])
nseg = sum(len(c["segments"]) for c in index["clips"])
print(f"DONE {len(clips)} clips, {total:.0f}s, {nseg} segments -> {OUT}")
