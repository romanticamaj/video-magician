---
name: video-magician
description: 用這個 repo 的 Remotion 管線後製短影音——跳剪、轉場、字幕、overlay 特效、音效與 BGM、響度 mastering。直式與橫式都支援，也支援不加任何文字的純剪接。當使用者要求「上字幕」「上特效」「配樂/混音」「做封面」「剪掉某段」「跳剪重點」「加淡入淡出」時使用。
---

# 短影音後製管線（本 repo）

> **動手之前先讀這兩份**（順序固定，兩份都是與本檔同級的指示）：
> 1. `references/editing-principles.md` — 剪片大原則。每支影片都成立的鐵則，違反即為 bug。
> 2. `references/learnings.md` — 累積的個別偏好與情境規則。
>
> 兩份都讀完再開始盤點素材。

架構分兩層：`src/engine/` 是渲染引擎（元件、jump-cut 時間軸系統、icon、字型），
**永遠不需要為單支影片修改**；所有專案內容集中在 `src/videoConfig.ts` 與
`src/subtitles.json`（皆 gitignored）。改影片 = 改 config。

## 初始化（fresh clone）

```bash
npm install
mkdir -p local
cp src/videoConfig.sample.ts src/videoConfig.ts
cp src/subtitles.sample.json src/subtitles.json
cp tools/captions.sample.json tools/captions.json
# 素材放 public/：毛片、bgm.wav、sfx/*.wav、cover_bg.png、last_frame.png
# ⚠️ 字型是硬依賴：public/fonts/ChenYuluoyan-2.0-Thin.ttf 不存在會卡渲染
```

`public/cover_bg.png` = 毛片第 0 幀；`public/last_frame.png` = **最後一個保留段的結尾幀**
（cuts 有剪到片尾時不能用毛片最後一幀，會漏出被剪畫面）：

```bash
ffmpeg -i 毛片.mov -frames:v 1 public/cover_bg.png
ffmpeg -ss <最後保留段結尾秒-0.05> -i 毛片.mov -frames:v 1 public/last_frame.png
```

## 工作流程

### 1. 素材盤點
`ffprobe` 毛片規格；`ffmpeg -af ebur128` 量人聲 LUFS（之後所有音量以此為基準）；抽畫格確認場景 cut 秒數。

盤點時**一定要先跑完這三個判斷**，它們會決定整支怎麼搭：

1. **有沒有人聲**：`astats=metadata=1:reset=N` 看 RMS 隨時間變化。平坦（起伏 < 1 dB）
   ＝只有配樂／環境音 → **整個字幕流程跳過**，不要硬上。
2. **內容的真實邊界**：`blackdetect` 找黑幀，頭尾各抽 10fps 逐格看。
   螢幕錄影幾乎一定錄到桌面或錄影軟體本身，`ffprobe` 的 duration 不等於內容結束點。
3. **輸出比例**：來源是橫式、而且畫面資訊貼在左右邊緣（遊戲面板、IDE、網頁後台）時，
   **問使用者**要橫式還是直式——硬裁成 9:16 會直接切掉內容。用 `composition` 設定。

### 2. 字幕
**沒有人聲就整段跳過**（見步驟 1 的 RMS 判斷），`subtitles.json` 放 `[]` 即可。
有人聲時毛片通常**沒有**現成字幕，標準路徑是三步：

1. **轉錄**：`python tools/transcribe.py <毛片> local/whisper.json "<專有名詞提示>"`
   （initial_prompt 先跟使用者要品牌名/人名/術語，中文 ASR 最容易錯這些；
   中繼檔一律放 `local/`，該目錄被 gitignore）。
2. **起草＋校對**：`python tools/whisper_to_captions.py local/whisper.json tools/captions.json`
   產生草稿，然後**逐句校對**成正典文字——自己先修明顯 ASR 錯誤（同音字、
   專有名詞、贅字取捨），再把整份草稿列給使用者確認一次。校對只改文字，不動 `t`。
3. **對齊**：`python tools/align.py local/whisper.json tools/captions.json src/subtitles.json <總長>`
   ——文字用校對後的正典，時間用 whisper 逐字戳，字級 diff 合併。

捷徑：使用者若提供人工字幕清單（剪映/CapCut 螢幕錄影等），抽格讀出文字＋起始秒
直接當正典，跳過步驟 2。

使用者說某句太早/太晚 → 查 whisper.json 該時段逐字時間，不要猜。

### 3. 設定 videoConfig
所有 overlay（封面、liquid glass 標題、逐字大字、章節 chips、印章、計數、片尾 CTA）、
音效 cue、剪輯段落都在 `src/videoConfig.ts`。時間一律用**來源影片秒數**——
`cuts` 改變時所有 cue 自動重新對位（見 `src/engine/cuts.ts`）。
chips 的 from/to 必須對齊畫面 cut（先抽格確認）。

`speed`（選填，預設 1）＝整體加速倍率。cue 時間仍寫**來源秒數**，只有輸出時間軸被壓縮，
所以改 speed 不需要動任何 cue。渲染時走 ffmpeg `atempo`，**音高不變**（1.2x 若不保
音高會升 3.2 個半音，變花栗鼠聲）。

