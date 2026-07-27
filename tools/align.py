# -*- coding: utf-8 -*-
"""Align canonical caption text (integer-second starts) with faster-whisper
word timestamps to produce precise subtitle timing.

Usage: python tools/align.py <whisper.json> <captions.json> <out subtitles.json> [total_sec]
"""
import json, re, difflib, sys, io, os

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

WHISPER, CAPTIONS, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
TOTAL = float(sys.argv[4]) if len(sys.argv) > 4 else 1e9

PUNCT = re.compile(r"[\s，。！？!?～~…、（）()「」\[\]:：;；'\"‘’“”😂-]+")

def norm(s):
    return PUNCT.sub("", s).lower()

whisper = json.load(open(WHISPER, encoding="utf-8"))
caps = json.load(open(CAPTIONS, encoding="utf-8"))

# 1. char stream from whisper words (distribute word time across its chars)
wchars = []  # (char, start, end)
for seg in whisper:
    for w in seg["words"]:
        chars = list(norm(w["w"]))
        if not chars:
            continue
        dur = (w["e"] - w["s"]) / len(chars)
        for i, c in enumerate(chars):
            wchars.append((c, w["s"] + i * dur, w["s"] + (i + 1) * dur))

wstr = "".join(c for c, _, _ in wchars)

# 2. char stream from captions
lines = [c for c in caps if "text" in c]
cchars = []  # (char, line_index)
for li, line in enumerate(lines):
    for c in norm(line["text"]):
        cchars.append((c, li))
cstr = "".join(c for c, _ in cchars)

# 3. align
sm = difflib.SequenceMatcher(None, cstr, wstr, autojunk=False)
starts = [None] * len(lines)
ends = [None] * len(lines)
matched = [0] * len(lines)
for block in sm.get_matching_blocks():
    for k in range(block.size):
        li = cchars[block.a + k][1]
        ws = wchars[block.b + k][1]
        we = wchars[block.b + k][2]
        if starts[li] is None or ws < starts[li]:
            starts[li] = ws
        if ends[li] is None or we > ends[li]:
            ends[li] = we
        matched[li] += 1

# 4. fill unmatched lines from list integer time; guard against far drift
for li, line in enumerate(lines):
    est = max(0.6, 0.18 * len(norm(line["text"])))
    if starts[li] is None or abs(starts[li] - float(line["t"])) > 1.6:
        starts[li] = float(line["t"])
        ends[li] = float(line["t"]) + est

# 5. monotonic + readable ends
order = sorted(range(len(lines)), key=lambda i: (starts[i], i))
prev_end = 0.0
res = []
for li in order:
    s = max(starts[li], prev_end + 0.02)
    e = max(ends[li], s + 0.5)
    res.append({"i": li, "s": s, "e": e})
    prev_end = s

for j, r in enumerate(res):
    nxt = res[j + 1]["s"] if j + 1 < len(res) else TOTAL
    lingered = min(nxt - 0.02, r["e"] + 0.9)
    r["e"] = max(r["e"], lingered) if lingered > r["s"] else r["e"]
    r["e"] = min(r["e"], nxt - 0.02) if nxt - 0.02 > r["s"] + 0.3 else r["e"]

out = []
for r in res:
    line = lines[r["i"]]
    out.append({
        "text": line["text"],
        "start": round(r["s"], 3),
        "end": round(r["e"], 3),
        "speaker": line.get("speaker", "host"),
    })

os.makedirs(os.path.dirname(OUT) or ".", exist_ok=True)
json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for o, r in zip(out, res):
    flag = "" if matched[r["i"]] else "  <-- fallback"
    print(f'{o["start"]:7.2f} {o["end"]:7.2f}  {o["text"]}{flag}')
print(len(out), "lines ->", OUT)
