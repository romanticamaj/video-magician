import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {ACCENT, ACCENT_DARK} from './theme';
import {FONT, HAND_FONT} from './font';
import {ArrowUpIcon, CheckIcon, ICONS, SparkleIcon} from './icons';
import {outToSrc} from './cuts';
import {CONFIG} from '../videoConfig';

// ---------- helpers ----------

// t is in SOURCE-video seconds — all cue times in CONFIG stay in source time
// even when jump cuts are applied (see cuts.ts).
const useT = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return {frame, fps, t: outToSrc(frame / fps)};
};

const inOut = (t: number, from: number, to: number, fade = 0.35): number => {
  if (t < from || t > to) {
    return 0;
  }
  return Math.min(1, (t - from) / fade, (to - t) / fade);
};

const float = (frame: number, speed: number, amp: number, phase = 0) =>
  Math.sin((frame / speed) * Math.PI * 2 + phase) * amp;

// ---------- liquid glass title ----------

export const LiquidTitle: React.FC = () => {
  const {t, frame, fps} = useT();
  const cfg = CONFIG.liquidTitle;
  if (!cfg) {
    return null;
  }
  const vis = inOut(t, cfg.from, cfg.to, 0.3);
  if (vis <= 0) {
    return null;
  }
  const pop = spring({
    frame,
    fps,
    config: {damping: 12, stiffness: 140, mass: 0.9},
    durationInFrames: 18,
  });
  const sheen = interpolate(t, [cfg.from + 0.3, cfg.from + 2.6], [-40, 110], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          top: 118,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          opacity: vis,
          transform: `translateY(${(1 - pop) * -60 + float(frame, 55, 5)}px) scale(${
            0.9 + 0.1 * pop
          })`,
        }}
      >
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            borderRadius: 999,
            padding: '20px 48px 26px',
            background: 'rgba(24,24,34,0.42)',
            border: '1.5px solid rgba(255,255,255,0.4)',
            backdropFilter: 'blur(22px) saturate(1.7)',
            WebkitBackdropFilter: 'blur(22px) saturate(1.7)',
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -14px 30px rgba(255,255,255,0.08), 0 18px 50px rgba(0,0,0,0.4)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '6%',
              width: '88%',
              height: '46%',
              borderRadius: 999,
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.4), transparent)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${sheen}%`,
              width: 130,
              background:
                'linear-gradient(105deg, transparent, rgba(255,255,255,0.5), transparent)',
              transform: 'skewX(-16deg)',
            }}
          />
          {cfg.icon ? (
            (() => {
              const TitleIcon = ICONS[cfg.icon];
              return <TitleIcon size={46} style={{position: 'relative'}} />;
            })()
          ) : null}
          <span
            style={{
              position: 'relative',
              fontFamily: HAND_FONT,
              fontSize: 62,
              color: '#FFFFFF',
              letterSpacing: 3,
              WebkitTextStroke: '4px rgba(10,10,14,0.55)',
              paintOrder: 'stroke fill',
              textShadow: '0 3px 0 rgba(0,0,0,0.5), 0 8px 26px rgba(0,0,0,0.6)',
            }}
          >
            {cfg.text}
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- chapter chips ----------

export const ChapterChips: React.FC = () => {
  const {t, fps, frame} = useT();
  const chip = CONFIG.chips.find((c) => t >= c.from && t <= c.to);
  if (!chip) {
    return null;
  }
  const vis = inOut(t, chip.from, chip.to, 0.3);
  const local = Math.round((t - chip.from) * fps);
  const pop = spring({
    frame: local,
    fps,
    config: {damping: 11, stiffness: 210, mass: 0.7},
    durationInFrames: 16,
  });
  const exitY = interpolate(t, [chip.to - 0.3, chip.to], [0, -40], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const Icon = ICONS[chip.icon];
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          top: 126,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          opacity: vis,
          transform: `translateY(${(1 - pop) * -40 + float(frame, 58, 6) + exitY}px) scale(${
            0.88 + 0.12 * pop
          })`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: 44,
            color: 'rgba(255,255,255,0.97)',
            background: 'rgba(18,18,24,0.55)',
            border: '1.5px solid rgba(255,255,255,0.28)',
            backdropFilter: 'blur(16px) saturate(1.4)',
            WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
            borderRadius: 999,
            padding: '16px 42px 19px',
            letterSpacing: 2,
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.3), 0 12px 36px rgba(0,0,0,0.4)',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              transform: `rotate(${float(frame, 34, 9)}deg)`,
            }}
          >
            <Icon size={52} color={ACCENT} />
          </span>
          {chip.label}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- success stamp + confetti ----------

export const SuccessStamp: React.FC = () => {
  const {t, fps} = useT();
  const cfg = CONFIG.stamp;
  if (!cfg || t < cfg.from || t > cfg.to) {
    return null;
  }
  const local = Math.round((t - cfg.from) * fps);
  const pop = spring({
    frame: local,
    fps,
    config: {damping: 10, stiffness: 330, mass: 0.9},
    durationInFrames: 16,
  });
  const vis = inOut(t, cfg.from, cfg.to, 0.25);
  const scale = interpolate(pop, [0, 1], [2.6, 1]);
  const pulse = 1 + Math.sin(Math.max(0, local - 16) / 5) * 0.02;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {Array.from({length: 44}).map((_, i) => {
        const angle = random(`ca-${i}`) * Math.PI * 2;
        const speed = 260 + random(`cs-${i}`) * 480;
        const life = interpolate(local, [2, 38], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const dist = speed * life;
        const grav = 360 * life * life;
        const size = 10 + random(`cz-${i}`) * 16;
        const colors = [ACCENT, '#FF6B6B', '#6BCB77', '#4D96FF', '#FFFFFF'];
        const color = colors[Math.floor(random(`cc-${i}`) * colors.length)];
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 540,
              top: 760,
              width: size,
              height: size * (0.5 + random(`cr-${i}`) * 0.8),
              background: color,
              borderRadius: 3,
              opacity: (1 - life) * vis,
              transform: `translate(${Math.cos(angle) * dist}px, ${
                Math.sin(angle) * dist * 0.7 + grav
              }px) rotate(${random(`cw-${i}`) * 720 * life}deg)`,
            }}
          />
        );
      })}
      <div
        style={{
          position: 'absolute',
          top: 620,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          opacity: vis * Math.min(1, pop * 1.5),
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: 80,
            color: '#5AF08F',
            border: '8px solid #5AF08F',
            borderRadius: 28,
            padding: '22px 52px 28px',
            letterSpacing: 5,
            transform: `rotate(-7deg) scale(${scale * pulse})`,
            background: 'rgba(8,20,12,0.4)',
            boxShadow:
              '0 0 0 5px rgba(90,240,143,0.18), 0 18px 50px rgba(0,0,0,0.45)',
            textShadow: '0 0 30px rgba(90,240,143,0.65)',
          }}
        >
          <CheckIcon size={84} color="#5AF08F" />
          {cfg.text}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- counter pop ----------

export const CountBadge: React.FC = () => {
  const {t, fps, frame} = useT();
  const cfg = CONFIG.counter;
  if (!cfg || t < cfg.from || t > cfg.to) {
    return null;
  }
  const local = Math.round((t - cfg.from) * fps);
  const pop = spring({
    frame: local,
    fps,
    config: {damping: 11, stiffness: 260, mass: 0.8},
    durationInFrames: 15,
  });
  const vis = inOut(t, cfg.from, cfg.to, 0.25);
  const n = Math.round(
    interpolate(local, [0, 22], [0, cfg.value], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );
  const done = local >= 22;
  const donePunch = done
    ? 1 + 0.12 * Math.max(0, 1 - (local - 22) / 8)
    : 1;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {done
        ? [0, 1, 2, 3, 4, 5].map((i) => {
            const a = (i / 6) * Math.PI * 2;
            const d = 210 + 40 * Math.sin(i * 2.1);
            const l2 = Math.min(1, (local - 22) / 14);
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: 540 + Math.cos(a) * d * l2 - 20,
                  top: 700 + Math.sin(a) * d * 0.6 * l2 - 20,
                  opacity: (1 - l2) * vis,
                  transform: `rotate(${l2 * 180}deg) scale(${0.6 + l2 * 0.7})`,
                }}
              >
                <SparkleIcon size={44} color={ACCENT} />
              </div>
            );
          })
        : null}
      <div
        style={{
          position: 'absolute',
          top: 545,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          opacity: vis,
          transform: `scale(${(0.65 + 0.35 * pop) * donePunch}) translateY(${float(
            frame,
            50,
            5
          )}px)`,
        }}
      >
        <div style={{textAlign: 'center'}}>
          <div
            style={{
              fontFamily: FONT,
              fontWeight: 900,
              fontSize: 200,
              lineHeight: 1,
              color: ACCENT,
              WebkitTextStroke: '13px rgba(12,12,16,0.9)',
              paintOrder: 'stroke fill',
              textShadow: `0 0 50px rgba(255,197,61,0.55), 0 12px 34px rgba(0,0,0,0.5)`,
              letterSpacing: 2,
            }}
          >
            {n}
          </div>
          <div
            style={{
              fontFamily: HAND_FONT,
              fontSize: 76,
              color: '#FFFFFF',
              textShadow:
                '0 3px 0 rgba(0,0,0,0.55), 0 10px 30px rgba(0,0,0,0.6)',
              marginTop: 8,
              letterSpacing: 10,
            }}
          >
            {cfg.label}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- end card CTA ----------

export const EndCard: React.FC = () => {
  const {t, fps, frame} = useT();
  const cfg = CONFIG.endCard;
  if (!cfg || t < cfg.from) {
    return null;
  }
  const local = Math.round((t - cfg.from) * fps);
  const pop = spring({
    frame: local,
    fps,
    config: {damping: 13, stiffness: 180, mass: 0.9},
    durationInFrames: 20,
  });
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          top: 360,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          transform: `translateY(${(1 - pop) * -70 + float(frame, 54, 7)}px) scale(${
            0.9 + 0.1 * pop
          })`,
          opacity: Math.min(1, pop * 1.3),
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
            background: 'rgba(255,255,255,0.12)',
            border: '1.5px solid rgba(255,255,255,0.38)',
            backdropFilter: 'blur(20px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
            borderRadius: 40,
            padding: '36px 60px 40px',
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.5), 0 20px 56px rgba(0,0,0,0.5)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              fontFamily: HAND_FONT,
              fontSize: 72,
              color: '#FFFFFF',
              letterSpacing: 3,
              textShadow: '0 2px 0 rgba(0,0,0,0.4), 0 8px 26px rgba(0,0,0,0.5)',
            }}
          >
            {cfg.icon ? (
              (() => {
                const CardIcon = ICONS[cfg.icon];
                return (
                  <span
                    style={{
                      display: 'inline-flex',
                      transform: `translateX(${float(frame, 30, 6)}px)`,
                    }}
                  >
                    <CardIcon size={72} color={ACCENT} />
                  </span>
                );
              })()
            ) : null}
            {cfg.title}
          </div>
          <div
            style={{
              fontFamily: FONT,
              fontWeight: 900,
              fontSize: 54,
              color: ACCENT,
              letterSpacing: 2,
              textShadow: '0 4px 18px rgba(0,0,0,0.5)',
            }}
          >
            {cfg.url}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: 40,
              color: 'rgba(255,255,255,0.92)',
              letterSpacing: 4,
              transform: `translateY(${Math.abs(Math.sin(local / 8)) * -10}px)`,
            }}
          >
            {cfg.cta}
            <span
              style={{
                display: 'inline-flex',
                transform: `translateY(${Math.abs(Math.sin(local / 8)) * -8}px)`,
              }}
            >
              <ArrowUpIcon size={44} color={ACCENT} />
            </span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- global polish ----------

export const Polish: React.FC = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const progress = Math.min(1, frame / durationInFrames);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse 90% 75% at 50% 46%, transparent 62%, rgba(0,0,0,0.26) 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 420,
          background:
            'linear-gradient(to top, rgba(0,0,0,0.42), rgba(0,0,0,0.0))',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          height: 9,
          width: `${progress * 100}%`,
          background: `linear-gradient(90deg, ${ACCENT_DARK}, ${ACCENT})`,
          boxShadow: `0 0 14px rgba(255,197,61,0.6)`,
        }}
      />
    </AbsoluteFill>
  );
};
