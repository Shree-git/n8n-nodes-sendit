#!/usr/bin/env bash
set -uo pipefail

# SendIt API Test Runner (direct curl)
# Runs all test cases from the n8n workflow definitions directly.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "${SCRIPT_DIR}/.env.test" ]]; then
  set -a; source "${SCRIPT_DIR}/.env.test"; set +a
fi

BASE="${SENDIT_BASE_URL}"
KEY="${SENDIT_API_KEY}"
PLAT="${TEST_PLATFORM:-linkedin}"

PASS=0; FAIL=0; TOTAL=0
BUGS=""

run_test() {
  local name="$1"
  local expected_status="$2"
  local method="$3"
  local url="$4"
  local body="${5:-}"
  local auth="${6:-yes}"
  TOTAL=$((TOTAL + 1))

  local auth_header=""
  if [[ "$auth" == "yes" ]]; then
    auth_header="-H 'Authorization: Bearer ${KEY}'"
  elif [[ "$auth" == "bad" ]]; then
    auth_header="-H 'Authorization: Bearer invalid_key_12345'"
  fi

  local cmd="curl -s -w '\nHTTP_STATUS:%{http_code}' -X ${method} ${auth_header} -H 'Content-Type: application/json'"
  if [[ -n "$body" ]]; then
    cmd="${cmd} -d '${body}'"
  fi
  cmd="${cmd} '${url}'"

  local output
  output=$(eval $cmd 2>&1)
  local status
  status=$(echo "$output" | grep 'HTTP_STATUS:' | sed 's/HTTP_STATUS://')
  local response_body
  response_body=$(echo "$output" | grep -v 'HTTP_STATUS:')

  # Support comma-separated expected statuses (e.g., "404,400")
  local matched=0
  IFS=',' read -ra EXPECTED <<< "$expected_status"
  for exp in "${EXPECTED[@]}"; do
    if [[ "$status" == "$exp" ]]; then
      matched=1
      break
    fi
  done

  if [[ $matched -eq 1 ]]; then
    printf "  %-55s %s  (HTTP %s)\n" "$name" "PASS" "$status"
    PASS=$((PASS + 1))
  else
    printf "  %-55s %s  (expected %s, got %s)\n" "$name" "FAIL" "$expected_status" "$status"
    FAIL=$((FAIL + 1))
    BUGS="${BUGS}\n[BUG] ${name}: expected HTTP ${expected_status}, got ${status}"
    # Print response body snippet for debugging
    echo "$response_body" | head -3 | sed 's/^/    > /'
  fi

  # Return response body for chaining
  echo "$response_body" > /tmp/sendit_last_response.json
}

get_json_field() {
  local field="$1"
  python3 -c "import json,sys; d=json.load(sys.stdin); print(d${field})" < /tmp/sendit_last_response.json 2>/dev/null
}

echo "========================================"
echo " SendIt API Test Suite"
echo "========================================"
echo " Base URL:  ${BASE}"
echo " Platform:  ${PLAT}"
echo "========================================"
echo ""

# ═══════════════════════════════════════════
echo "── 00: Health & Auth ──"
# ═══════════════════════════════════════════
run_test "GET /api/health" "200" "GET" "${BASE}/api/health" "" "none"
run_test "GET /api/v1/analytics (bad key → 401)" "401" "GET" "${BASE}/api/v1/analytics?platform=${PLAT}" "" "bad"
run_test "GET /api/v1/analytics (no key → 401)" "401" "GET" "${BASE}/api/v1/analytics?platform=${PLAT}" "" "none"

echo ""
echo "── 01: Content Validation ──"
run_test "POST /validate (valid content)" "200" "POST" "${BASE}/api/v1/validate" \
  '{"platforms":["linkedin"],"content":{"text":"Hello from n8n test suite!"}}'
run_test "POST /validate (no platforms → 400)" "400" "POST" "${BASE}/api/v1/validate" \
  '{"content":{"text":"test"}}'
run_test "POST /validate (no content → 400)" "400" "POST" "${BASE}/api/v1/validate" \
  '{"platforms":["linkedin"]}'
run_test "GET /requirements?platform=linkedin" "200" "GET" "${BASE}/api/v1/requirements?platform=${PLAT}" "" "none"
run_test "GET /requirements (no platform → 400)" "400" "GET" "${BASE}/api/v1/requirements" "" "none"

echo ""
echo "── 02: Library CRUD ──"
TS=$(date +%s)
run_test "POST /library (create)" "201" "POST" "${BASE}/api/v1/library" \
  "{\"title\":\"n8n-test-${TS}\",\"text\":\"Automated test content.\",\"type\":\"draft\",\"category\":\"testing\",\"tags\":[\"n8n\",\"test\"]}"
