# n8n-nodes-sendit

This is an n8n community node for [SendIt](https://sendit.infiniteappsai.com), an AI-native multi-platform social publishing API.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## Release Notes (v1.3.1)

`1.3.1` is a verification-readiness release:

- **n8n verification readiness**: Added GitHub Actions provenance publishing support for npm releases
- **Cloud-safe media upload**: Removed host file path reads; media uploads now use n8n binary data only
- **Standalone package fix**: Removed package imports from the SendIt server codebase
- **Refactored architecture**: Monolithic 2,842-line node split into handler-per-resource dispatch map (23 handler modules)
- **New resources**: Dead Letter Queue, Audit Log, Conversions
- **Expanded resources**: Brand Voice (get/update/delete), Webhooks (list/get/update), AI (reply suggestions, mention summary, feedback)
- **Multi-event triggers**: Trigger node now supports subscribing to multiple events at once
- **Pagination**: Added limit/offset to account, campaign, approvals, and brand voice list operations
- **Quick fixes**: Credential test uses `/capabilities` (lighter, scope-free), removed dead `gulp` dependency, fixed ESLint 9 lint script, scoped `requestTimeoutMs` to advanced resource, added missing operation descriptions, narrowed type casts

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

```bash
npm install n8n-nodes-sendit
```

## Quick Start

### 1. Get your API key

Sign in to [SendIt](https://sendit.infiniteappsai.com), go to **Dashboard > API Keys > Create New Key**, and copy the key (format: `sk_live_...`).

### 2. Add credentials in n8n

Go to **Credentials > Add Credential**, search for **SendIt API**, paste your key, and save. n8n tests the connection automatically.

### 3. Publish your first post

Add a **SendIt** node to a workflow, select **Post > Publish**, pick your target platforms, enter text, and execute. That's it.

### 4. Set up a trigger

Add a **SendIt Trigger** node as the first node in a new workflow. Select events to listen for (e.g., Post Published, Post Failed). Activate the workflow and n8n registers a webhook with SendIt automatically.

### 5. Example: AI social publishing pipeline

```
[Google Sheets] → [SendIt: AI > Generate Content] → [SendIt: Post > Publish] → [SendIt Trigger: post.published]
```

Read content ideas from a spreadsheet, generate AI copy, publish to multiple platforms, and get notified on success.

## Node Coverage (v1.3.1)

### Trigger

`SendIt Trigger` supports catalog events with multi-select plus custom override:

- Post lifecycle: `post.published`, `post.scheduled`, `post.failed`, `post.deleted`, `post.dead_lettered`
- Account lifecycle: `account.connected`, `account.disconnected`, `account.token_expiring`, `account.token_refresh_failed`, `account.reconnect_required`, `account.refresh_recovered`, `account.auth_recovery_completed`
- Listening: `mention.detected`, `mention.negative_sentiment`
- Team: `team.member_joined`, `team.member_left`, `team.member_role_changed`, `team.invitation_sent`, `team.invitation_accepted`, `team.invitation_declined`
- Approvals: `approval.submitted`, `approval.step_approved`, `approval.request_changes`, `approval.rejected`
- Analytics/Security/Audit: `analytics.anomaly_detected`, `security.api_key_rotation_due`, `audit.critical`

`Custom Event` lets you subscribe to an event string not listed yet in the static dropdown.

### Actions

| Resource        | Operation(s)                                                                                                                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `post`          | `publish`, `publishAi`                                                                                                                                                                                                         |
| `ai`            | `generate`, `replySuggestions`, `mentionSummary`, `feedback`                                                                                                                                                                   |
| `media`         | `upload`                                                                                                                                                                                                                       |
| `scheduledPost` | `create`, `getAll`, `delete`, `trigger`                                                                                                                                                                                        |
| `account`       | `getAll`                                                                                                                                                                                                                       |
| `validation`    | `validate`                                                                                                                                                                                                                     |
| `analytics`     | `getAnalytics`                                                                                                                                                                                                                 |
| `brandVoice`    | `create`, `list`, `get`, `update`, `delete`                                                                                                                                                                                    |
| `campaign`      | `plan`, `list`, `schedule`                                                                                                                                                                                                     |
| `inbox`         | `list`, `reply`, `getThread`, `updateStatus`                                                                                                                                                                                   |
| `listening`     | `refresh`, `listKeywords`, `createKeyword`, `getKeyword`, `updateKeyword`, `deleteKeyword`, `listMentions`, `getMention`, `markMentionsRead`, `archiveMentions`, `listAlerts`, `markAlertsRead`, `dismissAlerts`, `getSummary` |
| `aiMedia`       | `create`, `getStatus`                                                                                                                                                                                                          |
| `meta`          | `getCapabilities`, `getRequirements`, `getPlatformSettingsSchema`, `getBestTimes`, `getWebhookEventsCatalog`, `getWebhookTriggers`                                                                                             |
| `contentScore`  | `score`                                                                                                                                                                                                                        |
| `library`       | `list`, `create`, `get`, `update`, `delete`, `listCategories`, `listTags`                                                                                                                                                      |
| `approvals`     | `list`, `approve`, `reject`                                                                                                                                                                                                    |
| `bulkSchedule`  | `listImports`, `getImport`, `validateCsv`, `importCsv`, `downloadTemplate`                                                                                                                                                     |
| `connect`       | `getConnectAction`, `connectToken`, `connectWebhook`                                                                                                                                                                           |
| `webhooks`      | `list`, `get`, `update`, `testWebhook`                                                                                                                                                                                         |
| `deadLetter`    | `list`, `requeue`, `discard`                                                                                                                                                                                                   |
| `auditLog`      | `list`                                                                                                                                                                                                                         |
| `conversions`   | `track`                                                                                                                                                                                                                        |
| `advanced`      | `apiRequest`                                                                                                                                                                                                                   |

### Global Optional Headers

The action node supports optional request-scoped headers:

- `teamId` -> sent as `X-Team-ID`
- `idempotencyKey` -> sent as `Idempotency-Key`

## Supported Platforms

The node ships with the full SendIt platform catalog option list and should be treated as catalog-driven. Always use capabilities/meta operations (`meta.getCapabilities`) to verify current operator-side availability.

## Examples

### Connect token credentials (`connect.connectToken`)

`Credentials JSON` example:

```json
{ "apiKey": "your-platform-key", "apiSecret": "your-platform-secret" }
```

### Create library item (`library.create`)

- `libraryTitle`: `Weekly Product Update`
- `libraryText`: `New launch highlights...`
- `libraryType`: `template`
- `libraryTargetPlatforms`: `linkedin`, `x`

### Approve scheduled post (`approvals.approve`)

- `approvalPostId`: `sched_abc123`
- `approvalComment`: `Approved for publishing`

### Requeue a failed post (`deadLetter.requeue`)

- `deadLetterId`: `dl_abc123`

### Track a conversion (`conversions.track`)

- `conversionTrackedLinkId`: `tl_abc123`
- `conversionType`: `signup`
- `conversionValue`: `10`

### Advanced request (`advanced.apiRequest`)

- `method`: `GET`
- `path`: `/api/v2/capabilities`
- `queryJson`: `{"include_beta":"1"}`
- `responseMode`: `json`

Allowed path prefixes:

- `/api/v1/`
- `/api/v2/`

## API Contract Notes

- Inbox replies use `text` in `POST /api/v1/inbox/:threadId/reply`.
- Campaign planning uses `brief` + `platforms` (optional `postCount`, `startDate`, `endDate`).
- AI media create uses `provider`, `prompt`, `media_type`, and `parameters`.
- Bulk CSV validation/import expect raw CSV string in `csvContent`.

## Developer Note: 1.2.0 Endpoint Map

### Typed coverage

- Meta: `/capabilities`, `/requirements`, `/platforms/schema`, `/best-times`, `/webhooks/events-catalog`, `/webhooks/triggers`
- Publishing/scheduling: `/publish`, `/publish-ai`, `/schedule`, `/scheduled`, `/scheduled/:id`, `/scheduled/:id/trigger`
- AI/media: `/ai/generate-content`, `/ai/reply-suggestions`, `/ai/mention-summary`, `/ai/feedback`, `/media/upload`, `/ai-media`, `/ai-media/:id`
- Quality/validation: `/validate`, `/content-score`, `/analytics`
- Collaboration: `/inbox`, `/inbox/:threadId`, `/inbox/:threadId/reply`, `/inbox/:threadId/status`
- Listening: `/listening/*` keyword/mention/alert/summary/refresh routes
- Library: `/library`, `/library/:id`, `/library/categories`, `/library/tags`
- Brand Voice: `/brand-voice`, `/brand-voice/:id` (full CRUD)
- Approvals: `/approvals`, `/approvals/:postId/approve`, `/approvals/:postId/reject`
- Bulk: `/bulk-schedule`, `/bulk-schedule/:id`, `/bulk-schedule/validate`, `/bulk-schedule/import`, `/bulk-schedule/template`
- Connect: `/connect/:platform`, `/connect/token`, `/connect/webhook`
- Webhooks: `/webhooks`, `/webhooks/:id`, `/webhooks/:id/test` (list, get, update, test)
- Dead Letter: `/dead-letter`, `/dead-letter/:id/requeue`, `/dead-letter/:id/discard`
- Audit Log: `/audit-log`
- Conversions: `/conversions`

### Advanced coverage (long-tail + v2)

Use `advanced.apiRequest` for operations outside typed coverage, including v2 dashboard-heavy surfaces.

## Credentials

To use this node, you need a SendIt API key:

1. Sign in to [SendIt](https://sendit.infiniteappsai.com)
2. Open your [Dashboard](https://sendit.infiniteappsai.com/dashboard)
3. Create an API key in **API Keys**
4. Configure in n8n under **Credentials** -> **SendIt API**

API key format:

```text
sk_live_<32_character_string>
```

## Resources

- [SendIt Documentation](https://sendit.infiniteappsai.com/documentation.html)
- [n8n Community Nodes Documentation](https://docs.n8n.io/integrations/community-nodes/)

## License

[MIT](LICENSE)
