# Technical Steering

## Existing Baseline

The repository is a React 19, Vite, TypeScript PWA with React Router,
TanStack Query, normalized football provider models, and a small Node API layer.
The prediction game should extend these patterns instead of introducing a
separate frontend stack.

## Architecture Bias

Default to the smallest reliable serverless setup. The first audience is a
friends circle, so implementation simplicity comes first. Future scalability
should be preserved through clean boundaries, not built as upfront complexity.

Recommended first release:

- Amplify Hosting for the static PWA.
- Cognito only if login is needed for private saved predictions.
- One Lambda function for prediction-game APIs.
- DynamoDB on-demand for tournament, team, squad player, participant, question,
  prediction, result, score, and badge state.
- EventBridge Scheduler only for automatic poll closure/reminders if manual or
  request-time closure is not enough.
- CloudWatch logs with 7-day retention.
- AWS Budgets alert from day one.

Avoid for the first release:

- RDS, Aurora, OpenSearch, ElastiCache, ECS, EKS, long-running EC2, NAT
  gateways, WebSockets, and push infrastructure.
- Per-user provider API calls from page views.
- Public multi-tenant league abstractions.
- Large admin systems.
- High-cardinality metrics or verbose production logs.

## Backend Rules

- Browser state is never authoritative for lock status, points, results, or
  leaderboard ranks.
- Polls lock by server time. Predictions submitted after `closeAt` are rejected.
- Admin result entry creates a reviewable result record before points are
  published.
- Scoring must be deterministic and idempotent for a given scoring rules version
  and result version.
- AI-generated questions must be stored as structured questions before users can
  answer them.
- AI question generation should receive curated World Cup team and squad-player
  context from storage, not invent player names.
- Squad-player records are reference data for questions and scoring context, not
  fantasy squad gameplay state.
- AI-generated recap/banter text can be regenerated, but scored answers cannot
  change without an admin republish/recalculation.
- Admin overrides must create audit records.

## Frontend Rules

- Add prediction-game routes under `/fantasy` unless a better product name is
  chosen later.
- Use TanStack Query for server state and local component state for draft
  answers before submission.
- Keep question types structured: single choice, multiple choice, score range,
  exact score, player prediction, and time window.
- Add admin/import flows for World Cup teams and squad players, including
  positions and question-candidate flags.
- Keep admin screens separate from player screens.
- Offline behavior for prediction game is read-only unless a queued write design
  is approved.

## Future Scalability Paths

Keep these as future paths, not first-release requirements:

- API Gateway HTTP API instead of Lambda Function URL.
- Materialized leaderboards for larger groups.
- Multiple leagues and competitions per user.
- Football API integration for automatic fixtures/results.
- Queue-backed scoring fan-out.
- Push notifications and messaging integrations.
- Dedicated AI-agent worker.

## Quality Gates

Before shipping each prediction-game phase:

- `yarn lint`
- `yarn typecheck`
- `yarn test`
- Build succeeds with no provider or AI secrets in generated assets.
- Core mobile flows are checked at 375 px and desktop width.
- Locking, scoring, and admin override paths have tests.