ITEM_ID=$(get_json_field "['item']['id']")
if [[ -n "$ITEM_ID" && "$ITEM_ID" != "None" ]]; then
  run_test "GET /library/:id" "200" "GET" "${BASE}/api/v1/library/${ITEM_ID}"
  run_test "GET /library (list)" "200" "GET" "${BASE}/api/v1/library"
  run_test "PATCH /library/:id (update)" "200" "PATCH" "${BASE}/api/v1/library/${ITEM_ID}" \
    '{"title":"n8n-test-updated","text":"Updated by test."}'
  run_test "DELETE /library/:id" "200" "DELETE" "${BASE}/api/v1/library/${ITEM_ID}"
  run_test "GET /library/:id (deleted → 404)" "404" "GET" "${BASE}/api/v1/library/${ITEM_ID}"
else
  echo "  SKIP: Could not create library item (ID: ${ITEM_ID})"
fi
run_test "POST /library (no title → 400)" "400" "POST" "${BASE}/api/v1/library" \
  '{"text":"missing title"}'

echo ""
echo "── 03: Scheduling Lifecycle ──"
FUTURE=$(date -u -v+7d +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -d "+7 days" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null)
run_test "POST /schedule (create)" "200" "POST" "${BASE}/api/v1/schedule" \
  "{\"platforms\":[\"${PLAT}\"],\"content\":{\"text\":\"n8n test scheduled post ${TS}\"},\"scheduledTime\":\"${FUTURE}\"}"
SCHEDULE_ID=$(get_json_field "['scheduleId']")
run_test "GET /scheduled (list)" "200" "GET" "${BASE}/api/v1/scheduled"
run_test "POST /schedule (no time → 400)" "400" "POST" "${BASE}/api/v1/schedule" \
  "{\"platforms\":[\"${PLAT}\"],\"content\":{\"text\":\"missing time\"}}"
if [[ -n "$SCHEDULE_ID" && "$SCHEDULE_ID" != "None" ]]; then
  run_test "DELETE /scheduled/:id (cancel)" "200" "DELETE" "${BASE}/api/v1/scheduled/${SCHEDULE_ID}"
else
  echo "  SKIP: No scheduleId to cancel"
fi
run_test "DELETE /scheduled/nonexistent (→ 404)" "404,400" "DELETE" "${BASE}/api/v1/scheduled/nonexistent_12345"

echo ""
echo "── 04: Publishing ──"
run_test "POST /publish (direct)" "200" "POST" "${BASE}/api/v1/publish" \
  "{\"platforms\":[\"${PLAT}\"],\"content\":{\"text\":\"n8n automated test publish ${TS} #test\"}}"
run_test "POST /publish (no platforms → 400)" "400" "POST" "${BASE}/api/v1/publish" \
  '{"content":{"text":"missing platforms"}}'
run_test "POST /publish (no content → 400)" "400" "POST" "${BASE}/api/v1/publish" \
  "{\"platforms\":[\"${PLAT}\"]}"

echo ""
echo "── 05: Analytics ──"
run_test "GET /analytics?platform=${PLAT}" "200" "GET" "${BASE}/api/v1/analytics?platform=${PLAT}"
run_test "GET /analytics (no platform → 400)" "400" "GET" "${BASE}/api/v1/analytics"
run_test "GET /best-times?platform=${PLAT}" "200" "GET" "${BASE}/api/v1/best-times?platform=${PLAT}"
run_test "GET /best-times (no platform → 400)" "400" "GET" "${BASE}/api/v1/best-times"
run_test "POST /content-score" "200" "POST" "${BASE}/api/v1/content-score" \
  "{\"platforms\":[\"${PLAT}\"],\"text\":\"Great post about AI and testing #AI #ML\"}"
run_test "POST /content-score (no platforms → 400)" "400" "POST" "${BASE}/api/v1/content-score" \
  '{"text":"missing platforms"}'

echo ""
echo "── 06: Brand Voice CRUD ──"
run_test "POST /brand-voice (create)" "201" "POST" "${BASE}/api/v1/brand-voice" \
  "{\"name\":\"n8n-test-voice-${TS}\",\"tone\":\"professional\",\"personality\":\"friendly\",\"isDefault\":false}"
VOICE_ID=$(get_json_field "['profile']['id']")
if [[ -n "$VOICE_ID" && "$VOICE_ID" != "None" ]]; then
  run_test "GET /brand-voice (list)" "200" "GET" "${BASE}/api/v1/brand-voice"
  run_test "GET /brand-voice/:id" "200" "GET" "${BASE}/api/v1/brand-voice/${VOICE_ID}"
  run_test "PATCH /brand-voice/:id" "200" "PATCH" "${BASE}/api/v1/brand-voice/${VOICE_ID}" \
    '{"tone":"casual","personality":"Updated by n8n test"}'
  run_test "POST /brand-voice/:id/default" "200" "POST" "${BASE}/api/v1/brand-voice/${VOICE_ID}/default"
  run_test "DELETE /brand-voice/:id" "200" "DELETE" "${BASE}/api/v1/brand-voice/${VOICE_ID}"
