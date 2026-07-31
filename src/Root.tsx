import React from 'react';
import {Composition} from 'remotion';
import {Main} from './engine/Main';
import {TOTAL_FRAMES} from './engine/cuts';
import {CONFIG} from './videoConfig';

// vertical by default; landscape footage sets CONFIG.composition instead
const {width, height} = CONFIG.composition ?? {width: 1080, height: 1920};

export const Root: React.FC = () => {
  return (
    <Composition
      id="Main"
      component={Main}
      durationInFrames={TOTAL_FRAMES}
      fps={30}
      width={width}
      height={height}
    />
  );
};
