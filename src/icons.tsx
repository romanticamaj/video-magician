import React from 'react';

type IconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
};

const base = (
  size: number,
  style?: React.CSSProperties
): React.SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  style,
});

export const BookIcon: React.FC<IconProps> = ({
  size = 40,
  color = '#fff',
  strokeWidth = 2,
  style,
}) => (
  <svg {...base(size, style)}>
    <path
      d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5H6.5A2.5 2.5 0 0 0 4 21V5.5Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
    <path
      d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
    <path
      d="M8.5 7.5h7M8.5 11h4.5"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </svg>
);

export const WrenchIcon: React.FC<IconProps> = ({
  size = 40,
  color = '#fff',
  strokeWidth = 2,
  style,
}) => (
  <svg {...base(size, style)}>
    <path
      d="M20.7 6.3a5 5 0 0 1-6.6 6.5L7 20a2.1 2.1 0 0 1-3-3l7.2-7.1a5 5 0 0 1 6.5-6.6l-3 3 .4 2.6 2.6.4 3-3Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const BoltIcon: React.FC<IconProps> = ({
  size = 40,
  color = '#fff',
  strokeWidth = 2,
  style,
}) => (
  <svg {...base(size, style)}>
    <path
      d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      fill="rgba(255,255,255,0.12)"
    />
  </svg>
);

export const RetroTvIcon: React.FC<IconProps> = ({
  size = 40,
  color = '#fff',
  strokeWidth = 2,
  style,
}) => (
  <svg {...base(size, style)}>
    <rect
      x="3"
      y="7"
      width="18"
      height="13"
      rx="2.5"
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <path
      d="m8 2 4 5 4-5"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7 11v5M17.5 11.5v.01M17.5 15v.01"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </svg>
);

export const ClipboardCheckIcon: React.FC<IconProps> = ({
  size = 40,
  color = '#fff',
  strokeWidth = 2,
  style,
}) => (
  <svg {...base(size, style)}>
    <rect
      x="4.5"
      y="4"
      width="15"
      height="18"
      rx="2.5"
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <path
      d="M9 4.5V3.2A1.2 1.2 0 0 1 10.2 2h3.6A1.2 1.2 0 0 1 15 3.2v1.3"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
    <path
      d="m8.5 13.5 2.5 2.5 4.8-5"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const DocumentIcon: React.FC<IconProps> = ({
  size = 40,
  color = '#fff',
  strokeWidth = 2,
  style,
}) => (
  <svg {...base(size, style)}>
    <path
      d="M6 2.8h8.2L19 7.6V21.2H6V2.8Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
    <path
      d="M14 3v5h5"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
    <path
      d="M9 12h7M9 15.5h7M9 8.5h2"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </svg>
);

export const CarIcon: React.FC<IconProps> = ({
  size = 40,
  color = '#fff',
  strokeWidth = 2,
  style,
}) => (
  <svg {...base(size, style)}>
    <path
      d="M4 16.5 5.4 10a2.4 2.4 0 0 1 2.3-1.9h8.6A2.4 2.4 0 0 1 18.6 10l1.4 6.5"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect
      x="2.8"
      y="14.5"
      width="18.4"
      height="5"
      rx="1.6"
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <path
      d="M6.6 17h.01M17.4 17h.01"
      stroke={color}
      strokeWidth={strokeWidth * 1.6}
      strokeLinecap="round"
    />
    <path
      d="M7.5 11.5h9"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </svg>
);

export const ArrowDownIcon: React.FC<IconProps> = ({
  size = 40,
  color = '#fff',
  strokeWidth = 2.4,
  style,
}) => (
  <svg {...base(size, style)}>
    <path
      d="M12 4v14m0 0 6-6m-6 6-6-6"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ArrowUpIcon: React.FC<IconProps> = ({
  size = 40,
  color = '#fff',
  strokeWidth = 2.4,
  style,
}) => (
  <svg {...base(size, style)}>
    <path
      d="M12 20V6m0 0 6 6m-6-6-6 6"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const FootstepsIcon: React.FC<IconProps> = ({
  size = 40,
  color = '#fff',
  strokeWidth = 2,
  style,
}) => (
  <svg {...base(size, style)}>
    <path
      d="M7.5 3.5c1.8 0 2.8 1.7 2.8 3.8 0 1.6-.6 2.7-1.5 3.3l.2 2.2c-.1 1-2.7 1.2-2.9.1l-.5-2.1C4.5 10.4 4 9 4 7.6c0-2.2 1.6-4.1 3.5-4.1Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
    <path
      d="M16.5 10.5c-1.8.2-2.6 2-2.4 4.1.2 1.6.9 2.6 1.8 3.1l.1 2.2c.2 1 2.8.9 2.9-.2l.3-2.1c1-.5 1.4-2 1.2-3.4-.2-2.2-2-3.9-3.9-3.7Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
  </svg>
);

export const CheckIcon: React.FC<IconProps> = ({
  size = 40,
  color = '#fff',
  strokeWidth = 2.6,
  style,
}) => (
  <svg {...base(size, style)}>
    <circle cx="12" cy="12" r="9.2" stroke={color} strokeWidth={strokeWidth} />
    <path
      d="m7.8 12.4 2.8 2.8 5.6-6"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const SparkleIcon: React.FC<IconProps> = ({
  size = 40,
  color = '#fff',
  style,
}) => (
  <svg {...base(size, style)}>
    <path
      d="M12 2.5c.7 4.4 2.6 6.6 7.5 7.5-4.9 1.4-6.8 3.6-7.5 8.5-.7-4.9-2.6-7.1-7.5-8.5 4.9-.9 6.8-3.1 7.5-7.5Z"
      fill={color}
    />
  </svg>
);

// Anthropic logomark (simplified angular "A")
const AnthropicMarkBase: React.FC<IconProps> = ({
  size = 40,
  color = '#D97757',
  style,
}) => (
  <svg {...base(size, style)}>
    <path
      d="M13.8 3.8h-3.9L2.7 20.2h4L8.1 17h6.9l1.4 3.3h4L13.8 3.8Zm-4.4 10 2.2-5.4 2.1 5.4H9.4Z"
      fill={color}
    />
  </svg>
);

export const AnthropicMark = AnthropicMarkBase;

// name → component map so configs can reference icons by string
export const ICONS = {
  book: BookIcon,
  wrench: WrenchIcon,
  document: DocumentIcon,
  bolt: BoltIcon,
  retroTv: RetroTvIcon,
  clipboardCheck: ClipboardCheckIcon,
  car: CarIcon,
  arrowDown: ArrowDownIcon,
  arrowUp: ArrowUpIcon,
  footsteps: FootstepsIcon,
  check: CheckIcon,
  sparkle: SparkleIcon,
  anthropic: AnthropicMarkBase,
} as const;

export type IconName = keyof typeof ICONS;
