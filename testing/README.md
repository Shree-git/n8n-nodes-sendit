# Local n8n Test Environment

This folder runs a repeatable local n8n instance that loads the SendIt community node from `integrations/n8n`.

## Prerequisites

- Docker Desktop (or Docker Engine) with Compose v2
- Node.js + npm

## One-time setup

From `integrations/n8n`:

```bash
cp testing/.env.example testing/.env
```

Update `testing/.env` values (at minimum: `N8N_ENCRYPTION_KEY`, `N8N_BASIC_AUTH_PASSWORD`).

## Start

From `integrations/n8n`:

```bash
npm run testenv:up
```

What this does:

- Builds this package so the local node code is present in `dist/`
- Starts n8n on `http://localhost:5678`
- Waits for container health check to pass

## Stop

From `integrations/n8n`:

```bash
npm run testenv:down
```

## Logs

From `integrations/n8n`:

```bash
npm run testenv:logs
```

## Reset (clean state)

From `integrations/n8n`:

```bash
npm run testenv:reset
```

This removes the container and the named Docker volume (`sendit_n8n_test_data`).

## Direct Docker Compose commands (optional)

From `integrations/n8n/testing`:

```bash
docker compose --env-file .env up -d --wait
docker compose --env-file .env down --remove-orphans
docker compose --env-file .env down -v --remove-orphans
docker compose --env-file .env logs -f n8n
```

## Troubleshooting

- `testing/.env` missing: create it from `.env.example`.
- Port `5678` already in use: stop the conflicting service and retry.
- Node not visible in n8n UI: run `npm run build` in `integrations/n8n`, then restart with `npm run testenv:reset && npm run testenv:up`.
- Health check does not pass: inspect logs with `npm run testenv:logs`.

## Workflow-Level Test Assets

- Executable workflow test JSON files are in `integrations/n8n/testing/workflows`.
- Import these files in n8n to run smoke/lifecycle/trigger/retry-idempotency scenarios.
- Detailed execution checklist and reporting template: `docs/testing/N8N_AUTOMATION_EXECUTION_CHECKLIST.md`.
