export interface RoleTagInfo {
  tag: string;
  colour: string;   // text colour — role hue at 70% opacity
  border: string;   // border colour — role hue at 40% opacity
}

const ROLE_MAP: Record<string, RoleTagInfo> = {
  rockerboy: { tag: 'ROCK',  colour: 'rgba(255,0,170,0.7)',   border: 'rgba(255,0,170,0.4)'   },
  solo:      { tag: 'SOLO',  colour: 'rgba(255,68,68,0.7)',   border: 'rgba(255,68,68,0.4)'   },
  netrunner: { tag: 'NET',   colour: 'rgba(0,212,255,0.7)',   border: 'rgba(0,212,255,0.4)'   },
  tech:      { tag: 'TECH',  colour: 'rgba(255,176,0,0.7)',   border: 'rgba(255,176,0,0.4)'   },
  medtech:   { tag: 'MED',   colour: 'rgba(224,224,224,0.7)', border: 'rgba(224,224,224,0.4)' },
  media:     { tag: 'MEDIA', colour: 'rgba(255,221,0,0.7)',   border: 'rgba(255,221,0,0.4)'   },
  exec:      { tag: 'EXEC',  colour: 'rgba(68,136,255,0.7)',  border: 'rgba(68,136,255,0.4)'  },
  lawman:    { tag: 'LAW',   colour: 'rgba(255,136,0,0.7)',   border: 'rgba(255,136,0,0.4)'   },
  fixer:     { tag: 'FIX',   colour: 'rgba(51,255,51,0.7)',   border: 'rgba(51,255,51,0.4)'   },
  nomad:     { tag: 'NOM',   colour: 'rgba(255,170,68,0.7)',  border: 'rgba(255,170,68,0.4)'  },
};

/**
 * Returns tag abbreviation + colours for a role string,
 * or null for GM (has its own badge) and unknown/empty roles.
 */
export function getRoleTag(role: string | null | undefined): RoleTagInfo | null {
  if (!role) return null;
  const key = role.toLowerCase().trim();
  if (key === 'game master') return null;
  return ROLE_MAP[key] ?? null;
}
