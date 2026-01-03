/**
 * useRegenerateDialog - Hook for managing regenerate dialog state
 */

import { useState } from 'react';

export interface UseRegenerateDialogResult {
    isOpen: boolean;
    isRegenerating: boolean;
    open: () => void;
    close: () => void;
    handleConfirm: (regenerateFn: () => Promise<void>) => Promise<void>;
}

/**
 * Hook for managing regenerate dialog state
 */
export function useRegenerateDialog(): UseRegenerateDialogResult {
    const [isOpen, setIsOpen] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);

    const open = () => setIsOpen(true);
    const close = () => {
        if (!isRegenerating) {
            setIsOpen(false);
        }
    };

    const handleConfirm = async (regenerateFn: () => Promise<void>) => {
        setIsRegenerating(true);
        try {
            await regenerateFn();
            setIsOpen(false);
        } finally {
            setIsRegenerating(false);
        }
    };

    return {
        isOpen,
        isRegenerating,
        open,
        close,
        handleConfirm,
    };
}
