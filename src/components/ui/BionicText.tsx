/**
 * BionicText Component
 * 
 * Renders text with the first half of each word bolded for improved readability.
 * Based on Bionic Reading methodology to guide the eye through text.
 */

import React, { useMemo } from 'react';
import { usePersonalizationStore } from '@/store/personalization-store';

interface BionicTextProps {
    children: string;
    className?: string;
}

/**
 * Apply bionic reading formatting to a single word
 */
function formatWord(word: string): React.ReactElement {
    if (word.length <= 1) {
        return <span key={Math.random()}>{word}</span>;
    }

    // Bold the first half of the word (rounded up)
    const splitPoint = Math.ceil(word.length / 2);
    const boldPart = word.slice(0, splitPoint);
    const normalPart = word.slice(splitPoint);

    return (
        <span key={Math.random()}>
            <strong>{boldPart}</strong>{normalPart}
        </span>
    );
}

/**
 * BionicText component - conditionally applies bionic reading based on user preference
 */
export function BionicText({ children, className }: BionicTextProps) {
    const bionicReading = usePersonalizationStore(state => state.bionicReading);

    const formattedText = useMemo(() => {
        if (!bionicReading || !children) {
            return children;
        }

        // Split by whitespace while preserving it
        const parts = children.split(/(\s+)/);

        return parts.map((part, index) => {
            // If it's whitespace, return as-is
            if (/^\s+$/.test(part)) {
                return <span key={index}>{part}</span>;
            }

            // Otherwise, format the word
            return formatWord(part);
        });
    }, [children, bionicReading]);

    return <span className={className}>{formattedText}</span>;
}

export default BionicText;
