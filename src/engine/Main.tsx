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
import {CameraRig} from './CameraRig';
import {Cover, COVER_FRAMES} from './Cover';
import {Sfx} from './Sfx';
import {SEGMENTS, TOTAL_FRAMES, VIDEO_FRAMES, FPS, SPEED, srcToOut} from './cuts';
import {CONFIG} from '../videoConfig';
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

// Sections where the footage has its own music/SFX: pull the BGM down so the
// on-screen audio and narration lead. Duck times are SOURCE seconds, mapped
// through the cut/speed map like every other cue, with a short ramp each side.
const DUCK_RAMP_FRAMES = 8;

const bgmDuckGain = (frame: number): number => {
  const ducks = CONFIG.bgm?.ducks ?? [];
  let gain = 1;
  for (const d of ducks) {
    const a = COVER_FRAMES + srcToOut(d.from) * FPS;
    const b = COVER_FRAMES + srcToOut(d.to) * FPS;
    if (!(b > a)) {
      continue;
    }
    const target = Math.pow(10, d.gainDb / 20);
    gain = Math.min(
      gain,
      interpolate(
        frame,
        [a - DUCK_RAMP_FRAMES, a, b, b + DUCK_RAMP_FRAMES],
        [1, target, target, 1],
        {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
      )
    );
  }
  return gain;
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

// Dip-to-black on a splice. `at` is a source second on the join, so the
// transition follows the cuts like every other cue: the picture fades out into
// the splice, optionally holds black, then fades back in on the far side.
const Fades: React.FC = () => {
  const frame = useCurrentFrame();
  const fades = CONFIG.fades ?? [];
  let o = 0;
  for (const f of fades) {
    const half = ((f.durationSec ?? 0.6) * FPS) / 2;
    const hold = ((f.holdSec ?? 0) * FPS) / 2;
    const c = COVER_FRAMES + srcToOut(f.at) * FPS;
    o = Math.max(
      o,
      interpolate(
        frame,
        [c - half - hold, c - hold, c + hold, c + half + hold],
        [0, 1, 1, 0],
        {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
      )
    );
  }
  if (o <= 0) {
    return null;
  }
  return <AbsoluteFill style={{background: '#000', opacity: o}} />;
};

// Source-audio gain for one kept segment. Two jobs: a couple of frames of ramp
// at each splice so continuous audio does not click, and the tail of the final
// fade-to-black — the footage owns the audio, so the outro fade has to happen
// here rather than on a separate track.
const JOIN_FADE = CONFIG.audioJoinFadeFrames ?? 0;

// tail of the final fade-to-black, as a gain on whatever carries the audio
const outroGain = (absFrame: number): number => {
  if (CONFIG.outroFadeFrames <= 2) {
    return 1;
  }
  return interpolate(
    absFrame,
    [TOTAL_FRAMES - CONFIG.outroFadeFrames, TOTAL_FRAMES - 2],
    [1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
  );
};

const segmentVolume =
  (seg: {outFrame: number; durFrames: number}) =>
  (f: number): number => {
    const k = Math.min(JOIN_FADE, Math.floor((seg.durFrames - 1) / 2));
    const join =
      k > 0
        ? interpolate(
            f,
            [0, k, seg.durFrames - k, seg.durFrames],
            [0, 1, 1, 0],
            {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
          )
        : 1;
    return join * outroGain(COVER_FRAMES + seg.outFrame + f);
  };

// --- crossfaded audio layer -------------------------------------------------
// A splice in continuous audio must OVERLAP, not butt together: the outgoing
// clip keeps playing past the cut while fading out and the incoming clip starts
// early fading in. Ramping both to silence at the cut instead leaves a hole
// that still reads as a pop. The overlap is paid for with "handles" — each clip
// pre- and post-rolls half a crossfade into the material the cut discarded.
// Because the picture must still hard-cut, the audio cannot ride on the video
// element; it gets its own layer and the video is muted.
// On by default: a splice in continuous audio without an overlap pops, so this
// is a rule rather than an option. 15 frames -> 8-frame handles -> a real
// 16-frame (533ms) overlap. Set 0 to opt out and let audio ride on the video.
const XFADE = CONFIG.audioCrossfadeFrames ?? 15;
// handles are whole frames, so the real overlap is 2x the half-handle — the
// ramp has to span exactly that, otherwise it finishes before the clips stop
// overlapping and the tail of the crossfade plays at full gain on both sides
const XF_HALF = Math.round(XFADE / 2);
const XF_OVERLAP = XF_HALF * 2;
const SRC_FRAMES = Math.floor(CONFIG.srcDurationSec * FPS);

// Equal-power law. Two uncorrelated clips summed under sin/cos gains hold a
// constant perceived level across the overlap; a linear ramp dips ~3 dB in the
// middle, which is the very hole we are removing.
const equalPower = (p: number): number =>
  Math.sin(Math.min(1, Math.max(0, p)) * (Math.PI / 2));

const AUDIO_CLIPS =
  XFADE > 0
    ? SEGMENTS.map((s) => {
        const srcStart = Math.round(s.src * FPS);
        const srcEnd = srcStart + Math.round(s.durFrames * SPEED);
        // Handles are OUTPUT frames, but at playbackRate SPEED each one eats
        // SPEED source frames — so clamp against the footage on that scale, or
        // a sped-up edit seeks before 0 / past the end and the audio slips.
        const pre = Math.min(XF_HALF, Math.floor(srcStart / SPEED), s.outFrame);
        const post = Math.min(
          XF_HALF,
          Math.floor(Math.max(0, SRC_FRAMES - srcEnd) / SPEED)
        );
        const durFrames = s.durFrames + pre + post;
        const cap = Math.floor(durFrames / 2);
        return {
          from: s.outFrame - pre,
          durFrames,
          trimBefore: Math.max(0, srcStart - Math.floor(pre * SPEED)),
          // no handle means no neighbour to cross with (video head/tail)
          fadeIn: pre > 0 ? Math.min(XF_OVERLAP, cap) : 0,
          fadeOut: post > 0 ? Math.min(XF_OVERLAP, cap) : 0,
        };
      })
    : [];

const clipVolume =
  (c: {from: number; durFrames: number; fadeIn: number; fadeOut: number}) =>
  (f: number): number => {
    const gIn = c.fadeIn > 0 ? equalPower(f / c.fadeIn) : 1;
    const gOut =
      c.fadeOut > 0 ? equalPower((c.durFrames - f) / c.fadeOut) : 1;
    return gIn * gOut * outroGain(COVER_FRAMES + c.from + f);
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
            ) * bgmDuckGain(f)
          }
        />
      ) : null}

      {/* main content, shifted after the cover */}
      <Sequence from={COVER_FRAMES}>
        {/* source video played as kept segments (jump cuts), under the camera rig */}
        <CameraRig>
          {SEGMENTS.map((s, i) => (
            <Sequence key={i} from={s.outFrame} durationInFrames={s.durFrames}>
              {/* trimBefore is a plain source-frame offset; playbackRate then
                  advances SPEED source-seconds per output second. The renderer
                  resamples the audio with atempo, so pitch is preserved. */}
              <OffthreadVideo
                src={staticFile(CONFIG.videoFile)}
                trimBefore={Math.round(s.src * FPS)}
                playbackRate={SPEED}
                muted={XFADE > 0}
                volume={segmentVolume(s)}
              />
            </Sequence>
          ))}
        </CameraRig>

        {/* source audio as its own crossfaded layer (see AUDIO_CLIPS) */}
        {AUDIO_CLIPS.map((c, i) => (
          <Sequence key={`a${i}`} from={c.from} durationInFrames={c.durFrames}>
            <Audio
              src={staticFile(CONFIG.videoFile)}
              trimBefore={c.trimBefore}
              playbackRate={SPEED}
              volume={clipVolume(c)}
            />
          </Sequence>
        ))}
        <FreezeStill />
        {CONFIG.polish === false ? null : <Polish />}
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
      {CONFIG.cover ? (
        <Sequence from={0} durationInFrames={COVER_FRAMES}>
          <Cover />
        </Sequence>
      ) : null}
      {CONFIG.cover && CONFIG.sfx.coverWhoosh ? (
        <Sequence from={0} durationInFrames={100}>
          <Audio src={staticFile(CONFIG.sfx.coverWhoosh)} volume={1} />
        </Sequence>
      ) : null}

      <Fades />
      <FadeToBlack />
    </AbsoluteFill>
  );
};
