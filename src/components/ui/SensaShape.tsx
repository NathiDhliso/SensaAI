import { forwardRef } from 'react';
import styles from './SensaShape.module.css';

import type { SensaShapeType, SensaShapeSize } from './SensaShape.types';

export type { SensaShapeType, SensaShapeSize };

export interface SensaShapeProps {
    /** The geometric shape type to render */
    type: SensaShapeType;
    /** Size preset: sm (16px) to 2xl (48px) */
    size?: SensaShapeSize;
    /** Whether to enable subtle ambient animation (default: true) */
    animate?: boolean;
    /** Additional CSS classes */
    className?: string;
    /** Accessibility label */
    'aria-label'?: string;
}

// ============================================
// COMPONENT
// ============================================
export const SensaShape = forwardRef<HTMLDivElement, SensaShapeProps>(
    (
        {
            type,
            size = 'md',
            animate = true,
            className = '',
            'aria-label': ariaLabel,
            ...rest
        },
        ref
    ) => {
        const classNames = [
            styles.shapeWrapper,
            styles[`size${size.charAt(0).toUpperCase() + size.slice(1)}`],
            animate && styles.animate,
            className
        ].filter(Boolean).join(' ');

        return (
            <div
                ref={ref}
                className={classNames}
                role="img"
                aria-label={ariaLabel || `Symbol for ${type}`}
                {...rest}
            >
                <div className={styles[type]} />
            </div>
        );
    }
);

SensaShape.displayName = 'SensaShape';
