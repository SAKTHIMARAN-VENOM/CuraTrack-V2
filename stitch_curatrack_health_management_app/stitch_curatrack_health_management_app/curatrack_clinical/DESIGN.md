---
name: CuraTrack Clinical
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#434654'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#737685'
  outline-variant: '#c3c6d6'
  surface-tint: '#0c56d0'
  primary: '#003d9b'
  on-primary: '#ffffff'
  primary-container: '#0052cc'
  on-primary-container: '#c4d2ff'
  inverse-primary: '#b2c5ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#2b29bb'
  on-tertiary: '#ffffff'
  tertiary-container: '#4547d3'
  on-tertiary-container: '#d0cfff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2ff'
  primary-fixed-dim: '#b2c5ff'
  on-primary-fixed: '#001848'
  on-primary-fixed-variant: '#0040a2'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#e1e0ff'
  tertiary-fixed-dim: '#c0c1ff'
  on-tertiary-fixed: '#07006c'
  on-tertiary-fixed-variant: '#2f2ebe'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
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
  title-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
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
  label-lg:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.5px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  baseline: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 20px
  margin-tablet: 32px
---

## Brand & Style
The design system is rooted in the "Precision Care" philosophy, blending the systematic rigor of Material 3 with a premium, high-end healthcare aesthetic. It targets patients and providers who require a sense of absolute reliability, security, and calm.

The visual style is **Corporate / Modern** with a lean toward **Minimalism**. It prioritizes extreme clarity, generous whitespace to reduce cognitive load during medical tracking, and a "clinical-chic" finish. Surfaces are treated as organized, breathable layers that guide the user through complex health data without friction. The emotional response should be one of "effortless control" over one's health journey.

## Colors
The palette is anchored by **Medical Blue**, a deep, authoritative primary hue that signals stability and professional trust. **Emerald Green** serves as the functional accent, utilized for success states, recovery trends, and positive health indicators.

- **Primary (#0052CC):** Used for key actions, active states in bottom navigation, and primary branding.
- **Secondary (#10B981):** Reserved for health-positive data and "complete" states.
- **Surface:** A pristine white (#FFFFFF) is the standard background to maintain a sterile, clean feel.
- **Neutral/Outline:** Soft Slate (#E2E8F0) is used for borders and dividers to keep the UI light and avoid visual clutter.

## Typography
The design system utilizes **Inter** for all roles to leverage its exceptional legibility and systematic weight distribution. 

The scale emphasizes a strong hierarchy where headlines use a tighter letter-spacing and heavier weights to feel "grounded." Body text maintains a standard line height of 1.5x for maximum readability in medical logs. For mobile views, large display titles are slightly scaled down to ensure they do not wrap aggressively, maintaining a clean single-line impact where possible.

## Layout & Spacing
The layout follows a **Fluid Grid** model based on a 4px baseline. On mobile devices, a 4-column grid is used with 20px outside margins. For tablet and larger Android form factors, this expands to an 8 or 12-column grid.

Spacing is used to create "grouping by proximity." Components like cards and input fields should utilize `lg` (24px) vertical spacing to ensure the interface feels "premium" and uncrowded. Touch targets for all interactive elements must be a minimum of 48x48dp to meet healthcare accessibility standards.

## Elevation & Depth
Depth is conveyed through **Tonal Layers** and **Ambient Shadows**. This design system avoids harsh blacks in shadows, opting for a primary-tinted shadow (e.g., a subtle blue-grey tint) to maintain the premium feel.

- **Level 0 (Base):** Standard background.
- **Level 1 (Cards):** Resting state for medical records and dashboard widgets. Uses a very soft, diffused shadow (Blur: 12px, Y: 4, Opacity: 4% #000).
- **Level 2 (Active/Floating):** Used for Fab buttons or cards during a drag-and-drop action.
- **Overlays:** Full-screen modals and bottom sheets use a backdrop blur (12px) to keep the context of the medical dashboard visible while focusing the user's attention.

## Shapes
The shape language is defined by high-radius **Rounded** corners, specifically customized for this design system to evoke a friendly yet professional tone.

- **Standard Components:** Buttons and small inputs use a 12px radius.
- **Container Elements:** Medical cards, dashboard panels, and modal containers use a signature **24px radius** (`rounded-xl` equivalent).
- **Selection Controls:** Checkboxes and radio buttons maintain slightly softened corners (4px) to harmonize with the larger elements.

## Components
Consistent styling across medical-grade components:

- **Rounded Cards:** All data containers must use a 24px corner radius. They should have a 1px soft-grey border (#E2E8F0) and the Level 1 Ambient Shadow.
- **Buttons:** Primary buttons are fully filled with Medical Blue. Text is white, weight is Bold (600). Use the "M3 Pill" shape for high-priority actions.
- **Input Fields:** Outlined style is preferred. The border-color shifts from Soft Slate to Medical Blue on focus. Labels should float above the field in a smaller, semi-bold Inter font.
- **Bottom Navigation:** Uses the Material 3 tonal indicator (a soft blue pill) behind the active icon. Icons must be "Outlined" medical-themed glyphs with a 2px stroke weight.
- **Chips:** Used for medical tags (e.g., "Fast Acting," "Prescription"). These use a secondary Emerald Green tint for positive attributes and a light grey for neutral ones.
- **Progress Indicators:** Circular and linear progress bars use a thick 6dp stroke with rounded caps to match the system-wide shape language.