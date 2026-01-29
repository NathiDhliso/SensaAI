import { useEffect, useCallback } from 'react';

type KeyMapping = Record<string, number | boolean | 'A' | 'B'>;

interface UseQuizKeyboardOptions<T> {
  enabled: boolean;
  keyMap: KeyMapping;
  onKeyAction: (value: T) => void;
}

export function useQuizKeyboard<T extends number | boolean | 'A' | 'B'>({
  enabled,
  keyMap,
  onKeyAction,
}: UseQuizKeyboardOptions<T>): void {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    const key = e.key.toLowerCase();
    const value = keyMap[key];

    if (value !== undefined) {
      e.preventDefault();
      onKeyAction(value as T);
    }
  }, [enabled, keyMap, onKeyAction]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
}

export const QUIZ_KEY_MAPS = {
  yesNo: {
    'y': true,
    'n': false,
    '1': true,
    '2': false,
  } as KeyMapping,

  abChoice: {
    'a': 'A',
    'b': 'B',
    '1': 'A',
    '2': 'B',
  } as KeyMapping,

  multipleChoice: {
    '1': 0,
    '2': 1,
    '3': 2,
    '4': 3,
    'a': 0,
    'b': 1,
    'c': 2,
    'd': 3,
  } as KeyMapping,
};
