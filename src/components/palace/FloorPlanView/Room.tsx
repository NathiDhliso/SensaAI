/**
 * Room Component - Stage boundary in Floor Plan view
 * 
 * Renders a rectangular room with blueprint-style borders
 * and stage name label.
 */

import { motion } from 'framer-motion';
import type { RoomTheme } from '@/lib/palace/theme-engine';
import themeStyles from './RoomThemes.module.css';
import styles from './Room.module.css';

export interface RoomProps {
    room: {
        id: string;
        name: string;
        x: number;      // Normalized 0-1
        y: number;      // Normalized 0-1
        width: number;  // Normalized 0-1
        height: number; // Normalized 0-1
    };
    canvasSize: { width: number; height: number };
    animationDelay?: number;
    theme?: RoomTheme;
}

/**
 * Room renders a stage boundary with blueprint styling.
 */
export function Room({ room, canvasSize, animationDelay = 0, theme = 'Default' }: RoomProps) {
    // Convert normalized coordinates to pixels
    const x = room.x * canvasSize.width;
    const y = room.y * canvasSize.height;
    const width = room.width * canvasSize.width;
    const height = room.height * canvasSize.height;

    // Padding for room border
    const padding = 8;

    return (
        <motion.g
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, delay: animationDelay }}
        >
            {/* Room background container for patterning */}
            <foreignObject x={x} y={y} width={width} height={height} style={{ overflow: 'visible' }}>
                <div
                    className={`${themeStyles.roomBase} ${theme ? themeStyles[`theme${theme}`] : ''}`}
                    style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '8px',
                        border: '2px solid currentColor' // Uses theme border color
                    }}
                />
            </foreignObject>

            {/* Legacy Room background (kept for structure, but transparent) */}
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill="none"
                stroke="none"
                rx="8"
                ry="8"
            />

            {/* Room border glow */}
            <rect
                x={x + padding}
                y={y + padding}
                width={width - padding * 2}
                height={height - padding * 2}
                fill="none"
                stroke="rgba(59, 130, 246, 0.15)"
                strokeWidth="1"
                strokeDasharray="8 4"
                rx="4"
                ry="4"
            />

            {/* Room label background */}
            <rect
                x={x + 12}
                y={y + 8}
                width={Math.min(room.name.length * 10 + 24, width - 24)}
                height="28"
                fill="rgba(0, 0, 0, 0.6)"
                rx="4"
                ry="4"
            />

            {/* Room label */}
            <text
                x={x + 24}
                y={y + 27}
                className={styles.roomLabel}
                fill="rgba(59, 130, 246, 0.9)"
                fontSize="14"
                fontWeight="600"
                fontFamily="system-ui, sans-serif"
            >
                {room.name}
            </text>

            {/* Corner decorations (blueprint style) */}
            <g stroke="rgba(59, 130, 246, 0.4)" strokeWidth="2" fill="none">
                {/* Top-left corner */}
                <path d={`M ${x + 4} ${y + 16} L ${x + 4} ${y + 4} L ${x + 16} ${y + 4}`} />
                {/* Top-right corner */}
                <path d={`M ${x + width - 16} ${y + 4} L ${x + width - 4} ${y + 4} L ${x + width - 4} ${y + 16}`} />
                {/* Bottom-left corner */}
                <path d={`M ${x + 4} ${y + height - 16} L ${x + 4} ${y + height - 4} L ${x + 16} ${y + height - 4}`} />
                {/* Bottom-right corner */}
                <path d={`M ${x + width - 16} ${y + height - 4} L ${x + width - 4} ${y + height - 4} L ${x + width - 4} ${y + height - 16}`} />
            </g>
        </motion.g>
    );
}

export default Room;
