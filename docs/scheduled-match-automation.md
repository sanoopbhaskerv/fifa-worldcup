# Scheduled Match Automation

The fantasy backend can run a low-touch scheduled job that keeps fixtures current,
saves newly completed match results, and publishes fantasy scores for those newly
saved results.

## How It Runs

CloudFormation creates an EventBridge scheduled rule named
`FantasyMatchAutomationScheduleRule` when `FantasyMatchAutomationEnabled` is set
to `true`. The rule invokes the same fantasy Lambda used by the HTTP API.

The EventBridge target sends this payload:

```json
{"task":"match-automation"}
```

`server/aws/lambda.mjs` detects scheduled events with
`event.source === "aws.events"`. When `detail.task` is `match-automation`, it
routes the event to:

```text
POST /api/fantasy/admin/scheduled/match-automation
```

That route calls `runScheduledFantasyMatchAutomation` in
`server/fantasy-game.mjs`.

## Frequency

The schedule is controlled by the CloudFormation parameter
`FantasyMatchAutomationScheduleExpression`.

Current default:

```text
rate(1 hour)
```

So, when enabled, the automation runs every 1 hour, or about 24 times per day.

You can change it during deploy with any valid EventBridge scheduled-rule
expression, for example:

```text
rate(1 hour)
rate(2 hours)
cron(0 * * * ? *)
```

The job is disabled by default. It does not run unless
`FantasyMatchAutomationEnabled=true` is deployed.

## Hourly Schedule

For the current staging setup, use:

```bash
FANTASY_MATCH_AUTOMATION_ENABLED=true
FANTASY_MATCH_AUTOMATION_SCHEDULE_EXPRESSION="rate(1 hour)"
FANTASY_MATCH_AUTOMATION_REPLACE_EXISTING=false
FANTASY_MATCH_AUTOMATION_OVERWRITE_RESULTS=false
```

In GitHub Actions, set the manual workflow inputs to:

| Workflow input | Value |
| --- | --- |
| `fantasy_match_automation_enabled` | `true` |
| `fantasy_match_automation_schedule_expression` | `rate(1 hour)` |
| `fantasy_match_automation_replace_existing` | `false` |
| `fantasy_match_automation_overwrite_results` | `false` |

## What Each Run Does

Each scheduled run performs these steps in order:

1. Sync latest fixtures and match statuses from the provider.
2. Sync result facts for completed matches that do not already have saved
   results.
3. Publish fantasy scores for the results saved during that run.

The response shape is:

```json
{
  "fixtures": { "synced": 64 },
  "results": { "synced": 1, "skipped": 3 },
  "published": [
    { "matchId": "provider-match-id", "predictionCount": 12 }
  ],
  "game": {}
}
```

`game` is the updated fantasy game payload.

## Deploy Toggles

CloudFormation parameters:

| Parameter | Default | Meaning |
| --- | --- | --- |
| `FantasyMatchAutomationEnabled` | `false` | Creates/enables the EventBridge rule when `true`. |
| `FantasyMatchAutomationScheduleExpression` | `rate(1 hour)` | Controls how often the job runs. `rate(1 hour)` means 24 scheduled invocations per day. |
| `FantasyMatchAutomationReplaceExisting` | `false` | Replaces the full stored fixture list during fixture sync when `true`. Keep `false` to preserve local/manual fixture changes. |
| `FantasyMatchAutomationOverwriteResults` | `false` | Re-syncs already stored result facts when `true`. Keep `false` for idempotent low-cost runs. |

### Parameter Behavior

`FantasyMatchAutomationEnabled` controls whether the EventBridge scheduled rule
exists in the stack. When it is `true`, CloudFormation creates/enables the
schedule. When it is changed back to `false` and redeployed, CloudFormation
removes the scheduled rule and Lambda invoke permission, so no hourly runs are
triggered.

`FantasyMatchAutomationScheduleExpression` controls the frequency. Changing it
and redeploying updates the EventBridge scheduled rule in place. Use
`rate(1 hour)` for hourly runs.

`FantasyMatchAutomationReplaceExisting` is passed into Lambda as
`FANTASY_MATCH_AUTOMATION_REPLACE_EXISTING`. When `false`, the fixture sync keeps
local/manual fixture changes where possible. When `true`, the scheduled sync can
replace the full stored fixture list from the provider.

`FantasyMatchAutomationOverwriteResults` is passed into Lambda as
`FANTASY_MATCH_AUTOMATION_OVERWRITE_RESULTS`. When `false`, results that already
exist are skipped. When `true`, existing result facts can be refreshed from the
provider.

### `fantasy_match_automation_replace_existing`

This workflow input maps to the CloudFormation parameter
`FantasyMatchAutomationReplaceExisting`, which becomes the Lambda environment
variable `FANTASY_MATCH_AUTOMATION_REPLACE_EXISTING`.

It controls the fixture/status sync step only.

When set to `false`, the scheduled run merges provider fixtures into the
existing stored fixture list:

- Provider matches are updated from the latest provider payload.
- Local matches that are not present in the provider payload are preserved.
- Manual/admin fixture adjustments are less likely to be lost.
- Existing questions, predictions, and results are kept as long as their match
  still exists after the merge.

This is the recommended setting for hourly automation.

When set to `true`, the scheduled run replaces the stored fixture list with the
provider fixture list:

