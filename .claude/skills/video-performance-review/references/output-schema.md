# 輸出格式

寫到 `out/performance.json`。**不要**併進 `review.feedback.json`——
`make_review.mjs` 目前不吃 `perf-*` id，接受的提案要先變成 config 改動，
再走既有的 `review.html` 閘門。

```json
{
  "schema_version": "1",
  "analysis_id": "perf-r6",
  "render": {"path": "out/final_mastered.mp4", "review_revision": 6, "duration_sec": 35.92},

  "overall_decision": "edit_existing",

  "hook": {
    "verdict": "repair",
    "hook_text": "我叫 AI 幫我找音效包",
    "source_range_sec": [0.43, 3.31],
    "output_range_sec": [1.23, 3.62],
    "subject": "叫 AI 挑遊戲音效",
    "tension": "（缺）只講了做什麼，沒講為什麼該在意",
    "promised_payoff": "AI 到底挑不挑得準",
    "first_evidence_output_sec": 12.16,
    "sound_off_equivalent": "封面兩行字；0-0.8s 無字幕"
  },

  "conversation": {
    "verdict": "edit_can_create_conversation",
    "mechanic": "evaluation_disagreement",
    "viewer_question": "AI 挑這組，你買單嗎？",
    "why_two_answers": "音效好壞是主觀的；也有人認為對 key 是多此一舉",
    "invited_at_output_sec": null
  },

  "findings": [
    {
      "id": "perf-001",
      "dimension": "conversation",
      "tier": "B",
      "severity": "blocker",
      "claim": "成果是可被評判的，但全片沒有任何一刻把判斷權交給觀眾。",
      "evidence": [
        {"artifact": "src/subtitles.json", "selector": "sub-13..sub-18",
         "output_range_sec": [22.82, 34.62]}
      ],
      "falsifier": "若該區間畫面上已有可讀的提問，本條不成立。",
      "proposal_ids": ["edit-001"]
    }
  ],

  "edit_proposals": [
    {
      "id": "edit-001",
      "decision": "pending",
      "priority": 1,
      "apply_mode": "config_patch",
      "target": {"file": "src/videoConfig.ts", "path": "CONFIG.liquidTitle",
                 "operation": "set",
                 "value": {"text": "AI 挑這組，你買單嗎？", "from": 44.55, "to": 51.1}},
      "timing_basis": "source_seconds",
      "platform_scope": ["facebook", "instagram", "snap"],
      "observable_goal": "判斷題在第一段證據播放期間可讀。",
      "acceptance_tests": [
        "靜音也讀得到",
        "不遮住示範中的 UI",
        "拿掉提問後證據本身仍看得懂"
      ],
      "dependencies": []
    }
  ],

  "questions_for_user": [],

  "unknowns": ["觸及", "留言數", "留存變化", "是否會被推薦給新受眾"]
}
```

## 欄位規則

- **`timing_basis` 一律 `source_seconds`**——config 的所有 cue 都是來源秒數，
  剪點一改會自動重新對位。寫輸出秒數會在下次改剪時全部錯位。
- **`apply_mode` 必須誠實**。特別是「把某段移到前面」＝`source_rebuild`，
  不是 `config_patch`（引擎只能移除、不能重排，見 `src/engine/cuts.ts`）。
- **`falsifier` 不可省**。寫不出「什麼情況下我這條是錯的」，代表這條是憑感覺，
  應該降級或刪掉。
- **`observable_goal` 只能寫看得到的結果**，不能寫「留言會變多」。
- **`severity`** 用 `blocker` / `repair` / `nit` 三級，不要打分數。

## 給人看的表

JSON 之外，一定要附一張短表讓使用者逐項決定：

| ID | 改什麼 | 為什麼 | mode | 決定 |
|---|---|---|---|---|
| edit-001 | 證據播放時打出「AI 挑這組，你買單嗎？」 | 補上「評價／分歧」機制 | config_patch | 接受／退回／修改 |
| edit-002 | 把「屁啦」那 1.7s 接到最前面當冷開場 | 0–0.8s 目前無鉤子 | **source_rebuild** | 接受／退回／修改 |

`source_rebuild` 的項目要額外註明代價（要重建合成來源、所有 cue 重定基準、
或改用成品後製接片＋重新 mastering），讓使用者知道那不是免費的。
