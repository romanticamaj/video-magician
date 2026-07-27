import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import {Subtitles} from './Subtitles';
import {BigBang} from './BigBang';
import {Cover, COVER_FRAMES} from './Cover';
import {Sfx} from './Sfx';
import {TOTAL_FRAMES} from './Root';
import {SEGMENTS, VIDEO_FRAMES, FPS} from './cuts';
import {CONFIG} from './videoConfig';
import {
  ChapterChips,
  CountBadge,
  EndCard,
  LiquidTitle,
  Polish,
  SuccessStamp,
} from './overlays';

// frozen last frame, blurring in once the footage ends (sits under the overlays)
const FreezeStill: React.FC = () => {
  const frame = useCurrentFrame(); // local to the main sequence
  if (frame < VIDEO_FRAMES) {
    return null;
  }
  const blur = interpolate(frame, [VIDEO_FRAMES, VIDEO_FRAMES + 30], [0, 16], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill>
      <Img
        src={staticFile('last_frame.png')}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: `blur(${blur}px)`,
          transform: 'scale(1.06)',
        }}
      />
    </AbsoluteFill>
  );
};

const FadeToBlack: React.FC = () => {
  const frame = useCurrentFrame();
  const o = interpolate(
    frame,
    [TOTAL_FRAMES - CONFIG.outroFadeFrames, TOTAL_FRAMES - 2],
    [0, 1],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
  );
  if (o <= 0) {
    return null;
  }
  return <AbsoluteFill style={{background: '#000', opacity: o}} />;
};

export const Main: React.FC = () => {
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {/* BGM (pre-mixed: loudnorm + sidechain duck), fade in/out at the ends */}
      {CONFIG.bgm ? (
        <Audio
          src={staticFile(CONFIG.bgm.file)}
          volume={(f) =>
            interpolate(
              f,
              [
                0,
                CONFIG.bgm!.fadeInFrames,
                TOTAL_FRAMES - CONFIG.outroFadeFrames,
                TOTAL_FRAMES - 2,
              ],
              [0, 1, 1, 0],
              {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
            )
          }
        />
      ) : null}

      {/* main content, shifted after the cover */}
      <Sequence from={COVER_FRAMES}>
        {/* source video played as kept segments (jump cuts) */}
        {SEGMENTS.map((s, i) => (
          <Sequence
            key={i}
            from={Math.round(s.out * FPS)}
            durationInFrames={Math.round(s.dur * FPS)}
          >
            <OffthreadVideo
              src={staticFile(CONFIG.videoFile)}
              trimBefore={Math.round(s.src * FPS)}
            />
          </Sequence>
        ))}
        <FreezeStill />
        <Polish />
        <Subtitles />
        <BigBang />
        <LiquidTitle />
        <ChapterChips />
        <SuccessStamp />
        <CountBadge />
        <EndCard />
        <Sfx />
      </Sequence>

      {/* cover on top */}
      <Sequence from={0} durationInFrames={COVER_FRAMES}>
        <Cover />
      </Sequence>
      {CONFIG.sfx.coverWhoosh ? (
        <Sequence from={0} durationInFrames={100}>
          <Audio src={staticFile(CONFIG.sfx.coverWhoosh)} volume={1} />
        </Sequence>
      ) : null}

      <FadeToBlack />
    </AbsoluteFill>
  );
};
