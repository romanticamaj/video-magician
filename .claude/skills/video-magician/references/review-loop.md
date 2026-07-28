# Human-in-the-Loop 校驗迴圈

成品不是渲染完就交付——要經過**逐項審核閘門**。

## 流程

```
渲染 out/final.mp4
  → node tools/make_review.mjs --video out/final.mp4 --revision N
  → 交付 out/review.html 給使用者（單一自足檔案；OpenCut 式 UI：
     五軌時間軸 lanes＋playhead、點方塊=選取+seek、密度條顯示審核進度、
     鍵盤流 ↑↓ 換項 / a 通過 / r 要改 / x 移除 / space 播放）
  → 使用者逐項審：✅ 通過 / ✏️ 要改（可直接改欄位＋寫自由備註）/ 🗑️ 移除
  → ⚠️ 影片內嵌播放需 review.html 與影片檔同資料夾且經 file:// 或支援
     Range 的 host 開啟；沒有影片時退化為縮圖模式，功能不減
  → 匯出 review.feedback.json 丟回來
  → agent 套用 → 重渲染 → make_review --revision N+1
  → 迴圈直到沒有 changes_requested → 才進 mastering 與交付
```

## feedback JSON 格式

```json
{
 "revision": 1,
 "items": [
  {"id": "chip-2", "status": "changes_requested",
   "edits": {"from": 33.0, "label": "新文案"},
   "feedback": "太早出現，等畫面切到終端機再進"},
  {"id": "sub-14", "status": "approved"},
  {"id": "sfx-1", "status": "removed"}
 ]
}
```

## 套用規則（agent 端）

1. **`edits` 是結構化指令**：直接寫回 `videoConfig.ts` / `subtitles.json` 對應欄位
   （id 對照：`chip-N`＝chips[N]、`sub-N`＝subtitles[N]、`cut-N`＝cuts[N]、
   `sfx-N`＝sfx.cues[N]、其餘為同名 config 區塊）。
2. **`feedback` 是自由文字**：自行判斷怎麼改；與 `edits` 並存時 edits 先套、
   feedback 再調。時間類 feedback 一律回查 whisper 逐字戳或抽格佐證，不猜。
3. **`removed`**：overlay 設 null／陣列項刪除。
4. 沒列出的 item ＝ 未審，不動。
5. 套用完抽格驗證每個改動點，再整支渲染，產出下一版 review 頁。

## 閘門規則

- `changes_requested` > 0 → **禁止交付**，繼續迴圈。
- 全部 approved（或使用者明說「直接出」）→ mastering → 交付。
- 同類修正在迴圈中出現 ≥2 次 → 蒸餾成通用規則寫入 `learnings.md`。
