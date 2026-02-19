# SendIt n8n Workflow-Level Test Assets

These workflows are executable test assets for validating the SendIt n8n community node behavior in a local n8n test environment.

## Included Workflows

1. `01-action-smoke-list-accounts.json`
   - Manual trigger -> SendIt `account/getAll` -> payload assertion.

2. `02-publish-schedule-lifecycle.json`
   - Publish now + schedule create/list/trigger lifecycle with assertion nodes.

3. `03-trigger-event-handling-branch.json`
   - `SendIt Trigger` webhook event path with branch handling (`IF Is X Platform?`).

4. `04-retry-idempotency-split-wait-if.json`
   - Retry/idempotency workflow pattern using `Split In Batches`, `IF`, and `Wait`.

5. `05-library-lifecycle.json`
   - Library create/get/update/delete lifecycle path.

6. `06-approvals-lifecycle.json`
   - Approvals list path with optional approve/reject branch.

7. `07-listening-keyword-alert-flow.json`
   - Listening keyword/mention/alert/summary read flow.

8. `08-capabilities-connect-advanced.json`
   - Capabilities + connect action + advanced API request flow.

## How to Run

1. Start local n8n from `integrations/n8n`:

```bash
npm run testenv:up
```

2. Import each JSON from this folder into n8n UI.

3. Configure `SendIt API` credentials in n8n.

4. Execute each workflow manually (except the trigger workflow, which executes from webhook events).

## Notes

- These assets are designed for execution evidence capture, not as production automations.
- The trigger workflow subscribes to `post.failed` to validate webhook registration and branch logic.
- `06-approvals-lifecycle.json` defaults to a safe non-mutating branch unless you explicitly enable mutation in the code node.
- Publishing workflows default to `threads` in fixture nodes to avoid mandatory-media platforms.
