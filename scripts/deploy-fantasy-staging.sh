#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AWS_REGION="${AWS_REGION:-us-east-1}"
STACK_NAME="${STACK_NAME:-fantasy-prediction-game-staging}"
APP_NAME="${APP_NAME:-fantasy-prediction-game-staging}"
ARTIFACT_BUCKET="${ARTIFACT_BUCKET:-}"
ARTIFACT_PREFIX="${ARTIFACT_PREFIX:-fantasy-api}"
ARTIFACT_KEY="${ARTIFACT_KEY:-${ARTIFACT_PREFIX}/${APP_NAME}-$(date +%Y%m%d%H%M%S).zip}"
CORS_ALLOW_ORIGIN="${CORS_ALLOW_ORIGIN:-*}"
MONTHLY_BUDGET_USD="${MONTHLY_BUDGET_USD:-5}"
LAMBDA_RESERVED_CONCURRENCY="${LAMBDA_RESERVED_CONCURRENCY:-2}"
BUDGET_ALERT_EMAIL="${BUDGET_ALERT_EMAIL:-}"
FOOTBALL_DATA_API_KEY="${FOOTBALL_DATA_API_KEY:-}"
API_FOOTBALL_API_KEY="${API_FOOTBALL_API_KEY:-}"
API_FOOTBALL_DAILY_BUDGET="${API_FOOTBALL_DAILY_BUDGET:-90}"
FANTASY_AI_PROVIDER="${FANTASY_AI_PROVIDER:-}"
FANTASY_AI_FALLBACK_API_KEY="${FANTASY_AI_FALLBACK_API_KEY:-}"
FANTASY_AI_FALLBACK_MODEL="${FANTASY_AI_FALLBACK_MODEL:-llama-3.3-70b-versatile}"
FANTASY_AI_PROVIDER_URL="${FANTASY_AI_PROVIDER_URL:-}"
FANTASY_AI_API_KEY="${FANTASY_AI_API_KEY:-}"
FANTASY_AI_MODEL="${FANTASY_AI_MODEL:-}"
FANTASY_AI_DAILY_CALL_LIMIT="${FANTASY_AI_DAILY_CALL_LIMIT:-0}"
FANTASY_AI_ESTIMATED_COST_CENTS="${FANTASY_AI_ESTIMATED_COST_CENTS:-1}"
FANTASY_AI_MAX_OUTPUT_TOKENS="${FANTASY_AI_MAX_OUTPUT_TOKENS:-180}"
FANTASY_AI_SCHEDULE_EXPRESSION="${FANTASY_AI_SCHEDULE_EXPRESSION:-rate(30 minutes)}"
FANTASY_AI_SCHEDULE_ENABLED="${FANTASY_AI_SCHEDULE_ENABLED:-false}"
FANTASY_AI_SCHEDULE_AUTO_PUBLISH="${FANTASY_AI_SCHEDULE_AUTO_PUBLISH:-false}"
FANTASY_MATCH_AUTOMATION_SCHEDULE_EXPRESSION="${FANTASY_MATCH_AUTOMATION_SCHEDULE_EXPRESSION:-rate(1 hour)}"
FANTASY_MATCH_AUTOMATION_ENABLED="${FANTASY_MATCH_AUTOMATION_ENABLED:-false}"
FANTASY_MATCH_AUTOMATION_REPLACE_EXISTING="${FANTASY_MATCH_AUTOMATION_REPLACE_EXISTING:-false}"
FANTASY_MATCH_AUTOMATION_OVERWRITE_RESULTS="${FANTASY_MATCH_AUTOMATION_OVERWRITE_RESULTS:-false}"
WORK_DIR="${ROOT_DIR}/tmp/fantasy-lambda-package"
ZIP_PATH="${ROOT_DIR}/tmp/${APP_NAME}.zip"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_integer_range() {
  local name="$1"
  local value="$2"
  local min="$3"
  local max="$4"
  if ! [[ "${value}" =~ ^[0-9]+$ ]] || (( value < min || value > max )); then
    echo "${name} must be an integer between ${min} and ${max}. Received: ${value}" >&2
    exit 1
  fi
}

if [[ -z "${ARTIFACT_BUCKET}" ]]; then
  echo "ARTIFACT_BUCKET is required. Example: ARTIFACT_BUCKET=my-deploy-bucket yarn deploy:fantasy:staging" >&2
  exit 1
fi

require_command aws
require_command zip
require_command yarn
require_integer_range "FANTASY_AI_DAILY_CALL_LIMIT" "${FANTASY_AI_DAILY_CALL_LIMIT}" 0 50
require_integer_range "FANTASY_AI_ESTIMATED_COST_CENTS" "${FANTASY_AI_ESTIMATED_COST_CENTS}" 0 100
require_integer_range "FANTASY_AI_MAX_OUTPUT_TOKENS" "${FANTASY_AI_MAX_OUTPUT_TOKENS}" 60 500

