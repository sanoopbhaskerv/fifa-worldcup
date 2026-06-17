# Fantasy Football Prediction Game Tasks

## Phase 0. Product Decisions

- [x] Confirm the first tournament and competition edition.
- [ ] Confirm whether the first release is web app only, or web app plus
  WhatsApp/Telegram/manual sharing.
- [x] Confirm participant identity: invite code only, email login, phone login,
  or admin-created participants.
- [x] Confirm default poll close rule, recommended 15 minutes before kickoff.
- [ ] Confirm Man of the Match source: official, admin-decided, or group vote.
- [x] Confirm the World Cup squad data format you have available for import.
- [ ] Confirm scoring rules version 1.
- [x] Confirm public-scale features are out of scope for the first release.

## Phase 1. Domain And Mock Data

- [x] Replace squad-centric fantasy types with prediction-game types in
  `src/types/fantasy.ts`.
- [x] Add mock tournament, participants, fixtures, questions, predictions,
  results, scores, badges, and leaderboard data.
- [x] Add World Cup teams and full squad-player reference data.
- [x] Add candidate flags for scorer, star player, Man of the Match, Golden
  Boot, and Golden Glove options.
- [x] Add question category constants and point values.
- [x] Add match importance templates: normal, big match, knockout, final.
- [x] Add anti-confusion helpers for knockout qualification and own goals.

## Phase 2. Player Frontend

- [x] Add `/fantasy` player routes.
- [x] Build player home with open polls, next deadline, current rank, today
  points, and latest recap.
- [x] Build upcoming polls screen grouped by match.
- [ ] Build poll answering UI for single choice, multiple choice, score range,
  exact score, player prediction, and time window questions.
- [x] Build My Predictions screen with open, locked, missed, and scored states.
- [ ] Build Tournament Predictions screen.
- [x] Build Leaderboard screen with rank, nickname, points, today, correct
  winners, streak, favorite team, and badges.
- [x] Build Results screen with correct answers and match points breakdown.
- [x] Build Rules screen with scoring tables and lock rules.
- [ ] Add component tests for poll selection, lock state, missed prediction, and
  leaderboard rendering.

## Phase 3. Admin Frontend

- [x] Add `/fantasy/admin` route boundary.
- [x] Build Tournament Setup screen.
- [x] Build Participants screen.
- [x] Build Teams and Squads import/edit screen.
- [x] Build Fixtures screen with match importance selection.
- [x] Build Question Templates screen.
- [x] Build Poll Management screen for AI drafts, editing, publishing, and manual
  lock.
- [x] Build Result Entry screen with all required result facts.
- [x] Build Score Review screen before publishing.
- [x] Build AI Agent Settings screen.
- [x] Add tests for admin result validation and score review display.

## Phase 4. Scoring Engine

- [x] Implement scoring rule version model.
- [x] Implement correct-answer resolver per question category.
- [x] Implement match prediction scoring.
- [ ] Implement tournament prediction scoring.
- [ ] Implement optional streak and fun bonus calculation.
- [x] Implement leaderboard calculation.
- [ ] Implement badge/award calculation.
- [ ] Add unit tests for winner, draw, first scoring team, first goal time, own
  goal, 90-minute result, qualifier, Man of the Match, and missed predictions.
- [x] Ensure scoring is idempotent for the same result version.

## Phase 5. Backend Foundation

- [x] Add server module structure under `server/fantasy/`.
- [x] Implement storage adapter with local test double.
- [ ] Implement tournament, participant, fixture, question, prediction, result,
  score, badge, team, squad-player, and audit records.
- [x] Implement World Cup squad import/update APIs.
- [x] Implement player read APIs.
- [x] Implement prediction submit API with server-owned lock validation.
- [ ] Implement admin setup APIs.
- [x] Implement result entry and score publish APIs.
- [x] Implement audit records for overrides and republishing.
- [ ] Add route tests for auth/identity, lock rejection, result publishing, and
  recalculation.

## Phase 6. AI Host

- [x] Define AI host prompt and JSON schema for question generation.
- [x] Implement question draft generation endpoint.
- [x] Feed stored World Cup squad-player context into AI question generation.
- [x] Reject AI-generated player options that are not present in the squad
  dataset unless they are explicit fallback options.
- [x] Validate AI output before saving drafts.
- [ ] Implement recap generation from result and score data.
- [ ] Implement reminder and daily leaderboard message generation.
- [ ] Add banter level setting with friendly-humor guardrails.
- [ ] Keep AI provider key server-side only.
- [x] Add fallback templates when AI generation fails.

## Phase 7. AWS And Cost Controls

- [x] Choose Lambda Function URL or API Gateway HTTP API for first release.
- [x] Define DynamoDB table and optional indexes.
- [x] Decide whether Cognito is needed for first release identity.
- [x] Add AWS Budget alert setup instructions.
- [x] Add CloudWatch 7-day log retention.
- [x] Add least-privilege IAM for API Lambda.
- [x] Add AWS staging deployment flow for Lambda Function URL and DynamoDB.
- [x] Add manual GitHub Actions workflow for backend staging deploy.
- [ ] Add optional EventBridge Scheduler for closure/reminders/recaps.
- [ ] Confirm no AI/provider secrets are present in frontend build assets.

## Phase 8. Verification

- [x] Run `yarn lint`.
- [x] Run `yarn typecheck`.
- [x] Run `yarn test`.
- [x] Run `yarn build`.
- [ ] Smoke test player join, poll answer, answer edit before lock, lock
  rejection, missed prediction, admin result entry, score review, publish, and
  leaderboard update.
- [ ] Verify mobile layouts at 320, 375, 390, 412, and 768 px.
- [ ] Verify desktop admin screens.
- [ ] Document rollback path for disabling prediction writes while keeping
  public browsing online.

## Future Phase. Automation And Scale

- [ ] Backlog badge/award calculation after AWS staging is enabled.
- [ ] Integrate football API fixtures and results.
- [ ] Add lineup-aware question generation.
- [ ] Add WhatsApp/Telegram integration.
- [ ] Add push notifications.
- [ ] Add multiple leagues per user.
- [ ] Add multiple simultaneous tournaments.
- [ ] Add global public leaderboard.
- [ ] Move to API Gateway HTTP API if needed.
- [ ] Materialize leaderboard rows for larger groups.
- [ ] Add queue-backed scoring fan-out if scheduled scoring becomes too slow.
- [ ] Add richer owner/admin tools and abuse controls.
