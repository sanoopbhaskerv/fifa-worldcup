# Header Account Menu And Profile Shell Requirements

## Overview

Introduce a consistent account entry point in the top-right header area using an
avatar + display-name trigger. Move account actions (profile, edit display name,
settings, theme, and sign out) into this menu for both competition and fantasy
shells. Add a dedicated profile/settings surface for expanded account controls.

The scope is intentionally focused on information architecture and interaction
patterns shown in the updated mock. Other visual redesign ideas are out of
scope for this spec.

## Personas

- Player: wants quick access to account actions from any page.
- Admin/player hybrid: wants the same account entry point across shells.
- Developer: wants one reusable account menu model without duplicated topbar UI.

## Requirements

### R1. Unified Account Trigger

User story: As a user, I want a consistent account trigger in the top-right
header so I always know where account actions are.

Acceptance criteria:

- Competition and fantasy topbars shall expose a top-right account trigger.
- Trigger shall include avatar initials and display name.
- Trigger shall support keyboard activation and screen readers.
- Trigger shall reflect authenticated identity when available.

### R2. Menu-Based Account Actions

User story: As a user, I want account actions grouped in one menu so header
chrome stays uncluttered.

Acceptance criteria:

- The account menu shall include: View profile, Edit display name, Settings,
  Theme, and Sign out.
- Existing topbar standalone actions for theme/profile shall be removed or
  hidden in favor of the account menu.
- Menu actions shall map to existing routes or existing app behaviors where
  already implemented.
- Sign out action shall preserve current identity-clearing behavior.

### R3. Contextual Menu Items By Shell

User story: As a user, I want relevant shortcuts in the shell I am currently
using.

Acceptance criteria:

- Competition shell menu may include football-specific quick links.
- Fantasy shell menu may include fantasy shortcuts (for example My predictions,
  Leaderboard) above core account actions.
- Core account actions (Profile, Settings, Theme, Sign out) shall remain
  consistent across shells.

### R4. Dedicated Profile And Settings Surface

User story: As a user, I want a full account area to manage profile and
preferences beyond quick menu actions.

Acceptance criteria:

- Provide a profile/settings page reachable from account menu.
- Page shall support profile basics (name, display name, favorite team).
- Page shall provide preferences including theme selection.
- Page shall include notification preference placeholder/state even if backend
  persistence is deferred.

### R5. Responsive Interaction Behavior

User story: As a mobile user, I want the account menu to be usable without
covering critical content or clipping off-screen.

Acceptance criteria:

- Menu shall anchor to trigger and remain fully visible on mobile widths.
- Menu shall support outside-click and Escape key dismissal.
- Menu shall close after selecting a navigation action.
- Topbar shall avoid layout overlap when account trigger is present.

### R6. Accessibility And Semantics

User story: As a keyboard or assistive-tech user, I want the account menu to be
navigable and understandable.

Acceptance criteria:

- Trigger shall expose `aria-haspopup="menu"` and expanded state.
- Menu container and items shall use accessible roles/labels.
- Focus shall move into menu on open and return to trigger on close.
- Hit targets shall remain comfortable on touch devices.

### R7. Reusable Component Architecture

User story: As a developer, I want a reusable account menu component so behavior
is consistent and maintenance is easier.

Acceptance criteria:

- Implement a shared account menu component used by both competition and
  fantasy shells.
- Component shall support item groups and optional shell-specific sections.
- Component styling shall rely on existing token/theme system.
- Existing theme switcher integration shall be reusable inside menu content.

### R8. Quality Gates

User story: As a developer, I want confidence that account navigation and menu
behavior are stable.

Acceptance criteria:

- Add component tests for open/close, keyboard navigation, and action dispatch.
- Validate shell rendering with account trigger in mobile and desktop layouts.
- Run typecheck and tests after integration.
- Add regression checklist for topbar clutter and overflow.
