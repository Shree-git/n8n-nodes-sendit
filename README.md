# n8n-nodes-sendit

This is an n8n community node for [SendIt](https://sendit.infiniteappsai.com) - a multi-platform social media publishing service.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

```bash
npm install n8n-nodes-sendit
```

## Operations

### Triggers

- **On post published** - Triggers when a post is successfully published
- **On post scheduled** - Triggers when a post is scheduled
- **On post failed** - Triggers when a post fails to publish
- **On post deleted** - Triggers when a scheduled post is cancelled
- **On account connected** - Triggers when a social account is connected
- **On account disconnected** - Triggers when a social account is disconnected

### Actions

- **Publish Post** - Publish content immediately to selected platforms
- **Schedule Post** - Schedule content for future publishing
- **List Scheduled Posts** - Get all scheduled posts
- **Cancel Scheduled Post** - Cancel a scheduled post
- **Trigger Scheduled Post** - Publish a scheduled post immediately
- **List Accounts** - Get all connected social media accounts
- **Validate Content** - Validate content before publishing

## Supported Platforms

- LinkedIn
- Instagram
- Threads
- TikTok
- X (Twitter)

## Credentials

To use this node, you need a SendIt API key:

### Getting Your API Key

1. **Sign in** to [SendIt](https://sendit.infiniteappsai.com) using your email (magic link authentication)
2. Go to your [Dashboard](https://sendit.infiniteappsai.com/dashboard)
3. In the **API Keys** section, click **"Create New Key"**
4. Give it a name (e.g., "n8n Integration") and click Create
5. **Copy your API key immediately** - it's only shown once!

### API Key Format

```
sk_live_<32_character_string>
```

Keys always start with `sk_live_` followed by 32 alphanumeric characters.

### Configuring in n8n

1. In n8n, go to **Credentials** → **New Credential** → **SendIt API**
2. Paste your API key
3. Click **Save**

> **Note:** Your API key is only shown once when created. If you lose it, you'll need to create a new one from the dashboard.

## Resources

- [SendIt Documentation](https://sendit.infiniteappsai.com/documentation.html)
- [n8n Community Nodes Documentation](https://docs.n8n.io/integrations/community-nodes/)

## License

[MIT](LICENSE)
