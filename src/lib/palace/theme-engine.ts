export type RoomTheme = 'Factory' | 'Library' | 'Garden' | 'Laboratory' | 'Studio' | 'Default';

export interface ThemeConfig {
    name: RoomTheme;
    colors: {
        background: string;
        border: string;
        accent: string;
    };
    pattern: string; // SVG pattern or CSS keyword
}

export function getThemeForSubject(subject: string): RoomTheme {
    const s = subject.toLowerCase();

    if (s.includes('history') || s.includes('law') || s.includes('literature') || s.includes('philosophy')) {
        return 'Library';
    }
    if (s.includes('biology') || s.includes('chemistry') || s.includes('physics') || s.includes('science')) {
        return 'Laboratory';
    }
    if (s.includes('engineering') || s.includes('computer') || s.includes('tech') || s.includes('math')) {
        return 'Factory';
    }
    if (s.includes('art') || s.includes('music') || s.includes('design')) {
        return 'Studio';
    }
    if (s.includes('psychology') || s.includes('sociology') || s.includes('health')) {
        return 'Garden';
    }

    return 'Default';
}

export const THEMES: Record<RoomTheme, ThemeConfig> = {
    Factory: {
        name: 'Factory',
        colors: { background: '#f1f5f9', border: '#94a3b8', accent: '#64748b' },
        pattern: 'blueprint'
    },
    Library: {
        name: 'Library',
        colors: { background: '#fffbeb', border: '#b45309', accent: '#92400e' },
        pattern: 'dark-wood'
    },
    Laboratory: {
        name: 'Laboratory',
        colors: { background: '#f0f9ff', border: '#0ea5e9', accent: '#0284c7' },
        pattern: 'graph-paper'
    },
    Garden: {
        name: 'Garden',
        colors: { background: '#f0fdf4', border: '#22c55e', accent: '#16a34a' },
        pattern: 'leaf'
    },
    Studio: {
        name: 'Studio',
        colors: { background: '#faf5ff', border: '#a855f7', accent: '#9333ea' },
        pattern: 'abstract'
    },
    Default: {
        name: 'Default',
        colors: { background: '#ffffff', border: '#e2e8f0', accent: '#64748b' },
        pattern: 'none'
    }
};
