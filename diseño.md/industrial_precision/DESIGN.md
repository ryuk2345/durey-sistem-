---
name: Industrial Precision
colors:
  surface: '#faf8ff'
  surface-dim: '#d9d9e5'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f2fe'
  surface-container: '#ededf9'
  surface-container-high: '#e8e7f3'
  surface-container-highest: '#e2e1ed'
  on-surface: '#1a1b23'
  on-surface-variant: '#434655'
  inverse-surface: '#2e3039'
  inverse-on-surface: '#f0f0fb'
  outline: '#747686'
  outline-variant: '#c4c5d7'
  surface-tint: '#2151da'
  primary: '#0037b0'
  on-primary: '#ffffff'
  primary-container: '#1d4ed8'
  on-primary-container: '#cad3ff'
  inverse-primary: '#b7c4ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#7f2500'
  on-tertiary: '#ffffff'
  tertiary-container: '#a73400'
  on-tertiary-container: '#ffc9b7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b7c4ff'
  on-primary-fixed: '#001551'
  on-primary-fixed-variant: '#0039b5'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#ffdbcf'
  tertiary-fixed-dim: '#ffb59c'
  on-tertiary-fixed: '#390c00'
  on-tertiary-fixed-variant: '#832700'
  background: '#faf8ff'
  on-background: '#1a1b23'
  surface-variant: '#e2e1ed'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-mono:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 0.25rem
  sm: 0.5rem
  md: 1rem
  lg: 1.5rem
  xl: 2rem
  2xl: 3rem
  gutter: 1.5rem
  margin: 2rem
---

## Brand & Style

This design system is engineered for the high-stakes environment of factory management. It prioritizes clarity, structural integrity, and the "premium industrial" aesthetic—balancing the rugged utility of manufacturing with the sophisticated precision of modern SaaS.

The visual language is rooted in **Corporate Modernism** with a **Minimalist** lean. It utilizes a vast amount of whitespace to reduce cognitive load in data-dense environments, ensuring that operators can identify anomalies in seconds. The emotional response is one of reliability, systematic order, and professional authority. Surfaces are clean, transitions are purposeful, and the hierarchy is absolute.

## Colors

The palette is anchored by a foundational Slate and Zinc neutral scale to provide a calm, non-distracting workspace. **Blue-700** serves as the primary action color, chosen for its association with stability and institutional trust.

Functional colors are strictly reserved for state-based communication:
- **Emerald-500:** Indicates active machinery, successful syncs, or optimal throughput.
- **Amber-500:** Highlights preventative maintenance windows or idling assets.
- **Rose-600:** Reserved exclusively for critical failures, safety alerts, or hard stops.

Backgrounds utilize **Slate-50** for the main canvas, while **White** is used for elevated surface cards to create a clear "layering" effect.

## Typography

The typography system relies exclusively on **Inter** to leverage its exceptional legibility and systematic feel. In data-heavy views, use `data-mono` (Inter with tabular lining figures) to ensure numerical values align perfectly in tables and KPI cards.

- **Headlines:** Use semi-bold weights with slight negative letter spacing to feel "engineered."
- **Labels:** Use uppercase for small metadata labels to create a distinction from body text.
- **Scale:** On mobile devices, `display-lg` should scale down to 28px to maintain readability without excessive wrapping.

## Layout & Spacing

This design system employs a **12-column fluid grid** for the main content area with a fixed-width sidebar (280px). 

- **Desktop:** 24px (1.5rem) gutters and 32px (2rem) outer margins.
- **Tablet:** 16px gutters and 24px margins.
- **Mobile:** 16px gutters and 16px margins.

Spacing follows a strict 4px baseline. Components like data tables should use "Comfortable" (16px) or "Compact" (8px) vertical padding depending on the user's density preference. Multi-step forms should be centered in a maximum 640px container to maintain focus.

## Elevation & Depth

Depth is conveyed through a combination of **Tonal Layering** and **Ambient Shadows**. 

1. **Level 0 (Background):** Slate-50.
2. **Level 1 (Cards/Sidebar):** White surface with a 1px border of Slate-200. This is the primary work surface.
3. **Level 2 (Dropdowns/Modals):** White surface with `shadow-md` (a soft, diffused 12% opacity shadow) to indicate temporary overlay.

Avoid heavy blurs or colorful glows. All shadows should be neutral (using Slate-900 at very low opacity) to maintain the professional, industrial tone.

## Shapes

The design system utilizes a **Rounded (0.5rem)** base. This specific radius strikes a balance between the "hard" edges of industrial machinery and the "soft" approachability of modern software.

- **Small elements (Chips, Checkboxes):** 4px (0.25rem).
- **Standard elements (Buttons, Inputs, Cards):** 8px (0.5rem).
- **Large elements (Modals, Featured KPI Cards):** 12px (0.75rem).

## Components

### Buttons & Inputs
- **Primary Button:** Solid Blue-700 background, white text. 150ms ease-in-out transition on hover to a slightly darker shade.
- **Input Fields:** White background, 1px Slate-300 border. On focus, the border transitions to Blue-700 with a 2px soft blue outer glow.

### Data Tables
- Use Slate-50 for the header background.
- Row hover state: Slate-100.
- Vertical alignment: Middle.
- Numerical columns must be right-aligned using tabular figures.

### Status Badges
- Small, uppercase labels with a 10% opacity background of the status color and 100% opacity text of the same color (e.g., Emerald-50 bg @ 10%, Emerald-600 text).

### KPI Cards
- Large `headline-md` value, `label-md` title.
- Include a small sparkline or percentage change indicator in the bottom right.

### Multi-step Wizards
- Horizontal progress stepper at the top. 
- Completed steps show a checkmark in Emerald-500. 
- Current step uses a Blue-700 ring.