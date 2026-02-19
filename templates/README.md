# SendIt n8n Workflow Templates

Pre-built workflow templates for the SendIt n8n community node.

## Quick Start

1. Install the SendIt node: `npm install n8n-nodes-sendit`
2. Import a template JSON file in n8n
3. Configure your credentials
4. Activate the workflow

## API Contract Notes (v1.1.0)

- Global optional headers on action node:
  - `teamId` -> `X-Team-ID`
  - `idempotencyKey` -> `Idempotency-Key`
- Inbox replies use `text` in `POST /api/v1/inbox/:threadId/reply`.
- Campaign planning uses `brief` + `platforms` (optional `postCount`, `startDate`, `endDate`).
- AI media creation uses `provider`, `prompt`, `media_type`, and `parameters`.
- Connect flows:
  - `GET /api/v1/connect/:platform`
  - `POST /api/v1/connect/token`
  - `POST /api/v1/connect/webhook`
- Advanced operation supports only `/api/v1/*` and `/api/v2/*` paths.

## Available Templates

### Beginner (5 min setup)
| Template | Description |
|----------|-------------|
| Google Sheets Content Calendar | Publish from spreadsheet |
| RSS Feed to Social Media | Auto-share RSS items |
| WordPress Auto-Share | Share blog posts |
| Shopify Product Announcements | Announce new products |
| Airtable Post Scheduler | Schedule from Airtable |
| Slack to Social Media | Post from Slack |
| YouTube Video Promotion | Share new videos |

### Intermediate (10 min setup)
| Template | Description |
|----------|-------------|
| Notion Content Pipeline | Publish when status = Ready |
| Publish Notifications to Slack | Get notified on publish |
| Email Alerts on Failures | Alert when posts fail |
| Log Posts to Database | Track in DB |
| Share Typeform Testimonials | Share positive reviews |
| Library Lifecycle Automation | Create/get/update content library assets |

### Advanced (15+ min setup)
| Template | Description |
|----------|-------------|
| Multi-Platform Content Router | Route by content type |
| Content Approval Workflow | Slack approval before publish |
| Scheduled Bulk Upload | Bulk schedule from CSV |
| Approvals Queue Processing | Process approval queue with policy branch |
| Listening Alert Escalation | Escalate high-priority mentions/alerts |
| Capabilities + Connect + Advanced API | Discover capabilities and run long-tail requests |

## Importing Templates

### Via n8n UI

1. Open n8n
2. Click **Workflows** > **Import from File**
3. Select the template JSON file
4. Click **Import**

### Via CLI

```bash
n8n import:workflow --input=./template.json
```

## Configuring Credentials

### SendIt API Credentials

1. In n8n, go to **Credentials** > **New**
2. Search for "SendIt API"
3. Enter your API key (from SendIt dashboard)
4. Save

## Template Structure

```json
{
  "name": "Workflow Name",
  "nodes": [...],
  "connections": {...},
  "settings": {...}
}
```

## Best Practices

1. Test workflows with sample data before activating.
2. Use error handling for production workflows.
3. Use idempotency keys for retry-sensitive publish/schedule flows.
4. Keep credentials secure.
5. Monitor execution history for troubleshooting.

## Support

- n8n Documentation: https://docs.n8n.io
- SendIt Documentation: https://sendit.infiniteappsai.com/documentation.html
- Issues: https://github.com/infiniteappsai/sendit/issues
