import { useState, useEffect, useCallback } from 'react';
import { COLOUR_SCHEMES } from '../types';
import type { ColourSchemeConfig } from '../types';

export function useColourScheme(initialScheme: string = 'green') {
  const [schemeName, setSchemeName] = useState(initialScheme);
  const [customColour, setCustomColour] = useState('#ff0066');

  const getSchemeConfig = useCallback((): ColourSchemeConfig => {
    if (schemeName === 'custom') {
      return {
        name: 'Custom',
        primary: customColour,
        primaryDim: adjustBrightness(customColour, -20),
        primaryBright: adjustBrightness(customColour, 30),
        background: '#0a0a0a',
        backgroundLight: '#141414',
      };
    }
    return COLOUR_SCHEMES[schemeName] || COLOUR_SCHEMES.green;
  }, [schemeName, customColour]);

  useEffect(() => {
    const config = getSchemeConfig();
    const root = document.documentElement;
    root.style.setProperty('--primary', config.primary);
    root.style.setProperty('--primary-dim', config.primaryDim);
    root.style.setProperty('--primary-bright', config.primaryBright);
    root.style.setProperty('--bg', config.background);
    root.style.setProperty('--bg-light', config.backgroundLight);
  }, [getSchemeConfig]);

  return { schemeName, setSchemeName, customColour, setCustomColour, getSchemeConfig };
}

function adjustBrightness(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}
