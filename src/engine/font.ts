import {continueRender, delayRender, staticFile} from 'remotion';
import {loadFont} from '@remotion/google-fonts/NotoSansTC';

const {fontFamily} = loadFont('normal', {
  weights: ['500', '700', '900'],
});

export const FONT = `'${fontFamily}', 'Microsoft JhengHei', sans-serif`;

const handle = delayRender('load ChenYuluoyan font');
const chenyu = new FontFace(
  'ChenYuluoyan',
  `url('${staticFile('fonts/ChenYuluoyan-2.0-Thin.ttf')}') format('truetype')`
);
chenyu
  .load()
  .then(() => {
    document.fonts.add(chenyu);
    continueRender(handle);
  })
  .catch(() => continueRender(handle));

export const HAND_FONT = `'ChenYuluoyan', 'Microsoft JhengHei', sans-serif`;
