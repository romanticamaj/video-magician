// Non-destructive jump-cut system. All overlay/subtitle/sfx cues use
// SOURCE-timeline seconds — components convert via outToSrc/srcToOut,
// so edits re-align automatically when CONFIG.cuts changes.
import {CONFIG} from '../videoConfig';

export const FPS = 30;
export const SRC_DURATION = CONFIG.srcDurationSec;

// Footage speed-up. Source seconds stay the unit for every cue; only the
// output timeline shrinks, so changing speed re-times the whole edit at once.
export const SPEED = (() => {
  const s = CONFIG.speed ?? 1;
  if (!Number.isFinite(s) || s <= 0) {
    throw new Error(`Invalid speed ${CONFIG.speed}: must be a positive number`);
  }
  return s;
})();

// validate + normalize: finite, in bounds, sorted, overlapping/adjacent merged
const normalizeCuts = (
  cuts: Array<[number, number]>
): Array<[number, number]> => {
  for (const [f, t] of cuts) {
    if (
      !Number.isFinite(f) ||
      !Number.isFinite(t) ||
      f < 0 ||
      t <= f ||
      t > SRC_DURATION
    ) {
      throw new Error(
        `Invalid cut [${f}, ${t}]: need 0 <= from < to <= ${SRC_DURATION}`
      );
    }
  }
  const sorted = [...cuts].sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const [f, t] of sorted) {
    const last = merged[merged.length - 1];
    if (last && f <= last[1]) {
      last[1] = Math.max(last[1], t);
    } else {
      merged.push([f, t]);
    }
  }
  return merged;
};

export const CUTS = normalizeCuts(CONFIG.cuts);

const cutLen = CUTS.reduce((a, [f, t]) => a + (t - f), 0);
// source seconds of footage that survive the cuts (before the speed-up)
export const KEPT_DURATION = SRC_DURATION - cutLen;
// what that becomes on the output timeline once sped up
export const OUT_DURATION = KEPT_DURATION / SPEED;

// kept segments in source time, with frame boundaries quantized ONCE so
// consecutive segments tile the timeline exactly (no 1-frame gap/overlap)
export const SEGMENTS: Array<{
  src: number;
  outFrame: number;
  durFrames: number;
}> = (() => {
  const spans: Array<{src: number; out: number; dur: number}> = [];
  let src = 0;
  let out = 0;
  for (const [f, t] of CUTS) {
    spans.push({src, out, dur: f - src});
    out += f - src;
    src = t;
  }
  spans.push({src, out, dur: SRC_DURATION - src});

  return spans
    .map((s) => {
      // both boundaries go through the same expression, so consecutive
      // segments still tile exactly after the speed division
      const startFrame = Math.round((s.out / SPEED) * FPS);
      const endFrame = Math.round(((s.out + s.dur) / SPEED) * FPS);
      return {src: s.src, outFrame: startFrame, durFrames: endFrame - startFrame};
    })
    .filter((s) => s.durFrames > 0);
})();

const lastSeg = SEGMENTS[SEGMENTS.length - 1];
export const VIDEO_FRAMES = lastSeg.outFrame + lastSeg.durFrames;
// cover: null disables the cover entirely — no lead-in delay
export const COVER_FRAMES = CONFIG.cover ? CONFIG.coverFrames : 0;
export const TOTAL_FRAMES = COVER_FRAMES + VIDEO_FRAMES + CONFIG.outroFrames;

// true if this source moment falls inside a removed interval
export const isRemoved = (tSrc: number): boolean =>
  CUTS.some(([f, t]) => tSrc >= f && tSrc < t);

// output-timeline seconds -> source-timeline seconds
export const outToSrc = (tOut: number): number => {
  // undo the speed-up first, then add back everything the cuts removed
  const kept = tOut * SPEED;
  let removed = 0;
  for (const [f, t] of CUTS) {
    if (kept + removed >= f) {
      removed += t - f;
    }
  }
  return kept + removed;
};

// source-timeline seconds -> output-timeline seconds
// (times inside a cut clamp to the cut point; check isRemoved() to skip them)
export const srcToOut = (tSrc: number): number => {
  let removed = 0;
  for (const [f, t] of CUTS) {
    if (tSrc >= t) {
      removed += t - f;
    } else if (tSrc > f) {
      removed += tSrc - f;
    }
  }
  return (tSrc - removed) / SPEED;
};
