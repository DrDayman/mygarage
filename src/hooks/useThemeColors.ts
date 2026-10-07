import { useEffect, useState } from 'react';

export interface ThemeColors {
  accent: string;
  line: string;
  ink: string;
  ink2: string;
  ink3: string;
  surface: string;
  surface2: string;
}

function read(): ThemeColors {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    accent: v('--accent', '#0b6a73'),
    line: v('--line', '#d9dcd6'),
    ink: v('--ink', '#15181a'),
    ink2: v('--ink-2', '#41474c'),
    ink3: v('--ink-3', '#6b7176'),
    surface: v('--surface', '#fbfbfa'),
    surface2: v('--surface-2', '#f3f4f1'),
  };
}

/**
 * Resolved design-token colours for Recharts, which writes colours into SVG
 * attributes where CSS variables aren't reliable. Re-reads on light/dark changes.
 */
export function useThemeColors(): ThemeColors {
  const [colors, setColors] = useState(read);

  useEffect(() => {
    const update = () => setColors(read());
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    media?.addEventListener?.('change', update);
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    return () => {
      media?.removeEventListener?.('change', update);
      observer.disconnect();
    };
  }, []);

  return colors;
}
