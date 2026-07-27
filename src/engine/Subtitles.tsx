import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import subs from '../subtitles.json';
import {ACCENT, INK} from './theme';
import {FONT} from './font';
import {outToSrc} from './cuts';
import {CONFIG} from '../videoConfig';

type Sub = {
  text: string;
  start: number;
  end: number;
  speaker: string;
};

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const KEYWORD_RE = new RegExp(
  `(${CONFIG.keywords.map(escapeRegExp).join('|')})`,
  'g'
);

const renderText = (text: string, baseColor: string) => {
  const parts = text.split(KEYWORD_RE);
  return parts.map((part, i) =>
    CONFIG.keywords.includes(part) ? (
      <span key={i} style={{color: ACCENT}}>
        {part}
      </span>
    ) : (
      <span key={i} style={{color: baseColor}}>
        {part}
      </span>
    )
  );
};

export const Subtitles: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = outToSrc(frame / fps);

  const active = (subs as Sub[]).filter(
    (s) =>
      t >= s.start && t < s.end && s.text !== CONFIG.bigBang?.text
  );
  const sub = active.length > 0 ? active[active.length - 1] : null;

  if (!sub) {
    return null;
  }

  const pop = spring({
    frame: Math.round((t - sub.start) * fps),
    fps,
    config: {damping: 14, stiffness: 220, mass: 0.6},
    durationInFrames: 12,
  });

  const style = CONFIG.speakers[sub.speaker] ?? {color: INK};
  const short = sub.text.replace(/\s/g, '').length <= 4;
  const fontSize = short ? 78 : 60;

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          left: 60,
          right: 60,
          bottom: 330,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
          transform: `scale(${0.92 + 0.08 * pop}) translateY(${(1 - pop) * 16}px)`,
          opacity: Math.min(1, pop * 1.4),
        }}
      >
        {style.tag ? (
          <div
            style={{
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: 26,
              letterSpacing: 4,
              color: '#3B1F2E',
              background: style.color,
              borderRadius: 999,
              padding: '4px 18px 6px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
            }}
          >
            {style.tag}
          </div>
        ) : null}
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 900,
            fontSize,
            lineHeight: 1.35,
            textAlign: 'center',
            WebkitTextStroke: '10px rgba(12,12,16,0.9)',
            paintOrder: 'stroke fill',
            textShadow: '0 6px 24px rgba(0,0,0,0.55)',
            letterSpacing: 1,
          }}
        >
          {renderText(sub.text, style.color)}
        </div>
      </div>
    </AbsoluteFill>
  );
};
