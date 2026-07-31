// Sample per-project configuration.
// Copy to src/videoConfig.ts and fill in your own values:
//   cp src/videoConfig.sample.ts src/videoConfig.ts
import type {VideoConfig} from './engine/configTypes';

export const CONFIG: VideoConfig = {
  // source footage placed at public/<videoFile>
  videoFile: 'input.mov',
  srcDurationSec: 60,
  // output frame size — omit for the vertical 1080x1920 default. Landscape
  // footage whose on-screen text lives near the edges should stay landscape.
  // composition: {width: 1920, height: 1080},
  // footage speed-up (1 = untouched, 1.2 = 20% faster). Cue times below stay
  // in SOURCE seconds; only the output timeline shrinks. Pitch is preserved.
  speed: 1,
  coverFrames: 26, // cover length (frames @30fps); whole timeline shifts by this
  outroFrames: 54, // freeze + blur outro after the footage ends
  outroFadeFrames: 24, // final fade-to-black (video + audio)

  // jump cuts in SOURCE-timeline seconds — cut at sentence boundaries.
  // All subtitle/overlay/sfx cues stay in source time and re-align automatically.
  cuts: [],

  // splices that dip to black instead of hard-cutting. `at` is a source second
  // on the join (either end of the matching cut). Reserve these for act/scene
  // changes — a hard jump cut is the default, and fading every splice is mush.
  fades: [
    // {at: 14.2, durationSec: 0.8, holdSec: 0.12},
  ],

  // equal-power crossfade across every splice — ON by default (15). Leave it
  // alone unless the footage has no continuous audio to protect. Shorten it
  // only when a kept segment is too short to hold the overlap; 0 opts out.
  // audioCrossfadeFrames: 15,

  // vignette + bottom scrim + progress bar; set false for a pure cut with no
  // overlays, where they read as an unasked-for effect
  polish: true,

  // digital camera moves on the footage (optional; use sparingly — 2-4 per video
  // at story beats). Vocabulary + intensity ranges: motion-library.md.
  // A whip spanning a cut hides the splice: from = cutFrom-0.2, to = cutTo+0.2.
  cameraMoves: [
    // {type: 'punchIn', from: 30, to: 33, intensity: 0.12},
    // {type: 'whipRight', from: 41.3, to: 46.2, intensity: 1},
  ],

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

  // background music at public/<file> — pre-mixed via tools (loudnorm + sidechain).
  // ducks: sections where the footage has its own music/SFX (game capture, playing
  // back a render) — SOURCE seconds, so they follow the cuts like any other cue.
  bgm: {
    file: 'bgm.wav',
    fadeInFrames: 12,
    // ducks: [{from: 47.85, to: 83.3, gainDb: -12}],
  },
};
