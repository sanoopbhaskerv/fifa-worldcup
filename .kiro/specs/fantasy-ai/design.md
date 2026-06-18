# Fantasy AI Design

## Architecture

```text
Admin UI
  |
  v
Fantasy API Lambda
  |
  +--> Template generator, zero cost
  +--> Optional AI provider adapter, server-side only
  +--> Validator and sanitizer
  |
  v
DynamoDB drafts, recaps, reminders, audit records
```

The first implementation should prefer deterministic templates. External AI can
be plugged in through a provider adapter after the template output is already
useful.

## Modes

- `DISABLED`: no generation controls are shown except settings.
- `TEMPLATE_ONLY`: use local templates and squad data. This is the default.
- `ASSISTED`: call an external provider only when configured and within budget.

## Provider Strategy

Use an internal interface:

```ts
interface FantasyAiProvider {
  generateQuestions(input): Promise<QuestionDraft[]>;
  generateRecap(input): Promise<RecapDraft>;
  generateReminder(input): Promise<MessageDraft>;
}
```

Adapters:

- `TemplateFantasyAiProvider`: always available, zero cost.
- `ExternalFantasyAiProvider`: optional, environment gated, timeout bounded.

Candidate free or low-cost providers can be evaluated later, but they must not
be required for normal gameplay.

## Data Context

Question generation input should include only compact structured context:

- tournament rules and scoring version
- match id, teams, kickoff, stage, importance, lock time
- enabled question templates
- squad candidates for the two teams
- recent result and leaderboard context when relevant

Do not send full tournament state when a match-level subset is enough.

## Validation

Before saving drafts:

- question id, type, category, points, status, and close time are required
- player options must match stored squad players or explicit fallback options
- option counts must respect template limits
- exact-score questions must have free-text answer mode
- generated text must be short enough for mobile cards

Invalid external output falls back to templates.

## Cost Controls

- Default daily AI budget is `0`.
- External calls require both environment keys and admin setting enablement.
- Use short timeouts, low max tokens, and cache generated drafts.
- Never call AI from page load.
- Generate only on admin action or scheduled low-frequency jobs.
- Store outputs in DynamoDB and reuse them.

## AWS Cost Impact

Template mode adds no new AWS services. Optional automation may use EventBridge
Scheduler later for reminders/recaps, but manual admin-triggered generation is
preferred first.
