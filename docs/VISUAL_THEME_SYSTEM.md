# Visual Theme System — Requirements Document

## Introduction

The Visual Theme System adds a user preference for switching between two distinct visual styles while maintaining the existing dark/light mode functionality. This feature enables users to choose between a friendly "Playful" design (current look — ideal for younger learners) and a "Scholarly" design that evokes institutional credibility (Cambridge, Oxford, MIT) through restraint, precision, and typographic hierarchy. The system works seamlessly with both dark and light modes, creating four total visual combinations. The naming uses audience-neutral labels to frame the choice as a preference rather than a quality gradient.

## Audience Context

- **Playful** targets primary/secondary school learners who benefit from softer edges, warmer tones, emoji-rich feedback, and a more approachable interface.
- **Scholarly** targets university students and professors who expect a premium, information-dense, credible interface — no emojis, no glow effects, monochromatic tier hierarchy, single accent color, visible borders, angular shapes, and strong typographic weight contrast.

## Glossary

- **Visual_Theme_System**: The feature that manages user preferences for visual style selection
- **Playful_Theme**: The current design style with softer aesthetics, warmer tones, and approachable feel (default for new users)
- **Scholarly_Theme**: The new design style with refined typography, crisper elevation, visible structure, and academic credibility
- **Theme_Store**: The Zustand store managing theme preferences (both color mode and visual theme)
- **Theme_Attribute**: The data attribute (`data-visual-theme`) applied to the root element to control CSS overrides
- **Settings_Panel**: The UI component where users configure application preferences
- **CSS_Variables**: The design tokens defined in `index.css` that control visual appearance
- **Dark_Light_Mode**: The existing color scheme system (separate from visual theme)

## Requirements

### Requirement 1: Visual Theme State Management

**User Story:** As a user, I want my visual theme preference to be saved and persisted, so that my choice is remembered across sessions.

#### Acceptance Criteria

1. THE Theme_Store SHALL store a `visualTheme` property with type `'playful' | 'scholarly'`
2. WHEN a user changes their visual theme, THE Theme_Store SHALL update the `visualTheme` state immediately
3. WHEN the application loads, THE Theme_Store SHALL restore the user's saved visual theme from localStorage
4. WHEN a user has no saved preference (new user), THE Theme_Store SHALL default to `'playful'` to preserve the current experience
5. WHEN a user has existing data (existing user), THE Theme_Store SHALL default to `'playful'` to avoid breaking their current experience

### Requirement 2: Visual Theme Application

**User Story:** As a user, I want the visual theme to be applied consistently across the entire application, so that all components reflect my chosen style.

#### Acceptance Criteria

1. WHEN the application renders, THE Visual_Theme_System SHALL apply a `data-visual-theme` attribute to the root HTML element
2. WHEN the `visualTheme` state changes, THE Visual_Theme_System SHALL update the `data-visual-theme` attribute value
3. THE `data-visual-theme` attribute SHALL have a value of either `"playful"` or `"scholarly"`
4. WHEN `data-visual-theme` is `"playful"`, THE Visual_Theme_System SHALL apply no additional CSS overrides (current behavior)
5. WHEN `data-visual-theme` is `"scholarly"`, THE Visual_Theme_System SHALL apply scholarly CSS variable overrides

### Requirement 3: Scholarly Theme Visual Characteristics

**User Story:** As a university student or professor, I want the Scholarly theme to provide a premium, institutional-quality interface with clear visual hierarchy, so that the tool feels appropriate for serious academic work.

#### Design Psychology

Premium perception is triggered by: **Restraint** (one accent, not three), **Structure** (visible borders), **Precision** (crisp shadows vs soft glows), **Hierarchy** (strong typography weight contrast), **Breathing room** (increased padding), **Maturity** (angular 6px radius vs playful 12px+), **Credibility** (desaturated cooler tones).

#### Acceptance Criteria

1. WHEN the Scholarly_Theme is active, THE Visual_Theme_System SHALL apply crisp card elevation using precise box-shadows (`0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)`) — never glow effects
2. WHEN the Scholarly_Theme is active, THE Visual_Theme_System SHALL add visible 1px solid borders (`rgba(0,0,0,0.08)` light / `rgba(255,255,255,0.08)` dark) to cards and surfaces
3. WHEN the Scholarly_Theme is active, THE Visual_Theme_System SHALL strengthen typography hierarchy: heading weight 600, body weight 400, label weight 500, letter-spacing -0.02em, line-height 1.6
4. WHEN the Scholarly_Theme is active, THE Visual_Theme_System SHALL reduce border-radius to 4px/6px/8px (sm/md/lg) for angular, structured appearance
5. WHEN the Scholarly_Theme is active, THE Visual_Theme_System SHALL use increased content spacing for breathing room
6. WHEN the Scholarly_Theme is active, THE Visual_Theme_System SHALL use ONE accent color (`#2563EB` deep royal blue) for all interactive elements — no secondary accent colors
7. WHEN the Scholarly_Theme is active, THE Visual_Theme_System SHALL use monochromatic tier colors (Academic Blue Gradient): Trunk `#475569`, Branch `#3b4f6b`, Leaf `#2c3e5a` — hierarchy through intensity, not hue
8. WHEN the Scholarly_Theme is active, THE Visual_Theme_System SHALL use warm off-white backgrounds (`#fafaf9`) in light mode and blue-black backgrounds (`#0a0e14`) in dark mode
9. WHEN the Scholarly_Theme is active, THE Visual_Theme_System SHALL use desaturated Bloom's taxonomy colors (monochromatic slate gradient) instead of rainbow
10. WHEN the Scholarly_Theme is active, THE Visual_Theme_System SHALL refine button hover states with subtle border accent + `translateY(-1px)` lift — never glow
11. WHEN the Scholarly_Theme is active, THE Visual_Theme_System SHALL maintain WCAG AA contrast ratios for all text elements
12. WHEN the Scholarly_Theme is active, THE Visual_Theme_System SHALL strip glow effects and strong shadows under `@media print` for clean printed output
13. WHEN the Scholarly_Theme is active, THE Visual_Theme_System SHALL remove ALL glow variables (`--shadow-glow-*: none`)

