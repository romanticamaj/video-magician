// Non-destructive jump-cut system. All overlay/subtitle/sfx cues use
// SOURCE-timeline seconds — components convert via outToSrc/srcToOut,
// so edits re-align automatically when CONFIG.cuts changes.
import {CONFIG} from '../videoConfig';

export const CUTS = CONFIG.cuts;
export const SRC_DURATION = CONFIG.srcDurationSec;
export const FPS = 30;

const cutLen = CUTS.reduce((a, [f, t]) => a + (t - f), 0);
export const KEPT_DURATION = SRC_DURATION - cutLen;
export const VIDEO_FRAMES = Math.round(KEPT_DURATION * FPS);
export const TOTAL_FRAMES =
  CONFIG.coverFrames + VIDEO_FRAMES + CONFIG.outroFrames;

// kept segments in source time
export const SEGMENTS: Array<{src: number; out: number; dur: number}> = (() => {
  const segs: Array<{src: number; out: number; dur: number}> = [];
  let src = 0;
  let out = 0;
  for (const [f, t] of CUTS) {
    segs.push({src, out, dur: f - src});
    out += f - src;
    src = t;
  }
  segs.push({src, out, dur: SRC_DURATION - src});
  return segs;
})();

// output-timeline seconds -> source-timeline seconds
export const outToSrc = (tOut: number): number => {
  for (const s of SEGMENTS) {
    if (tOut < s.out + s.dur) {
      return s.src + (tOut - s.out);
    }
  }
  const last = SEGMENTS[SEGMENTS.length - 1];
  return last.src + (tOut - last.out);
};

// source-timeline seconds -> output-timeline seconds
// (times inside a cut clamp to the cut point)
export const srcToOut = (tSrc: number): number => {
  let removed = 0;
  for (const [f, t] of CUTS) {
    if (tSrc >= t) {
      removed += t - f;
    } else if (tSrc > f) {
      removed += tSrc - f;
    }
  }
  return tSrc - removed;
};
