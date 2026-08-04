"use client";

import { create } from "zustand";

interface SidebarState {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  toggle: () => void;
  toggleMobile: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isCollapsed: false,
  isMobileOpen: false,
  toggle: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
  toggleMobile: () => set((state) => ({ isMobileOpen: !state.isMobileOpen })),
  setCollapsed: (collapsed) => set({ isCollapsed: collapsed }),
}));

interface AppState {
  currentClinicId: string | null;
  setCurrentClinicId: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentClinicId: null,
  setCurrentClinicId: (id) => set({ currentClinicId: id }),
}));
