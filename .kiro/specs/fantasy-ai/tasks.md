# Fantasy AI Tasks

## Phase 1. Zero-Cost Template AI

- [x] Keep AI settings in backend game state.
- [x] Generate match question drafts from templates and squad candidates.
- [x] Validate generated player options against squad data.
- [x] Fall back to templates when external AI is disabled.
- [ ] Add template recap generation from result facts and score changes.
- [ ] Add template reminder generation from open polls and lock times.
- [ ] Add daily leaderboard summary generation from rank and points changes.

## Phase 2. Admin Workflow

- [x] Add admin AI settings screen.
- [x] Add admin poll draft generation and publish flow.
- [ ] Add admin preview for recap/reminder copy.
- [ ] Add audit records for recap/reminder generation.
- [ ] Add one-click disable for external AI mode.

## Phase 3. Optional External AI

- [ ] Define server-side provider adapter interface.
- [ ] Add environment-gated external provider config.
- [ ] Add timeout, daily budget, and max-call guard.
- [ ] Add cache key per match/template/context version.
- [ ] Add tests for provider failure fallback.
- [ ] Confirm no AI keys exist in frontend build output.

## Phase 4. Automation Later

- [ ] Add optional EventBridge Scheduler for pre-match reminders.
- [ ] Add optional post-result recap generation after score publish.
- [ ] Add optional daily summary generation.
- [ ] Keep all automation disabled by default in staging.
