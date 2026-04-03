import React from 'react';
import type { KiriHouBodyRegion, KiriHouEntry } from '../../types';

interface RegionDot {
  region: KiriHouBodyRegion;
  cx: number;
  cy: number;
}

// Dot positions mapped to the 120×280 viewBox silhouette
const REGION_DOTS: RegionDot[] = [
  { region: 'eyes',      cx: 60,  cy: 22  },
  { region: 'head',      cx: 60,  cy: 35  },
  { region: 'spine',     cx: 60,  cy: 90  },
  { region: 'torso',     cx: 60,  cy: 110 },
  { region: 'left_arm',  cx: 25,  cy: 105 },
  { region: 'right_arm', cx: 95,  cy: 105 },
  { region: 'hands',     cx: 60,  cy: 145 },
  { region: 'left_leg',  cx: 40,  cy: 200 },
  { region: 'right_leg', cx: 80,  cy: 200 },
];

function dotColor(humanityCost: number): string {
  if (humanityCost >= 6) return '#cc2222';
  if (humanityCost >= 3) return '#ffb000';
  return 'var(--primary-dim)';
}

interface Props {
  entries: KiriHouEntry[];
  onRegionClick: (region: KiriHouBodyRegion) => void;
}

export function KiriHouBodyDiagram({ entries, onRegionClick }: Props) {
  const entryByRegion = new Map<KiriHouBodyRegion, KiriHouEntry[]>();
  for (const entry of entries) {
    const list = entryByRegion.get(entry.body_region) ?? [];
    list.push(entry);
    entryByRegion.set(entry.body_region, list);
  }

  return (
    <svg
      viewBox="0 0 120 280"
      className="kiri-body-diagram"
      aria-label="Cyberware body diagram"
    >
      {/* Silhouette — simplified geometric humanoid */}
      {/* Head */}
      <ellipse cx="60" cy="30" rx="14" ry="17" className="kiri-body-part" />
      {/* Neck */}
      <rect x="54" y="46" width="12" height="10" className="kiri-body-part" />
      {/* Torso */}
      <rect x="33" y="56" width="54" height="70" rx="4" className="kiri-body-part" />
      {/* Left arm */}
      <rect x="15" y="60" width="16" height="60" rx="4" className="kiri-body-part" />
      {/* Right arm */}
      <rect x="89" y="60" width="16" height="60" rx="4" className="kiri-body-part" />
      {/* Left hand */}
      <ellipse cx="23" cy="126" rx="8" ry="6" className="kiri-body-part" />
      {/* Right hand */}
      <ellipse cx="97" cy="126" rx="8" ry="6" className="kiri-body-part" />
      {/* Left leg */}
      <rect x="35" y="128" width="20" height="80" rx="4" className="kiri-body-part" />
      {/* Right leg */}
      <rect x="65" y="128" width="20" height="80" rx="4" className="kiri-body-part" />
      {/* Left foot */}
      <ellipse cx="45" cy="212" rx="12" ry="6" className="kiri-body-part" />
      {/* Right foot */}
      <ellipse cx="75" cy="212" rx="12" ry="6" className="kiri-body-part" />
      {/* Spine line */}
      <line x1="60" y1="56" x2="60" y2="126" className="kiri-spine-line" />

      {/* Dots for installed cyberware */}
      {REGION_DOTS.map(({ region, cx, cy }) => {
        const regionEntries = entryByRegion.get(region);
        if (!regionEntries?.length) return null;
        const maxCost = Math.max(...regionEntries.map(e => e.humanity_cost));
        const color = dotColor(maxCost);
        const names = regionEntries.map(e => e.cyberware_name).join(', ');
        const isPulsing = maxCost >= 6;

        return (
          <g
            key={region}
            className="kiri-dot-group"
            onClick={() => onRegionClick(region)}
            style={{ cursor: 'pointer' }}
          >
            <title>{names}</title>
            <circle
              cx={cx}
              cy={cy}
              r={5}
              fill={color}
              opacity={0.9}
              className={isPulsing ? 'kiri-dot kiri-dot--pulse' : 'kiri-dot'}
            />
            <circle
              cx={cx}
              cy={cy}
              r={8}
              fill="none"
              stroke={color}
              strokeWidth={1}
              opacity={0.4}
            />
          </g>
        );
      })}
    </svg>
  );
}
