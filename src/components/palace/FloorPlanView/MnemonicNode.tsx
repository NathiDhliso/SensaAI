/**
 * MnemonicNode Component - Emoji-based concept marker
 * 
 * Renders a concept as an emoji within a treemap rectangle.
 * States: Default (emoji only) → Hover (emoji + anchor name) → Click (full story)
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TreemapPosition } from '@/lib/generation/floor-plan-generator';
import type { LearningConcept, MnemonicContext } from '@/lib/types/learning';

export interface MnemonicNodeProps {
    concept: LearningConcept;
    position: TreemapPosition;
    canvasSize: { width: number; height: number };
    isSelected?: boolean;
    onClick?: () => void;
    animationDelay?: number;
}

/**
 * Extract emoji from anchor string (e.g., "Volcano 🌋" → "🌋")
 */
function extractEmoji(anchor: string): string {
    const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
    const matches = anchor.match(emojiRegex);
    return matches?.[0] || '📦'; // Default fallback emoji
}

/**
 * Extract anchor name without emoji (e.g., "Volcano 🌋" → "Volcano")
 */
function extractAnchorName(anchor: string): string {
    const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
    return anchor.replace(emojiRegex, '').trim();
}

/**
 * Get tier-based font size for emoji
 */
function getEmojiSize(tier: MnemonicContext['tier'] | undefined, nodeWidth: number): number {
    const baseSize = Math.min(nodeWidth * 0.4, 48);
    switch (tier) {
        case 'Foundation': return Math.max(baseSize, 32);
        case 'Keystone': return Math.max(baseSize * 0.8, 24);
        case 'Utility': return Math.max(baseSize * 0.6, 18);
        default: return 24;
    }
}

/**
 * Get tier-based stroke color
 */
function getTierColor(tier: MnemonicContext['tier'] | undefined): string {
    switch (tier) {
        case 'Foundation': return 'rgba(16, 185, 129, 0.6)'; // Sage/green
        case 'Keystone': return 'rgba(139, 92, 246, 0.6)'; // Purple
        case 'Utility': return 'rgba(245, 158, 11, 0.5)'; // Amber
        default: return 'rgba(107, 114, 128, 0.5)';
    }
}

/**
 * MnemonicNode renders a concept as an interactive emoji rectangle.
 */
export function MnemonicNode({
    concept,
    position,
    canvasSize,
    isSelected,
    onClick,
    animationDelay = 0,
}: MnemonicNodeProps) {
    const [isHovered, setIsHovered] = useState(false);

    // Convert normalized position to pixels
    const x = position.x * canvasSize.width;
    const y = position.y * canvasSize.height;
    const width = position.width * canvasSize.width;
    const height = position.height * canvasSize.height;

    // Extract mnemonic data
    const mnemonic = concept.mnemonic;
    const emoji = useMemo(
        () => mnemonic?.anchor ? extractEmoji(mnemonic.anchor) : '📦',
        [mnemonic?.anchor]
    );
    const anchorName = useMemo(
        () => mnemonic?.anchor ? extractAnchorName(mnemonic.anchor) : concept.name.charAt(0),
        [mnemonic?.anchor, concept.name]
    );

    const tier = mnemonic?.tier;
    const emojiSize = getEmojiSize(tier, width);
    const tierColor = getTierColor(tier);

    // Center position for emoji
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    return (
        <motion.g
            layoutId={`concept-${concept.id}`}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{
                duration: 0.4,
                delay: animationDelay,
                type: 'spring',
                stiffness: 200,
                damping: 20,
            }}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={onClick}
        >
            {/* Node rectangle */}
            <motion.rect
                x={x}
                y={y}
                width={width}
                height={height}
                rx="6"
                ry="6"
                fill={isSelected ? 'rgba(139, 92, 246, 0.2)' : 'rgba(30, 30, 50, 0.8)'}
                stroke={isSelected ? 'rgba(139, 92, 246, 0.8)' : tierColor}
                strokeWidth={isSelected ? 3 : 2}
                animate={{
                    scale: isHovered ? 1.02 : 1,
                    strokeWidth: isHovered ? 3 : 2,
                }}
                transition={{ duration: 0.15 }}
            />

            {/* Emoji */}
            <text
                x={centerX}
                y={centerY + (isHovered ? -8 : 4)}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={emojiSize}
                style={{ userSelect: 'none', pointerEvents: 'none' }}
            >
                {emoji}
            </text>

            {/* Anchor name (shown on hover) */}
            <AnimatePresence>
                {isHovered && (
                    <motion.text
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        transition={{ duration: 0.15 }}
                        x={centerX}
                        y={centerY + emojiSize / 2 + 12}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="rgba(255, 255, 255, 0.9)"
                        fontSize={Math.min(12, width / 8)}
                        fontWeight="500"
                        fontFamily="system-ui, sans-serif"
                        style={{ userSelect: 'none', pointerEvents: 'none' }}
                    >
                        {anchorName.length > 15 ? anchorName.slice(0, 15) + '...' : anchorName}
                    </motion.text>
                )}
            </AnimatePresence>

            {/* Tier indicator (small dot) */}
            <circle
                cx={x + width - 8}
                cy={y + 8}
                r="4"
                fill={tierColor}
            />
        </motion.g>
    );
}

export default MnemonicNode;
