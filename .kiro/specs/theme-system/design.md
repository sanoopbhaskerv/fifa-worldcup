# CSS Token System And Theme Personalization Design

## Architecture Summary

The implementation introduces a layered styling model:

1. **Token layer** (`tokens.css`)
2. **Theme override layer** (`themes.css`)
3. **Component/application layer** (`global.css`)
4. **Runtime preference layer** (React theme context + storage)

This keeps existing classes and layout rules mostly intact while moving color
and visual identity into maintainable tokens.

## Style Layering

### 1) Token Layer

`src/styles/tokens.css` defines default primitives and semantic aliases:

- Primitives: `--theme-canvas`, `--theme-surface`, `--theme-text`,
  `--theme-accent`, etc.
- Semantics: `--canvas`, `--surface`, `--text`, `--accent`, `--danger`, etc.
- Shared utility tokens: `--on-accent`, `--app-background`, `--font-body`,
  `--font-display`.

### 2) Theme Layer

`src/styles/themes.css` provides `[data-theme="..."]` overrides for curated
palettes, e.g.:

- `pitch` (default green-forward identity)
- `ocean`
- `sunset`
- `neon`

Only primitive tokens are overridden; semantic aliases inherit automatically.

### 3) App CSS Layer

`src/styles/global.css` continues to hold layout and component rules. It is
updated to consume tokens instead of hardcoded key values where practical:

- Root typography from token fonts.
- Background gradients from tokenized surface/accent blend values.
- CTA foreground from `--on-accent`.

## Runtime Theme State

### Theme Registry

`src/utils/theme.ts` defines:

- Theme ID union type.
- Ordered theme options for selector labels.
- Safe resolver for unknown values.

### Persistence

`src/utils/storage.ts` adds `getTheme` and `setTheme` methods under versioned
storage keys.

### React Runtime

`src/app/theme-context.tsx` owns app-level state:

- Initializes from persisted preference.
- Applies `data-theme` on `document.documentElement`.
- Exposes `theme`, `setTheme`, and options through context.

### Selector Component

`src/components/ThemeSwitcher.tsx` renders an accessible compact selector:

- `<label>` + `<select>` bound to context state.
- Reusable in multiple shells.

## Integration Points

Theme selector is placed in:

- Home header
- Competition top bar
- Fantasy top bar

All pages update instantly through shared context.

## Accessibility

- Preserve readable contrast by keeping semantic text tokens and muted tokens
  theme-specific.
- Keep focus outlines mapped to `--accent`.
- Selector includes explicit label and keyboard support.

## Migration Strategy

1. Introduce token/theme files and runtime context.
2. Keep semantic aliases backward compatible to avoid mass rewrite risk.
3. Incrementally replace literal values with semantic tokens in hot paths.
4. Add tests for storage resolution and selector interaction.

## Risks And Mitigations

- **Risk:** Legacy hardcoded colors remain in deep selectors.
  - **Mitigation:** Keep aliases stable now, schedule iterative cleanup.
- **Risk:** Inconsistent state if selector used in multiple shells.
  - **Mitigation:** single global context provider.
- **Risk:** Broken contrast in new palettes.
  - **Mitigation:** curated palettes + manual visual QA checklist.