**接點音訊**：每個剪點都會做等功率 crossfade（畫面照樣硬切），`audioCrossfadeFrames`
**預設 15 幀＝500ms，不用寫**。只有在保留段短到裝不下重疊時才調小。
這是鐵則不是選項——理由與驗收方法見 `references/editing-principles.md` §1。

**轉場**：`fades` 在指定接點做 dip-to-black（`at` 寫該 cut 任一端的來源秒數）。
只下在換關卡／換場景／換段落的地方，一支 90s 約 4–6 個，其餘維持硬跳剪。

**畫面尺寸與純剪接**：`composition` 設輸出長寬（省略＝直式 1080×1920）。
使用者要「純剪接、不加字」時，除了所有 overlay 設 null，還要 `polish: false`
關掉暗角／底部漸層／進度條——那層是為字幕可讀性存在的，沒字幕時只是不請自來的效果。
另外 `cover: null` 時不需要 `public/cover_bg.png`，`outroFrames: 0` 時不需要 `last_frame.png`。

**運鏡與物件動畫**：`cameraMoves` 可加數位運鏡（punch-in、慢 zoom、whip-pan
蓋剪點、手持感…），overlay 動畫參數（blur 進場、overshoot、stagger）照
`references/motion-library.md` 的語彙與數值選用——挑 2–4 個放在故事節拍上，
不要鋪滿。

### 4. 音效與 BGM
- SFX：一律 loudnorm 到人聲 -13 dB 左右再放進 `public/sfx/`
  （**< 0.5s 的極短音效改用峰值正規化**，見 learnings）。
- 毛片自帶音樂/音效的段落（玩遊戲、播成品）用 `bgm.ducks`（來源秒數）壓 -12 dB 左右，
  讓畫面聲音與口白當主角。
- BGM 預先混好（loudnorm 人聲 -6 dB ＋ sidechain ducking 壓 2 dB）再放 `public/bgm.wav`，
  完整指令見 `references/audio-mixing.md`。key 要 `adelay=<封面幀數/30*1000>ms` 對齊封面位移。

### 5. 驗證循環
- 每次改動先 `npx remotion still Main out/chk.png --frame <N>` 抽關鍵幀讀圖確認，再整支渲染。
- `npx remotion render Main out/<專案代號>_revN.mp4 --concurrency 8`（背景跑）。
  ⚠️ `out/` 會累積上一支影片的版本歷程，**輸出檔名一定要加專案前綴**，
  不要接著用 `final_vN` 編號——`--output` 會靜默覆蓋別支影片的檔案。開跑前先 `ls out/`。
- 只想聽／看某一段時用 `--frames=<起>-<迄>` 只渲染該區間，比整支快一個量級。
- 成品抽格驗證每個 overlay 出現/消失的邊界時刻。
- 抽格做對照表時**不要用 `select` 接 `fps`**：`fps` 會用重複幀填滿被 select 丟掉的空隙，
  做出來的 grid 是假的。改成逐段 `-ss/-t` 抽再 `vstack`/`hstack` 併起來。

### 6. 校驗迴圈（閘門，必經）
整支渲染後**不要直接交付**：`node tools/make_review.mjs --video out/final.mp4 --revision N`
產出 `out/review.html` 給使用者逐項審核（每個 overlay/字幕/剪點/音效一個 item，
可改欄位值＋寫備註）。收到 `review.feedback.json` 後逐項套用、重渲染、出下一版。
**還有 changes_requested 就不能進 mastering。** 細節見 `references/review-loop.md`。

### 7. 成品響度
mastering 到 -14 LUFS / TP ≤ -1.5 dB，`-c:v copy` 不重渲染，
limiter ceiling 設 -2.5 dB 防 AAC overshoot——指令與迭代方法見 `references/audio-mixing.md`。

## Self-learning（必做）

這個 skill 會隨使用自我進化，機制有三步：

1. **啟動時**：先讀 `references/editing-principles.md` 再讀 `references/learnings.md`，
   兩者都當作與 SKILL.md 同級的指示。
2. **過程中**：每當使用者**修正**一個產出（「這裡太黑」「這個 chip 太早出現」「音量再小一點」）
   或表達可重用的**偏好**，在完成該修正後，把它蒸餾成一條通用規則
   append 進 `references/learnings.md`（格式見該檔案）。判斷標準：
   「下一支不同的影片還會用到嗎？」會 → 記；只是這支影片的個別調整 → 不記。
3. **收尾時**：交付前回顧本次對話，檢查是否有漏記的學習。穩定的學習依性質分流升級：
   - **不這樣做就會壞**（物理／感知層面的必然）→ 升級進 `references/editing-principles.md`
   - **這樣做比較好**（風格偏好、本 repo 的慣例）→ 升級進 SKILL.md 的「設計慣例」
   升級後從 learnings.md 移除。

⚠️ learnings.md 跟著 repo 走（公開）：只記通用規則，不記專案文案、
個人資訊或具體影片內容。

## 設計慣例
- icon 用 `src/engine/icons.tsx` 的 SVG（config 以字串引用），不用 emoji。
- 封面主標：乾淨白色正體字、不加粗、無複雜動畫（0.3s 展開＋徽章蓋章已內建）。
- 手寫字型只當點綴；大字強調用黑描邊（`ThickText` outline，fatten=0）。
- 所有 overlay 不遮臉；封面要露出表情。
- 狀態類 overlay（印章/計數）事件結束畫面切走就退場。
