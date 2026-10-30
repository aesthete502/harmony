import type { ReactNode } from 'react';

interface IconProps {
  size?: number;
}

/** 统一线性图标，避免 emoji 在不同系统上样式不一致 */
function Svg({ children, size = 20 }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function IconKeyboard({ size }: IconProps) {
  return (
    <Svg size={size}>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <path d="M8 6v7M12 6v7M16 6v7" />
    </Svg>
  );
}

export function IconTarget({ size }: IconProps) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" />
    </Svg>
  );
}

export function IconLayers({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M12 3.5 3.5 8l8.5 4.5L20.5 8 12 3.5Z" />
      <path d="M3.5 12.5 12 17l8.5-4.5" />
      <path d="M3.5 16.5 12 21l8.5-4.5" />
    </Svg>
  );
}

export function IconChart({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </Svg>
  );
}

export function IconCircle({ size }: IconProps) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="5.6" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="9.2" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="14.8" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="18.4" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="6.5" cy="14.8" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="6.5" cy="9.2" r="1.1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconPlay({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M7 4.5 19 12 7 19.5V4.5Z" />
    </Svg>
  );
}

export function IconStop({ size }: IconProps) {
  return (
    <Svg size={size}>
      <rect x="6" y="6" width="12" height="12" rx="1.5" />
    </Svg>
  );
}
