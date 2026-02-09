import { create } from 'zustand';
interface UIState {
 isSettingsPanelOpen: boolean;
 openSettingsPanel: () => void;
 closeSettingsPanel: () => void;
 toggleSettingsPanel: () => void;
}
export const useUIStore = create<UIState>((set) => ({
 isSettingsPanelOpen: false,
 openSettingsPanel: () => set({ isSettingsPanelOpen: true }),
 closeSettingsPanel: () => set({ isSettingsPanelOpen: false }),
 toggleSettingsPanel: () => set((state) => ({ isSettingsPanelOpen: !state.isSettingsPanelOpen }))
}));