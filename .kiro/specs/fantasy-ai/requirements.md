# Fantasy AI Requirements

## Overview

Add an AI host layer for the private World Cup prediction game. It should create
poll drafts, reminders, recaps, and leaderboard banter while keeping AWS and AI
provider cost at zero or near-zero for a friends circle.

## Requirements

### R1. Template-Only Default

User story: As the admin, I want AI-like automation without provider cost so the
game is reliable and cheap.

Acceptance criteria:

- The system shall support `TEMPLATE_ONLY` mode as the default.
- Template mode shall generate poll drafts, reminder copy, and recap copy
  without external AI calls.
- The app shall remain fully usable when external AI is disabled.

### R2. Optional External AI

User story: As the admin, I want to test free or low-cost AI APIs later without
rewriting the game.

Acceptance criteria:

- External AI shall be server-side only.
- External AI shall be disabled unless configured by environment and admin
  settings.
- External AI shall have daily budget, timeout, and max-call controls.
- External AI failure shall fall back to deterministic templates.

### R3. Grounded Poll Drafts

User story: As a player, I want polls that use real match and squad data.

Acceptance criteria:

- Question drafts shall use stored fixtures, teams, squads, templates, and match
  importance.
- Player option drafts shall use stored squad players only, plus explicit
  fallback options like `No goal`, `Own goal`, and `Other`.
- AI output shall be validated before it is saved.
- Invalid drafts shall be rejected or replaced with templates.

### R4. Admin Review

User story: As the admin, I want control before players see AI output.

Acceptance criteria:

- AI-generated questions shall be saved as drafts.
- Admin shall be able to edit, publish, or discard drafts.
- Published polls shall be regular structured questions owned by the backend.

### R5. Recaps And Reminders

User story: As a friend group, we want short reminders and recaps that make the
game feel alive.

Acceptance criteria:

- The system shall generate pre-match reminders from open poll counts and lock
  times.
- The system shall generate post-match recaps from result facts and score
  changes.
- The system shall generate daily leaderboard summaries from rank and points
  changes.
- Messages shall be short, friendly, and safe for a friends group.

### R6. Observability And Safety

User story: As the owner, I want to know when AI is used and stop it quickly.

Acceptance criteria:

- AI calls and template generations shall create audit records.
- Admin settings shall include mode, budget, banter level, and fallback controls.
- A single setting shall disable external AI without redeploying frontend code.
