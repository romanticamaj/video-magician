import React from 'react';
import {Composition} from 'remotion';
import {Main} from './engine/Main';
import {TOTAL_FRAMES} from './engine/cuts';

export const Root: React.FC = () => {
  return (
    <Composition
      id="Main"
      component={Main}
      durationInFrames={TOTAL_FRAMES}
      fps={30}
      width={1080}
      height={1920}
    />
  );
};
