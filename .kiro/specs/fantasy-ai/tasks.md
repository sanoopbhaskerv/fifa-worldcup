# Fantasy AI Tasks

## Phase 1. Zero-Cost Template AI

- [x] Keep AI settings in backend game state.
- [x] Generate match question drafts from templates and squad candidates.
- [x] Validate generated player options against squad data.
- [x] Fall back to templates when external AI is disabled.
- [x] Add `FantasyAiMessage` types and game payload fields.
- [x] Add storage support for `AI_MESSAGE` records in memory and DynamoDB
  adapters.
- [x] Implement context hash helper for generated message idempotency.
- [x] Implement template reminder generation from open polls and lock times.
- [x] Implement template recap generation from result facts and score changes.
- [x] Implement daily leaderboard summary generation from rank and points
  changes.
- [x] Add backend tests for each template generator.

## Phase 2. Admin Workflow

- [x] Add admin AI settings screen.
- [x] Add admin poll draft generation and publish flow.
- [x] Add admin AI message list API.
- [x] Add admin APIs to generate reminder, recap, and leaderboard drafts.
- [x] Add admin APIs to publish, regenerate, and discard AI messages.
- [x] Add audit records for draft, publish, regenerate, and discard actions.
- [ ] Add admin preview UI for recap/reminder/leaderboard copy.
- [ ] Add tests for admin message publishing and player visibility.
- [ ] Add one-click disable for external AI mode.

## Phase 3. Player Experience

- [ ] Show latest published host message on fantasy home.
- [ ] Show published match recap on fantasy result cards.
- [ ] Show open-poll reminder banner when relevant.
- [ ] Keep drafts hidden from player payloads.
- [ ] Add mobile layout checks for host message cards.

## Phase 4. Optional External AI

- [ ] Define server-side provider adapter interface.
- [ ] Add environment-gated external provider config.
- [ ] Add timeout, daily budget, and max-call guard.
- [ ] Add cache key per match/template/context version.
- [ ] Add tests for provider failure fallback.
- [ ] Confirm no AI keys exist in frontend build output.

## Phase 5. Automation Later

- [ ] Add optional EventBridge Scheduler for pre-match reminders.
- [ ] Add optional post-result recap generation after score publish.
- [ ] Add optional daily summary generation.
- [ ] Keep all automation disabled by default in staging.

## Recommended Build Order

1. Data model and storage for `FantasyAiMessage`.
2. Template generator functions and unit tests.
3. Admin routes for generating and publishing drafts.
4. Admin message preview UI.
5. Player fantasy home/result display.
6. Optional external AI adapter after template flow is useful.
