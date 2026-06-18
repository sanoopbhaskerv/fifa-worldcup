# Header Account Menu And Profile Shell Design

## Architecture Summary

This feature introduces a reusable header account menu and a profile/settings
surface while preserving existing route structure and data providers.

The implementation is split into three parts:

1. Shared account menu component
2. Shell integration adapters (competition + fantasy)
3. Profile/settings route surface

## UI Composition

### Account Trigger

A compact trigger appears at the top-right of the header:

- Avatar circle with initials
- Display name text
- Optional caret icon indicating expandable menu

Display name truncates safely at narrow widths while avatar remains visible.

### Menu Layout

Menu opens as an anchored popover panel with grouped actions.

Recommended grouping:

1. Identity summary (avatar, full name, subtitle)
2. Shell shortcuts (optional per shell)
3. Core account actions
4. Danger action (sign out)

Core actions are stable across shells:

- View profile
- Edit display name
- Settings
- Theme
- Sign out

Theme action can either:

- Inline-expand a theme selector row, or
- Navigate to profile/settings page and focus preferences section.

## Information Architecture

### Shell-Specific Menus

Competition shell menu:

- Identity summary
- Optional quick links (for example favorites)
- Core account actions

Fantasy shell menu:

- Identity summary
- Fantasy shortcuts (My predictions, Leaderboard)
- Core account actions

### Profile/Settings Surface

Create a dedicated account page with two zones:

- Left: account section navigation (Profile, Preferences, Notifications, Theme)
- Right: editable forms and preferences cards

This page is the long-form destination for settings currently spread across
header controls.

## Component Design

### New Shared Component

`AccountMenu` component responsibilities:

- Render trigger button state
- Manage open/close state
- Handle outside click and Escape close
- Render grouped menu actions
- Emit action callbacks/navigation

Suggested props:

- identity: `{ initials, displayName, subtitle? }`
- sections: action groups and items
- onSelect(actionId)
- variant: `competition | fantasy`

### Supporting Hook

Optional `useAccountMenu` hook:

- state: `isOpen`
- handlers: `open`, `close`, `toggle`
- focus return target tracking

## Accessibility Model

- Trigger: button with `aria-haspopup="menu"` and `aria-expanded`
- Menu: role `menu`
- Items: role `menuitem`
- Keyboard:
  - Enter/Space/ArrowDown opens menu
  - Escape closes menu
  - ArrowUp/ArrowDown cycles items
  - Tab closes menu and continues natural focus order

## Routing And Behavior Mapping

Action mapping recommendations:

- View profile -> `/fantasy/profile` (or unified account route if introduced)
- Edit display name -> `/fantasy/profile`
- Settings -> `/fantasy/profile`
- Theme -> inline selector in menu or `/fantasy/profile#theme`
- Sign out -> existing identity clear + redirect to shell entry

Competition shell can reuse fantasy profile destination initially to avoid
backend/model duplication.

## Styling Strategy

- Reuse existing token system in `tokens.css` and `themes.css`
- Add account-menu styles in shell stylesheet layer where ownership is clear
  (`global.css` for shared, `fantasy.css` for fantasy-specific variants)
- Keep panel width and spacing token-driven
- Ensure z-index aligns with sticky topbar and mobile tabs

## Responsive Behavior

Mobile:

- Trigger remains top-right and tap-friendly
- Menu aligns right edge to viewport-safe area
- Width constrained to avoid horizontal overflow

Tablet/Desktop:

- Keep one-row topbar where possible
- Menu appears below trigger with subtle elevation

## Data And State Considerations

Identity source:

- Fantasy shell: existing stored fantasy identity
- Competition shell: if no authenticated identity exists, use lightweight guest
  identity fallback (initials + label)

No schema change required for MVP; page-level profile edit can continue to use
existing storage or APIs already in place.

## Risks And Mitigations

- Risk: duplicate account controls remain in header and menu.
  - Mitigation: remove legacy controls when menu integration lands.
- Risk: menu clipping on small screens.
  - Mitigation: right-edge anchoring + max-width + viewport-safe offsets.
- Risk: inconsistent behavior across shells.
  - Mitigation: shared component with variant-only content sections.
- Risk: theme switcher behavior divergence.
  - Mitigation: single theme source of truth and one selector implementation.
