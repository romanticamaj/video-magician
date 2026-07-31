# 音訊混音配方（ffmpeg）

## 順序很重要：先整平人聲，再擺其他東西

⚠️ **不要拿未處理的毛片人聲當基準。** 手持/手機錄的口白，句與句之間的音量差
實測可以到 **22 dB**；配樂卻是幾乎恆定的。用「整段 integrated」去算相對音量會被
平均值騙——帳面上配樂比人聲低 6 dB，實際上**安靜的句子會被配樂蓋過去**
（實測最糟的一句配樂比人聲還大 8.7 dB）。

所以第一步是把人聲整平到 **動態範圍 ≤ 8 dB**，之後所有相對音量才有意義：

```bash
# 對「合成後的來源檔」音軌做，處理完 mux 回去（-c:v copy）
ffmpeg -y -i src_audio_raw.wav -af "\
highpass=f=85,\
equalizer=f=300:t=q:w=1.2:g=-3,\
dynaudnorm=f=200:g=17:m=10:p=0.9,\
acompressor=threshold=-26dB:ratio=3:attack=8:release=200:makeup=3,\
treble=g=4:f=3200:t=q:w=0.7,\
alimiter=limit=0.95" -ar 48000 -ac 2 src_audio_leveled.wav
```

🚫 **不要用降噪**（`afftdn` / `anlmdn` / `afwtdn` / `arnndn`）。實測代價遠大於效益：
四個降噪器在房間錄音上都只換到 **0.5–1.4 dB** 的底噪下降，但頻譜相減會**優先吃掉
最接近底噪的高頻**，聲音會變悶。這是站長明確的偏好，不是可選項。

⚠️ **整平會讓聲音變悶，一定要補償。** 寬頻增益是「等比例放大房間」，不是放大人聲——
實測把一句安靜台詞抬起來時：100–300 Hz **+22 dB**、2k–5k（清晰度）只有 **+15 dB**、
5k–10k（空氣感）只有 **+11 dB**，等於高頻相對掉了 7–11 dB。所以鏈子裡有兩道補償：

- `equalizer=f=300:g=-3` 削掉房間的箱音（悶的來源之一是低中頻堆積）
- `treble=g=4:f=3200:t=q:w=0.7` 把壓縮與距離吃掉的清晰度加回來

⚠️ `treble`／`bass` 的 `t` 是**寬度單位**不是形狀：`t=h` 會把 `w` 當成 Hz，
而 `w` 預設 0.5 → 0.5 Hz 的極窄共振 → 高頻暴衝 50 dB、整軌削波。
**一律寫成 `t=q:w=0.7`**。這個 bug 只有量頻譜才抓得到，聽感上會誤以為「變清楚了」。

**驗收不只看 spread，還要看頻譜傾斜**：處理前後各量 5 個頻段的 RMS，
2k–5k 的增益不能比 300–800 少超過 3 dB。差太多就加大 `treble` 的 g 值。
逐句 spread 的量法見下方「驗收」。

## 配比（speech-led，podcast／短影音）

| 元素 | 目標 | 說明 |
|---|---|---|
| 人聲動態範圍 | **≤ 8 dB** | 整平後每句 RMS 的極差 |
| 人聲 | -16 LUFS 左右 | 整平後的基準 |
| SFX | 人聲 -13 dB | |
| BGM（沒人講話時） | 人聲 **-8 dB** | 填空檔、有存在感 |
| BGM（講話時，ducked） | 人聲 **-18 dB** | |
| Sidechain 深度 | **8–10 dB** | 不是 2 dB |
| **每句人聲 vs 配樂分離度** | **≥ +15 dB** | ← 真正要驗的指標 |
| 成品整體 | -14 LUFS、TP ≤ -1.5 dBTP | |

⚠️ 舊版這份文件寫「BGM 人聲 -6 dB、ducking 2 dB」是**錯的**——那是音樂為主的配比，
用在口白影片上會讓人聲被蓋掉。2 dB 的 duck 對語音清晰度幾乎沒有作用。

## SFX 正規化

```bash
# 例：人聲 -17 LUFS → SFX 目標 -30
ffmpeg -y -i sfx.wav -af "loudnorm=I=-30:TP=-4:LRA=7" -ar 44100 -ac 2 sfx_n.wav
```

## BGM：正規化＋Sidechain ducking（烘進檔案）

⚠️ **有 jump cuts 時**：預混的 ducking key 是「未剪的人聲」，剪點之後 ducking
時間軸會偏移。cuts 非空時改在渲染後做 ducking——對 `out/final.mp4` 的成品
人聲抽出當 key（`adelay` 不需要，時間軸已一致），壓 BGM 後再合回；或接受
輕度 ducking（≤2 dB）下偏移不可聞的折衷，但要在交付說明中標注。

