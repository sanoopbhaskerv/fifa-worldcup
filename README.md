# Full Time Football

A mobile-first React PWA for exploring major football competitions with live
fixtures, scores, standings, scorers, knockout brackets, and enriched match
details.

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

Static hosting cannot keep API keys secret because it only serves files. The
current deployment target is the built PWA in `dist/`. Deploy that folder to
your existing AWS static hosting setup.

Build the static artifact:

```bash
yarn build
```

Your static host should serve `dist/index.html` as the SPA fallback for deep
links such as `/competitions/world-cup/2026`.

Temporary live-data mode is available by setting `VITE_FOOTBALL_DATA_API_KEY`
and `VITE_API_FOOTBALL_API_KEY` at build time. This embeds the provider keys in
the generated browser assets. Use it only while you accept that users can
extract those keys from `dist/`.

### GitHub Actions Secrets

GitHub Actions secrets can provide the temporary build-time `VITE_*` provider
keys. The included `.github/workflows/static-build.yml` maps:

```yaml
VITE_FOOTBALL_DATA_API_KEY: ${{ secrets.FOOTBALL_DATA_API_KEY }}
VITE_API_FOOTBALL_API_KEY: ${{ secrets.API_FOOTBALL_API_KEY }}
```

That workflow builds and uploads `dist/` as an artifact. Add your existing AWS
upload step after the build if you want the workflow to deploy automatically.

Current split:

- Local development: use `.env` with `yarn dev`.
- Static production: deploy `dist/`; with `VITE_*` keys it attempts direct live
  provider calls from the browser, otherwise it uses demo fallback when `/api/*`
  is unavailable.
- GitHub Actions: store provider keys as repository secrets if using temporary
  static live mode.
- Future live production: add a real backend and keep provider keys server-side.

Provider CORS policies may still block direct browser calls. If that happens,
the app falls back to demo data until a backend is added.

### Docker

```bash
docker build -t full-time-football .
docker run --env-file .env -p 4173:4173 full-time-football
```

For any other GitHub-connected host, configure both keys as runtime secrets.
Do not inject them into a frontend build or GitHub Pages workflow.

## Architecture

- React Router for canonical lazy routes
- TanStack Query for caching, retries, and 60-second live polling
- Normalized provider boundary in `src/providers`
- Server normalizers and quota-aware caches in `server`
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
