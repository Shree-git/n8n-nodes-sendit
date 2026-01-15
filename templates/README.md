# SendIt n8n Workflow Templates

Pre-built workflow templates for the SendIt n8n community node.

## Quick Start

1. Install the SendIt node: `npm install n8n-nodes-sendit`
2. Import a template JSON file in n8n
3. Configure your credentials
4. Activate the workflow

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

### Advanced (15+ min setup)
| Template | Description |
|----------|-------------|
| Multi-Platform Content Router | Route by content type |
| Content Approval Workflow | Slack approval before publish |
| Scheduled Bulk Upload | Bulk schedule from CSV |

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

### Other Credentials

Each template may require additional credentials:
- Google Sheets: OAuth2
- Slack: OAuth2 or API Token
- Notion: API Key
- etc.

## Template Structure

```json
{
  "name": "Workflow Name",
  "nodes": [...],
  "connections": {...},
  "settings": {...}
}
```

## Customization Tips

### Add Error Handling
```
Trigger -> Try/Catch -> SendIt -> Success/Error paths
```

### Add Rate Limiting
```
Trigger -> Split In Batches -> SendIt -> Wait (1 second)
```

### Add Deduplication
```
Trigger -> Check if exists -> IF -> SendIt
```

### Add Logging
```
SendIt -> Log to Sheets/Database/Slack
```

## Common Patterns

### Filter Before Publishing
```json
{
  "nodes": [
    { "type": "trigger" },
    { "type": "n8n-nodes-base.if", "conditions": "..." },
    { "type": "n8n-nodes-sendit.sendIt" }
  ]
}
```

### Multiple Platforms with Different Content
```json
{
  "nodes": [
    { "type": "trigger" },
    { "type": "n8n-nodes-base.switch" },
    { "type": "n8n-nodes-sendit.sendIt", "platforms": ["linkedin"] },
    { "type": "n8n-nodes-sendit.sendIt", "platforms": ["twitter"] }
  ]
}
```

## Best Practices

1. **Test workflows** with sample data before activating
2. **Use error handling** for production workflows
3. **Set appropriate polling intervals** to avoid rate limits
4. **Keep credentials secure** and use environment variables
5. **Monitor execution history** for troubleshooting

## Support

- n8n Documentation: https://docs.n8n.io
- SendIt Documentation: https://sendit.infiniteappsai.com/docs
- Issues: https://github.com/infiniteappsai/sendit/issues
