'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/lib/theme-store';

export default function ThemeInitializer() {
  const loadPreferences = useThemeStore((s) => s.loadPreferences);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return null;
}
