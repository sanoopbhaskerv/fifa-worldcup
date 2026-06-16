# Full Time Football PWA — Design and Architecture

## 1. Product Summary

Full Time is a public, mobile-first Progressive Web App for browsing major
international and club football competitions.

The default first-run experience is:

- Competition: FIFA World Cup
- Edition: Latest supported edition
- Route: `/competitions/world-cup/2026`

The app must remain useful without API credentials. A typed mock provider will
ship with realistic data and exercise all major competition formats.

Authentication and fantasy football are explicitly out of scope. Domain and
provider boundaries should allow those features to be added later without
coupling them to the public browsing experience.

## 2. Core User Flows

1. Open the app and see the latest FIFA World Cup overview.
2. Switch competition or edition while preserving the current supported section.
3. Search and filter fixtures or results.
4. Open a match to inspect events and available details.
5. Browse group or league standings.
6. Follow progression through a mobile-friendly knockout bracket.
7. Browse top scorers.
8. Favorite competitions and quickly reopen recent selections.
9. Refresh or relaunch and retain the last selection.
10. Reopen recently viewed content while offline.

## 3. Supported Competition Catalog

The catalog is configuration-driven. Initial entries:

### International

- FIFA World Cup
- FIFA Women's World Cup
- UEFA European Championship
- Copa América
- Africa Cup of Nations
- AFC Asian Cup
- CONCACAF Gold Cup
- UEFA Nations League

### Club

- UEFA Champions League
- UEFA Europa League
- UEFA Conference League
- English Premier League
- La Liga
- Serie A
- Bundesliga
- Ligue 1
- Major League Soccer
- Copa Libertadores

The mock provider must contain detailed datasets for at least:

- FIFA World Cup: group and knockout format
- English Premier League: round-robin league
- UEFA Champions League: combined league/knockout format with two-legged ties

Other catalog entries may initially reuse generated, normalized demo data, but
must not produce blank core screens.

## 4. Technical Stack

- Yarn Classic 1.22
- React 19 with strict TypeScript
- Vite 7
- React Router 7
- TanStack Query 5
- Framer Motion 12
- Plain CSS with design tokens and responsive utilities
- `vite-plugin-pwa` with Workbox
- Vitest and Testing Library
- ESLint 9 flat configuration

Do not add a large state library or UI component framework.

## 5. Architecture

Feature-oriented source layout:

```text
src/
  app/                 App composition, router, providers, boundaries
  components/          Shared presentational primitives
  features/
    competitions/      Picker, favorites, recents
    editions/          Edition selection
    matches/           Fixtures, results, cards, details
    standings/         League and group tables
    brackets/          Knockout rounds and ties
    scorers/           Scorer lists
  hooks/               Shared browser and persistence hooks
  mocks/               Catalog and realistic normalized datasets
  providers/           Provider interface and implementations
  services/            Query keys and provider-facing query functions
  styles/              Global tokens and layout
  test/                Test setup and reusable test helpers
  types/               Normalized domain models
  utils/               Dates, routes, filters, standings logic
```

### Domain Boundary

UI components consume only normalized models from `src/types/domain.ts`.
Provider-specific payloads must be normalized before reaching the UI.

The `FootballDataProvider` interface is the data access boundary:

```ts
interface FootballDataProvider {
  getCompetitions(): Promise<Competition[]>;
  getCompetitionData(
    competitionId: string,
    editionId: string,
  ): Promise<CompetitionData>;
  getMatchDetails(match: Match): Promise<MatchDetails>;
}
```

The implemented browser provider calls same-origin `/api` routes. The Node
layer uses football-data.org for competition pages and API-Football for
on-demand match enrichment. Private keys remain runtime-only and are never
bundled into browser JavaScript.

### Live Provider Boundary

- `server/football-data.mjs`: fixtures, results, standings, scorers, crests
- `server/api-football.mjs`: events, lineups, statistics, officials
- `server/handler.mjs`: same-origin API routing
- `server/cache.mjs`: request deduplication and provider-aware TTLs
- `src/providers/hybrid-football-provider.ts`: explicit live-to-mock fallback

