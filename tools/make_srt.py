# -*- coding: utf-8 -*-
"""subtitles.json → SRT, aware of the cover offset and jump cuts.

Usage: python tools/make_srt.py <subtitles.json> <out.srt> [cover_offset_sec] [cuts_json]

cuts_json: optional JSON array of [from, to] source-time intervals matching
videoConfig.cuts, e.g. "[[57.68, 62.06]]". Captions fully inside a cut are
dropped; captions crossing a boundary are clipped; all times are remapped to
the output timeline.
"""
import json, sys

subs = json.load(open(sys.argv[1], encoding="utf-8"))
offset = float(sys.argv[3]) if len(sys.argv) > 3 else 0.0
cuts = json.loads(sys.argv[4]) if len(sys.argv) > 4 else []
cuts = sorted([list(map(float, c)) for c in cuts])


def src_to_out(t):
    removed = 0.0
    for f, to in cuts:
        if t >= to:
            removed += to - f
        elif t > f:
            removed += t - f
    return t - removed


def clip(start, end):
    """Clip a caption interval against removed intervals; None if fully removed."""
    for f, to in cuts:
        if start >= f and end <= to:
            return None
        if start < f < end <= to:
            end = f
        elif f <= start < to < end:
            start = to
    if end - start < 0.15:
        return None
    return start, end


def ts(x):
    total_ms = round((x + offset) * 1000)
    s, ms = divmod(total_ms, 1000)
    m, s = divmod(s, 60)
    h, m = divmod(m, 60)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


n = 0
with open(sys.argv[2], "w", encoding="utf-8-sig") as f:
    for sub in subs:
        clipped = clip(sub["start"], sub["end"])
        if clipped is None:
            continue
        start, end = (src_to_out(t) for t in clipped)
        n += 1
        f.write(f"{n}\n{ts(start)} --> {ts(end)}\n{sub['text']}\n\n")
print("ok", n, "captions", f"({len(subs) - n} dropped)" if n != len(subs) else "")
