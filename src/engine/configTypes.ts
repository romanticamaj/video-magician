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
  coverFrames: number;
  outroFrames: number;
  outroFadeFrames: number;
  cuts: Array<[number, number]>;
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
  bgm: {file: string; fadeInFrames: number} | null;
};
