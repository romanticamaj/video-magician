---
name: rough-cut
description: 粗剪——使用者丟一堆毛片，逐支轉錄語音與畫面內容做成互動 timeline（stringout），讓使用者勾選刪除段落、修字幕，套用後組出 master 粗剪＋正典字幕，直接接進 video-magician 後製。當使用者「丟多支毛片要剪成一支」「先看講了什麼再決定留哪些」時使用。
---

# rough-cut（粗剪：index → decide → assemble）

上游 skill。產出 = master 粗剪影片＋對齊好的字幕輸入，出口直接接 `video-magician`
（上字幕/特效/混音）。核心理念見 ADR-0007：**先建索引、在文字上做決策**，
只在關鍵處回看畫面。

## 流程

### 1. 索引（每支毛片轉錄＋探測）

```bash
python tools/stringout.py local/stringout.json <clip1> <clip2> ... --prompt "<專有名詞>"
```

- 先跟使用者要專有名詞（品牌/人名/術語）塞 prompt。
- 逐支輸出：時長、解析度、句級 segments（含逐字時間戳）。
- **畫面文字**：對含螢幕/文件的 clip，抽 2-3 格自己讀，把關鍵畫面文字
  （網址、數字、標題）記下來，校對字幕時用來查證。

### 2. Stringout 審核頁（交付給使用者）

```bash
node tools/make_stringout.mjs --index local/stringout.json
```

產出 `out/stringout.html`（單一自足檔）：每支 clip 一節——內嵌播放器＋
時間軸色塊（綠=保留、紅=刪除）＋逐句列（縮圖、時間、**可編輯字幕**、刪除鈕）。
鍵盤流：`↑↓` 換句、`d` 刪/留、`enter` 改字、`space` 播放該句。
使用者審完按「匯出 decisions」得 `stringout.decisions.json`。

交付前 agent 可以先做一輪**建議**：明顯的重複 take、口誤、廢話段先標成刪除
候選（在對話中列出理由讓使用者參考），但**決定權在使用者**。

### 3. 套用（組 master＋產字幕輸入）

```bash
python tools/apply_stringout.py local/stringout.json <decisions.json>
```

- 保留段自動加 0.12s 呼吸空間、相鄰 <0.6s 的段落合併（避免碎剪）。
- 組出 `local/master.mp4`（跨 clip trim+concat，統一重編碼；**各 clip 解析度
  必須一致**，不一致先正規化）。
- 逐字時間戳與使用者改過的字幕文字**重映射到 master 時間軸**：
  `local/master_whisper.json` ＋ `tools/captions.json`（正典）。

### 4. 交棒給 video-magician

```bash
python tools/align.py local/master_whisper.json tools/captions.json src/subtitles.json <master長度>
cp local/master.mp4 public/
# videoConfig.videoFile = 'master.mp4'，之後照 video-magician skill 走
```

master 已是乾淨粗剪，videoConfig 的 `cuts` 通常留空；後續微調再用 cuts。

## 注意

- 中繼檔（index、master_whisper、plan）一律放 `local/`（gitignored）。
- 句子在 stringout 里被刪掉≠音訊消失——是整段畫面+聲音都不進 master；
  想保畫面刪聲音是另一回事，跟使用者確認。
- 無語音的 b-roll clip 會沒有 segments：在索引後主動問使用者「這支要
  整段保留/丟棄/取哪段」，手動補進 decisions（`keep` 一個涵蓋整段的假 segment）。
- decisions 套用後如果使用者又要改，重跑 apply 即可（決策檔是唯一真相源）。
