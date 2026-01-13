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
    /** Base layer - default stacking context (CSS: var(--z-base)) */
    BASE: 1,

    /** Dropdowns, popovers (CSS: var(--z-dropdown)) */
    DROPDOWN: 100,

    /** Sticky elements (headers, sidebars) (CSS: var(--z-sticky)) */
    STICKY: 200,

    /** Fixed position elements (CSS: var(--z-fixed)) */
    FIXED: 300,

    /** Learning equation tracker overlay */
    EQUATION_TRACKER: 350,

    /** Modal backdrops (CSS: var(--z-modal-backdrop)) */
    MODAL_BACKDROP: 400,

    /** Modals, dialogs (CSS: var(--z-modal)) */
    MODAL: 500,

    /** Popovers (CSS: var(--z-popover)) */
    POPOVER: 600,

    /** Tooltips (CSS: var(--z-tooltip)) */
    TOOLTIP: 700,

    /** Overlays (CSS: var(--z-overlay)) */
    OVERLAY: 1000,

    /** Notifications, toasts (CSS: var(--z-toast)) */
    TOAST: 2000,

    /** Maximum z-index (CSS: var(--z-max)) */
    MAX: 9999,
} as const;

export type ZIndexKey = keyof typeof Z_INDEX;
export type ZIndexValue = typeof Z_INDEX[ZIndexKey];
