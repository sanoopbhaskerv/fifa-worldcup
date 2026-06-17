# Product Steering

## Product Intent

Full Time Football should add a lightweight prediction game for a private
friends circle. This is not a squad-building fantasy sports platform. The game
should feel like a polished WhatsApp, Telegram, or Discord group game: simple
polls, clear points, friendly banter, and a leaderboard everyone checks during
the tournament.

The first release should be easy for friends to understand in one minute:

- Answer match prediction polls before kickoff.
- Answer tournament-long prediction polls before the tournament starts.
- Earn points when results are entered or imported.
- Compete on an overall leaderboard plus daily/fun awards.
- Let an AI host generate questions, reminders, recap text, and banter.
- Use the World Cup squad/player dataset to keep AI-generated player options
  grounded in real squads.

## Product Principles

- Prediction-first, not squad-first. Do not build player drafts, budgets,
  transfers, captaincy, bench selection, or marketplace mechanics.
- Friends-circle first. Optimize for a private group and owner-managed game.
- Keep each match lightweight. Normal matches should have about 5 questions,
  big matches about 8, finals about 10.
- Make rules obvious. A player should understand why they got points without
  reading a long help page.
- Use the AI agent as host, not as game authority. The backend decides locks,
  scoring, and published results.
- Use squad data as question context only. Storing World Cup squads does not
  mean building squad-management gameplay.
- Avoid manual exceptions after poll closure. Late predictions get 0 points.
- Keep scalability as a future phase. Do not implement public-platform mechanics
  until the private friends version proves useful.

## First Release Scope

In scope:

- One owner-created tournament prediction game.
- Private participant list with name, nickname, favorite team, and optional
  avatar.
- World Cup teams and full squad/player reference data for AI question options.
- Match prediction polls.
- Tournament-long prediction polls.
- Poll locking before kickoff.
- Admin result entry and score review.
- Automatic scoring after result publish.
- Friends leaderboard with total points, daily points, correct winners, streak,
  and favorite team.
- Fun awards such as daily champion, comeback hero, risk taker, and prediction
  king.
- AI-generated questions, reminders, prediction summaries, recaps, and banter
  text.

Out of scope for first release:

- Squad creation, transfer rules, captaincy, and bench management.
- Real-money prizes or gambling mechanics.
- Public league discovery or public league browsing.
- Multiple leagues per user.
- Multiple simultaneous fantasy competitions.
- Global public leaderboard.
- Real-time match-event scoring.
- Native mobile apps.
- Complex admin dashboards beyond setup, polls, result entry, and review.

## Future Scalability

Future scalability is valid, but explicitly out of scope for the first release.
First-release decisions should avoid dead ends:

- Keep tournament, team, squad player, participant, match, question, prediction,
  result, score, and badge entities distinct.
- Keep scoring rules versioned.
- Keep AI question generation separate from scoring.
- Keep provider ingestion separate from admin-entered results.
- Keep all lock and scoring decisions server-owned.

Future features can include multiple leagues, multiple tournaments, public
leaderboards, API Gateway migration, push notifications, football API result
integration, lineup-aware questions, and richer admin tooling.

## Success Metrics

- A friend can join and submit predictions in under 2 minutes.
- Admin can publish a match result and leaderboard in under 1 minute.
- Normal match poll set remains small enough that people keep answering.
- Monthly AWS spend stays close to zero for friends-circle usage.
- No provider keys, AI keys, or scoring authority are shipped in browser assets.
