# 音訊混音配方（ffmpeg）

基準：先量人聲響度，所有相對音量以它為準。

```bash
ffmpeg -i 毛片.mov -af ebur128=framelog=quiet -f null - 2>&1 | grep -A4 "Integrated loudness"
```

## 配比

| 元素 | 音量 |
|---|---|
| 人聲 | 不動（基準） |
| SFX | 人聲 -13 dB 左右 |
| BGM 基準 | 人聲 -6 dB |
| Sidechain ducking | 講話時壓 2 dB |
| 成品整體 | -14 LUFS integrated、true peak ≤ -1.5 dBTP |

## SFX 正規化

```bash
# 例：人聲 -17 LUFS → SFX 目標 -30
ffmpeg -y -i sfx.wav -af "loudnorm=I=-30:TP=-4:LRA=7" -ar 44100 -ac 2 sfx_n.wav
```

## BGM：正規化＋Sidechain ducking（烘進檔案）

```bash
# BGM = 人聲 -6 dB；ducking ≈2 dB
# adelay = 封面位移 ms（coverFrames/30*1000，例 26 幀 = 867ms）
ffmpeg -y -i bgm_raw.wav -i 毛片.mov -filter_complex "\
[0:a]atrim=0:總長,loudnorm=I=<人聲-6>:TP=-4:LRA=9,aresample=44100[bgm];\
[1:a]adelay=867|867,apad,aresample=44100[key];\
[bgm][key]sidechaincompress=threshold=0.022:ratio=2:attack=12:release=400:makeup=1[out]" \
-map "[out]" -t 總長 -ar 44100 -ac 2 public/bgm.wav
```

校準：講話字句瞬間 RMS 通常比整段 RMS 高 6-8 dB（整段被停頓拉低），
threshold 要設在字句 RMS 之下 8-10 dB 才會確實觸發。
驗證方式＝量「連續講話 6 秒窗」vs「無聲空檔窗」的 LUFS 差：

```bash
ffmpeg -ss <講話窗> -t 6 -i public/bgm.wav -af ebur128=framelog=quiet -f null - 2>&1 | grep "I:"
ffmpeg -ss <空檔窗> -t 2 -i public/bgm.wav -af ebur128=framelog=quiet -f null - 2>&1 | grep "I:"
```

## 成品響度 mastering（不重渲染）

```bash
# 1) 量現值
ffmpeg -i final.mp4 -af ebur128=framelog=quiet -f null - 2>&1 | grep "I:"
# 2) gain = (-14) - 現值，先估再迭代（limiter 會吃掉部分增益）
ffmpeg -y -i final.mp4 -c:v copy \
  -af "volume=<gain>dB,alimiter=limit=0.75:attack=5:release=60:level=false" \
  -c:a aac -b:a 192k final_mastered.mp4
# 3) 驗證 true peak
ffmpeg -i final_mastered.mp4 -af "ebur128=framelog=quiet:peak=true" -f null - 2>&1 | grep -E "I:|Peak:"
```

⚠️ limiter ceiling 設 -1.5 dB 時 AAC 編碼會 overshoot 到 0 dBFS——
ceiling 要留到 **-2.5 dB（limit=0.75）**。gain 與 ceiling 互動非線性，
一律「調 → 量 → 再調」迭代收斂。
