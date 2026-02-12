# Styling Specifications

**Last Updated:** February 12, 2026
**Status:** MANDATORY — All CSS must follow these rules.

---

## Rule #1: No Hardcoded Colors in Component CSS

The ONLY file that may contain raw hex/rgb values is `src/index.css`.
Every `.module.css` file must use CSS variables exclusively.

```css
/* FORBIDDEN in any .module.css file */
color: #6B46C1;
background: rgb(107, 70, 193);
border: 1px solid rgba(0, 0, 0, 0.1);
box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

/* CORRECT — always use variables */
color: var(--color-accent);
background: var(--overlay-primary-10);
border: 1px solid var(--color-border-light);
box-shadow: var(--shadow-md);
```

**Why:** The app supports 4 theme combinations (Playful Light, Playful Dark, Scholarly Light, Scholarly Dark). Hardcoded values break theme switching.

---

## CSS Variable Catalog

### Text Colors
| Variable | Light Mode | Usage |
|----------|-----------|-------|
| `--color-text-dark` | `#111827` | Primary headings, body text |
| `--color-text-medium` | `#374151` | Secondary text |
| `--color-text-light` | `#4B5563` | Tertiary text |
| `--color-text-muted` | `#6B7280` | Captions, placeholders |
| `--color-text-on-accent` | `#ffffff` | Text on accent-colored backgrounds |
| `--color-text-on-success` | `#ffffff` | Text on success-colored backgrounds |
| `--color-text-operator` | `rgba(0,0,0,0.3)` | Decorative operators, dividers |

### Background Colors
| Variable | Light Mode | Usage |
|----------|-----------|-------|
| `--color-bg-primary` | `#F3F0EB` | Page background |
| `--color-bg-secondary` | `#EADFD0` | Secondary sections |
| `--color-bg-tertiary` | `#E5E7EB` | Tertiary areas |
| `--color-bg-neutral` | `#E2E8F0` | Neutral panels |

### Surface Colors (Cards, Panels)
| Variable | Light Mode | Usage |
|----------|-----------|-------|
| `--color-surface` | `#FFFFFF` | Card backgrounds |
| `--color-surface-elevated` | `#FFFFFF` | Elevated cards, modals |
| `--color-surface-subtle` | `#F9FAFB` | Subtle card variant |
| `--color-surface-secondary` | `#F7F5FA` | Secondary surface |
| `--color-surface-hover` | `#F2F4F7` | Hover state |

### Border Colors
| Variable | Light Mode | Usage |
|----------|-----------|-------|
| `--color-border` | `#9CA3AF` | Default borders |
| `--color-border-light` | `#D1D5DB` | Subtle borders |
| `--color-border-emphasis` | `#6B7280` | Emphasized borders |
| `--color-border-hover` | = emphasis | Hover state borders |

### Accent Colors
| Variable | Light Mode | Usage |
|----------|-----------|-------|
| `--color-accent` | `#6B46C1` | Primary accent (amethyst) |
| `--color-accent-hover` | `#553c9a` | Accent hover state |
| `--color-accent-light` | `#8b5cf6` | Lighter accent variant |
| `--color-accent-alt` | `#F59E0B` | Secondary accent (amber) |

### Semantic Colors
| Variable | Usage |
|----------|-------|
| `--color-success` / `--color-success-bg` / `--color-success-border` / `--color-success-text` | Correct answers, passed states |
| `--color-warning` / `--color-warning-bg` / `--color-warning-border` / `--color-warning-text` | Caution, pitfalls, timer warnings |
| `--color-error` / `--color-error-bg` / `--color-error-border` / `--color-error-text` | Errors, failed states |
| `--color-info` / `--color-info-bg` / `--color-info-border` / `--color-info-text` | Informational highlights |

### Tier Colors
| Variable | Usage |
|----------|-------|
| `--color-trunk` | Trunk-tier badges, borders, icons |
| `--color-branch` | Branch-tier badges, borders, icons |
| `--color-leaf` | Leaf-tier badges, borders, icons |

