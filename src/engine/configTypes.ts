import type {IconName} from './icons';

export type CameraMove = {
  type:
    | 'punchIn'
    | 'crashZoom'
    | 'zoomIn'
    | 'zoomOut'
    | 'panLeft'
    | 'panRight'
    | 'handheld'
    | 'whipLeft'
    | 'whipRight';
  from: number; // source-timeline seconds
  to: number;
  intensity?: number; // see references/motion-library.md for ranges
};

// Dip-to-black over a splice: the picture fades out into the cut and fades back
// in on the other side. `at` is a SOURCE second on the join (use either end of
// the corresponding cut — both map to the same output moment).
export type Fade = {
  at: number;
  durationSec?: number; // total fade-out + fade-in time, default 0.6
  holdSec?: number; // time held fully black in the middle, default 0
};

export type SfxCue = {
  file: string;
  at: number; // source-timeline seconds
  durationSec?: number;
  fadeOutSec?: number;
  volume?: number;
  playbackRate?: number;
};

export type VideoConfig = {
  videoFile: string;
  srcDurationSec: number;
  // Output frame size. Defaults to vertical 1080x1920; set 1920x1080 when the
  // footage is landscape and cropping it would destroy on-screen information.
  composition?: {width: number; height: number};
  // Playback speed of the footage, e.g. 1.2 plays it 20% faster. Cue times
  // stay in source seconds; the output timeline is compressed by this factor.
  speed?: number;
  coverFrames: number;
  outroFrames: number;
  outroFadeFrames: number;
  cuts: Array<[number, number]>;
  // splices that dip to black instead of hard-cutting — use on act/scene
  // changes only, a hard jump cut is the default
  fades?: Fade[];
  // CROSSFADE length (frames) across every splice, DEFAULT 15 (a real 533ms
  // overlap once rounded to whole-frame handles). The two clips overlap: the
  // outgoing one plays on past the cut while fading out and the incoming one
  // starts early fading in, so there is never a gap. This is what prevents pops
  // — a fade DOWN to silence and back up leaves a hole and still pops. Audio
  // lives on its own layer because of it, so the picture still hard-cuts.
  // Must be <= the shortest kept segment. 0 opts out entirely.
  audioCrossfadeFrames?: number;
  // Legacy fallback: symmetric ramp to silence at each segment edge, with no
  // overlap. Leaves an audible gap on continuous audio — prefer the crossfade.
  audioJoinFadeFrames?: number;
  // vignette + bottom scrim + progress bar. On by default because it buys
  // subtitle legibility; turn off for a pure cut with no overlays.
  polish?: boolean;
  cameraMoves?: CameraMove[];
  keywords: string[];
  speakers: Record<string, {color: string; tag?: string}>;
  cover: {badge: string; titleLines: string[]} | null;
  liquidTitle: {text: string; from: number; to: number; icon?: IconName} | null;
  bigBang: {
    text: string;
    start: number;
    step: number;
    end: number;
    bigFrom: number; // chars from this index render larger + accent color
  } | null;
  chips: Array<{from: number; to: number; label: string; icon: IconName}>;
  stamp: {from: number; to: number; text: string} | null;
  counter: {from: number; to: number; value: number; label: string} | null;
  endCard: {
    from: number;
    title: string;
    url: string;
    cta: string;
    icon?: IconName;
  } | null;
  sfx: {
    coverWhoosh?: string;
    bigBangPop?: string;
    cues: SfxCue[];
  };
  bgm: {
    file: string;
    fadeInFrames: number;
    // Sections where the footage carries its own music/SFX and the BGM should
    // step back. Times are SOURCE seconds, so they follow the cuts like any
    // other cue. gainDb is negative, e.g. -12 to sit under game audio.
    ducks?: Array<{from: number; to: number; gainDb: number}>;
  } | null;
};
