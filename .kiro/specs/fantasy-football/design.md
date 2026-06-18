# Fantasy Football Prediction Game Design

## Architecture Summary

The feature is a private prediction game layered beside the existing public
football browser. Players answer structured polls, admin publishes results, the
backend calculates points, and an AI host generates question drafts and recap
messages.

```text
Browser PWA
  |
  | HTTPS
  v
Lambda Function URL or API Gateway HTTP API
  |
  v
Prediction Game API Lambda
  |
  +--> DynamoDB game state
  +--> Cognito or lightweight participant identity
  +--> AI provider for question/recap drafts, server-side only

Optional EventBridge Scheduler
  |
  v
Poll closure, reminders, daily recap jobs
```

Use Lambda Function URL for the first friends-circle version if it is enough.
Move to API Gateway HTTP API later when route auth, throttling, custom domains,
or richer observability justify it.

## Cost-Minimal AWS Plan

Use:

- Amplify Hosting for static assets.
- One Lambda for API routes.
- DynamoDB on-demand for game data.
- Cognito only if simple invite-code identity is not enough.
- EventBridge Scheduler only for automatic closure/reminder jobs.
- CloudWatch log retention set to 7 days.
- AWS Budget alert at a low monthly threshold.

Avoid initially:

- WebSockets, push notifications, RDS/Aurora, OpenSearch, ElastiCache, ECS, EKS,
  EC2, NAT gateways, and complex admin services.
- Direct browser calls to AI providers or football data providers.
- Real-time event scoring. First release can score when admin enters results.

## Frontend Routes

```text
/fantasy
/fantasy/polls
/fantasy/predictions
/fantasy/tournament
/fantasy/leaderboard
/fantasy/results
/fantasy/rules
/fantasy/admin
/fantasy/admin/tournament
/fantasy/admin/participants
/fantasy/admin/fixtures
/fantasy/admin/templates
/fantasy/admin/polls
/fantasy/admin/results
/fantasy/admin/score-review
/fantasy/admin/ai
```

Player routes should be mobile-first. Admin routes can be denser and more
operational.

## Player UX

Home:

- Open polls due soon.
- Next poll closure time.
- Current rank and total points.
- Today's points.
- Recent point changes and latest recap.

Upcoming Polls:

- Group by match and kickoff time.
- Show question count, max points, and poll close time.
- Use clear status labels: Open, Closing Soon, Locked, Scored.

My Predictions:

- Show submitted answers before lock.
- After lock, show locked state and eventual points.
- Keep missed predictions visible with 0 points to avoid confusion.

Leaderboard:

- Rank, nickname, total points, today's points, correct winners, streak, and
  favorite team.
- Highlight daily champion, biggest rank jump, and badge of the day.

Results:

- Match result, correct answers, player points from that match, and recap text.

## Admin UX

Tournament Setup:

- Tournament metadata, poll close settings, reminder settings, scoring rules
  version, and Man of the Match source.

Participants:

- Add/edit participant name, nickname, favorite team, avatar, and admin role.

Teams And Squads:

- Import or edit World Cup teams, groups, FIFA codes, and full squad-player
  details.
- Mark players as scorer candidates, star candidates, Man of the Match
  candidates, Golden Boot candidates, and Golden Glove candidates.
- Keep this dataset as AI/scoring reference data, not user-owned squad gameplay.

Fixtures:

- Use existing football competition fixtures where available.
- Allow manual fixture creation/editing for friends-circle control.
- Set match importance: Normal, Big Match, Knockout, Final.

Question Templates:

- Normal: 5 questions.
- Big match: up to 8 questions.
- Knockout: up to 8 questions.
- Final: up to 10 questions.
- Admin can edit templates without touching scoring code.

Poll Management:

- Generate AI draft questions for a match or day.
- Review, edit, and publish questions.
- Lock manually if needed.

Result Entry:

- Final score.
- Winner.
- First scoring team.
- First goal scorer.
- First goal minute.
- Anytime scorers.
- Players with 2+ goals.
- Man of the Match.
- Penalty awarded.
- Red card.
- Clean sheet.

Score Review:

- Show calculated points by participant and question.
- Publish scores and leaderboard.
- Recalculate after admin correction with audit trail.

AI Agent Settings:

- Tone.
- Banter level.
- Max questions by match importance.
- Poll close minutes before kickoff.
- Reminder timing.
- Publish leaderboard after each match.
- Publish daily summary.

## Domain Model

Suggested TypeScript types:

