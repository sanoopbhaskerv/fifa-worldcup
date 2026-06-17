# Fantasy Football Prediction Game Requirements

## Overview

Build a lightweight prediction-based fantasy football game for a private
friends circle. Players answer match and tournament prediction polls, polls lock
before kickoff, results are entered or imported, points are calculated, and the
AI host posts reminders, recaps, leaderboard updates, and friendly banter.

The first release is not a squad-building fantasy game. Squad budgets,
transfers, captaincy, benches, and player marketplaces are out of scope.
Scalability should remain possible later, but public-platform features are out
of scope now.

## Personas

- Player: wants fast polls, clear points, a leaderboard, and fun bragging rights.
- Admin/owner: wants to set up the tournament, manage polls, enter results,
  review scoring, and publish recaps without heavy operations.
- AI host: generates structured questions and friendly messages, but does not
  own scoring authority.

## Requirements

### R1. Tournament Setup

User story: As the admin, I want to create one friends tournament so that the
game has fixtures, rules, participants, and scoring settings.

Acceptance criteria:

- The system shall support one active tournament for the first release.
- The tournament shall include name, start date, end date, teams, groups,
  fixtures, participants, scoring rules, poll closing rule, and reminder rule.
- The default poll close rule shall be 15 minutes before kickoff.
- Tournament predictions shall close before the first match starts.
- The system shall support match importance levels: `NORMAL`, `BIG_MATCH`,
  `KNOCKOUT`, and `FINAL`.

### R2. Participants

User story: As a friend, I want to join with a nickname and favorite team so
that the leaderboard feels personal.

Acceptance criteria:

- Participants shall have name, nickname, favorite team, and optional avatar.
- Nicknames shall be shown on leaderboards and recaps.
- The system shall prevent duplicate participant entries for the same identity.
- The first release may use invite code, email, or admin-created participants.

### R3. Question Types

User story: As a player, I want simple prediction questions so that I can answer
quickly before matches.

Acceptance criteria:

- The system shall support single choice questions.
- The system shall support multiple choice questions with a configured selection
  count.
- The system shall support score range questions.
- The system may support exact score questions for big matches and finals.
- The system shall support player prediction questions with an `Other` option.
- The system shall support time-window questions for first goal timing.

### R4. World Cup Squad Reference

User story: As the admin, I want the full World Cup squad details stored so that
the AI host can create realistic player-based questions and options.

Acceptance criteria:

- The system shall support World Cup team records with country name, FIFA code,
  group, and optional ranking/seed metadata.
- The system shall support full squad-player records for each World Cup team.
- Each squad player shall include name, team, position, and optional shirt
  number.
- Player positions shall use `GK`, `DEF`, `MID`, and `FWD`.
- Squad players shall support question-candidate flags for scorer, star player,
  Man of the Match, Golden Boot, and Golden Glove generation.
- Goalkeeper candidates shall be used for Golden Glove options.
- Scorer and star candidates shall be used for first goal scorer, anytime
  scorer, and star-player-score questions.
- The AI host shall use this dataset as context and shall not invent player
  names when generating options.
- Admin shall be able to import and edit the dataset manually for the first
  release.
- This dataset is reference data only and shall not introduce squad-building,
  transfers, captaincy, or user-owned fantasy squads.

### R5. Match Question Templates

User story: As the admin, I want templates so that normal matches stay simple
and big matches feel special.

Acceptance criteria:

- Normal matches shall default to 5 questions.
- Big matches shall default to up to 8 questions.
- Knockout matches shall default to up to 8 questions.
- Finals shall default to up to 10 questions.
- The system shall clearly separate "result after 90 minutes" from "who
  qualifies" for knockout matches.
- Admin shall be able to review AI-generated questions before publishing in the
  first release.

### R6. Tournament Predictions

User story: As a player, I want long-term predictions before the tournament so
that I stay invested across the whole competition.

Acceptance criteria:

- The system shall support tournament winner, runner-up, finalists,
  semi-finalists, quarter-finalists, group winners, group qualifiers, Golden
  Boot, Golden Glove, and Player of the Tournament questions.
- Tournament predictions shall carry higher points than normal match questions.
- Tournament predictions shall not be editable after tournament prediction lock.

### R7. Prediction Submission And Locking

User story: As a player, I want to submit and review my answers before polls
close.

Acceptance criteria:

- Players shall be able to answer open questions.
- Players shall be able to change answers until the poll closes.
- Predictions submitted after `closeAt` shall be rejected.
- Locked predictions shall remain visible to the player.
- Missed predictions shall score 0 points.
- Manual exceptions after closure are out of scope for the first release.

### R8. Result Entry

User story: As the admin, I want to enter match results and review scoring
before publishing points.