- Matches missing from the provider payload are removed from stored game state.
- Questions, predictions, and results attached to removed matches are filtered
  out by the fixture sync.
- It is useful for a deliberate full fixture reset or when the provider is the
  trusted source of truth.
- It is riskier for recurring hourly runs because temporary provider gaps or
  manual local edits can be overwritten.

Practical guidance:

| Value | Use when |
| --- | --- |
| `false` | Normal hourly schedule, staging, production, or any setup with manual/admin fixture edits. |
| `true` | One-off fixture rebuilds where provider data should completely replace local state. |

### `fantasy_match_automation_overwrite_results`

This workflow input maps to the CloudFormation parameter
`FantasyMatchAutomationOverwriteResults`, which becomes the Lambda environment
variable `FANTASY_MATCH_AUTOMATION_OVERWRITE_RESULTS`.

It controls the completed-result sync step only.

When set to `false`, the scheduled run is idempotent for results:

- Completed provider matches without a stored result are saved.
- Completed provider matches that already have a stored result are skipped.
- Already published/scored polls are not recalculated every hour.
- Manual corrections to stored result facts are preserved.

This is the recommended setting for hourly automation.

When set to `true`, the scheduled run refreshes result facts even when a result
already exists:

- Existing stored results for completed matches can be replaced from provider
  data.
- Poll scoring can be republished for those refreshed results.
- It can fix a provider score correction after a result was first saved.
- It can also overwrite manual result corrections.

Important limitation: the scheduled provider result sync currently saves score
facts available from the competition fixture payload, such as score, winner,
both-teams-scored, and total-goals range. Detailed scorer/card facts are not
available from that scheduled payload and may still need manual result entry or
a deeper detail-provider sync.

Practical guidance:

| Value | Use when |
| --- | --- |
| `false` | Normal hourly schedule, low-cost/idempotent runs, and preserving manual result corrections. |
| `true` | Temporary correction runs when provider scores changed and you intentionally want to refresh stored results. |

The staging deploy script maps environment variables to those parameters:

```bash
FANTASY_MATCH_AUTOMATION_ENABLED=true
FANTASY_MATCH_AUTOMATION_SCHEDULE_EXPRESSION="rate(1 hour)"
FANTASY_MATCH_AUTOMATION_REPLACE_EXISTING=false
FANTASY_MATCH_AUTOMATION_OVERWRITE_RESULTS=false
```

GitHub Actions exposes the same controls as manual workflow inputs.

## Recommended Staging Settings

For the current staging backend, use:

```bash
FANTASY_MATCH_AUTOMATION_ENABLED=true
FANTASY_MATCH_AUTOMATION_SCHEDULE_EXPRESSION="rate(1 hour)"
FANTASY_MATCH_AUTOMATION_REPLACE_EXISTING=false
FANTASY_MATCH_AUTOMATION_OVERWRITE_RESULTS=false
```

This keeps the job idempotent and avoids replacing manually adjusted fixtures or
overwriting manually corrected results.

## Turning It Off

To stop the scheduled job, redeploy with:

```bash
FANTASY_MATCH_AUTOMATION_ENABLED=false
```

In GitHub Actions, run the staging deploy workflow and set
`fantasy_match_automation_enabled` to `false`.

After that deploy, CloudFormation removes the `FantasyMatchAutomationScheduleRule`
resource because it is guarded by the `IsFantasyMatchAutomationEnabled`
condition. Manual API calls to
`POST /api/fantasy/admin/scheduled/match-automation` still work, but EventBridge
will no longer trigger it automatically.

## Free-Tier Impact

An hourly schedule creates about 24 EventBridge-triggered Lambda invocations per
day, roughly 720 per 30-day month before any manual runs.

That is far below Lambda's published 1 million free requests per month. The
practical cost risk for this job is not the schedule itself; it is provider API
usage and DynamoDB read/write usage inside each run.

Keep these settings for low-cost/idempotent behavior:

```bash
FANTASY_MATCH_AUTOMATION_REPLACE_EXISTING=false
FANTASY_MATCH_AUTOMATION_OVERWRITE_RESULTS=false
```

Also keep `API_FOOTBALL_DAILY_BUDGET` low enough for the account. The scheduled
job still depends on the external provider limits configured for the backend.

AWS references:

- [EventBridge scheduled rules](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule-schedule.html)
- [EventBridge pricing](https://aws.amazon.com/eventbridge/pricing/)
- [Lambda pricing](https://aws.amazon.com/lambda/pricing/)
- [DynamoDB pricing](https://aws.amazon.com/dynamodb/pricing/)

## Manual Run

You can trigger the same automation manually against the deployed API:

```bash
curl -X POST "$FANTASY_API_URL/api/fantasy/admin/scheduled/match-automation" \
  -H "content-type: application/json" \
  -d '{"actorId":"manual","replaceExisting":false,"overwriteResults":false}'
```

Use this for smoke testing after deployment. The scheduled EventBridge run sends
the same options through Lambda environment variables.

## Relationship To AI Scheduling

The existing AI draft schedule still works separately. Scheduled events without
`detail.task = "match-automation"` continue to route to:

```text
POST /api/fantasy/admin/ai-messages/scheduled
```

That means one Lambda handles both scheduled workflows, but EventBridge payloads
decide which route runs.