### Bloom's Taxonomy Colors
| Variable | Cognitive Level |
|----------|----------------|
| `--color-bloom-remember` | Remember |
| `--color-bloom-understand` | Understand |
| `--color-bloom-apply` | Apply |
| `--color-bloom-analyze` | Analyze |
| `--color-bloom-evaluate` | Evaluate |
| `--color-bloom-create` | Create |

### Overlay Colors (Transparent Tints)
Use these for subtle backgrounds, hover states, and gradients:
```
--overlay-primary-5   (5% amethyst)
--overlay-primary-10  (10% amethyst)
--overlay-primary-15  (15% amethyst)
--overlay-accent-5/10/15
--overlay-sage-5/10
--overlay-amber-5/10/20
--overlay-white-10/20/30/40/50/60/80
--overlay-black-40/60
```

### Shadows
| Variable | Usage |
|----------|-------|
| `--shadow-sm` | Subtle elevation |
| `--shadow-md` | Cards, dropdowns |
| `--shadow-lg` | Modals, floating panels |
| `--shadow-xl` | Hero elements |
| `--shadow-glow-primary` | Accent glow (buttons) |
| `--shadow-glow-primary-hover` | Accent glow hover |
| `--shadow-glow-sage` | Success glow |
| `--shadow-glow-amber` | Warning glow |

### Spacing
Use `--spacing-{n}` variables: `0, px, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32`

### Border Radius
Use `--radius-{size}` variables: `sm, md, lg, xl, 2xl, 3xl, full`

### Typography
| Variable | Value | Usage |
|----------|-------|-------|
| `--font-display` | Plus Jakarta Sans | Headings, titles |
| `--font-body` | Source Sans 3 | Body text, UI elements |
| `--font-mono` | JetBrains Mono | Code snippets |
| `--font-size-xs` through `--font-size-5xl` | 0.75rem – 3rem | Font scale |

### Z-Index
| Variable | Value | Usage |
|----------|-------|-------|
| `--z-base` | 1 | Default stacking |
| `--z-dropdown` | 100 | Dropdowns |
| `--z-sticky` | 200 | Sticky headers |
| `--z-fixed` | 300 | Fixed elements |
| `--z-modal-backdrop` | 400 | Modal backdrops |
| `--z-modal` | 500 | Modals |
| `--z-popover` | 600 | Popovers |
| `--z-tooltip` | 700 | Tooltips |
| `--z-toast` | 2000 | Toast notifications |

---

## Theme System

SensaPBL supports 4 theme combinations:

| Theme | Mode | Data Attributes |
|-------|------|----------------|
| Playful Light | Default | (no attributes) |
| Playful Dark | `[data-theme="dark"]` or `.dark` | Dark backgrounds |
| Scholarly Light | `[data-visual-theme="scholarly"]` | Institutional, restrained |
| Scholarly Dark | Both attributes | Scholarly + dark |

### Scholarly Mode Overrides in Component CSS

When a component needs scholarly-specific styling, use `:global()`:

```css
:global([data-visual-theme="scholarly"]) .myCard {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}
```

### Key files
- **Variable definitions:** `src/index.css`
- **Theme store:** `src/store/theme-store.ts`
- **Theme hook:** `src/shared/hooks/useVisualTheme.ts` — provides `isScholarly`, `stripEmoji()`, `scholarlyLabel()`
- **Graph colors:** `src/shared/constants/theme-colors.ts` — `getGraphColors()`
- **Full spec:** `docs/VISUAL_THEME_SYSTEM.md`

---

## CSS Module Conventions

- **File naming:** `ComponentName.module.css`
- **Class naming:** camelCase (`.phaseCard`, `.sectionHeader`)
- **No `!important`** unless overriding third-party styles
- **No inline styles** in TSX unless truly dynamic (e.g., computed positions)
- **Responsive:** Mobile-first, use `@media (min-width: ...)` for larger screens
- **Animations:** Use `framer-motion` for JS-driven animation, CSS `@keyframes` for simple transitions

---

## Validation Script

Run this to find hardcoded color violations:
```powershell
scripts/check-hardcoded-colors.ps1
scripts/check-css-var-prefixes.ps1
```
