// Sample per-project configuration.
// Copy to src/videoConfig.ts and fill in your own values:
//   cp src/videoConfig.sample.ts src/videoConfig.ts
import type {VideoConfig} from './configTypes';

export const CONFIG: VideoConfig = {
  // source footage placed at public/<videoFile>
  videoFile: 'input.mov',
  srcDurationSec: 60,
  coverFrames: 26, // cover length (frames @30fps); whole timeline shifts by this
  outroFrames: 54, // freeze + blur outro after the footage ends
  outroFadeFrames: 24, // final fade-to-black (video + audio)

  // jump cuts in SOURCE-timeline seconds — cut at sentence boundaries.
  // All subtitle/overlay/sfx cues stay in source time and re-align automatically.
  cuts: [],

  // words highlighted in the accent color inside subtitles
  keywords: ['AI', '關鍵字'],

  // subtitle speaker styles; subtitles.json lines reference these by name
  speakers: {
    host: {color: '#FFFFFF'},
    guest: {color: '#FFC9E3', tag: '來賓'},
  },

  // opening cover (first frame of the footage as background)
  cover: {
    badge: '品牌標語',
    titleLines: ['影片標題第一行', '第二行'],
  },

  // liquid-glass pill title shown near the top at the start
  liquidTitle: {text: '影片主題', from: 0, to: 3.5},

  // one line of dialogue rendered as huge per-character animated text,
  // timed to the spoken words (suppressed from normal subtitles)
  bigBang: {text: '重點大字', start: 1.8, step: 0.2, end: 3.8, bigFrom: 2},

  // glassmorphism chapter chips at the top — align from/to with scene cuts
  chips: [
    {from: 5, to: 15, label: '第一章', icon: 'book'},
    {from: 20, to: 30, label: '動工', icon: 'bolt'},
    {from: 40, to: 55, label: '成果驗收', icon: 'clipboardCheck'},
  ],

  // success stamp with confetti burst
  stamp: {from: 30, to: 33, text: '完成'},

  // big count-up number
  counter: {from: 42, to: 45, value: 100, label: '件全部完成'},

  // end-card CTA with URL
  endCard: {
    from: 55,
    title: '我的網站',
    url: 'example.com',
    cta: '已上線 · 快去逛逛',
  },

  // one-shot SFX cues (files under public/sfx/, pre-normalized ~ -30 LUFS)
  sfx: {
    coverWhoosh: 'sfx/whoosh.wav',
    bigBangPop: 'sfx/pop.wav', // played once per character, rising pitch
    cues: [
      {file: 'sfx/stamp.wav', at: 30, durationSec: 1, volume: 0.9},
      {file: 'sfx/chime.wav', at: 55, durationSec: 1.4, volume: 0.9},
    ],
  },

  // background music at public/<file> — pre-mixed via tools (loudnorm + sidechain)
  bgm: {file: 'bgm.wav', fadeInFrames: 12},
};
