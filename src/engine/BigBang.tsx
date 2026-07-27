import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {spring} from 'remotion';
import {ACCENT} from './theme';
import {HAND_FONT} from './font';
import {Thick} from './ThickText';
import {outToSrc} from './cuts';
import {CONFIG} from '../videoConfig';

// One line of dialogue rendered as huge per-character animated text,
// timed to the spoken words.
export const BigBang: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cfg = CONFIG.bigBang;
  const t = outToSrc(frame / fps);
  if (!cfg || t < cfg.start || t > cfg.end) {
    return null;
  }
  const chars = [...cfg.text];
  const ROT = chars.map((_, i) => (i % 2 === 0 ? -1 : 1) * (8 + (i * 5) % 11));

  const out = interpolate(t, [cfg.end - 0.18, cfg.end], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const outScale = interpolate(out, [0, 1], [1.35, 1]);

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 1150,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          gap: 2,
          opacity: out,
          transform: `scale(${outScale})`,
        }}
      >
        {chars.map((c, i) => {
          const local = Math.round((t - (cfg.start + i * cfg.step)) * fps);
          if (local < 0) {
            return <span key={i} style={{width: 0, overflow: 'hidden'}} />;
          }
          const pop = spring({
            frame: local,
            fps,
            config: {damping: 9, stiffness: 380, mass: 0.7},
            durationInFrames: 13,
          });
          const scale = interpolate(pop, [0, 1], [3.4, 1]);
          const rot = interpolate(pop, [0, 1], [ROT[i], ROT[i] * 0.22]);
          const big = i >= cfg.bigFrom;
          const wob = Math.sin(frame / 6 + i * 1.3) * 2.2;
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                fontFamily: HAND_FONT,
                fontSize: big ? 210 : 150,
                lineHeight: 1,
                transform: `scale(${scale}) rotate(${rot + wob}deg) translateY(${
                  (1 - pop) * -60
                }px)`,
                opacity: Math.min(1, pop * 1.6),
                filter: 'drop-shadow(0 12px 30px rgba(0,0,0,0.55))',
                margin: '0 4px',
              }}
            >
              <Thick
                text={c}
                color={big ? ACCENT : '#FFFFFF'}
                fatten={0}
                outline={big ? 14 : 11}
                outlineColor="rgba(8,8,12,0.92)"
              />
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
