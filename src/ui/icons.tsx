import type { ReactNode } from 'react';

const P: Record<string, ReactNode> = {
  bars: <><path d="M4 20V4" /><path d="M4 20h16" /><path d="M9 20v-7" /><path d="M14 20V8" /><path d="M19 20v-4" /></>,
  book: <><path d="M12 6c-2-1.4-4.6-2-8-2v14c3.4 0 6 .6 8 2 2-1.4 4.6-2 8-2V4c-3.4 0-6 .6-8 2z" /><path d="M12 6v14" /></>,
  sliders: <><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" /></>,
  candlePlus: <><path d="M8 5v3M8 16v3M15 8v2M15 17v3" /><rect x="6" y="8" width="4" height="8" rx="1" /><rect x="13" y="10" width="4" height="7" rx="1" /><path d="M19 3v5M16.5 5.5h5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  chevDown: <path d="M6 9l6 6 6-6" />,
  chevLeft: <path d="M15 6l-6 6 6 6" />,
  chevRight: <path d="M9 6l6 6-6 6" />,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></>,
  calendar: <><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M8 3v4M16 3v4M4 10h16" /></>,
  wallet: <><path d="M4 7a2 2 0 012-2h11v4" /><rect x="4" y="7" width="16" height="12" rx="3" /><circle cx="16" cy="13" r="1.2" /></>,
  share: <><circle cx="6" cy="12" r="2.4" /><circle cx="17" cy="6" r="2.4" /><circle cx="17" cy="18" r="2.4" /><path d="M8.1 11l6.8-3.6M8.1 13l6.8 3.6" /></>,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  trash: <><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" /></>,
  edit: <><path d="M4 20l4-1 10-10-3-3L5 16z" /><path d="M14 6l3 3" /></>,
  download: <><path d="M12 4v11M7.5 11l4.5 4.5 4.5-4.5M5 20h14" /></>,
  upload: <><path d="M12 16V5M7.5 9L12 4.5 16.5 9M5 20h14" /></>,
  dna: <><path d="M6 3c0 6 12 6 12 12s-12 0-12 6M18 3c0 6-12 6-12 12" /></>,
  list: <><path d="M8 6h12M8 12h12M8 18h12" /><circle cx="4" cy="6" r=".8" /><circle cx="4" cy="12" r=".8" /><circle cx="4" cy="18" r=".8" /></>,
  moon: <path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8v.01" /></>,
  home: <><path d="M4 11l8-7 8 7" /><path d="M6 10v10h12V10" /><path d="M10 20v-5h4v5" /></>,
  palette: <><path d="M12 3a9 9 0 100 18c1.4 0 2-1 1.5-2.2-.6-1.4.2-2.8 1.8-2.8H17a4 4 0 004-4c0-5-4-9-9-9z" /><circle cx="7.5" cy="11" r="1" /><circle cx="10" cy="7" r="1" /><circle cx="15" cy="7.5" r="1" /></>,
  type: <path d="M5 6V4h14v2M12 4v16M9 20h6" />,
  sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18 16l.8 2.2L21 19l-2.2.8L18 22l-.8-2.2L15 19l2.2-.8z" />,
  layers: <><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /></>,
  image: <><rect x="3.5" y="4.5" width="17" height="15" rx="3" /><circle cx="9" cy="10" r="1.6" /><path d="M4 17l5-4 4 3 3-2 4 3" /></>,
  calculator: <><rect x="5" y="3" width="14" height="18" rx="3" /><path d="M8.5 7.5h7M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01" /></>,
  trophy: <><path d="M8 4h8v5a4 4 0 01-8 0z" /><path d="M8 6H5a3 3 0 003 4M16 6h3a3 3 0 01-3 4M12 13v4M8 20h8" /></>,
  trend: <path d="M3 17l5-6 4 3 8-9" />,
  target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.5" /></>,
  scale: <><path d="M12 4v16M6 20h12M5 7h14" /><path d="M5 7l-3 7a3 3 0 006 0zM19 7l-3 7a3 3 0 006 0z" /></>,
  coins: <><ellipse cx="12" cy="7" rx="7" ry="3" /><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" /></>,
  activity: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  star: <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" />,
  file: <><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M10 12h5M10 16h5" /></>,
  shield: <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />,
  leaf: <><path d="M5 19c0-8 5-14 15-14 0 9-5 15-13 15" /><path d="M5 19c3-5 6-8 10-10" /></>,
  cloud: <path d="M7 18a4 4 0 01-.6-7.95A5.5 5.5 0 0117 8.5a4.8 4.8 0 01.5 9.5z" />,
  bolt: <path d="M13 3L5 13.5h6L10 21l8-10.5h-6z" />,
  grid: <><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></>
};

export type IconName = keyof typeof P;

export function Icon({ name, size = 22, label }: { name: IconName; size?: number; label?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {P[name]}
    </svg>
  );
}
