#!/usr/bin/env bash
set -euo pipefail

# SendIt n8n API Test Runner
# Runs all workflow JSON files in order and reports results.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKFLOWS_DIR="${SCRIPT_DIR}/workflows"

# Load env vars if .env.test exists
if [[ -f "${SCRIPT_DIR}/.env.test" ]]; then
  set -a
  source "${SCRIPT_DIR}/.env.test"
  set +a
fi

# Verify required env vars
if [[ -z "${SENDIT_API_KEY:-}" || "${SENDIT_API_KEY}" == *"YOUR_API_KEY_HERE"* ]]; then
  echo "ERROR: SENDIT_API_KEY is not set. Copy .env.test and add your API key."
  exit 1
fi

if [[ -z "${SENDIT_BASE_URL:-}" ]]; then
  echo "ERROR: SENDIT_BASE_URL is not set."
  exit 1
fi

echo "========================================"
echo " SendIt API Test Suite"
echo "========================================"
echo "Base URL:  ${SENDIT_BASE_URL}"
echo "Platform:  ${TEST_PLATFORM:-linkedin}"
echo "Team ID:   ${SENDIT_TEAM_ID:-(none)}"
echo "========================================"
echo ""

PASS=0
FAIL=0
SKIP=0
TOTAL=0
FAILED_WORKFLOWS=""

for workflow in "${WORKFLOWS_DIR}"/*.json; do
  [[ -f "${workflow}" ]] || continue
  TOTAL=$((TOTAL + 1))
  name="$(basename "${workflow}")"

  printf "%-45s " "${name}"

  # Run the workflow via n8n CLI
  if output=$(npx n8n execute --file="${workflow}" 2>&1); then
    echo "PASS"
    PASS=$((PASS + 1))
  else
    # Check if it's a known skip condition (no data to test against)
    if echo "${output}" | grep -q "SKIP"; then
      echo "SKIP"
      SKIP=$((SKIP + 1))
    else
      echo "FAIL"
      FAIL=$((FAIL + 1))
      FAILED_WORKFLOWS="${FAILED_WORKFLOWS}\n  - ${name}"
      # Print last 10 lines of output for debugging
      echo "${output}" | tail -10 | sed 's/^/    /'
    fi
  fi
done

echo ""
echo "========================================"
echo " Results: ${PASS} passed, ${FAIL} failed, ${SKIP} skipped (${TOTAL} total)"
echo "========================================"

if [[ -n "${FAILED_WORKFLOWS}" ]]; then
  echo -e "\nFailed workflows:${FAILED_WORKFLOWS}"
fi

if [[ ${FAIL} -gt 0 ]]; then
  exit 1
fi

echo ""
echo "All tests passed!"
exit 0
