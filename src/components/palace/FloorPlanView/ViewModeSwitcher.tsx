/**
 * ViewModeSwitcher - Toggle between Mind Palace view modes
 * 
 * Provides a UI control to switch between:
 * - Exterior (Street View)
 * - Interior (Floor Plan)
 * - Graph (Dependency visualization)
 */

import { motion } from 'framer-motion';
import { Map, Grid3X3, GitBranch } from 'lucide-react';
import styles from './ViewModeSwitcher.module.css';

export type ViewMode = 'exterior' | 'interior' | 'graph';

export interface ViewModeSwitcherProps {
    /** Current active view mode */
    currentMode: ViewMode;
    /** Callback when mode changes */
    onModeChange: (mode: ViewMode) => void;
    /** Whether mode switching is currently disabled (e.g., during transition) */
    isDisabled?: boolean;
    /** View modes to show (hide unavailable modes) */
    availableModes?: ViewMode[];
}

/**
 * Mode button configuration
 */
const MODE_CONFIG: Record<ViewMode, { icon: typeof Map; label: string; description: string }> = {
    exterior: {
        icon: Map,
        label: 'Exterior',
        description: 'Street View entrance',
    },
    interior: {
        icon: Grid3X3,
        label: 'Floor Plan',
        description: 'Blueprint interior',
    },
    graph: {
        icon: GitBranch,
        label: 'Graph',
        description: 'Dependency network',
    },
};

/**
 * ViewModeSwitcher component
 */
export function ViewModeSwitcher({
    currentMode,
    onModeChange,
    isDisabled = false,
    availableModes = ['exterior', 'interior', 'graph'],
}: ViewModeSwitcherProps) {
    return (
        <div className={styles.switcherContainer}>
            <div className={styles.buttonGroup}>
                {availableModes.map((mode) => {
                    const config = MODE_CONFIG[mode];
                    const Icon = config.icon;
                    const isActive = mode === currentMode;

                    return (
                        <motion.button
                            key={mode}
                            className={`${styles.modeButton} ${isActive ? styles.active : ''}`}
                            onClick={() => !isDisabled && onModeChange(mode)}
                            disabled={isDisabled}
                            whileHover={isDisabled ? {} : { scale: 1.02 }}
                            whileTap={isDisabled ? {} : { scale: 0.98 }}
                            title={config.description}
                        >
                            <Icon size={18} className={styles.icon} />
                            <span className={styles.label}>{config.label}</span>

                            {/* Active indicator */}
                            {isActive && (
                                <motion.div
                                    className={styles.activeIndicator}
                                    layoutId="viewModeIndicator"
                                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                />
                            )}
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}

export default ViewModeSwitcher;
