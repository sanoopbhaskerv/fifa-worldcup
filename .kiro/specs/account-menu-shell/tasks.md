# Header Account Menu And Profile Shell Tasks

## Phase 1. Spec Alignment

- [x] Review updated mock and capture account-menu-first interaction model.
- [x] Document scope boundary to exclude unrelated global redesign changes.
- [x] Define requirements, design architecture, and phased tasks.

## Phase 2. Shared Menu Foundation

- [ ] Create reusable `AccountMenu` component with trigger + popover panel.
- [ ] Add grouped action model for identity, shortcuts, and core account
  actions.
- [ ] Add menu accessibility semantics and keyboard support.
- [ ] Add outside-click/Escape dismissal logic.

## Phase 3. Competition Shell Integration

- [ ] Integrate account trigger into competition topbar right side.
- [ ] Move header account/theme controls into account menu.
- [ ] Add competition-specific shortcut actions where available.
- [ ] Ensure no topbar overlap on mobile widths.

## Phase 4. Fantasy Shell Integration

- [ ] Integrate shared account menu into fantasy topbar.
- [ ] Add fantasy shortcut actions (My predictions, Leaderboard) in menu.
- [ ] Move profile/settings/theme/sign-out actions into menu.
- [ ] Ensure sign-out behavior matches existing identity flow.

## Phase 5. Profile/Settings Surface

- [ ] Create or extend account page layout for profile + preferences.
- [ ] Add account navigation sections: Profile, Preferences, Notifications,
  Theme.
- [ ] Wire menu actions to profile/settings destinations.
- [ ] Keep form fields aligned with existing identity model.

## Phase 6. Styling And Responsiveness

- [ ] Add token-based styles for account trigger, menu panel, and menu rows.
- [ ] Add mobile-safe anchoring and width constraints.
- [ ] Validate desktop and tablet alignment in competition and fantasy shells.
- [ ] Remove obsolete topbar action styles replaced by account menu.

## Phase 7. Testing And Validation

- [ ] Add component tests for menu open/close, keyboard navigation, and item
  selection.
- [ ] Add integration tests for shell-level account trigger presence.
- [ ] Run `npm run typecheck`.
- [ ] Run `yarn test`.
- [ ] Perform manual smoke test at 320, 375, 390, 412, 768, and desktop widths.

## Phase 8. Rollout Checklist

- [ ] Confirm account menu parity across competition and fantasy shells.
- [ ] Confirm theme selection remains functional through menu path.
- [ ] Confirm profile/settings route deep-link behavior.
- [ ] Capture before/after screenshots for regression tracking.
