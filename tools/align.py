# -*- coding: utf-8 -*-
"""Align canonical caption text (integer-second starts) with faster-whisper
word timestamps to produce precise subtitle timing.

Usage: python tools/align.py <whisper.json> <captions.json> <out subtitles.json> [total_sec]
"""
import json, re, difflib, sys, io, os

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

WHISPER, CAPTIONS, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
TOTAL = float(sys.argv[4]) if len(sys.argv) > 4 else 1e9
GAP = 0.02  # minimum silence between consecutive subtitles
MIN_MATCH_RATIO = 0.5  # matched-char confidence threshold per line

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

# 2. char stream from captions; gap entries become linger barriers
lines = [c for c in caps if "text" in c]
gaps = sorted(float(c["t"]) for c in caps if "gap" in c)
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

# 4. fallback for unmatched / low-confidence / drifted lines
for li, line in enumerate(lines):
    n = len(norm(line["text"]))
    est = max(0.6, 0.18 * n)
    ratio = matched[li] / n if n else 0.0
    low_conf = ratio < MIN_MATCH_RATIO
    drifted = starts[li] is not None and abs(starts[li] - float(line["t"])) > 1.6
    if starts[li] is None or low_conf or drifted:
        starts[li] = float(line["t"])
        ends[li] = float(line["t"]) + est
        matched[li] = 0

# 5. canonical order preserved; enforce monotonic starts, then linger, then
#    unconditionally cap every end at the next start (non-overlap guarantee)
prev_start = -1e9
for li in range(len(lines)):
    starts[li] = max(starts[li], prev_start + GAP)
    ends[li] = max(ends[li], starts[li] + 0.5)
    prev_start = starts[li]

def next_barrier(li):
    nxt = starts[li + 1] if li + 1 < len(lines) else TOTAL
    for g in gaps:
        if ends[li] <= g < nxt:
            nxt = g
            break
    return nxt

for li in range(len(lines)):
    barrier = next_barrier(li)
    lingered = min(barrier - GAP, ends[li] + 0.9)
    if lingered > starts[li] + 0.3:
        ends[li] = max(min(ends[li], barrier - GAP), min(lingered, barrier - GAP))
    # readable-duration floor first, then the hard non-overlap cap wins:
    # dense captions get shortened, never overlapped
    ends[li] = max(ends[li], starts[li] + 0.3)
    if li + 1 < len(lines):
        cap = starts[li + 1] - GAP
        ends[li] = min(ends[li], cap) if cap > starts[li] else starts[li] + 0.01

out = []
for li, line in enumerate(lines):
    out.append({
        "text": line["text"],
        "start": round(starts[li], 3),
        "end": round(ends[li], 3),
        "speaker": line.get("speaker", "host"),
    })

os.makedirs(os.path.dirname(OUT) or ".", exist_ok=True)
json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for li, o in enumerate(out):
    flag = "" if matched[li] else "  <-- fallback"
    print(f'{o["start"]:7.2f} {o["end"]:7.2f}  {o["text"]}{flag}')
print(len(out), "lines ->", OUT)

# sanity: report any residual overlap (should never fire)
for a, b in zip(out, out[1:]):
    if a["end"] > b["start"]:
        print(f'WARN overlap: "{a["text"]}" ends {a["end"]} after "{b["text"]}" starts {b["start"]}')