Static hosting cannot keep runtime provider keys secret. The repository
therefore separates the static PWA build from any future API backend. The
current deployment path is `yarn build` and publishing `dist/` to the user's
existing AWS static hosting setup. As a temporary tradeoff, GitHub Actions can
inject provider keys into `VITE_*` build variables, and the browser will call
the providers directly. Those keys are exposed in built assets and this path
must be replaced by a backend before public launch.

### State Ownership

- URL: competition, edition, section, match ID, shareable filters
- TanStack Query: competition catalog and all football server state
- Local storage: favorites, recents, last selection, user preferences
- Local component state: open dialogs and transient interaction state

No application-wide mutable state store is planned.

### Routing

Canonical routes:

```text
/
/competitions/:competitionSlug/:editionId
/competitions/:competitionSlug/:editionId/fixtures
/competitions/:competitionSlug/:editionId/results
/competitions/:competitionSlug/:editionId/standings
/competitions/:competitionSlug/:editionId/bracket
/competitions/:competitionSlug/:editionId/scorers
/competitions/:competitionSlug/:editionId/matches/:matchId
```

`/` redirects to the persisted last selection when valid, otherwise to the
latest FIFA World Cup edition.

Changing competition or edition preserves the active section only when the new
competition supports it. Unsupported sections redirect to overview and show a
short explanatory notice where appropriate.

All section routes should be lazy-loaded.

### Capability-Driven UI

Each competition supplies:

- `hasStandings`
- `hasGroups`
- `hasBracket`
- `hasScorers`
- `hasLineups`
- `hasLiveEvents`
- `hasMatchStats`
- `hasTwoLeggedTies`

Navigation and detail sections are derived from these flags. Unsupported
features are hidden rather than rendered as broken or permanently empty views.

## 6. Data and Query Behavior

Suggested query keys:

```ts
["competitions"]
["competition", competitionId, editionId]
```

Defaults:

- Data remains fresh for a short period to prevent unnecessary refetches.
- Recently viewed competition data remains cached for offline use.
- Retry transient failures, but do not repeatedly retry rate-limit responses.
- Preserve existing data during background refresh.
- Expose `dataUpdatedAt`, fetch state, and errors to the shell.

The mock provider should simulate a small delay. It may optionally support
deterministic error modes for tests, but production mock browsing must be
reliable.

## 7. Visual System

The design should feel like a premium global football product without copying
protected competition or broadcaster identities.

### Direction

- Deep stadium green background
- Warm off-white primary text
- Energetic acid-lime product accent
- Per-competition configurable accent
- Strong editorial typography and compact score typography
- Layered cards with restrained borders and shadows
- Minimal glass effects
- Original letter-based team badges and competition emblems

Current base colors:

```text
Canvas:       #07130f
Surface:      #0d1d17
Surface 2:    #13261f
Text:         #f7f8f2
Muted:        #9dafA5
Accent:       #c9ff47
Danger:       #ff6b62
Warning:      #ffca58
```

Competition accents may override the product accent for decorative highlights,
but interaction affordances must remain consistent and accessible.

### Responsive Navigation

- Sticky top bar on all sizes
- Mobile bottom navigation with safe-area padding
- Horizontally scrollable contextual tabs when necessary
- Desktop sidebar or top-level section navigation
- Minimum touch target: 44 by 44 CSS pixels

### Tables and Brackets

- Tables use a sticky team column on narrow screens.
- Secondary statistics may scroll horizontally inside the table region only.
- Zone meaning includes labels or text, not color alone.
- Brackets become a round-by-round vertical carousel/list on mobile.
- Desktop may display connected columns, but mobile is the primary design.

### Motion

Framer Motion is limited to:

- Route/content transitions
- Picker/dialog transitions
- Active tab indicator
- Filter result transitions
- Expandable match details
- Update notification

Respect `prefers-reduced-motion`. Avoid continuous decorative animation.

## 8. Screen Requirements

### Overview

- Competition and edition identity
- Live match or next-match hero
- Recent results
- Upcoming fixtures
- Current leader or defending champion
- Key statistics
- Capability-aware quick links

### Fixtures

- Group by calendar date
- Status filters: all, live, upcoming, postponed, completed
- Team, stage/group, and round filters
- Local kickoff time
- Venue, stage, score, and status

### Results

