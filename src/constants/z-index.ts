/**
 * Z-Index Scale
 * 
 * Centralized z-index values to prevent layering conflicts.
 * Use these constants instead of arbitrary z-index values.
 * 
 * Usage:
 * import { Z_INDEX } from '@/constants/z-index';
 * style={{ zIndex: Z_INDEX.MODAL }}
 */

export const Z_INDEX = {
    /** Base layer - default stacking context */
    BASE: 1,

    /** Dropdowns, popovers, tooltips */
    DROPDOWN: 10,

    /** Sticky elements (headers, sidebars) */
    STICKY: 20,

    /** Fixed position elements */
    FIXED: 50,

    /** Overlays, backdrops */
    OVERLAY: 100,

    /** Modals, dialogs */
    MODAL: 1000,

    /** Tooltips (should appear above modals) */
    TOOLTIP: 10000,

    /** Notifications, toasts (highest priority) */
    NOTIFICATION: 100000,
} as const;

export type ZIndexKey = keyof typeof Z_INDEX;
export type ZIndexValue = typeof Z_INDEX[ZIndexKey];
