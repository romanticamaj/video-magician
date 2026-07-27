# -*- coding: utf-8 -*-
"""Bootstrap a captions.json draft from whisper output.

This is the DEFAULT path when no human-made caption list exists:
whisper provides both draft text and coarse start times; the draft is then
proofread (fix ASR errors / proper nouns / line splits) before align.py
locks precise timing to the corrected text.

Usage: python tools/whisper_to_captions.py <whisper.json> <out captions.json> [max_chars]
"""
import json, sys, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

WHISPER, OUT = sys.argv[1], sys.argv[2]
MAX_CHARS = int(sys.argv[3]) if len(sys.argv) > 3 else 16

segs = json.load(open(WHISPER, encoding="utf-8"))
captions = []
for seg in segs:
    words = seg.get("words") or []
    if not words:
        captions.append({"t": int(seg["start"]), "text": seg["text"].strip()})
        continue
    # split long segments into subtitle-sized lines on word boundaries
    line, line_start = "", None
    for w in words:
        if line_start is None:
            line_start = w["s"]
        line += w["w"]
        if len(line.replace(" ", "")) >= MAX_CHARS:
            captions.append({"t": int(line_start), "text": line.strip()})
            line, line_start = "", None
    if line.strip():
        captions.append({"t": int(line_start), "text": line.strip()})

json.dump(captions, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for c in captions:
    print(f'{c["t"]:5d}  {c["text"]}')
print(len(captions), "draft lines ->", OUT)
print("NOTE: proofread this draft (ASR errors, proper nouns, line splits) before align.py")
