import { create } from 'zustand';

export type AccentColor = 'indigo' | 'emerald' | 'rose' | 'amber' | 'cyan' | 'violet' | 'blue' | 'orange';

const ACCENT_HSL: Record<AccentColor, string> = {
  indigo: '239 84% 67%',
  emerald: '160 84% 39%',
  rose: '346 77% 50%',
  amber: '38 92% 50%',
  cyan: '189 94% 43%',
  violet: '263 70% 50%',
  blue: '217 91% 60%',
  orange: '25 95% 53%',
};

interface ThemeState {
  accent: AccentColor;
  fontSize: 'sm' | 'base' | 'lg';
  setAccent: (accent: AccentColor) => void;
  setFontSize: (size: 'sm' | 'base' | 'lg') => void;
  applyAccent: () => void;
  loadPreferences: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  accent: 'indigo',
  fontSize: 'base',

  setAccent: (accent) => {
    set({ accent });
    if (typeof window !== 'undefined') {
      localStorage.setItem('dt-accent', accent);
    }
    get().applyAccent();
  },

  setFontSize: (fontSize) => {
    set({ fontSize });
    if (typeof window !== 'undefined') {
      localStorage.setItem('dt-font-size', fontSize);
      document.documentElement.classList.remove('text-sm', 'text-base', 'text-lg');
      document.documentElement.classList.add(`text-${fontSize}`);
    }
  },

  applyAccent: () => {
    const { accent } = get();
    if (typeof window !== 'undefined') {
      const hsl = ACCENT_HSL[accent];
      document.documentElement.style.setProperty('--primary', hsl);
      document.documentElement.style.setProperty('--ring', hsl);
    }
  },

  loadPreferences: () => {
    if (typeof window === 'undefined') return;
    const savedAccent = localStorage.getItem('dt-accent') as AccentColor | null;
    const savedFontSize = localStorage.getItem('dt-font-size') as 'sm' | 'base' | 'lg' | null;

    if (savedAccent && ACCENT_HSL[savedAccent]) {
      set({ accent: savedAccent });
      const hsl = ACCENT_HSL[savedAccent];
      document.documentElement.style.setProperty('--primary', hsl);
      document.documentElement.style.setProperty('--ring', hsl);
    }

    if (savedFontSize && ['sm', 'base', 'lg'].includes(savedFontSize)) {
      set({ fontSize: savedFontSize });
      document.documentElement.classList.remove('text-sm', 'text-base', 'text-lg');
      document.documentElement.classList.add(`text-${savedFontSize}`);
    }
  },
}));

export const ACCENT_COLORS: { value: AccentColor; label: string; class: string }[] = [
  { value: 'indigo', label: 'Indigo', class: 'bg-indigo-500' },
  { value: 'blue', label: 'Mavi', class: 'bg-blue-500' },
  { value: 'violet', label: 'Mor', class: 'bg-violet-500' },
  { value: 'rose', label: 'Gül', class: 'bg-rose-500' },
  { value: 'emerald', label: 'Yeşil', class: 'bg-emerald-500' },
  { value: 'cyan', label: 'Cyan', class: 'bg-cyan-500' },
  { value: 'amber', label: 'Amber', class: 'bg-amber-500' },
  { value: 'orange', label: 'Turuncu', class: 'bg-orange-500' },
];
