# Motion Library（運鏡＋物件動畫語彙）

提煉自 [aicameramovements.com](https://aicameramovements.com)（46 種運鏡）與
[transitions.dev](https://github.com/Jakubantalik/transitions.dev)（27 種 UI 轉場）。
用途：剪輯時從這裡挑效果，讓畫面有導演感——**但一支 90 秒最多 2–4 個運鏡、
用在故事節拍上**（揭曉、轉折、高潮），連發等於沒有。

## A. 數位運鏡（作用在毛片畫面上）

原始 46 種裡，2D 後製管線可行的子集（engine 已內建 `CONFIG.cameraMoves`）：

| type | 效果 | 情緒/用途 | 建議參數 |
|---|---|---|---|
| `punchIn` | 快速推近後定住 | 強調、笑點、金句落點 | intensity 0.08–0.15，0.3–0.5s |
| `zoomIn` | 全程緩慢放大 | 醞釀緊張、聚焦人物 | intensity 0.05–0.12，跨整段 3–8s |
| `zoomOut` | 緩慢拉遠 | 揭示環境、收尾釋放 | 同上 |
| `crashZoom` | 極快撞入 | 誇張喜劇強調（配 thud 音效） | intensity 0.2–0.3，0.15–0.25s |
| `panLeft/Right` | 水平橫移 | 引導視線、空間過場 | intensity 0.03–0.06（比例位移） |
| `handheld` | 微晃 | 臨場感、緊張段落 | intensity 0.004–0.01，整段 |
| `whipLeft/Right` | 甩鏡＋動態模糊 | **跨剪點轉場**——蓋住 jump cut | 跨剪點前後各 0.15–0.25s |

限制（1080×1920 來源）：
- 放大超過 ~1.3x 會軟掉；punchIn 上限 0.15、crashZoom 短到看不清才可 0.3。
- pan 位移要配 `scale(1+|pan|)` 補邊（engine 自動做），所以 pan 幅度即隱含放大。
- whip 的正確用法：`from` 設剪點前 0.2s（來源時間）、`to` 設剪點後接續畫面 0.2s
  ——輸出時間軸上是連續的，模糊高峰剛好蓋住接縫。

沒法做的（需要 3D/生成）：orbit、arc、dolly 視差、drone、FPV、earth zoom——
若腳本需要，提示使用者用生成式影片工具補 b-roll，不要硬模擬。

## B. 物件動畫（作用在 overlay 上）

transitions.dev 的設計 DNA——**照抄這些常數，質感就對了**：

| 原則 | 值 | 30fps 換算 |
|---|---|---|
| 進場帶模糊 | blur 2–3px → 0 | 與位移同步消退 |
| 位移要小 | 8–16px（不是 100px） | 動得少、看得清 |
| Overshoot 彈性 | `cubic-bezier(.34,1.45,.64,1)` | spring damping≈12 |
| 柔性落定 | `cubic-bezier(.22,1,.36,1)` | Easing.out(Easing.cubic) 近似 |
| 逐項 stagger | 40–90ms | 1–3 幀/項 |
| 開慢關快 | open 350–500ms / close 250ms | 進 10–15 幀、出 7 幀 |

目錄 → 本管線 overlay 對照（挑過，只列用得上的）：

| transitions.dev | 用在 | 配方 |
|---|---|---|
| texts-reveal | 標題/字幕進場 | 逐行 rise 12px＋blur 3px→0，stagger 40ms |
| number pop-in | 計數字元更新 | 逐位進場，最後兩位加 stagger，blur 2px |
| spinning-counter | 大數字揭曉（744 類） | 每位數字捲軸轉輪＋垂直模糊，stagger 90ms，1.4s |
| success-check | 印章/完成標記 | fade＋rotate 80°→0＋Y-bob＋SVG 路徑描邊 |
| toast | chips 進出場 | 上移 16px＋fade＋scale 0.97＋cross-blur；出場更快 |
| panel-reveal | 片尾卡/面板 | 短位移＋blur 讀作完整展開 |
| shimmer-text | 「生成中」狀態字 | 高光帶掃過（LiquidTitle sheen 同源） |
| error-state-shake | 否定/NG 時刻 | X 軸 shake 3 次遞減 |
| skeleton-reveal | 內容載入敘事 | 骨架→實內容 cross-fade |

Remotion 換算要領：
- CSS `animation` → `interpolate(frame, [...], {easing: Easing.bezier(...)})`；
  overshoot 曲線直接用 `spring({damping:12, stiffness:200})` 更自然。
- blur 進場：`filter: blur(${interpolate(p,[0,1],[3,0])}px)`——**這是
  transitions.dev 質感的一半來源，別省**。
- stagger：`frame - i * 2` 餵給每項自己的 spring。
- 出場永遠比進場快 30%，且不要倒放進場動畫（單純 fade 即可）。