```bash
# BGM = 人聲 -6 dB；ducking ≈2 dB
# adelay = 封面位移 ms（coverFrames/30*1000，例 26 幀 = 867ms）
ffmpeg -y -i bgm_raw.wav -i 毛片.mov -filter_complex "\
[0:a]atrim=0:總長,loudnorm=I=<人聲-6>:TP=-4:LRA=9,aresample=44100[bgm];\
[1:a]adelay=867|867,apad,aresample=44100[key];\
[bgm][key]sidechaincompress=threshold=0.018:ratio=1.1:attack=12:release=400:makeup=1[out]" \
-map "[out]" -t 總長 -ar 44100 -ac 2 public/bgm.wav
```

⚠️ **`ratio` 是深度的主控，不是 threshold**。壓縮量 ≈
`(key 超出 threshold 的 dB) x (1 - 1/ratio)`，實測約為此估計的 1.4–1.8 倍
（偵測器看短時峰值，比 RMS 高），所以一律「調 → 量 → 再調」。
speech-led 要的 8–10 dB，整平後的人聲大約落在 **threshold 0.025 / ratio 3.3**
（attack 15、release 500，release 太短會抽動）。

threshold 只決定**什麼時候**開始壓：設在**房間底噪之上、字句 RMS 之下**。
太低（低於底噪）會變成全程都壓 → 空檔也降，講話與空檔的對比消失。
先量底噪與字句的 RMS 再決定：

```bash
ffmpeg -ss <字句窗> -t 2 -i <key> -af astats -f null - 2>&1 | grep -m1 "RMS level dB"
ffmpeg -ss <空檔窗> -t 0.3 -i <key> -af astats -f null - 2>&1 | grep -m1 "RMS level dB"
```

**驗證一定要跟「同一個 loudnorm 目標的未壓版」逐窗相減**，否則兩版的整體
音量差會被誤讀成 ducking 深度（曾因此誤判空檔被壓了 2 dB）：

```bash
# 未壓參考版：跟正式版用完全相同的 loudnorm I 值
ffmpeg -y -i bgm_raw.wav -af "loudnorm=I=<同上>:TP=-4:LRA=9" -t 總長 local/bgm_noduck.wav
# 逐窗相減；目標＝講話窗 -2 dB 左右、空檔窗 0 dB
```

## 驗收：逐句量分離度（唯一可信的指標）

整段 integrated 會騙人，**一定要逐句量**。做法：把成品減去無配樂版得到「混音裡的配樂」，
再用 `src/subtitles.json` 的每一句視窗，比較人聲與配樂的 RMS：

```bash
# 1) 相位反相相加 → 殘差就是混音裡的配樂（注意 normalize=0，且不要再乘 2）
ffmpeg -y -i out/final.mp4 -i out/nobgm.mp4 -filter_complex \
  "[1:a]volume=-1[inv];[0:a][inv]amix=inputs=2:duration=shortest:normalize=0[r]" \
  -map "[r]" local/bgm_residual.wav
# 2) 逐句量 out/nobgm.mp4 與 local/bgm_residual.wav 的 RMS，相減
```

合格線：**每一句都 ≥ +15 dB**，沒有任何一句低於 +10 dB。
實測案例：整平前 range -8.7…+17.2 dB（中位數 +4.6、16/19 句不及格）；
整平＋加深 duck 後 +13.2…+24.2 dB（中位數 +20.2、0 句不及格）。

## 成品響度 mastering（不重渲染）

```bash
# 1) 量現值
ffmpeg -i out/final.mp4 -af ebur128=framelog=quiet -f null - 2>&1 | grep "I:"
# 2) gain = (-14) - 現值，先估再迭代（limiter 會吃掉部分增益）
ffmpeg -y -i out/final.mp4 -c:v copy \
  -af "volume=<gain>dB,alimiter=limit=0.75:attack=5:release=60:level=false" \
  -c:a aac -b:a 192k out/final_mastered.mp4
# 3) 驗證 true peak
ffmpeg -i out/final_mastered.mp4 -af "ebur128=framelog=quiet:peak=true" -f null - 2>&1 | grep -E "I:|Peak:"
```

⚠️ limiter ceiling 設 -1.5 dB 時 AAC 編碼會 overshoot 到 0 dBFS——
ceiling 要留到 **-2.5 dB（limit=0.75）**。gain 與 ceiling 互動非線性，
一律「調 → 量 → 再調」迭代收斂。
