import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {srcToOut} from './cuts';
import {CONFIG} from '../videoConfig';
import type {CameraMove} from './configTypes';

// Digital camera moves applied over the footage layer. Move times are in
// SOURCE seconds; they are mapped to the output timeline, so a whip spanning
// a cut plays continuously across the splice (that's the point of a whip).
// Vocabulary and defaults: references/motion-library.md.

const settle = Easing.out(Easing.cubic);

const transformFor = (
  move: CameraMove,
  p: number,
  frame: number
): {transform?: string; blur?: number} => {
  const i = move.intensity ?? 0.1;
  switch (move.type) {
    case 'punchIn': {
      const s = 1 + i * interpolate(p, [0, 0.35], [0, 1], {extrapolateRight: 'clamp', easing: settle});
      return {transform: `scale(${s})`};
    }
    case 'crashZoom': {
      const s = 1 + i * interpolate(p, [0, 0.5], [0, 1], {extrapolateRight: 'clamp', easing: Easing.in(Easing.quad)});
      return {transform: `scale(${s})`, blur: interpolate(p, [0, 0.5, 1], [0, 1.5, 0])};
    }
    case 'zoomIn':
      return {transform: `scale(${1 + i * p})`};
    case 'zoomOut':
      return {transform: `scale(${1 + i * (1 - p)})`};
    case 'panLeft':
    case 'panRight': {
      const dir = move.type === 'panRight' ? -1 : 1;
      const x = dir * i * 100 * interpolate(p, [0, 1], [-0.5, 0.5]);
      return {transform: `scale(${1 + i * 1.1}) translateX(${x}%)`};
    }
    case 'handheld': {
      const a = i * 100;
      const x = Math.sin(frame / 7.3) * a * 0.6 + Math.sin(frame / 2.9) * a * 0.25;
      const y = Math.cos(frame / 8.7) * a * 0.5 + Math.sin(frame / 3.7) * a * 0.2;
      return {transform: `scale(${1 + i * 2.5}) translate(${x}%, ${y}%)`};
    }
    case 'whipLeft':
    case 'whipRight': {
      const dir = move.type === 'whipRight' ? -1 : 1;
      // slide out fast, snap back — blur peaks mid-move to hide the splice.
      // scale 1.18 gives 9% overscan per side, covering the 8% travel.
      const x = dir * interpolate(p, [0, 0.5, 1], [0, 8, 0], {easing: Easing.inOut(Easing.quad)});
      const blur = interpolate(p, [0, 0.35, 0.5, 0.65, 1], [0, 10, 14, 10, 0]);
      return {transform: `scale(1.18) translateX(${x}%)`, blur};
    }
    default:
      return {};
  }
};

export const CameraRig: React.FC<{children: React.ReactNode}> = ({children}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const moves = CONFIG.cameraMoves ?? [];
  const tOut = frame / fps;

  let style: React.CSSProperties = {};
  for (const m of moves) {
    const a = srcToOut(m.from);
    const b = srcToOut(m.to);
    if (tOut < a || tOut > b || b <= a) {
      continue;
    }
    const p = (tOut - a) / (b - a);
    const {transform, blur} = transformFor(m, p, frame);
    style = {
      transform,
      filter: blur ? `blur(${blur.toFixed(1)}px)` : undefined,
    };
    break; // moves shouldn't overlap; first match wins
  }

  return <AbsoluteFill style={style}>{children}</AbsoluteFill>;
};
