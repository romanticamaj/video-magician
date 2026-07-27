import React from 'react';
import {Composition} from 'remotion';
import {Main} from './Main';
import {CONFIG} from './videoConfig';
import {VIDEO_FRAMES} from './cuts';

export const FPS = 30;
export const TOTAL_FRAMES =
  CONFIG.coverFrames + VIDEO_FRAMES + CONFIG.outroFrames;

export const Root: React.FC = () => {
  return (
    <Composition
      id="Main"
      component={Main}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={1080}
      height={1920}
    />
  );
};