```ts
type FantasyQuestionType =
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "SCORE_RANGE"
  | "EXACT_SCORE"
  | "PLAYER"
  | "TIME_WINDOW";

type FantasyQuestionCategory =
  | "MATCH_WINNER"
  | "QUALIFIER"
  | "RESULT_90"
  | "FINAL_SCORE_RANGE"
  | "EXACT_SCORE"
  | "FIRST_SCORING_TEAM"
  | "FIRST_GOAL_TIME"
  | "FIRST_GOAL_SCORER"
  | "ANYTIME_GOAL_SCORER"
  | "STAR_PLAYER_SCORE"
  | "PLAYER_SCORES_2_PLUS"
  | "TOTAL_GOALS"
  | "BOTH_TEAMS_SCORE"
  | "CLEAN_SHEET"
  | "MAN_OF_THE_MATCH"
  | "PENALTY"
  | "RED_CARD"
  | "TOURNAMENT_WINNER"
  | "RUNNER_UP"
  | "FINALISTS"
  | "SEMI_FINALISTS"
  | "QUARTER_FINALISTS"
  | "GROUP_WINNER"
  | "GROUP_QUALIFIERS"
  | "GOLDEN_BOOT"
  | "GOLDEN_GLOVE"
  | "BEST_PLAYER";

type MatchImportance = "NORMAL" | "BIG_MATCH" | "KNOCKOUT" | "FINAL";

interface FantasyTournament {
  id: string;
  name: string;
  competitionId?: string;
  editionId?: string;
  startDate: string;
  endDate: string;
  status: "UPCOMING" | "LIVE" | "COMPLETE";
  pollCloseMinutesBeforeKickoff: number;
  scoringRulesVersion: string;
}

interface FantasyTeam {
  id: string;
  tournamentId: string;
  name: string;
  fifaCode: string;
  group?: string;
  rankingSeed?: number;
}

interface FantasySquadPlayer {
  id: string;
  tournamentId: string;
  teamId: string;
  name: string;
  position: "GK" | "DEF" | "MID" | "FWD";
  shirtNumber?: number;
  isScorerCandidate: boolean;
  isStarCandidate: boolean;
  isMotmCandidate: boolean;
  isGoldenBootCandidate: boolean;
  isGoldenGloveCandidate: boolean;
}

interface FantasyQuestion {
  id: string;
  tournamentId: string;
  matchId?: string;
  category: FantasyQuestionCategory;
  type: FantasyQuestionType;
  text: string;
  options: string[];
  points: number;
  selectionCount?: number;
  status: "DRAFT" | "OPEN" | "LOCKED" | "SCORED" | "VOID";
  closeAt: string;
}

interface FantasyPrediction {
  id: string;
  questionId: string;
  participantId: string;
  answer: string | string[] | { homeGoals: number; awayGoals: number };
  submittedAt: string;
  lockedAt?: string;
  pointsAwarded?: number;
}
```

## DynamoDB Shape

Table: `PredictionGame`

Suggested keys:

```text
PK=TOURNAMENT#<tournamentId>      SK=PROFILE
PK=TOURNAMENT#<tournamentId>      SK=TEAM#<teamId>
PK=TEAM#<teamId>                  SK=PLAYER#<playerId>
PK=TOURNAMENT#<tournamentId>      SK=PARTICIPANT#<participantId>
PK=TOURNAMENT#<tournamentId>      SK=MATCH#<matchId>
PK=TOURNAMENT#<tournamentId>      SK=QUESTION#<questionId>
PK=QUESTION#<questionId>          SK=PREDICTION#<participantId>
PK=MATCH#<matchId>                SK=RESULT#<resultVersion>
PK=MATCH#<matchId>                SK=SCORE#<participantId>#<questionId>
PK=TOURNAMENT#<tournamentId>      SK=LEADERBOARD#<paddedRank>#<participantId>
PK=TOURNAMENT#<tournamentId>      SK=BADGE#<date>#<badgeId>
PK=TOURNAMENT#<tournamentId>      SK=AUDIT#<timestamp>#<id>
```

For the first release, leaderboard rows may be computed on read from participant
score totals. Materialize rows only when reads become slow or when daily recap
generation benefits from stored rank movement.

## API Surface

Player reads:

- `GET /api/fantasy/tournament`
- `GET /api/fantasy/polls`
- `GET /api/fantasy/predictions`
- `GET /api/fantasy/leaderboard`
- `GET /api/fantasy/results`
- `GET /api/fantasy/rules`

Player writes:

