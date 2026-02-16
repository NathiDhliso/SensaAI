/**
 * CoachInterventionBanner — Enhancement D
 *
 * Dismissible smart-coaching banner. Trigger rules are evaluated in
 * VelocityLearning.tsx which sets `type` + optional `onPrimary`/`onSecondary`.
 */
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertTriangle,
    Coffee,
    Zap,
    TrendingDown,
    Award,
    Rocket,
    X
} from 'lucide-react';
import styles from './CoachInterventionBanner.module.css';

export type InterventionType =
    | 'diminishing_returns'
    | 'skip_streak'
    | 'low_verify'
    | 'flow_state'
    | 'near_mastery';

interface InterventionConfig {
    icon: typeof AlertTriangle;
    headline: string;
    detail: string;
    primaryLabel: string;
    secondaryLabel: string;
}

const CONFIGS: Record<InterventionType, InterventionConfig> = {
    diminishing_returns: {
        icon: Coffee,
        headline: 'Diminishing Returns Detected',
        detail: 'You\'ve been studying for 90+ minutes. Cognitive research shows breaks boost retention.',
        primaryLabel: 'Take a break',
        secondaryLabel: 'Open Gym instead'
    },
    skip_streak: {
        icon: AlertTriangle,
        headline: 'Multiple Skips Detected',
        detail: 'You\'ve skipped 3 concepts in a row. Would you like to drop to an easier tier?',
        primaryLabel: 'Drop tier',
        secondaryLabel: 'Keep going'
    },
    low_verify: {
        icon: TrendingDown,
        headline: 'Low Verify Scores',
        detail: '3 recent verify scores are below 40%. Rebuilding connections might help.',
        primaryLabel: 'Back to Map',
        secondaryLabel: 'Continue'
    },
    flow_state: {
        icon: Zap,
        headline: 'You\'re in Flow! 🔥',
        detail: '3 S-grades in a row — you\'re crushing it. Keep the momentum going!',
        primaryLabel: 'Let\'s go!',
        secondaryLabel: ''
    },
    near_mastery: {
        icon: Award,
        headline: 'Almost There!',
        detail: 'You\'re 2 sessions from full mastery. One final push?',
        primaryLabel: 'Push through',
        secondaryLabel: 'Save for later'
    }
};

interface CoachInterventionBannerProps {
    type: InterventionType;
    onPrimary: () => void;
    onSecondary?: () => void;
    onDismiss: () => void;
}

export function CoachInterventionBanner({
    type,
    onPrimary,
    onSecondary,
    onDismiss
}: CoachInterventionBannerProps) {
    const config = CONFIGS[type];
    const Icon = config.icon;

    return (
        <AnimatePresence>
            <motion.div
                className={styles.container}
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
            >
                <Icon size={20} className={styles.icon} />
                <div className={styles.body}>
                    <span className={styles.headline}>{config.headline}</span>
                    <span className={styles.detail}>{config.detail}</span>
                    <div className={styles.actions}>
                        <button className={styles.primaryAction} onClick={onPrimary}>
                            <Rocket size={14} style={{ marginRight: 4 }} />
                            {config.primaryLabel}
                        </button>
                        {config.secondaryLabel && onSecondary && (
                            <button className={styles.secondaryAction} onClick={onSecondary}>
                                {config.secondaryLabel}
                            </button>
                        )}
                    </div>
                </div>
                <button className={styles.dismiss} onClick={onDismiss} aria-label="Dismiss">
                    <X size={16} />
                </button>
            </motion.div>
        </AnimatePresence>
    );
}

export default CoachInterventionBanner;
