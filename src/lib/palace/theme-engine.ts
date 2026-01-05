import { COLORS } from '@/constants/theme-colors';

export type PalaceTheme = 'blueprint' | 'warm' | 'cool' | 'nature' | 'mystic' | 'minimal';

export type RoomTheme = 'Factory' | 'Library' | 'Garden' | 'Laboratory' | 'Studio' | 'Default';

export const VISUAL_PALETTES = {
    Tech: ['shape:construct', 'shape:synapse', 'shape:bastion', 'shape:prism'],
    Nature: ['shape:seed', 'shape:sprout', 'shape:bloom', 'shape:crown'],
    Abstract: ['shape:nebula', 'shape:prism', 'shape:synapse', 'shape:bloom'],
    Structural: ['shape:bastion', 'shape:construct', 'shape:prism', 'shape:crown'],
    Default: ['shape:nebula', 'shape:synapse', 'shape:construct', 'shape:bastion', 'shape:prism']
};

export type PaletteType = keyof typeof VISUAL_PALETTES;

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
        colors: { background: COLORS.text.light, border: COLORS.text.muted, accent: COLORS.text.medium },
        pattern: 'blueprint'
    },
    Library: {
        name: 'Library',
        colors: { background: COLORS.warning, border: COLORS.secondary.amber, accent: COLORS.secondary.amber },
        pattern: 'dark-wood'
    },
    Laboratory: {
        name: 'Laboratory',
        colors: { background: COLORS.info, border: COLORS.info, accent: COLORS.info },
        pattern: 'graph-paper'
    },
    Garden: {
        name: 'Garden',
        colors: { background: COLORS.success, border: COLORS.success, accent: COLORS.secondary.sage },
        pattern: 'leaf'
    },
    Studio: {
        name: 'Studio',
        colors: { background: COLORS.primary.amethyst, border: COLORS.primary.plum, accent: COLORS.accent.default },
        pattern: 'abstract'
    },
    Default: {
        name: 'Default',
        colors: { background: '#ffffff', border: COLORS.text.muted, accent: COLORS.text.muted },
        pattern: 'none'
    }
};
