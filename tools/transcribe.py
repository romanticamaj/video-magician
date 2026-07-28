# -*- coding: utf-8 -*-
"""faster-whisper 轉錄，含逐字時間戳。
用法: python transcribe.py <影片或音檔> <輸出.json> [initial_prompt]
"""
import io, json, os, sys
from faster_whisper import WhisperModel

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

src, out = sys.argv[1], sys.argv[2]
prompt = sys.argv[3] if len(sys.argv) > 3 else "繁體中文。"
os.makedirs(os.path.dirname(out) or ".", exist_ok=True)

model = WhisperModel("small", device="cpu", compute_type="int8")
segments, info = model.transcribe(
    src,
    language="zh",
    word_timestamps=True,
    vad_filter=True,
    initial_prompt=prompt,
)
result = []
for seg in segments:
    words = [{"w": w.word, "s": round(w.start, 3), "e": round(w.end, 3)} for w in (seg.words or [])]
    result.append({"text": seg.text, "start": round(seg.start, 3), "end": round(seg.end, 3), "words": words})
    print(f"[{seg.start:7.2f} - {seg.end:7.2f}] {seg.text}", flush=True)

with open(out, "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=1)
print("DONE", info.language, info.duration)
