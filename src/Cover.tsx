import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {ACCENT, ACCENT_DARK} from './theme';
import {FONT, HAND_FONT} from './font';
import {Thick} from './ThickText';
import {CONFIG} from './videoConfig';

export const COVER_FRAMES = CONFIG.coverFrames;

export const Cover: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cover = CONFIG.cover;
  if (!cover) {
    return null;
  }

  // badge: quick stamp — slams down from large scale
  const stamp = spring({
    frame,
    fps,
    config: {damping: 12, stiffness: 400, mass: 0.6},
    durationInFrames: 10,
  });
  const stampScale = interpolate(stamp, [0, 1], [2.2, 1]);

  // title band: opens from center to both sides in 0.3s
  const open = interpolate(frame, [0, 9], [50, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <Img
        src={staticFile('cover_bg.png')}
        style={{width: '100%', height: '100%', objectFit: 'cover'}}
      />
      {/* soft edge darkening, keeps the subject visible */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse 85% 70% at 50% 42%, transparent 45%, rgba(0,0,0,0.5) 100%)',
        }}
      />

      {/* top brand plate — stamp in */}
      <div
        style={{
          position: 'absolute',
          top: 168,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          opacity: Math.min(1, stamp * 2),
          transform: `rotate(-2deg) scale(${stampScale})`,
        }}
      >
        <div
          style={{
            background: 'rgba(12,12,18,0.72)',
            border: `3px solid ${ACCENT}`,
            boxShadow: `0 0 0 7px rgba(12,12,18,0.72), 0 0 0 9px ${ACCENT_DARK}, 0 18px 44px rgba(0,0,0,0.55)`,
            borderRadius: 18,
            padding: '14px 40px 20px',
          }}
        >
          <span
            style={{
              fontFamily: HAND_FONT,
              fontSize: 84,
              lineHeight: 1.1,
              letterSpacing: 8,
              textShadow: '0 4px 20px rgba(0,0,0,0.6)',
            }}
          >
            <Thick text={cover.badge} color={ACCENT} fatten={4.5} />
          </span>
        </div>
      </div>

      {/* main title — full-bleed dark band, opens left-right */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 1300,
          padding: '56px 0 60px',
          background: 'rgba(0,0,0,0.38)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          fontFamily: FONT,
          fontWeight: 500,
          fontSize: 98,
          lineHeight: 1.35,
          whiteSpace: 'nowrap',
          textAlign: 'center',
          color: '#FFFFFF',
          textShadow: '0 4px 24px rgba(0,0,0,0.6)',
          letterSpacing: 2,
          clipPath: `inset(0 ${open}% 0 ${open}%)`,
        }}
      >
        {cover.titleLines.map((line, i) => (
          <React.Fragment key={i}>
            {i > 0 ? <br /> : null}
            {line}
          </React.Fragment>
        ))}
      </div>
    </AbsoluteFill>
  );
};
