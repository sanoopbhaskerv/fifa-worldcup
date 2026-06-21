# Full Time Football

A mobile-first React PWA for exploring major football competitions with live
fixtures, scores, standings, scorers, knockout brackets, and enriched match
details.

## Fantasy Football Prediction Game Planning

Kiro-style planning docs for the friends-circle Fantasy Football prediction
game live under `.kiro`:

- `.kiro/steering/product.md`
- `.kiro/steering/tech.md`
- `.kiro/steering/structure.md`
- `.kiro/specs/fantasy-football/requirements.md`
- `.kiro/specs/fantasy-football/design.md`
- `.kiro/specs/fantasy-football/tasks.md`

Use those docs as the product, architecture, cost, design, and task source of
truth before implementing prediction polls, scoring, leaderboards, admin result
entry, and AI-hosted recaps.

## Prerequisites

- Node.js 20 or newer
- Yarn Classic 1.22
- football-data.org API key
- API-Football API key

## Local Setup

```bash
yarn install
cp .env.example .env
```

Add the server-only keys to `.env`:

```dotenv
FOOTBALL_DATA_API_KEY=...
API_FOOTBALL_API_KEY=...
API_FOOTBALL_DAILY_BUDGET=90
```

To enable Gemini AI for the fantasy prediction game, add these server-only keys:

```dotenv
# Select the Gemini provider (Google AI Studio)
FANTASY_AI_PROVIDER=gemini

# API key from https://aistudio.google.com
FANTASY_AI_API_KEY=...

# Model name — gemini-2.0-flash is recommended (free tier)
FANTASY_AI_MODEL=gemini-2.0-flash

# Daily call limit (0 = disabled; deployment max is 50)
FANTASY_AI_DAILY_CALL_LIMIT=20

# Estimated cost in cents per call (0 for free-tier Gemini)
FANTASY_AI_ESTIMATED_COST_CENTS=0

# Max output tokens per call (300–600 for host messages, auto-doubled for drafts)
FANTASY_AI_MAX_OUTPUT_TOKENS=300
```

These keys must also be set as Lambda environment variables when deploying the fantasy backend on AWS. They are never exposed in browser assets.

Do not prefix local server secrets with `VITE_`. Vite-prefixed values are
compiled into browser code. `.env` is ignored by Git.

Run the integrated web and API development server:

```bash
yarn dev
```

## Commands

```bash
yarn dev        # Vite plus local /api middleware
yarn lint       # ESLint
yarn typecheck  # Strict TypeScript
yarn test       # Unit and component tests
yarn build      # Production PWA build
yarn preview    # Preview build with local /api middleware
yarn start      # Production Node static/API server
yarn deploy:fantasy:staging  # Package and deploy the fantasy Lambda staging stack
```

## Provider Architecture

The browser only calls same-origin `/api/*` routes. Keys are read by Node and
are never sent to React.

### football-data.org

Used for competition-level data:

- Fixtures and results
- Delayed live scores
- League and group standings
- Top scorers
- Knockout matches
- Team crests

Live competition pages poll every 60 seconds only while a match is live.
Server-side caches use a 55-second match TTL, 10-minute standings TTL, and
one-hour scorer TTL to stay within the 10-request-per-minute limit.

Implemented mappings:

| App competition | Provider code |
| --- | --- |
| FIFA World Cup | `WC` |
| UEFA EURO | `EC` |
| Champions League | `CL` |
| Premier League | `PL` |
| La Liga | `PD` |
| Serie A | `SA` |
| Bundesliga | `BL1` |
| Ligue 1 | `FL1` |

Unmapped competitions retain the typed mock fallback and display a clear notice.

### API-Football

Called only when a user opens a match. It supplies:

- Goal, card, and substitution events
- Starting elevens and substitutes
- Formations and coaches
- Team statistics
- Referee information

The server caches the date-level fixture resolution and each detail endpoint.
`API_FOOTBALL_DAILY_BUDGET` defaults to 90, leaving headroom below the
100-request free quota.

