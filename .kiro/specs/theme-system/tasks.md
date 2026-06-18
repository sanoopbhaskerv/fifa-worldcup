# CSS Token System And Theme Personalization Tasks

## Phase 1. Spec And Inventory

- [x] Document requirements for tokenization and theme personalization.
- [x] Document architecture and migration approach.
- [x] Create phased implementation tasks.

## Phase 2. Token Foundation

- [x] Add `src/styles/tokens.css` with primitive and semantic tokens.
- [x] Add `src/styles/themes.css` with 4 curated theme overrides.
- [x] Update global CSS root declarations to use tokenized fonts and colors.
- [x] Replace key hardcoded accent-foreground values with `--on-accent`.

## Phase 3. Runtime Theme System

- [x] Add `src/utils/theme.ts` with theme registry and safe resolver.
- [x] Extend `src/utils/storage.ts` with persisted theme preference methods.
- [x] Add app-level `ThemeProvider` and hook in `src/app/theme-context.tsx`.
- [x] Wrap app root with provider in `src/main.tsx`.

## Phase 4. Theme Selector UX

- [x] Add reusable `ThemeSwitcher` component.
- [x] Integrate selector into home shell.
- [x] Integrate selector into competition top bar.
- [x] Integrate selector into fantasy top bar.
- [x] Add CSS for selector states and responsive behavior.

## Phase 5. Quality Gates

- [x] Add tests for theme resolver and storage persistence behavior.
- [x] Add component test for theme switcher interaction.
- [x] Run `yarn typecheck`.
- [x] Run focused tests for new theme utilities/components.

## Phase 6. Follow-up Cleanup

- [x] Extract fantasy base styles into `src/styles/fantasy.css` to reduce global stylesheet size.
- [x] Extract football/content base styles into `src/styles/football.css` and home base styles into `src/styles/home.css`.
- [x] Move domain-specific responsive breakpoints from `src/styles/global.css` into domain stylesheets.
- [x] Continue replacing remaining literal color values with semantic tokens.
- [x] Add optional `prefers-color-scheme` mapping to initial theme default.
- [ ] Add visual regression snapshots for each theme (future).

## Phase 7. Spatial And Typography Tokens

- [x] Define spacing, typography, and layout-width primitives in `src/styles/tokens.css`.
- [x] Add semantic aliases for shared page/section insets and heading sizes.
- [x] Migrate repeated container width and page padding values in global/home/football/fantasy styles.
- [x] Migrate repeated heading, label, and metadata font-size values to semantic tokens.
- [x] Migrate repeated card/form spacing (`padding`, `gap`, `margin`) to spacing tokens.
- [x] Run `yarn typecheck` and focused tests after migration.
- [x] Perform manual responsive smoke check for Home, Football shell, and Fantasy shell.
