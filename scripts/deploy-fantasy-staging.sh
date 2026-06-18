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
FANTASY_AI_PROVIDER_URL="${FANTASY_AI_PROVIDER_URL:-}"
FANTASY_AI_API_KEY="${FANTASY_AI_API_KEY:-}"
FANTASY_AI_MODEL="${FANTASY_AI_MODEL:-}"
FANTASY_AI_DAILY_CALL_LIMIT="${FANTASY_AI_DAILY_CALL_LIMIT:-0}"
FANTASY_AI_ESTIMATED_COST_CENTS="${FANTASY_AI_ESTIMATED_COST_CENTS:-1}"
FANTASY_AI_MAX_OUTPUT_TOKENS="${FANTASY_AI_MAX_OUTPUT_TOKENS:-180}"
FANTASY_AI_SCHEDULE_EXPRESSION="${FANTASY_AI_SCHEDULE_EXPRESSION:-rate(30 minutes)}"
FANTASY_AI_SCHEDULE_ENABLED="${FANTASY_AI_SCHEDULE_ENABLED:-false}"
FANTASY_AI_SCHEDULE_AUTO_PUBLISH="${FANTASY_AI_SCHEDULE_AUTO_PUBLISH:-false}"
WORK_DIR="${ROOT_DIR}/tmp/fantasy-lambda-package"
ZIP_PATH="${ROOT_DIR}/tmp/${APP_NAME}.zip"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
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

aws cloudformation deploy \
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
    FantasyAiProviderUrl="${FANTASY_AI_PROVIDER_URL}" \
    FantasyAiApiKey="${FANTASY_AI_API_KEY}" \
    FantasyAiModel="${FANTASY_AI_MODEL}" \
    FantasyAiDailyCallLimit="${FANTASY_AI_DAILY_CALL_LIMIT}" \
    FantasyAiEstimatedCostCents="${FANTASY_AI_ESTIMATED_COST_CENTS}" \
    FantasyAiMaxOutputTokens="${FANTASY_AI_MAX_OUTPUT_TOKENS}" \
    FantasyAiScheduleExpression="${FANTASY_AI_SCHEDULE_EXPRESSION}" \
    FantasyAiScheduleEnabled="${FANTASY_AI_SCHEDULE_ENABLED}" \
    FantasyAiScheduleAutoPublish="${FANTASY_AI_SCHEDULE_AUTO_PUBLISH}" \
    BudgetAlertEmail="${BUDGET_ALERT_EMAIL}"

aws cloudformation describe-stacks \
  --region "${AWS_REGION}" \
  --stack-name "${STACK_NAME}" \
  --query "Stacks[0].Outputs" \
  --output table