On June 15, 2026, this free account allowed fixture queries only for the
provider's current rolling date window (June 14–16, 2026). It rejected the
2025 season, historical date requests, and the `last` parameter. Match pages
outside the permitted window therefore show football-data.org information plus
an honest detail-availability notice.

## Data Fallback

`HybridFootballDataProvider` tries the live API first. Unsupported competitions,
unavailable editions, rate limits, and outages fall back to bundled normalized
demo data without breaking routes. The UI always labels the active source as
`Live provider` or `Demo fallback`.

## PWA and Offline Behavior

The production service worker:

- Precaches the application shell and lazy route chunks
- Uses an SPA navigation fallback
- Caches same-origin `/api/` responses with stale-while-revalidate
- Shows offline, saved-data, and update-ready indicators
- Supports installed standalone layouts and mobile safe areas

Use `yarn build && yarn start` for realistic service-worker testing.

## Deployment

Amplify Hosting is serving a static Vite build. Static hosting cannot keep API
keys secret because it only serves files. The current deployment target is the
built PWA in `dist/`.

Build the static artifact:

```bash
yarn build
```

Amplify should serve `dist/index.html` as the SPA fallback for deep links such
as `/competitions/world-cup/2026`.

Temporary live-data mode is available by setting `VITE_FOOTBALL_DATA_API_KEY`
and `VITE_API_FOOTBALL_API_KEY` at build time. This embeds the provider keys in
the generated browser assets. Use it only while you accept that users can
extract those keys from `dist/`.

### AWS Amplify Environment Variables

The included `amplify.yml` installs dependencies with Yarn, runs lint,
typecheck, tests, and builds `dist/`.

For temporary static live mode, add these environment variables in Amplify
Hosting:

- `VITE_FOOTBALL_DATA_API_KEY`
- `VITE_API_FOOTBALL_API_KEY`
- `VITE_FOOTBALL_DATA_BASE_URL=/football-data/v4`
- `VITE_API_FOOTBALL_BASE_URL=/api-football`
- `VITE_API_FOOTBALL_DAILY_BUDGET` optional, defaults to `90`

These values are available during the Amplify build and are embedded into the
generated Vite assets. They are encrypted in Amplify configuration, but they are
not secret after the static app is built.

To avoid browser CORS failures while still accepting temporary key exposure,
configure Amplify Hosting rewrites:

```json
[
  {
    "source": "/football-data/<*>",
    "target": "https://api.football-data.org/<*>",
    "status": "200",
    "condition": null
  },
  {
    "source": "/api-football/<*>",
    "target": "https://v3.football.api-sports.io/<*>",
    "status": "200",
    "condition": null
  },
  {
    "source": "</^[^.]+$|\\.(?!(css|gif|ico|jpg|jpeg|js|png|txt|svg|woff|woff2|ttf|map|json|webmanifest)$)([^.]+$)/>",
    "target": "/index.html",
    "status": "200",
    "condition": null
  }
]
```

With those settings, the browser calls your Amplify domain, for example
`/football-data/v4/competitions/WC/matches?season=2026`, and Amplify proxies the
request to football-data.org. The `X-Auth-Token` header is still visible in the
browser request, but the CORS check is against your own Amplify origin.

Current split:

- Local development: use `.env` with `yarn dev`.
- Static production: deploy `dist/`; with `VITE_*` keys it attempts direct live
  provider calls from the browser, otherwise it uses demo fallback when `/api/*`
  is unavailable.
- Amplify Hosting: set provider keys as branch environment variables if using
  temporary static live mode.
- Fantasy backend: use the Lambda Function URL + DynamoDB template in
  `infra/fantasy-api.cloudformation.yml` for the friends-circle prediction game.

Provider CORS policies may still block direct browser calls. If that happens,
use the Amplify rewrite rules above or fall back to demo data until a backend is
added.

### Fantasy API On AWS

