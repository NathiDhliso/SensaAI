import { useEffect } from 'react';

/**
 * Hook that listens for Escape key press
 */
export function useEscapeKey(handler: () => void, enabled: boolean = true) {
    useEffect(() => {
        if (!enabled) return;

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                handler();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [handler, enabled]);
}
