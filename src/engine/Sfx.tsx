import React from 'react';
import {Audio, Sequence, interpolate, staticFile} from 'remotion';
import {srcToOut} from './cuts';
import {CONFIG} from '../videoConfig';

// SFX are pre-normalized well below the voice level (see tools/ mixing docs).
// Cue times are in SOURCE-video seconds; converted through the cut map.
const FPS = 30;
const out = (s: number) => Math.round(srcToOut(s) * FPS);

export const Sfx: React.FC = () => {
  const bang = CONFIG.bigBang;
  const chars = bang ? [...bang.text] : [];
  return (
    <>
      {/* per-character pops for the big-bang line, rising pitch */}
      {bang && CONFIG.sfx.bigBangPop
        ? chars.map((_, i) => (
            <Sequence
              key={`pop-${i}`}
              from={out(bang.start + i * bang.step)}
              durationInFrames={20}
            >
              <Audio
                src={staticFile(CONFIG.sfx.bigBangPop!)}
                playbackRate={1 + i * 0.07}
                volume={0.9}
              />
            </Sequence>
          ))
        : null}

      {CONFIG.sfx.cues.map((cue, i) => {
        const durFrames = Math.round((cue.durationSec ?? 2) * FPS);
        const fadeFrames = Math.round((cue.fadeOutSec ?? 0) * FPS);
        const vol = cue.volume ?? 1;
        return (
          <Sequence key={i} from={out(cue.at)} durationInFrames={durFrames}>
            <Audio
              src={staticFile(cue.file)}
              playbackRate={cue.playbackRate ?? 1}
              volume={(f) =>
                fadeFrames > 0
                  ? interpolate(
                      f,
                      [0, durFrames - fadeFrames, durFrames],
                      [vol, vol, 0],
                      {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
                    )
                  : vol
              }
            />
          </Sequence>
        );
      })}
    </>
  );
};