The first fantasy backend target is intentionally small: one Lambda Function URL,
one DynamoDB on-demand table, 7-day CloudWatch log retention, least-privilege
table access, and an optional USD budget alert.

For staging, create or reuse a private deployment-artifact S3 bucket, then run:

```bash
ARTIFACT_BUCKET=YOUR_ARTIFACT_BUCKET \
CORS_ALLOW_ORIGIN=https://develop.d32ngvag2hklf1.amplifyapp.com \
FOOTBALL_DATA_API_KEY=YOUR_FOOTBALL_DATA_KEY \
API_FOOTBALL_API_KEY=YOUR_API_FOOTBALL_KEY \
BUDGET_ALERT_EMAIL=you@example.com \
yarn deploy:fantasy:staging
```

Optional staging overrides:

- `AWS_REGION`, default `us-east-1`
- `STACK_NAME`, default `fantasy-prediction-game-staging`
- `APP_NAME`, default `fantasy-prediction-game-staging`
- `ARTIFACT_PREFIX`, default `fantasy-api`
- `MONTHLY_BUDGET_USD`, default `5`
- `LAMBDA_RESERVED_CONCURRENCY`, default `2`
- `FOOTBALL_DATA_API_KEY`, optional server-side football-data.org key
- `API_FOOTBALL_API_KEY`, optional server-side API-Football key
- `API_FOOTBALL_DAILY_BUDGET`, default `90`

The script packages `server/`, `package.json`, `yarn.lock`, and production
`node_modules`, uploads the zip to S3, deploys the CloudFormation stack, and
prints the stack outputs including `FantasyApiUrl`.

#### GitHub Actions Staging Deploy

After the local staging deploy succeeds, use the manual GitHub Actions workflow
`.github/workflows/fantasy-backend-staging.yml` for repeatable backend deploys.
It is intentionally `workflow_dispatch` only until staging is proven.

Required GitHub repository secrets:

- `AWS_ROLE_TO_ASSUME`: IAM role ARN trusted by GitHub OIDC for this repository.
- `FANTASY_ARTIFACT_BUCKET`: private S3 bucket used for Lambda zip artifacts.
- `FOOTBALL_DATA_API_KEY`: server-side football-data.org key.
- `API_FOOTBALL_API_KEY`: server-side API-Football key.

Optional GitHub repository secret:

- `FANTASY_BUDGET_ALERT_EMAIL`: email recipient for the optional AWS Budget.

The workflow runs `yarn lint`, `yarn typecheck`, and `yarn test`, then calls the
same `yarn deploy:fantasy:staging` script used locally. Default CORS origin is
`https://develop.d32ngvag2hklf1.amplifyapp.com`.

Keep CI/CD manual until:

- Local script deploy has succeeded once.
- `curl "$FANTASY_API_URL/api/fantasy/game"` returns the DynamoDB-backed game.
- Amplify has been rebuilt with `VITE_FANTASY_API_BASE_URL`.
- Join, prediction submit, result publish, and leaderboard smoke checks pass.

Manual deployment is still possible if you already have a zip artifact:

```bash
aws cloudformation deploy \
  --template-file infra/fantasy-api.cloudformation.yml \
  --stack-name fantasy-prediction-game-staging \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    AppName=fantasy-prediction-game-staging \
    LambdaS3Bucket=YOUR_ARTIFACT_BUCKET \
    LambdaS3Key=YOUR_ARTIFACT_KEY.zip \
    CorsAllowOrigin=https://YOUR_FRONTEND_DOMAIN \
    BudgetAlertEmail=you@example.com \
    LambdaReservedConcurrency=2
```

Runtime variables set by the template:

- `FANTASY_DYNAMODB_TABLE`
- `CORS_ALLOW_ORIGIN`
- `FOOTBALL_DATA_API_KEY`
- `API_FOOTBALL_API_KEY`
- `API_FOOTBALL_DAILY_BUDGET`