Acceptance criteria:

- Admin shall be able to enter final score, winner, first scoring team, first
  goal scorer, first goal minute, anytime scorers, players with 2+ goals, Man of
  the Match, penalty awarded, red card, and clean sheet.
- Admin shall be able to review calculated points before publishing.
- Result publish shall trigger score calculation.
- Admin overrides shall be audited.
- Man of the Match source shall be chosen before the tournament: official,
  admin-decided, or group vote. The recommended default is official if
  available, otherwise admin-decided.

### R9. Scoring

User story: As a player, I want scoring to be transparent so that I trust the
leaderboard.

Acceptance criteria:

- The system shall version scoring rules.
- The system shall calculate points deterministically from question category,
  prediction answer, and result facts.
- The system shall store points per prediction.
- The system shall support streak bonuses and fun bonuses as optional features,
  not core MVP blockers.
- The system shall show a points breakdown for completed matches.

Recommended first-version match scoring:

| Prediction | Points |
| --- | ---: |
| Winner | 5 |
| First scoring team | 4 |
| First goal time | 5 |
| First goal scorer | 8 |
| Total goals range | 3 |
| Both teams score | 3 |
| Star player scores | 3 |
| Man of the Match | 7 |

Recommended tournament scoring:

| Prediction | Points |
| --- | ---: |
| Tournament winner | 30 |
| Runner-up | 20 |
| Semi-finalist | 10 each |
| Quarter-finalist | 6 each |
| Golden Boot | 25 |
| Golden Glove | 20 |
| Best Player | 20 |
| Group winner | 8 each |

### R10. Leaderboards And Awards

User story: As a player, I want standings and fun awards so that the group stays
active.

Acceptance criteria:

- The main leaderboard shall show rank, player nickname, total points, today's
  points, correct winners, streak, and favorite team.
- The system shall show daily champion.
- The system shall show biggest daily rank jump when available.
- The system may show awards such as Prediction King, VAR Victim, Comeback Hero,
  Risk Taker, Golden Brain, Goal Guru, Clean Sheet Master, Clutch Predictor, and
  Final Boss.
- Friendly humor is allowed; insulting or hostile messaging is not.

### R11. AI Host

User story: As the admin, I want an AI host to reduce manual work and make the
game entertaining.

Acceptance criteria:

- The AI host shall generate structured question drafts from tournament, match,
  team, player, and rules input.
- The AI host shall receive World Cup squad-player context for the teams in the
  match before generating player-based options.
- The AI host shall follow question count limits by match importance.
- The AI host shall generate intro messages, reminders, prediction summaries,
  post-match recaps, daily leaderboard messages, and friendly banter.
- The AI host shall not create too many questions for normal matches.
- AI-generated questions shall be validated before publishing.
- Scoring shall not depend on free-form AI text.

### R12. Scheduling

User story: As the group, we want polls and reminders at predictable times.

Acceptance criteria:

- The system shall support morning posting of all match polls for the day.
- The system shall support reminders before poll closure.
- The system shall close each poll at the configured `closeAt`.
- The recommended simplified schedule is: morning polls, close each match 15
  minutes before kickoff, update points after each match, post daily leaderboard
  at night.

### R13. Anti-Confusion Rules

User story: As a player, I want edge cases handled consistently so that scoring
does not cause arguments.

Acceptance criteria:

- Knockout questions shall distinguish 90-minute result from qualification.
- Own goals shall count as `Own Goal` for first goal scorer.
- First scoring team for an own goal shall be the team that receives the goal.
- If a predicted player does not play, the prediction still stands after lock.
- The AI host should avoid non-squad players only when reliable lineup data is
  available before lock.

### R14. Screens

User story: As a player or admin, I want focused screens for the actual game
tasks.

Acceptance criteria:

- Player screens shall include Home, Upcoming Polls, My Predictions,
  Leaderboard, Tournament Predictions, Results, and Rules.
- Admin screens shall include Tournament Setup, Teams and Squads, Participants,
  Fixtures, Question Templates, Poll Management, Result Entry, Score Review, and
  AI Agent Settings.
- The first screen for signed-in players shall prioritize open polls, next
  deadline, current rank, and recent points.

### R15. Cost And Scalability Boundary

User story: As the owner, I want the first release to stay cheap but avoid
architectural dead ends.

Acceptance criteria:

- The system shall avoid always-on backend compute.
- The system shall avoid per-user provider API calls.
- The system shall keep AI keys and provider keys server-side.
- The system shall keep tournament, team, squad player, participant, question,
  prediction, result, score, and badge entities distinct.
- The system shall not implement public league discovery in the first release.
- The system shall not implement multiple leagues per user in the first release.
- The system shall not implement global public leaderboards in the first
  release.