rm -rf "${WORK_DIR}" "${ZIP_PATH}"
mkdir -p "${WORK_DIR}" "$(dirname "${ZIP_PATH}")"

cp "${ROOT_DIR}/package.json" "${ROOT_DIR}/yarn.lock" "${WORK_DIR}/"
cp -R "${ROOT_DIR}/server" "${WORK_DIR}/server"

(
  cd "${WORK_DIR}"
  yarn install --frozen-lockfile --production --ignore-scripts --silent
  zip -qr "${ZIP_PATH}" package.json yarn.lock node_modules server
)

aws s3 cp "${ZIP_PATH}" "s3://${ARTIFACT_BUCKET}/${ARTIFACT_KEY}" --region "${AWS_REGION}"

if ! aws cloudformation deploy \
    --region "${AWS_REGION}" \
    --template-file "${ROOT_DIR}/infra/fantasy-api.cloudformation.yml" \
    --stack-name "${STACK_NAME}" \
    --capabilities CAPABILITY_IAM \
    --parameter-overrides \
      AppName="${APP_NAME}" \
      LambdaS3Bucket="${ARTIFACT_BUCKET}" \
      LambdaS3Key="${ARTIFACT_KEY}" \
      CorsAllowOrigin="${CORS_ALLOW_ORIGIN}" \
      MonthlyBudgetUsd="${MONTHLY_BUDGET_USD}" \
      LambdaReservedConcurrency="${LAMBDA_RESERVED_CONCURRENCY}" \
      FootballDataApiKey="${FOOTBALL_DATA_API_KEY}" \
      ApiFootballApiKey="${API_FOOTBALL_API_KEY}" \
      ApiFootballDailyBudget="${API_FOOTBALL_DAILY_BUDGET}" \
      FantasyAiProvider="${FANTASY_AI_PROVIDER}" \
      FantasyAiFallbackApiKey="${FANTASY_AI_FALLBACK_API_KEY}" \
      FantasyAiFallbackModel="${FANTASY_AI_FALLBACK_MODEL}" \
      FantasyAiProviderUrl="${FANTASY_AI_PROVIDER_URL}" \
      FantasyAiApiKey="${FANTASY_AI_API_KEY}" \
      FantasyAiModel="${FANTASY_AI_MODEL}" \
      FantasyAiDailyCallLimit="${FANTASY_AI_DAILY_CALL_LIMIT}" \
      FantasyAiEstimatedCostCents="${FANTASY_AI_ESTIMATED_COST_CENTS}" \
      FantasyAiMaxOutputTokens="${FANTASY_AI_MAX_OUTPUT_TOKENS}" \
      FantasyAiScheduleExpression="${FANTASY_AI_SCHEDULE_EXPRESSION}" \
      FantasyAiScheduleEnabled="${FANTASY_AI_SCHEDULE_ENABLED}" \
      FantasyAiScheduleAutoPublish="${FANTASY_AI_SCHEDULE_AUTO_PUBLISH}" \
      FantasyMatchAutomationScheduleExpression="${FANTASY_MATCH_AUTOMATION_SCHEDULE_EXPRESSION}" \
      FantasyMatchAutomationEnabled="${FANTASY_MATCH_AUTOMATION_ENABLED}" \
      FantasyMatchAutomationReplaceExisting="${FANTASY_MATCH_AUTOMATION_REPLACE_EXISTING}" \
      FantasyMatchAutomationOverwriteResults="${FANTASY_MATCH_AUTOMATION_OVERWRITE_RESULTS}" \
      BudgetAlertEmail="${BUDGET_ALERT_EMAIL}"; then
  echo "CloudFormation deploy failed. Recent failed stack events:" >&2
  if ! aws cloudformation describe-stack-events \
    --region "${AWS_REGION}" \
    --stack-name "${STACK_NAME}" \
    --query "StackEvents[?contains(ResourceStatus, 'FAILED')].[Timestamp,LogicalResourceId,ResourceStatus,ResourceStatusReason]" \
    --output table >&2; then
    echo "Unable to read stack events. Add cloudformation:DescribeStackEvents to the GitHub deploy role, then rerun this workflow or inspect the stack events in the AWS Console." >&2
  fi
  exit 1
fi

aws cloudformation describe-stacks \
  --region "${AWS_REGION}" \
  --stack-name "${STACK_NAME}" \
  --query "Stacks[0].Outputs" \
  --output table