Scheduled fixture/result automation is documented in
[docs/scheduled-match-automation.md](docs/scheduled-match-automation.md).
It is disabled by default. When `FantasyMatchAutomationEnabled=true`, the default
frequency is every 1 hour through `FantasyMatchAutomationScheduleExpression`.

The Lambda entrypoint is `server/aws/lambda.handler`. The server uses local
memory storage by default and switches to DynamoDB when
`FANTASY_DYNAMODB_TABLE` is present.

The CloudFormation template lets the Lambda Function URL handle browser CORS.
The handler only emits CORS headers for normal responses when
`EMIT_LAMBDA_CORS_HEADERS=true` is set, which is intended for non-Function-URL
deployments. Do not set that flag for this staging stack, otherwise browsers can
reject duplicate `Access-Control-Allow-Origin` headers.

To connect the static frontend directly to this staging API for both fantasy and
competition data, set one of these build-time environment variables in Amplify
Hosting:

```dotenv
VITE_BACKEND_API_BASE_URL=https://YOUR_FUNCTION_URL_WITHOUT_TRAILING_SLASH
VITE_FANTASY_API_BASE_URL=https://YOUR_FUNCTION_URL_WITHOUT_TRAILING_SLASH
```

`VITE_BACKEND_API_BASE_URL` is preferred for new setups. `VITE_FANTASY_API_BASE_URL`
is still supported as an alias because the same Lambda handles all `/api/*`
routes.

This exposes only the API URL, not provider keys. Remove
`VITE_FOOTBALL_DATA_API_KEY`, `VITE_API_FOOTBALL_API_KEY`, and
`VITE_API_FOOTBALL_KEY` from Amplify once the Lambda backend is enabled. Keep
`FOOTBALL_DATA_API_KEY`, `API_FOOTBALL_API_KEY`, and future AI provider keys
server-side.

Staging smoke checks after deploy:

```bash
curl "$FANTASY_API_URL/api/health"
curl "$FANTASY_API_URL/api/fantasy/game"
curl -X POST "$FANTASY_API_URL/api/fantasy/join" \
  -H "content-type: application/json" \
  -d '{"inviteCode":"SANOOP2026"}'
```

Rollback path for staging is simple: unset `VITE_FANTASY_API_BASE_URL` in the
frontend build to return fantasy reads to local/demo fallback behavior, or set
the Lambda reserved concurrency to `1` while preserving public browsing:

```bash
aws lambda put-function-concurrency \
  --function-name fantasy-prediction-game-staging \
  --reserved-concurrent-executions 1
```

First-release identity uses admin-created participant invite codes, not Cognito.
Local seed codes are `SANOOP2026` and `ANOOP2026`; the browser stores the joined
participant id in local storage and sends that id with prediction writes.

### Docker

```bash
docker build -t full-time-football .
docker run --env-file .env -p 4173:4173 full-time-football
```

For any server-capable host, configure both keys as runtime secrets. Do not
inject provider keys into frontend builds once the app is public.

## Architecture

- React Router for canonical lazy routes
- TanStack Query for caching, retries, and 60-second live polling
- Normalized provider boundary in `src/providers`
- Server normalizers and quota-aware caches in `server`
- Fantasy prediction API boundary in `server/fantasy` with local and DynamoDB
  storage adapters
- Local storage for favorites, recents, and last selection
- Framer Motion for restrained transitions
- Workbox-generated PWA service worker

See [DESIGN.md](./DESIGN.md) and [TODO.md](./TODO.md).

## Adding a Competition

1. Add catalog metadata to `src/mocks/catalog.ts`.
2. Add football-data.org and API-Football mappings to
   `server/provider-config.mjs` when available.
3. Set accurate capabilities and active editions.
4. Add normalizer fixtures/tests for any new provider behavior.

## Known Limitations

- football-data.org live scores are delayed.
- API-Football detail coverage is constrained by its current free-plan window.
- Some competitions use demo fallback because football-data.org does not cover
  them on the free tier.
- Venue and attendance data are not always supplied.
- Protected competition branding is not copied; provider team crests are used
  when available.
