# -*- coding: utf-8 -*-
"""subtitles.json → SRT（可加封面位移）
用法: python make_srt.py <subtitles.json> <輸出.srt> [位移秒 例 0.867]
"""
import json, sys

subs = json.load(open(sys.argv[1], encoding="utf-8"))
off = float(sys.argv[3]) if len(sys.argv) > 3 else 0.0

def ts(x):
    x += off
    h = int(x // 3600); m = int(x % 3600 // 60); s = int(x % 60)
    ms = int(round((x - int(x)) * 1000))
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

with open(sys.argv[2], "w", encoding="utf-8-sig") as f:
    for i, s in enumerate(subs, 1):
        f.write(f"{i}\n{ts(s['start'])} --> {ts(s['end'])}\n{s['text']}\n\n")
print("ok", len(subs))
