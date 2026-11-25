import type { SVGProps } from "react";

const P: Record<string, React.ReactNode> = {
  crown: (<><path d="m2 4 3 12h14l3-12-6 7-4-9-4 9-6-7z" /><path d="M5 20h14" /></>),
  gem: (<><path d="M6 3h12l4 6-10 13L2 9z" /><path d="M11 3 8 9l4 13 4-13-3-6" /><path d="M2 9h20" /></>),
  bolt: <path d="M13 2 3 14h8l-1 8 10-12h-8z" />,
  door: (<><path d="M5 21V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v17" /><path d="M3 21h18" /><circle cx="12.5" cy="12" r=".8" fill="currentColor" /></>),
  locker: (<><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M4 12h16" /><path d="M8 7.5h3M8 16.5h3" /></>),
  lock: (<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>),
  unlock: (<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 7.5-2" /></>),
  user: (<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>),
  users: (<><circle cx="9" cy="8" r="3.5" /><path d="M2 20a7 7 0 0 1 14 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a7 7 0 0 1 4 5.5" /></>),
  card: (<><rect x="2" y="5" width="20" height="14" rx="3" /><path d="M2 10h20M6 15h4" /></>),
  nfc: (<><path d="M8 8a6 6 0 0 1 0 8M12 5.5a9.5 9.5 0 0 1 0 13M16 3a13 13 0 0 1 0 18" /></>),
  cart: (<><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M2 3h3l2.7 12.4a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 8H6" /></>),
  chart: (<><path d="M3 3v18h18" /><path d="M7 15v3M12 10v8M17 6v12" /></>),
  bell: (<><path d="M6 9a6 6 0 0 1 12 0c0 6 2 7 2 8H4c0-1 2-2 2-8z" /><path d="M10 21a2 2 0 0 0 4 0" /></>),
  gear: (<><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" /></>),
  fingerprint: (<><path d="M6 11a6 6 0 0 1 12 0c0 3 0 5-1 8" /><path d="M9 20c1-2 1.5-4 1.5-7a1.5 1.5 0 0 1 3 0c0 3-.5 5.5-2 8" /><path d="M3 10a9 9 0 0 1 18 0" /><path d="M6 15c0 2-.5 3-1 4" /></>),
  face: (<><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" /><path d="M9 9v1.5M15 9v1.5M12 9v4.5h-1M9 16c1.7 1.3 4.3 1.3 6 0" /></>),
  calendar: (<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>),
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  power: (<><path d="M12 3v9" /><path d="M6.4 6.4a8 8 0 1 0 11.2 0" /></>),
  phone: (<><rect x="7" y="2" width="10" height="20" rx="2.5" /><path d="M11 18h2" /></>),
  qr: (<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM20 14v.01M14 20h3M20 17v4" /></>),
  logout: (<><path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" /><path d="M16 8l4 4-4 4M20 12H9" /></>),
  dumbbell: (<><path d="M6 6v12M18 6v12M3 9v6M21 9v6M6 12h12" /></>),
  plus: <path d="M12 5v14M5 12h14" />,
  send: <path d="m3 11 18-8-8 18-2-8z" />,
  shield: (<><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" /><path d="m9 12 2 2 4-4" /></>),
  home: (<><path d="M3 11 12 3l9 8" /><path d="M5 10v10h14V10" /></>),
};

export type IconName = keyof typeof P;

export function Icon({ name, size = 20, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {P[name]}
    </svg>
  );
}
