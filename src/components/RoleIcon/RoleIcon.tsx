import type { CSSProperties, ReactNode } from 'react';

interface RoleIconProps {
  role: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function RoleIcon({ role, size = 24, className, style }: RoleIconProps) {
  const key = role.toLowerCase().trim();

  const paths: Record<string, ReactNode> = {
    rockerboy: (
      // Microphone silhouette
      <path
        d="M12 2a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3zm-5 8a5 5 0 0 0 10 0h-1.5a3.5 3.5 0 0 1-7 0H7zm5 6.9V19h3v1.5H9V19h3v-2.1A7 7 0 0 1 5 10h1.5a5.5 5.5 0 0 0 11 0H19a7 7 0 0 1-7 6.9z"
        fillRule="evenodd"
      />
    ),

    solo: (
      // Pistol silhouette
      <path d="M3 9h11v2H3V9zm11 0h1.5l1 1.5H17v1h-3v-2.5zM17 10.5V13h1v1h-5v-1h1v-1.5h3zM3 11v3h1.5l.5 2h5l.5-2H12v-3H3z" />
    ),

    netrunner: (
      // Circuit trace / neural jack
      <g>
        <circle cx="12" cy="12" r="2.5" fill="none" strokeWidth="1.5" stroke="currentColor" />
        <circle cx="12" cy="12" r="5.5" fill="none" strokeWidth="1" stroke="currentColor" strokeDasharray="3 2" />
        <line x1="12" y1="2" x2="12" y2="6.5" strokeWidth="1.5" stroke="currentColor" />
        <line x1="12" y1="17.5" x2="12" y2="22" strokeWidth="1.5" stroke="currentColor" />
        <line x1="2" y1="12" x2="6.5" y2="12" strokeWidth="1.5" stroke="currentColor" />
        <line x1="17.5" y1="12" x2="22" y2="12" strokeWidth="1.5" stroke="currentColor" />
        <circle cx="12" cy="2.5" r="1" fill="currentColor" />
        <circle cx="12" cy="21.5" r="1" fill="currentColor" />
        <circle cx="2.5" cy="12" r="1" fill="currentColor" />
        <circle cx="21.5" cy="12" r="1" fill="currentColor" />
      </g>
    ),

    tech: (
      // Wrench
      <path d="M15.6 3a5 5 0 0 0-4.9 6l-7 7a1.5 1.5 0 0 0 2.1 2.1l7-7A5 5 0 0 0 20 6.4l-2.8 2.8-1.4-.7-.7-1.4L17.9 4a5 5 0 0 0-2.3-.9z" />
    ),

    medtech: (
      // Medical cross
      <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7V2z" />
    ),

    media: (
      // Camera / lens
      <path
        d="M20 6h-2.8L16 4H8L6.8 6H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zm-8 11a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9zm0-7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"
        fillRule="evenodd"
      />
    ),

    exec: (
      // Briefcase
      <path
        d="M8 6V4h8v2h4a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4zm2-2v2h4V4h-4zm-6 5v9h16v-9H4zm7 1h2v3h-2v-3z"
        fillRule="evenodd"
      />
    ),

    lawman: (
      // Shield / badge
      <path
        d="M12 2l8 3v6c0 4.4-3.4 8.5-8 9.9C7.4 19.5 4 15.4 4 11V5l8-3zm0 2.2L6 6.7V11c0 3.5 2.6 6.8 6 8 3.4-1.2 6-4.5 6-8V6.7L12 4.2zm0 3.3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm-2 5h4v1H10v-1z"
        fillRule="evenodd"
      />
    ),

    fixer: (
      // Handshake
      <path
        d="M4 10l3.5-3.5 2.5 1 2-1 4 3.5-2 2 1 1-4 4-1-1-2 2-4-4 1-1-1-1.5L4 10zm2.5.5l1-1 1.5 1.5L8 12l-1.5-1.5zm8 4l-1.5-1.5 1-1L15.5 13.5 14 15zm-2-5l-2 2 1.5 1.5 2-2L12 10z"
      />
    ),

    nomad: (
      // Steering wheel
      <g>
        <circle cx="12" cy="12" r="9.5" fill="none" strokeWidth="1.5" stroke="currentColor" />
        <circle cx="12" cy="12" r="2.5" fill="none" strokeWidth="1.5" stroke="currentColor" />
        <line x1="12" y1="9.5" x2="12" y2="3" strokeWidth="1.5" stroke="currentColor" />
        <line x1="14.7" y1="10.6" x2="20.2" y2="7.2" strokeWidth="1.5" stroke="currentColor" />
        <line x1="14.7" y1="13.4" x2="20.2" y2="16.8" strokeWidth="1.5" stroke="currentColor" />
        <line x1="12" y1="14.5" x2="12" y2="21" strokeWidth="1.5" stroke="currentColor" />
        <line x1="9.3" y1="13.4" x2="3.8" y2="16.8" strokeWidth="1.5" stroke="currentColor" />
        <line x1="9.3" y1="10.6" x2="3.8" y2="7.2" strokeWidth="1.5" stroke="currentColor" />
      </g>
    ),

    'game master': (
      // Eye (GM sees all)
      <path
        d="M12 5C7 5 2.7 8.4 1 13c1.7 4.6 6 8 11 8s9.3-3.4 11-8c-1.7-4.6-6-8-11-8zm0 13a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"
        fillRule="evenodd"
      />
    ),
  };

  const icon = paths[key] ?? (
    // Default: terminal cursor block
    <rect x="4" y="6" width="10" height="13" rx="1" />
  );

  // Determine if we need stroke-based rendering (netrunner, nomad use strokes)
  const isStrokeBased = key === 'netrunner' || key === 'nomad';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={isStrokeBased ? 'none' : 'currentColor'}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {icon}
    </svg>
  );
}
