/**
 * 아이콘 모음.
 *
 * 라이브러리를 넣지 않고 필요한 것만 직접 둔다. 개수가 적고,
 * 번들 크기와 버전 관리를 줄이는 편이 이 규모에 맞다.
 * 모두 24×24 스트로크 기준이라 크기·색이 부모를 따른다.
 */
type P = { size?: number; className?: string };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export const IconHome = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5.5 9.5V20h13V9.5" />
  </svg>
);

export const IconCompass = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-2 5-5 2 2-5z" />
  </svg>
);

export const IconUser = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="8.5" r="3.5" />
    <path d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" />
  </svg>
);

export const IconBell = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 4 1.5 5.5 1.5 5.5H5S6.5 14 6.5 10Z" />
    <path d="M10.5 19a1.8 1.8 0 0 0 3 0" />
  </svg>
);

export const IconPlus = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className} strokeWidth={2.2}>
    <path d="M12 6v12M6 12h12" />
  </svg>
);

export const IconHeart = ({ size = 20, className, filled }: P & { filled?: boolean }) => (
  <svg {...base(size)} className={className} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9Z" />
  </svg>
);

export const IconFilter = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 7h16M7 12h10M10 17h4" />
  </svg>
);

export const IconArrowRight = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </svg>
);

export const IconArrowLeft = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M20 12H5M11 6l-6 6 6 6" />
  </svg>
);

export const IconLink = ({ size = 15, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M9.5 14.5a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1 1" />
    <path d="M14.5 9.5a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1-1" />
  </svg>
);

export const IconPin = ({ size = 15, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 21s6-5.2 6-9.6A6 6 0 0 0 6 11.4C6 15.8 12 21 12 21Z" />
    <circle cx="12" cy="11" r="2.2" />
  </svg>
);

export const IconClose = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="m7 7 10 10M17 7 7 17" />
  </svg>
);

export const IconCheck = ({ size = 26, className }: P) => (
  <svg {...base(size)} className={className} strokeWidth={2.4}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

export const IconAlert = ({ size = 26, className }: P) => (
  <svg {...base(size)} className={className} strokeWidth={2.2}>
    <path d="M12 7v6M12 16.8v.2" />
  </svg>
);

export const IconInfo = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v.2M12 11.5v4.5" />
  </svg>
);

/** PRISM 워드마크의 스파클. 브랜드 표식으로만 쓴다. */
export const IconSpark = ({ size = 18, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12 1.6c.54 6.1 4.2 9.76 10.3 10.3-6.1.54-9.76 4.2-10.3 10.3-.54-6.1-4.2-9.76-10.3-10.3C7.8 11.36 11.46 7.7 12 1.6Z" />
  </svg>
);

export const IconGoogle = ({ size = 18 }: P) => (
  <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true">
    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.94v2.33A9 9 0 0 0 9 18Z" />
    <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.94a9 9 0 0 0 0 8.1l3.03-2.33Z" />
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .94 4.95l3.03 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
  </svg>
);
