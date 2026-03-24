import { useEffect } from 'react';
import { getSkin, isPolishedSkin } from '../lib/skinUtils';

/**
 * Applies the skin system to document.documentElement based on the user's role:
 * - Sets data-skin attribute (consumed by per-skin CSS files)
 * - For polished skins: adds class 'skin-polished' and dynamically imports the skin CSS
 * - For CRT: ensures no skin-polished class is present
 * Cleans up both on unmount.
 *
 * Works alongside useRoleSkin — only touches data-skin and skin-polished class.
 */
export function useSkin(role: string | null | undefined): void {
  useEffect(() => {
    const skin = getSkin(role ?? '');
    const root = document.documentElement;
    root.setAttribute('data-skin', skin);
    if (isPolishedSkin(skin)) {
      root.classList.add('skin-polished');
      import(`../styles/skins/${skin}.css`);
    } else {
      root.classList.remove('skin-polished');
    }
    return () => {
      root.removeAttribute('data-skin');
      root.classList.remove('skin-polished');
    };
  }, [role]);
}
