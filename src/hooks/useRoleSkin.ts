import { useEffect } from 'react';

// Roles that receive visual treatment.
// Unrecognised roles and Game Master get no skin applied.
const RECOGNISED_ROLES = new Set([
  'rockerboy', 'solo', 'netrunner', 'tech', 'medtech',
  'media', 'exec', 'lawman', 'fixer', 'nomad',
]);

// CSS custom properties set inline on <html> per role.
// Animation keyframes and selector-based overrides live in roleSkins.css.
const ROLE_CSS_VARS: Record<string, Record<string, string>> = {
  netrunner: {
    '--scanline-opacity':      '0.07',
    '--flicker-duration':      '6s',
  },
  solo: {
    '--scanline-opacity':      '0.06',
    '--flicker-duration':      '12s',
    '--cursor-blink-duration': '1.5s',
  },
  exec: {
    '--scanline-opacity':      '0.02',
    // flicker disabled via [data-role="exec"] .crt-flicker { animation: none }
  },
  rockerboy: {
    '--cursor-blink-duration': '0.6s',
  },
  // medtech, nomad, tech, media, lawman, fixer: no CSS var overrides —
  // their effects are handled entirely by [data-role] selectors in roleSkins.css
};

/**
 * Applies role-based CRT visual variations to document.documentElement:
 * - Sets data-role attribute (consumed by roleSkins.css selectors)
 * - Sets role-specific CSS custom properties inline
 * Cleans up both on unmount.
 *
 * Safe to use alongside useColourScheme — only touches --scanline-opacity,
 * --flicker-duration, and --cursor-blink-duration.
 */
export function useRoleSkin(role: string | null | undefined): void {
  useEffect(() => {
    if (!role) return;
    const key = role.toLowerCase().trim();
    if (!RECOGNISED_ROLES.has(key)) return;

    const root = document.documentElement;
    root.setAttribute('data-role', key);

    const vars = ROLE_CSS_VARS[key];
    if (vars) {
      for (const [prop, value] of Object.entries(vars)) {
        root.style.setProperty(prop, value);
      }
    }

    return () => {
      root.removeAttribute('data-role');
      if (vars) {
        for (const prop of Object.keys(vars)) {
          root.style.removeProperty(prop);
        }
      }
    };
  }, [role]);
}