- `POST /api/fantasy/join`
- `PUT /api/fantasy/predictions/:questionId`

Admin reads:

- `GET /api/fantasy/admin/participants`
- `GET /api/fantasy/admin/teams`
- `GET /api/fantasy/admin/teams/:teamId/squad`
- `GET /api/fantasy/admin/fixtures`
- `GET /api/fantasy/admin/templates`
- `GET /api/fantasy/admin/score-review/:matchId`

Admin writes:

- `POST /api/fantasy/admin/tournament`
- `POST /api/fantasy/admin/participants`
- `POST /api/fantasy/admin/teams/import`
- `PUT /api/fantasy/admin/teams/:teamId`
- `PUT /api/fantasy/admin/teams/:teamId/squad/:playerId`
- `PUT /api/fantasy/admin/fixtures/:matchId`
- `POST /api/fantasy/admin/questions/generate`
- `POST /api/fantasy/admin/questions/publish`
- `POST /api/fantasy/admin/polls/:matchId/lock`
- `POST /api/fantasy/admin/results/:matchId`
- `POST /api/fantasy/admin/results/:matchId/publish-scores`
- `POST /api/fantasy/admin/recaps/generate`

## AI Host Contract

Input:

```json
{
  "tournament": {
    "name": "Friend Prediction Leaague",
    "pollCloseMinutesBeforeKickoff": 15
  },
  "match": {
    "teamA": "Brazil",
    "teamB": "Argentina",
    "kickoffTime": "2026-06-15T20:30:00+05:30",
    "stage": "GROUP",
    "importance": "BIG_MATCH"
  },
  "teams": {
    "Brazil": {
      "starPlayers": ["Vinicius Jr", "Rodrygo", "Neymar"],
      "goalkeeper": "Alisson"
    },
    "Argentina": {
      "starPlayers": ["Messi", "Julian Alvarez", "Lautaro Martinez"],
      "goalkeeper": "Emiliano Martinez"
    }
  },
  "rules": {
    "maxQuestions": 8,
    "includeFirstGoalScorer": true,
    "includeBanter": true
  }
}
```

Output must be structured JSON with `introMessage`, `pollCloseAt`, and
questions. The server validates categories, types, options, point values, and
question count before saving drafts.

For player-based questions, the server should build the AI input from stored
World Cup squad-player records. The AI may choose among provided candidates, but
the backend should reject options that reference unknown players unless the
option is the explicit `Other`, `Own Goal`, `No goal`, or category-specific
fallback.

## Scoring Pipeline

1. Polls are published with structured questions.
2. Players submit predictions while questions are open.
3. Polls lock at `closeAt` by server time.
4. Admin enters match result facts.
5. Backend calculates correct answers by question category.
6. Backend awards points per prediction and stores score rows.
7. Admin reviews calculated scores.
8. Admin publishes scores, leaderboard, badges, and recap.

## Anti-Confusion Rules

- Knockout `RESULT_90` and `QUALIFIER` are separate categories.
- Own goal: first goal scorer answer is `Own Goal`.
- Own goal: first scoring team is the team that receives the goal.
- If a player does not play, the locked prediction still stands.
- Man of the Match source must be configured before the tournament.
- AI-generated player options must come from the stored World Cup squad dataset
  or from explicit fallback options.

## Visual Direction

- Keep the existing premium football visual system, but make fantasy pages feel
  like a live game room.
- Use poll cards, deadline chips, rank movement arrows, badge chips, and recap
  panels.
- The first signed-in screen should be functional, not a marketing hero.
- Use friendly, compact copy. Do not explain the whole feature inside the UI.
- Cards are for polls, result rows, leaderboard rows, and admin review items.
- Mobile poll answering must be thumb-friendly with clear selected states.

## Launch Phases

Phase 1: Local prediction shell

- Mock tournament, participants, fixtures, question templates, prediction
  submission, World Cup squad reference data, leaderboard, and result pages.

Phase 2: Admin and scoring

- Admin setup, poll generation/review, result entry, score calculation, score
  review, publishing, and recaps.

Phase 3: Serverless persistence

- Lambda API, DynamoDB storage, optional Cognito/invite identity, server-owned
  locking, audit records, and budget/log controls.

Phase 4: AI host

- Structured question generation, recap generation, reminders, banter settings,
  and validation.

Future phase: automation and scale

- Football API result integration, lineup-aware questions, WhatsApp/Telegram
  integration, push notifications, multiple leagues, multiple tournaments,
  public leaderboards, materialized leaderboard rows, and queue-backed scoring.
