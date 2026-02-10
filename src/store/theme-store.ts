import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export type Theme = 'light' | 'dark' | 'system';
export type VisualTheme = 'playful' | 'scholarly';
type ThemeState = {
 theme: Theme;
 resolvedTheme: 'light' | 'dark';
 visualTheme: VisualTheme;
};
type ThemeActions = {
 setTheme: (theme: Theme) => void;
 setVisualTheme: (visualTheme: VisualTheme) => void;
 initializeTheme: () => void;
};
const getSystemTheme = (): 'light' | 'dark' => {
 if (typeof window === 'undefined') return 'light';
 return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};
const applyTheme = (resolvedTheme: 'light' | 'dark') => {
 if (typeof document === 'undefined') return;
 const root = document.documentElement;
 if (resolvedTheme === 'dark') {
 root.classList.add('dark');
 root.setAttribute('data-theme', 'dark');
 } else {
 root.classList.remove('dark');
 root.setAttribute('data-theme', 'light');
 }
};
const applyVisualTheme = (visualTheme: VisualTheme) => {
 if (typeof document === 'undefined') return;
 document.documentElement.setAttribute('data-visual-theme', visualTheme);
};
export const useThemeStore = create<ThemeState & ThemeActions>()(
 persist(
 (set, get) => ({
 theme: 'system',
 resolvedTheme: 'light',
 visualTheme: 'playful',
 setTheme: (theme) => {
 const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;
 applyTheme(resolvedTheme);
 set({ theme, resolvedTheme });
 },
 setVisualTheme: (visualTheme) => {
 applyVisualTheme(visualTheme);
 set({ visualTheme });
 },
 initializeTheme: () => {
 const { theme, visualTheme } = get();
 const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;
 applyTheme(resolvedTheme);
 applyVisualTheme(visualTheme);
 set({ resolvedTheme });
 // Listen for system theme changes
 if (typeof window !== 'undefined') {
 const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
 const handleChange = () => {
 const currentTheme = get().theme;
 if (currentTheme === 'system') {
 const newResolved = getSystemTheme();
 applyTheme(newResolved);
 set({ resolvedTheme: newResolved });
 }
 };
 mediaQuery.addEventListener('change', handleChange);
 }
 }
 }),
 {
 name: 'sensa-theme-storage',
 partialize: (state) => ({ theme: state.theme, visualTheme: state.visualTheme }),
 onRehydrateStorage: () => (state) => {
 if (state) {
 const resolvedTheme = state.theme === 'system' ? getSystemTheme() : state.theme;
 applyTheme(resolvedTheme);
 applyVisualTheme(state.visualTheme ?? 'playful');
 state.resolvedTheme = resolvedTheme;
 }
 }
 }
 )
);
// Initialize theme on module load
if (typeof window !== 'undefined') {
 // Small delay to ensure store is hydrated
 setTimeout(() => {
 useThemeStore.getState().initializeTheme();
 }, 0);
}