else
  echo "  SKIP: Could not create brand voice (ID: ${VOICE_ID})"
fi
run_test "POST /brand-voice (no name → 400)" "400" "POST" "${BASE}/api/v1/brand-voice" '{}'

echo ""
echo "── 07: Campaigns ──"
run_test "GET /campaigns (list)" "200" "GET" "${BASE}/api/v1/campaigns"
run_test "POST /campaigns (create)" "201" "POST" "${BASE}/api/v1/campaigns" \
  "{\"brief\":\"n8n test campaign: software testing\",\"platforms\":[\"${PLAT}\"],\"postCount\":3}"
run_test "POST /campaigns (no brief → 400)" "400" "POST" "${BASE}/api/v1/campaigns" \
  "{\"platforms\":[\"${PLAT}\"]}"
run_test "POST /campaigns (no platforms → 400)" "400" "POST" "${BASE}/api/v1/campaigns" \
  '{"brief":"test"}'

echo ""
echo "── 08: Approvals ──"
run_test "GET /approvals (list)" "200" "GET" "${BASE}/api/v1/approvals"
run_test "POST /approvals/nonexistent/approve (→ 404)" "404,400" "POST" "${BASE}/api/v1/approvals/nonexistent_id/approve"
run_test "POST /approvals/nonexistent/reject (→ 404)" "404,400" "POST" "${BASE}/api/v1/approvals/nonexistent_id/reject" \
  '{"reason":"test rejection"}'

echo ""
echo "── 09: Social Listening ──"
run_test "POST /listening/keywords (create)" "201" "POST" "${BASE}/api/v1/listening/keywords" \
  "{\"keyword\":\"n8n-test-kw-${TS}\",\"type\":\"keyword\",\"platforms\":[\"linkedin\"]}"
KW_ID=$(get_json_field "['keyword']['id']")
if [[ -n "$KW_ID" && "$KW_ID" != "None" ]]; then
  run_test "GET /listening/keywords (list)" "200" "GET" "${BASE}/api/v1/listening/keywords"
  run_test "GET /listening/keywords/:id" "200" "GET" "${BASE}/api/v1/listening/keywords/${KW_ID}"
  run_test "PATCH /listening/keywords/:id" "200" "PATCH" "${BASE}/api/v1/listening/keywords/${KW_ID}" \
    '{"platforms":["linkedin","x"]}'
  run_test "DELETE /listening/keywords/:id" "200" "DELETE" "${BASE}/api/v1/listening/keywords/${KW_ID}"
else
  echo "  SKIP: Could not create keyword (ID: ${KW_ID})"
fi
run_test "GET /listening/mentions" "200" "GET" "${BASE}/api/v1/listening/mentions"
run_test "GET /listening/summary" "200" "GET" "${BASE}/api/v1/listening/summary"
run_test "POST /listening/refresh" "200" "POST" "${BASE}/api/v1/listening/refresh"
run_test "POST /listening/keywords (no keyword → 400)" "400" "POST" "${BASE}/api/v1/listening/keywords" '{}'

echo ""
echo "── 10: Social Inbox ──"
run_test "GET /inbox (list)" "200" "GET" "${BASE}/api/v1/inbox"
run_test "GET /inbox?status=open" "200" "GET" "${BASE}/api/v1/inbox?status=open"
run_test "POST /inbox/nonexistent/reply (→ 404)" "404,400" "POST" "${BASE}/api/v1/inbox/nonexistent_id/reply" \
  '{"text":"test reply"}'
run_test "POST /inbox/nonexistent/status (→ 404)" "404,400" "POST" "${BASE}/api/v1/inbox/nonexistent_id/status" \
  '{"status":"closed"}'

echo ""
echo "── 11: Dead Letter Queue ──"
run_test "GET /dead-letter (list)" "200" "GET" "${BASE}/api/v1/dead-letter"
run_test "GET /dead-letter?status=dead&limit=5" "200" "GET" "${BASE}/api/v1/dead-letter?status=dead&limit=5"
run_test "POST /dead-letter/nonexistent/requeue (→ 404)" "404,400" "POST" "${BASE}/api/v1/dead-letter/nonexistent_id/requeue"
run_test "POST /dead-letter/nonexistent/discard (→ 404)" "404,400" "POST" "${BASE}/api/v1/dead-letter/nonexistent_id/discard"

