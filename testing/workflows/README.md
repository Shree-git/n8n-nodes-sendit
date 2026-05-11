# SendIt n8n Test Workflows

Consolidated test suite for validating the SendIt n8n integration. Contains both node-level tests (using the SendIt n8n node) and API-level tests (using raw HTTP requests).

## Node-Level Tests (01-08)

These workflows use the `n8n-nodes-sendit` node directly. They require the SendIt API credential configured in n8n.

| #   | File                            | What it tests                                                 |
| --- | ------------------------------- | ------------------------------------------------------------- |
| 01  | action-smoke-list-accounts      | Basic action smoke test — account.getAll                      |
| 02  | publish-schedule-lifecycle      | Publish + schedule create/list/trigger lifecycle              |
| 03  | trigger-event-handling-branch   | SendIt Trigger (post.failed) with platform branching          |
| 04  | retry-idempotency-split-wait-if | Retry/idempotency workflow with Split In Batches              |
| 05  | library-lifecycle               | Library create/get/update/delete                              |
| 06  | approvals-lifecycle             | Approvals list + conditional approve/reject (canMutate=false) |
| 07  | listening-keyword-alert-flow    | Keywords, mentions, alerts, summary read flow                 |
| 08  | capabilities-connect-advanced   | Capabilities + connect action + raw API request               |

## API-Level Tests (09-18)

These workflows use raw HTTP requests (n8n-nodes-base.httpRequest) to test the SendIt API directly. They require `SENDIT_API_KEY` and `SENDIT_BASE_URL` environment variables set in n8n.

| #   | File                   | What it tests                        |
| --- | ---------------------- | ------------------------------------ |
| 09  | api-health-and-auth    | Health endpoint, 401 on bad auth     |
| 10  | api-content-validation | Content validation before publishing |
| 11  | api-analytics          | Analytics retrieval and processing   |
| 12  | api-brand-voice        | Brand voice profile CRUD             |
| 13  | api-campaigns          | Campaign planning and scheduling     |
| 14  | api-social-inbox       | Inbox thread management and replies  |
| 15  | api-dead-letter        | Failed post recovery and requeueing  |
| 16  | api-webhooks           | Webhook registration and testing     |
| 17  | api-ai-features        | AI content generation and media      |
| 18  | api-bulk-operations    | Bulk CSV import and operations       |

## How to Run

### Interactive (n8n UI)

1. Start local n8n:
   ```bash
   cd integrations/n8n
   npm run testenv:up
   ```
2. Open http://localhost:5678
3. Import each JSON workflow via **Workflows** > **Import from File**
4. Configure credentials:
   - **Node-level tests (01-08):** Add a "SendIt API" credential with your API key
   - **API-level tests (09-18):** Set `SENDIT_API_KEY` and `SENDIT_BASE_URL` env vars in n8n settings or Docker env
5. Execute each workflow manually (except 03, which is webhook-triggered)

### Automated (scripts)

```bash
cd integrations/n8n/testing

# Create .env.test with your credentials
cat > .env.test << 'EOF'
SENDIT_API_KEY=sk_live_your_key_here
SENDIT_BASE_URL=https://sendit.infiniteappsai.com
TEST_PLATFORM=linkedin
EOF

# Run all API-level tests via curl
./run-tests.sh

# Run all workflows via n8n CLI
./run-all.sh
```

## Notes

- Node-level tests (01-08) test the n8n node's parameter mapping, credential handling, and assertion logic.
- API-level tests (09-18) test the SendIt API responses directly, independent of the n8n node.
- The trigger workflow (03) subscribes to `post.failed` to validate webhook registration and branch logic.
- Workflow 06 defaults to safe non-mutating branch unless you explicitly enable mutation.
- Publishing workflows default to `threads` to avoid mandatory-media platforms.