- Completed matches grouped by date
- Final, extra-time, penalty, and aggregate treatments
- Search and stage/round filtering
- Links to match details

### Standings

- League and group tables
- P, W, D, L, GF, GA, GD, points, form
- Accessible zone descriptions
- Narrow-screen usability

### Bracket

- Round of 32 where applicable through final
- Third-place match
- Two-legged tie aggregate display
- Extra-time and penalties
- Clear winner progression

### Scorers

- Rank, player, team, goals, assists, matches
- Minutes and penalties when available
- No unlicensed player imagery

### Match Details

- Score, status, local time, venue, stage, round
- Aggregate and penalty context
- Timeline and major events
- Conditional lineups, stats, and officials sections
- Honest partial-data messaging

## 9. Persistence

Use versioned local-storage keys:

```text
full-time:favorites:v1
full-time:recents:v1
full-time:last-selection:v1
full-time:preferences:v1
```

Rules:

- Favorites are stable competition IDs.
- Recents are deduplicated and capped, for example at five.
- Last selection contains competition slug and edition ID.
- Invalid or removed values are ignored safely.
- Storage access handles privacy mode and quota exceptions.

## 10. PWA and Offline Design

The manifest and base icon assets already exist.

Required behavior:

- Installable standalone experience
- Offline application shell
- Precache built JS, CSS, HTML, fonts, and icons
- Cache recently used football data
- Visible offline indicator
- Visible stale-data and last-updated treatment
- Prompt when a new service worker version is ready
- iOS standalone metadata and safe-area support

Because the initial provider is local mock data bundled with the application,
core data remains available offline after the application shell has been cached.
The caching boundary must still support future `/api/` responses.

## 11. Accessibility

Target WCAG 2.1 AA where practical:

- Semantic landmarks and headings
- Skip link
- Keyboard-accessible picker and menus
- Proper dialog naming and focus behavior
- Visible `:focus-visible` indicators
- Accessible tabs and tables
- `aria-live` announcements for loading and network state
- Text labels for statuses and standings zones
- Contrast-safe colors
- Reduced-motion support

## 12. Error and Empty States

Never render a blank page.

Provide distinct treatments for:

- Initial loading
- Background refresh
- Invalid route or edition
- Unsupported feature
- Provider error
- Rate limit
- Offline with cache
- Offline without cache
- Stale cached data
- Empty filters
- Partial match data
- Postponed or cancelled match

Use a route-level error boundary and a global React error boundary.

## 13. Testing Strategy

### Unit Tests

- Provider normalization
- Capability-derived navigation
- Edition fallback and route generation
- Local-time date formatting
- Fixture/result filters
- Goal difference and standings zones
- Knockout winner and aggregate logic
- Safe persistence helpers

### Component Tests

- Competition picker
- Edition selector
- Match card
- Navigation
- Standings table
- Mobile bracket
- Scorer list
- Offline/stale indicators

### End-to-End/Browser Verification

At minimum manually verify:

- 320, 375, 390, and 412 pixel mobile widths
- Tablet portrait and landscape
- Desktop
- No document-level horizontal overflow
- Keyboard navigation
- Default and persisted routing
- Competition and edition switching
- Match deep link
- Offline reload after first visit
- Service worker update prompt

## 14. Documentation Requirements

The final `README.md` must cover:

- Prerequisites and Yarn commands
- Environment variables
- Provider selection and proxy requirement
- Mock provider behavior
- Supported competitions and limitations
- PWA/offline behavior
- Testing and production build
- Deployment
- High-level architecture
- Adding a competition

## 15. Important Decisions and Assumptions

- The repository began empty except for `.gitignore`.
- Yarn is required by the user. Do not switch to npm or pnpm.
- The app uses plain CSS rather than Tailwind to avoid another build layer and
  keep design tokens explicit.
- Protected logos, club crests, and player photography are not used. Original
  text emblems and generated team badges provide a consistent fallback.
- The hosted frontend is static for now. Temporary production live provider data
  may use build-time `VITE_*` keys in browser assets. A future same-origin
  `/api` backend is required to secure those keys.
- Current-date-sensitive content must not imply that mock scores are live facts.
  Clearly label the application as demo data where appropriate.
