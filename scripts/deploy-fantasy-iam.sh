#!/usr/bin/env bash
# One-time bootstrap: creates the GitHub OIDC provider and the deploy role
# used by GitHub Actions to deploy the fantasy backend.
#
# Run this manually with AWS admin credentials whenever:
#   - Setting up the stack for the first time
#   - Adding new resource types to fantasy-api.cloudformation.yml that need
#     additional IAM permissions
#
# Usage:
#   GITHUB_ORG=your-org GITHUB_REPO=your-repo AWS_REGION=ap-south-1 \
#     ARTIFACT_BUCKET=your-bucket bash scripts/deploy-fantasy-iam.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

AWS_REGION="${AWS_REGION:-ap-south-1}"
STACK_NAME="${IAM_STACK_NAME:-fantasy-prediction-game-iam}"
APP_STACK_NAME="${APP_STACK_NAME:-fantasy-prediction-game-staging}"
DEPLOY_ROLE_NAME="${DEPLOY_ROLE_NAME:-GitHubFantasyBackendStagingDeployRole}"
ARTIFACT_BUCKET="${ARTIFACT_BUCKET:-}"
GITHUB_ORG="${GITHUB_ORG:-}"
GITHUB_REPO="${GITHUB_REPO:-}"
GITHUB_BRANCH="${GITHUB_BRANCH:-*}"

if [[ -z "${GITHUB_ORG}" ]]; then
  echo "GITHUB_ORG is required. Example: GITHUB_ORG=my-org bash scripts/deploy-fantasy-iam.sh" >&2
  exit 1
fi
if [[ -z "${GITHUB_REPO}" ]]; then
  echo "GITHUB_REPO is required. Example: GITHUB_REPO=my-repo bash scripts/deploy-fantasy-iam.sh" >&2
  exit 1
fi
if [[ -z "${ARTIFACT_BUCKET}" ]]; then
  echo "ARTIFACT_BUCKET is required." >&2
  exit 1
fi

echo "Deploying IAM bootstrap stack: ${STACK_NAME}"
echo "  GitHub:          ${GITHUB_ORG}/${GITHUB_REPO} (branch: ${GITHUB_BRANCH})"
echo "  Deploy role:     ${DEPLOY_ROLE_NAME}"
echo "  App stack:       ${APP_STACK_NAME}"
echo "  Artifact bucket: ${ARTIFACT_BUCKET}"
echo "  Region:          ${AWS_REGION}"
echo ""

aws cloudformation deploy \
  --region "${AWS_REGION}" \
  --template-file "${ROOT_DIR}/infra/iam.cloudformation.yml" \
  --stack-name "${STACK_NAME}" \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    GitHubOrg="${GITHUB_ORG}" \
    GitHubRepo="${GITHUB_REPO}" \
    GitHubBranch="${GITHUB_BRANCH}" \
    DeployRoleName="${DEPLOY_ROLE_NAME}" \
    AppStackName="${APP_STACK_NAME}" \
    ArtifactBucket="${ARTIFACT_BUCKET}"

echo ""
echo "Bootstrap complete. Role ARN for AWS_ROLE_TO_ASSUME GitHub secret:"
aws cloudformation describe-stacks \
  --region "${AWS_REGION}" \
  --stack-name "${STACK_NAME}" \
  --query "Stacks[0].Outputs[?OutputKey=='DeployRoleArn'].OutputValue" \
  --output text
