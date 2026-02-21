import { create } from 'zustand';

interface SidebarState {
  isOpen: boolean;
  isCompact: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  toggleCompact: () => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isOpen: false,
  isCompact: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  toggleCompact: () => set((s) => ({ isCompact: !s.isCompact })),
}));
