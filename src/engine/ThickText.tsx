import React from 'react';

// ChenYuluoyan is a thin handwriting font — fake a bold weight by stacking
// a same-color stroked copy (fatten) over a dark outline copy (outline).
export const Thick: React.FC<{
  text: string;
  color?: string;
  fatten?: number;
  outline?: number;
  outlineColor?: string;
  style?: React.CSSProperties;
}> = ({
  text,
  color = '#FFFFFF',
  fatten = 4,
  outline = 0,
  outlineColor = 'rgba(10,10,14,0.85)',
  style,
}) => {
  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-block',
        ...style,
      }}
    >
      {outline > 0 ? (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            color: 'transparent',
            WebkitTextStroke: `${outline}px ${outlineColor}`,
          }}
        >
          {text}
        </span>
      ) : null}
      <span
        style={{
          position: 'relative',
          color,
          WebkitTextStroke: `${fatten}px ${color}`,
        }}
      >
        {text}
      </span>
    </span>
  );
};
