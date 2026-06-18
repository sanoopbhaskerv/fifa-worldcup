# Structure Steering

## Repository Organization

Prediction-game code should fit the existing feature-oriented layout:

```text
src/
  features/
    fantasy/
      admin/
      components/
      hooks/
      pages/
      utils/
  providers/
    fantasy-provider.ts
  services/
    fantasy-queries.ts
  types/
    fantasy.ts
server/
  fantasy/
    ai-host.mjs
    auth.mjs
    deadlines.mjs
    squad-reference.mjs
    question-templates.mjs
    results.mjs
    routes.mjs
    scoring.mjs
    storage.mjs
.kiro/
  steering/
  specs/
    fantasy-football/
```

## Document Roles

- `.kiro/steering/product.md`: lasting product rules.
- `.kiro/steering/tech.md`: lasting architecture and cost rules.
- `.kiro/steering/structure.md`: lasting repo organization rules.
- `.kiro/steering/ai.md`: lasting AI cost, safety, and provider rules.
- `.kiro/specs/fantasy-football/requirements.md`: user-facing and system
  requirements for the prediction game.
- `.kiro/specs/fantasy-football/design.md`: implementation architecture,
  backend shape, data model, and visual direction.
- `.kiro/specs/fantasy-football/tasks.md`: implementation checklist.
- `.kiro/specs/fantasy-ai/requirements.md`: AI host requirements.
- `.kiro/specs/fantasy-ai/design.md`: AI host architecture and cost controls.
- `.kiro/specs/fantasy-ai/tasks.md`: AI host implementation checklist.

## Naming Rules

- Prefix prediction-game domain types with `Fantasy` while the route remains
  `/fantasy`: `FantasyTournament`, `FantasyParticipant`, `FantasyQuestion`,
  `FantasyPrediction`, `FantasyResult`, `FantasyScore`, `FantasyBadge`,
  `FantasyTeam`, `FantasySquadPlayer`.
- Use `Prediction` for a user's answer, not for generated questions.
- Use `QuestionTemplate` for reusable AI/admin question recipes.
- Use `MatchImportance` values: `NORMAL`, `BIG_MATCH`, `KNOCKOUT`, `FINAL`.
- Keep normalized football data names unchanged: `Match`, `Team`, `Competition`.
- Use `SquadPlayer` or `FantasySquadPlayer` only for real World Cup squad
  reference data. Do not use it for user-selected fantasy squads.

## Boundary Rules

- Public browsing must continue to work without authentication.
- Player prediction writes require participant identity.
- Admin result entry and score publishing require owner/admin authorization.
- Server fantasy modules should not import React or browser-only code.
- Browser fantasy modules should not import provider SDKs, AWS SDKs, AI SDKs, or
  secrets.
- AI question generation should produce structured question drafts that the
  backend validates before publishing.
