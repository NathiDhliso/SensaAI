import { useThemeStore } from '@/store/theme-store';

const EMOJI_REGEX = /\p{Emoji_Presentation}|\p{Extended_Pictographic}|\u200D|\uFE0F/gu;

export function useVisualTheme() {
 const visualTheme = useThemeStore((s) => s.visualTheme);
 const isScholarly = visualTheme === 'scholarly';

 return { visualTheme, isScholarly };
}

export function stripEmoji(text: string): string {
 return text.replace(EMOJI_REGEX, '').replace(/\s{2}/g, ' ').trim();
}

export function scholarlyLabel(playfulText: string, scholarlyText: string, isScholarly: boolean): string {
 return isScholarly ? scholarlyText : playfulText;
}
