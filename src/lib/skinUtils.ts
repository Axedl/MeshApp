export const SKIN_ROLES: Record<string, string> = {
  netrunner:     'crt',
  tech:          'crt',
  fixer:         'crt',
  nomad:         'crt',
  exec:          'exec',
  rockerboy:     'rockerboy',
  media:         'media',
  medtech:       'medtech',
  solo:          'solo',
  lawman:        'lawman',
  'game master': 'crt',
};

export function getSkin(role: string): string {
  return SKIN_ROLES[role.toLowerCase().trim()] ?? 'crt';
}

export function isPolishedSkin(skin: string): boolean {
  return skin !== 'crt';
}
