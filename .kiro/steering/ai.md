# AI Steering

## Intent

AI should reduce admin effort and add personality to the friends fantasy game
without becoming a cost or reliability dependency. The default AI mode is
template-only and costs zero. External AI providers are optional, server-side
only, and must have hard budget limits.

## Principles

- Template-first: generate useful polls, reminders, and recaps from deterministic
  templates before calling any external AI API.
- Admin-approved: AI creates drafts; admins publish questions and important
  messages.
- Grounded data: player options must come from stored fixtures, teams, squads,
  results, and scoring data.
- No browser secrets: provider keys never ship to frontend assets.
- Budget bounded: every external AI feature must respect daily/monthly caps and
  graceful fallback to templates.
- Friends-circle tone: banter should be playful, short, and non-hostile.
- Scoring neutral: AI text never decides locks, scores, winners, or leaderboard
  points.

## Cost Position

First release should run with `TEMPLATE_ONLY` mode and zero AI spend. Free AI
APIs may be evaluated later for draft quality, but the app must remain fully
usable if the provider is unavailable, slow, quota-limited, or disabled.
