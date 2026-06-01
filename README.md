# Incident Response Tool

A full-stack ITSM incident response web application for managing the complete incident lifecycle — from detection through resolution. Built with Node.js, TypeScript, React, and SQLite.

![Dashboard](https://img.shields.io/badge/status-active-brightgreen) ![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue) ![React](https://img.shields.io/badge/React-19-61dafb) ![License](https://img.shields.io/badge/license-MIT-green)

---

## Features

### Incident Management
- **Full lifecycle tracking** — `open → investigating → identified → monitoring → resolved`
- **Severity levels** — P1 (Critical), P2 (High), P3 (Medium), P4 (Low)
- **Assignee & tag tracking** — assign owners and tag incidents for filtering
- **Audit timeline** — every status change, note, and integration event is automatically logged

### SLA Tracking
| Severity | Response SLA | Resolution SLA |
|----------|-------------|----------------|
| P1       | 15 minutes  | 1 hour         |
| P2       | 30 minutes  | 4 hours        |
| P3       | 2 hours     | 24 hours       |
| P4       | 8 hours     | 72 hours       |

Live countdown timers on every incident card turn red when an SLA is breached.

### Integrations
- **Slack** — Block Kit notifications on create, resolve, and escalate via Incoming Webhooks
- **Jira** — Automatically creates a Jira issue (linked back to the incident) on creation
- **Inbound Webhook** — Generic HTTP endpoint for receiving alerts from external tools (Datadog, PagerDuty, custom scripts, etc.)

### Dashboard & Real-Time Updates
- Metrics bar showing open incidents by severity, SLA breach count, and average resolution time
- Server-Sent Events (SSE) keep the dashboard live without polling
- Search and filter by title, severity, and status

### Post-Mortem Generation
One-click Markdown post-mortem template pre-filled with the incident's metadata, SLA data, and full timeline — ready to fill in root cause and action items.

---

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Backend   | Node.js 22, TypeScript, Express 5   |
| Database  | SQLite (better-sqlite3), WAL mode   |
| Frontend  | React 19, Vite 6, Tailwind CSS v4   |
| Real-time | Server-Sent Events (SSE)            |
| Icons     | Lucide React                        |
| Dev runner| concurrently + tsx watch            |

---

## Prerequisites

- **Node.js** v18 or later (v22 recommended)
- **npm** v9 or later

---

## Installation

```bash
git clone https://github.com/brianturner005/Incident_Response.git
cd Incident_Response
npm install
```

---

## Configuration

Copy the example environment file and fill in any integrations you want to enable. All fields are optional — the app runs fully without any external integrations configured.

```bash
cp .env.example .env
```

```env
PORT=3000
DATA_DIR=./data

# Slack Incoming Webhook (https://api.slack.com/messaging/webhooks)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Jira Cloud (https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/)
JIRA_BASE_URL=https://yourorg.atlassian.net
JIRA_EMAIL=you@yourorg.com
JIRA_API_TOKEN=your_api_token_here
JIRA_PROJECT_KEY=IT
```

You can also configure integrations at runtime through the **Settings** page in the UI without restarting the server.

---

## Running the App

### Development

Starts the Express server (with hot reload via `tsx watch`) and the Vite dev server concurrently. The Vite server proxies `/api` requests to Express.

```bash
npm run dev
```

- **App UI**: http://localhost:5173
- **API**: http://localhost:3000/api

### Production

```bash
npm run build   # compiles TypeScript + bundles React with Vite
npm start       # serves everything from Express on port 3000
```

- **App**: http://localhost:3000

The SQLite database is automatically created at `./data/incidents.db` on first run.

---

## API Reference

All endpoints are prefixed with `/api`.

### Incidents

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/incidents` | Create an incident. Triggers Slack + Jira if configured. |
| `GET` | `/incidents` | List incidents. Query params: `status`, `severity`, `search`. |
| `GET` | `/incidents/:id` | Get incident details. |
| `PATCH` | `/incidents/:id` | Update title, description, severity, status, assignee, or tags. |
| `POST` | `/incidents/:id/resolve` | Mark as resolved. Sends Slack notification. |
| `POST` | `/incidents/:id/notes` | Add a manual note to the timeline. |
| `GET` | `/incidents/:id/timeline` | Get the full audit timeline. |
| `POST` | `/incidents/:id/postmortem` | Generate a post-mortem Markdown template. |

**Create incident body:**
```json
{
  "title": "Payments API returning 500s",
  "description": "Error rate on /api/checkout exceeds 5%",
  "severity": "P1",
  "assignee": "alice",
  "tags": "payments,api"
}
```

### Metrics

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/metrics` | Open incidents by severity, SLA breach count, avg resolution time. |

### Configuration

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/config` | Get current integration config (tokens are masked). |
| `PUT` | `/config` | Update integration config key-value pairs. |
| `POST` | `/config/test-slack` | Send a test Slack message. |
| `POST` | `/config/test-jira` | Verify Jira credentials (pings `/rest/api/3/myself`). |

### Real-Time Events

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/events` | SSE stream. Emits `incident_created`, `incident_updated`, `incident_resolved` events. |

### Inbound Webhook

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/webhooks/inbound` | Receive external alerts and create incidents automatically. |

**Inbound webhook body:**
```json
{
  "title": "High error rate detected",
  "description": "P99 latency exceeded threshold on service-A",
  "severity": "P2",
  "source": "Datadog",
  "tags": ["api", "latency"]
}
```

If `severity` is missing or invalid, it defaults to `P2`. The `source` value is added to the incident's tags as `source:<value>`.

---

## Project Structure

```
Incident_Response/
├── src/
│   ├── shared/
│   │   └── types.ts              # Shared TypeScript types (Incident, TimelineEvent, SLA_TARGETS, etc.)
│   ├── server/
│   │   ├── index.ts              # HTTP server entry point
│   │   ├── app.ts                # Express app setup, route mounting, static file serving
│   │   ├── db/
│   │   │   └── index.ts          # SQLite initialization, schema DDL, WAL mode, env seeding
│   │   ├── routes/
│   │   │   ├── incidents.ts      # Incident CRUD, resolve, notes, timeline, post-mortem
│   │   │   ├── config.ts         # Integration config read/write + test endpoints
│   │   │   ├── metrics.ts        # Aggregated metrics endpoint
│   │   │   ├── webhooks.ts       # Inbound alert ingestion
│   │   │   └── events.ts         # SSE stream
│   │   └── services/
│   │       ├── incident.ts       # Core business logic: CRUD, SLA computation, metrics
│   │       ├── slack.ts          # Slack Incoming Webhook client (Block Kit)
│   │       ├── jira.ts           # Jira REST API v3 client
│   │       ├── postmortem.ts     # Post-mortem Markdown generator
│   │       └── eventBus.ts       # In-process pub/sub for SSE fan-out
│   └── client/
│       ├── index.html
│       ├── main.tsx              # React entry point
│       ├── App.tsx               # Router and layout
│       ├── api.ts                # Typed fetch wrappers for all API endpoints
│       ├── index.css             # Tailwind CSS v4 import
│       ├── components/
│       │   ├── SeverityBadge.tsx # Color-coded P1/P2/P3/P4 badge
│       │   ├── StatusBadge.tsx   # Status badge with lifecycle colors
│       │   ├── SLATimer.tsx      # Live countdown/elapsed timer with breach detection
│       │   ├── IncidentCard.tsx  # Dashboard list card
│       │   ├── IncidentForm.tsx  # Create incident modal
│       │   ├── Timeline.tsx      # Vertical audit event list
│       │   └── MetricsBar.tsx    # Top-of-dashboard metrics summary
│       └── pages/
│           ├── Dashboard.tsx     # Incident list, filters, metrics, SSE live updates
│           ├── IncidentDetail.tsx # Full detail view, actions, note-taking, post-mortem
│           └── Settings.tsx      # Integration configuration and test connections
├── data/                         # SQLite database (created at runtime, gitignored)
├── dist/                         # Compiled output (gitignored)
├── .env.example                  # Environment variable template
├── tsconfig.json                 # Base TypeScript config
├── tsconfig.server.json          # Server build (CommonJS, outputs to dist/)
├── tsconfig.client.json          # Client TypeScript config (for IDE support)
├── vite.config.ts                # Vite build config with /api proxy
└── package.json
```

---

## Integration Setup Guides

### Slack

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and create a new app.
2. Enable **Incoming Webhooks** and add a webhook to your desired channel.
3. Copy the webhook URL (starts with `https://hooks.slack.com/services/...`).
4. Paste it into `.env` as `SLACK_WEBHOOK_URL`, or enter it on the **Settings** page.

Notifications are sent for:
- New incident created (with severity, status, description, and Jira link if available)
- Incident resolved
- Severity escalation

### Jira

1. Log in to your Atlassian account and go to [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens).
2. Create an API token.
3. Fill in the four Jira fields in `.env` (or Settings page): `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEY`.
4. Use **Test Connection** in Settings to verify before going live.

Jira issues are automatically created when an incident is opened. The issue is linked back to the incident detail page. Priority mapping:

| Incident Severity | Jira Priority |
|-------------------|---------------|
| P1                | Highest       |
| P2                | High          |
| P3                | Medium        |
| P4                | Low           |

### External Tools (Inbound Webhook)

Any tool that can send an HTTP POST can push alerts into the system. Example with `curl`:

```bash
curl -X POST http://localhost:3000/api/webhooks/inbound \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Disk usage > 90% on prod-db-01",
    "severity": "P2",
    "source": "Nagios",
    "tags": ["database", "storage"]
  }'
```

This is the primary integration point for combining this tool with other tools in a monitoring suite.

---

## Expanding the Tool Suite

This tool is designed to be one piece of a larger ITSM suite. The key integration surfaces are:

- **`POST /api/webhooks/inbound`** — push alerts from any monitoring tool, log analyzer, or custom script
- **`GET /api/events`** — subscribe to the SSE stream to react to incident lifecycle changes in real time
- **`GET /api/incidents` + `GET /api/metrics`** — query incident state for dashboards or reporting tools
- **Shared types** in `src/shared/types.ts` — import directly if building a TypeScript companion tool

---

## License

MIT — see [LICENSE](./LICENSE).
