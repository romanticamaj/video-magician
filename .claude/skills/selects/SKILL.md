---
name: selects
description: 圈選（pull selects）——使用者丟一群長影片，先把要的片段圈出來：ASR 語音段可快速跳轉勾選，任意畫面段可用入點/出點手動圈、在指定位置切割，匯出決策後 ffmpeg 切出所有片段，進入 rough-cut 粗剪。當使用者「一堆素材先挑片段」「把要的部分圈出來/切出來」時使用。
---

# selects（圈選：從素材堆拉出要的片段）

最上游 skill。管線全貌：**selects（圈段）→ rough-cut（粗剪成 master）→
video-magician（字幕/特效/混音）**。素材量大、只有部分要用時從這裡開始；
素材本來就都要用則直接跳 rough-cut。

## 流程

### 1. 索引（重用 rough-cut 的工具）

```bash
python tools/stringout.py local/stringout.json <clip1> <clip2> ... --prompt "<專有名詞>"
```

長素材多支會跑一陣子（small 模型約 0.7x 實時）；先告知使用者預估時間。

### 2. 圈選頁（交付給使用者）

```bash
node tools/make_selects.mjs --index local/stringout.json
```

產出 `out/selects.html`（單一自足檔）。每支影片一節，兩種圈法並存：

- **語音段（上排、綠色）**：每句 ASR 一個候選段——點跳播、勾 checkbox 匯出、
  改起訖秒數微調前後、改備註。
- **手動段（下排、藍色）**：影片播到哪，`i` 標入點、`o` 標出點成段——圈任何
  畫面（b-roll、操作畫面、無語音段落）。
- **切割**：播放頭停在段內按 `s`，該段一分為二，兩半各自勾選。
- 鍵盤流：`space` 播放、`←→` ±0.5s、`i/o` 圈段、`s` 切割、`e` 勾/取消、
  `↑↓` 換段、`✕` 刪段。

匯出 `selects.decisions.json`。agent 可先做一輪建議（把明顯的重點句先勾好、
在對話裡說明理由），但決定權在使用者。

### 3. 切割

```bash
python tools/apply_selects.py <decisions.json> [--pad 0.15]
```

- 每個勾選段精確重編碼切出（不用 stream copy——會被 keyframe 拉走）。
- 產出 `local/selects/NN_名稱_起-訖_備註.mp4` ＋ `manifest.json`。
- `--pad` 可整批加呼吸空間（rough-cut 之後還會再修）。

### 4. 交棒

切出的片段資料夾就是 rough-cut 的輸入：

```bash
python tools/stringout.py local/stringout.json local/selects/*.mp4 --prompt "..."
# 之後照 rough-cut skill 走（stringout 頁 → decisions → master → video-magician）
```

片段少而乾淨時也可以跳過 rough-cut 直接合（用 rough-cut 的 apply 全保留即可）。

## 注意

- 手動段沒有 ASR 文字，備註欄留給使用者/agent 寫用途（「開箱特寫」「B-roll」）。
- decisions 是唯一真相源：改主意就改 JSON 重跑 apply，輸出資料夾會重建。
- 中繼檔與切出片段都在 `local/`（gitignored）。