### Requirement 4: Theme Independence from Dark/Light Mode

**User Story:** As a user, I want to combine visual themes with dark/light modes independently, so that I can choose my preferred combination (e.g., Scholarly + Dark).

#### Acceptance Criteria

1. THE Visual_Theme_System SHALL operate independently from the Dark_Light_Mode system
2. WHEN a user changes dark/light mode, THE Visual_Theme_System SHALL preserve the selected visual theme
3. WHEN a user changes visual theme, THE Visual_Theme_System SHALL preserve the selected dark/light mode
4. THE Scholarly_Theme CSS overrides SHALL work correctly in both light mode and dark mode
5. THE Playful_Theme SHALL work correctly in both light mode and dark mode (current behavior, no changes needed)

### Requirement 5: Settings Panel Integration

**User Story:** As a user, I want to select my visual theme from the Settings panel with clear descriptions, so that I can easily understand and switch between Playful and Scholarly styles.

#### Acceptance Criteria

1. THE Settings_Panel SHALL display a visual theme selector in the Appearance section, below the existing color mode toggle
2. WHEN the Settings_Panel renders, THE visual theme selector SHALL show the currently active theme
3. WHEN a user clicks a theme option, THE Settings_Panel SHALL update the `visualTheme` state immediately
4. THE visual theme selector SHALL provide labels: "Playful" and "Scholarly"
5. THE visual theme selector SHALL provide brief descriptive text: "Friendly and approachable" / "Refined and structured"
6. THE visual theme selector SHALL use the same toggle-button UI pattern as the existing dark/light theme toggle
7. THE visual theme selector SHALL provide visual feedback indicating the active selection
8. THE visual theme selector SHALL apply changes instantly (live preview — no confirmation step)

### Requirement 6: Performance and Compatibility

**User Story:** As a user, I want theme switching to be instant and smooth, so that the interface remains responsive.

#### Acceptance Criteria

1. WHEN a user switches visual themes, THE Visual_Theme_System SHALL trigger a page reload to fully apply the UI overhaul (component-level conditional rendering requires re-mount)
2. WHEN a user switches visual themes, THE Visual_Theme_System SHALL not cause unexpected layout shifts after reload
3. THE Scholarly_Theme CSS overrides SHALL be additive and not break existing component styles
4. THE Visual_Theme_System SHALL not impact application load time or runtime performance
5. WHEN CSS variables are overridden, THE changes SHALL cascade to all components using those variables

### Requirement 7: CSS Architecture

**User Story:** As a developer, I want the visual theme system to use CSS variable overrides, so that the implementation is maintainable and doesn't duplicate styles.

#### Acceptance Criteria

1. THE Scholarly_Theme SHALL be implemented using CSS variable overrides scoped to `[data-visual-theme="scholarly"]`
2. THE Scholarly_Theme overrides SHALL modify existing CSS variables rather than creating new ones
3. THE Scholarly_Theme overrides SHALL be defined in `index.css` alongside existing theme definitions
4. WHEN no `data-visual-theme` attribute is present, THE Visual_Theme_System SHALL default to Playful_Theme behavior (current styles)
5. THE CSS implementation SHALL follow the existing design system structure and naming conventions
6. THE Scholarly_Theme SHALL include a `@media print` block that resets elevation and glow to ensure clean printed output

### Requirement 8: Emoji and Visual Metaphor Stripping

**User Story:** As a university student or professor, I want the Scholarly theme to remove all emojis and playful visual metaphors, so that the interface maintains institutional credibility.

#### Acceptance Criteria

1. WHEN the Scholarly_Theme is active, THE Visual_Theme_System SHALL strip all emoji characters from UI labels, buttons, headers, and feedback messages
2. WHEN the Scholarly_Theme is active, THE Visual_Theme_System SHALL replace emoji-based indicators with text labels or Lucide icons
3. THE `useVisualTheme()` hook in `src/shared/hooks/useVisualTheme.ts` SHALL provide `isScholarly` boolean, `stripEmoji()`, and `scholarlyLabel()` utilities
4. WHEN the Scholarly_Theme is active, THE Visual_Theme_System SHALL hide visual anchor emojis from concept chips, mood cards, persona displays, confidence labels, and tier badges
5. THE emoji stripping SHALL be implemented via conditional rendering in 25+ components using the `useVisualTheme()` hook pattern: `{!isScholarly && <span>emoji</span>}`