echo ""
echo "── 12: Webhooks ──"
run_test "GET /webhooks/events-catalog" "200" "GET" "${BASE}/api/v1/webhooks/events-catalog"
run_test "POST /webhooks (create)" "201" "POST" "${BASE}/api/v1/webhooks" \
  '{"url":"https://httpbin.org/post","events":["post.published","post.failed"]}'
WH_ID=$(get_json_field "['webhook']['id']")
if [[ -n "$WH_ID" && "$WH_ID" != "None" ]]; then
  run_test "GET /webhooks (list)" "200" "GET" "${BASE}/api/v1/webhooks"
  run_test "GET /webhooks/:id" "200" "GET" "${BASE}/api/v1/webhooks/${WH_ID}"
  run_test "POST /webhooks/:id/test" "200" "POST" "${BASE}/api/v1/webhooks/${WH_ID}/test"
  run_test "DELETE /webhooks/:id" "200" "DELETE" "${BASE}/api/v1/webhooks/${WH_ID}"
else
  echo "  SKIP: Could not create webhook (ID: ${WH_ID})"
fi
run_test "POST /webhooks (no url → 400)" "400" "POST" "${BASE}/api/v1/webhooks" \
  '{"events":["post.published"]}'
run_test "POST /webhooks (no events → 400)" "400" "POST" "${BASE}/api/v1/webhooks" \
  '{"url":"https://httpbin.org/post"}'
run_test "POST /webhooks (invalid events → 400)" "400" "POST" "${BASE}/api/v1/webhooks" \
  '{"url":"https://httpbin.org/post","events":["invalid.event"]}'

echo ""
echo "── 13: AI Features ──"
run_test "POST /ai/generate-content" "200" "POST" "${BASE}/api/v1/ai/generate-content" \
  "{\"platforms\":[\"${PLAT}\"],\"prompt\":\"Write a post about API testing\"}"
run_test "POST /ai/generate-content (empty platforms → 400)" "400" "POST" "${BASE}/api/v1/ai/generate-content" \
  '{"platforms":[]}'
run_test "POST /ai/generate-content (no input → 400)" "400" "POST" "${BASE}/api/v1/ai/generate-content" \
  '{"platforms":["linkedin"]}'
run_test "GET /ai-media (list)" "200" "GET" "${BASE}/api/v1/ai-media"
run_test "POST /ai-media (create job)" "201,403" "POST" "${BASE}/api/v1/ai-media" \
  '{"provider":"sora","prompt":"sunrise over mountains","media_type":"video"}'
run_test "POST /ai-media (bad provider → 400)" "400" "POST" "${BASE}/api/v1/ai-media" \
  '{"provider":"invalid_provider","prompt":"test"}'
run_test "POST /ai-media (no prompt → 400)" "400" "POST" "${BASE}/api/v1/ai-media" \
  '{"provider":"sora"}'

echo ""
echo "── 14: Bulk Operations ──"
run_test "GET /bulk-schedule/template" "200" "GET" "${BASE}/api/v1/bulk-schedule/template"
FUTURE2=$(date -u -v+10d +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -d "+10 days" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null)
run_test "POST /bulk-schedule/validate" "200" "POST" "${BASE}/api/v1/bulk-schedule/validate" \
  "{\"csvContent\":\"platform,text,scheduledTime\nlinkedin,n8n bulk test post,${FUTURE2}\"}"
run_test "POST /bulk-schedule/validate (no csv → 400)" "400" "POST" "${BASE}/api/v1/bulk-schedule/validate" '{}'
run_test "POST /bulk-schedule/import" "200" "POST" "${BASE}/api/v1/bulk-schedule/import" \
  "{\"csvContent\":\"platform,text,scheduledTime\nlinkedin,n8n bulk import test,${FUTURE2}\"}"
run_test "GET /bulk-schedule (list imports)" "200" "GET" "${BASE}/api/v1/bulk-schedule"
run_test "POST /bulk-schedule/import (no csv → 400)" "400" "POST" "${BASE}/api/v1/bulk-schedule/import" '{}'

echo ""
echo "── 15: Audit Log ──"
run_test "GET /audit-log" "200" "GET" "${BASE}/api/v1/audit-log"

echo ""
echo "── 16: Accounts ──"
run_test "GET /accounts (list)" "200" "GET" "${BASE}/api/v1/accounts"

echo ""
echo "========================================"
echo " Results: ${PASS} passed, ${FAIL} failed (${TOTAL} total)"
echo "========================================"

if [[ -n "$BUGS" ]]; then
  echo ""
  echo "════════════════════════════════════════"
  echo " BUGS FOUND:"
  echo "════════════════════════════════════════"
  echo -e "$BUGS"
  echo ""
fi

if [[ ${FAIL} -gt 0 ]]; then
  exit 1
fi
echo "All tests passed!"
exit 0
