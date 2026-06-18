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

## First Milestone Scope

Build **Template AI Host v1** before any external provider work.

In scope:

- Generate recap drafts after a result is saved or scores are published.
- Generate reminder drafts for upcoming matches with open polls.
- Generate daily leaderboard summary drafts.
- Admin preview, publish, regenerate, and discard controls.
- Display published AI host cards on fantasy home and result pages.

Out of scope:

- External AI provider calls.
- WhatsApp, Telegram, push notification, or email delivery.
- Fully scheduled automation.
- Player-personalized AI messages.

## Data Model

Add a `FantasyAiMessage` record:

```ts
type FantasyAiMessageType = "REMINDER" | "RECAP" | "LEADERBOARD_SUMMARY";
type FantasyAiMessageStatus = "DRAFT" | "PUBLISHED" | "DISCARDED";
type FantasyAiMessageSource = "TEMPLATE" | "EXTERNAL_AI" | "MANUAL";

interface FantasyAiMessage {
  id: string;
  tournamentId: string;
  matchId?: string;
  type: FantasyAiMessageType;
  status: FantasyAiMessageStatus;
  source: FantasyAiMessageSource;
  title: string;
  body: string;
  contextHash: string;
  createdAt: string;
  createdByParticipantId: string;
  publishedAt?: string;
  discardedAt?: string;
}
```

Storage keys:

```text
PK: TOURNAMENT#<tournamentId>
SK: AI_MESSAGE#<createdAt>#<messageId>
type: AI_MESSAGE
```

Keep existing `recaps` for backwards compatibility during migration, but new
host content should use `aiMessages`.

## Backend Routes

Admin routes:

```text
GET  /api/fantasy/admin/ai-messages
POST /api/fantasy/admin/ai-messages/reminder-draft
POST /api/fantasy/admin/ai-messages/recap-draft
POST /api/fantasy/admin/ai-messages/leaderboard-draft
PUT  /api/fantasy/admin/ai-messages/:messageId
POST /api/fantasy/admin/ai-messages/:messageId/publish
POST /api/fantasy/admin/ai-messages/:messageId/discard
```

Player payload:

- `GET /api/fantasy/game` should include published AI messages only.
- Admin routes may return drafts and discarded records.

## Template Generators

Reminder draft input:

- match
- teams
- kickoff
- poll close time
- open question count
- participant count
- unanswered count when scoped to a group

Recap draft input:

- result facts
- match teams
- published scores
- top points for the match
- notable correct predictions when available

Leaderboard summary input:

- current leaderboard
- previous rank when available
- today points
- badges when available

Output shape:

```ts
interface TemplateMessageDraft {
  title: string;
  body: string;
  source: "TEMPLATE";
  contextHash: string;
}
```

## Admin UI

Create `/fantasy/admin/ai-host` or extend the existing AI settings page with two
tabs:

- `Settings`: current AI mode, banter level, budget controls.
- `Messages`: drafts and published host messages.

Message rows should show:

- type
- match or tournament scope
- title/body preview
- status
- source
- actions: `Preview`, `Publish`, `Regenerate`, `Discard`

## Player UI

Fantasy home:

- Show latest published `RECAP` or `LEADERBOARD_SUMMARY`.
- Show next relevant `REMINDER` when polls are open.

Results page:

- Show published recap for each completed match.

Polls page:

- Optionally show reminder banner for the selected match group later.

## Auditing

Create audit records for:

- `AI_MESSAGE_DRAFTED`
- `AI_MESSAGE_PUBLISHED`
- `AI_MESSAGE_DISCARDED`
- `AI_MESSAGE_REGENERATED`

Audit metadata should include message type, source, match id, and context hash.

## External AI Later

When template v1 is stable, add an optional provider behind the same generator
interface. The provider must:

- run server-side only
- use compact context
- timeout quickly
- use context hash caching
- obey daily budget and call count
- fall back to template output on any error
