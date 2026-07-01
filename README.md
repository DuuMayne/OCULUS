# OCULUS — Operational Control Unified Logic & Uniform Scoring

Continuously monitors your critical security controls and alerts you the moment something drifts out of compliance. Instead of finding out at audit time that MFA was disabled three months ago, OCULUS checks your controls every few hours and sends a Slack message the instant a control fails.

Connect your Okta, GitHub, and AWS accounts once. OCULUS handles the rest — running checks on a schedule, storing evidence snapshots, and giving you a live dashboard of what's passing and what's not.

---

## Part of the PANOPTICON Suite

OCULUS is one piece of a three-part system for GRC engineers:

| Tool | What it does | Repo |
|------|-------------|------|
| **[CHECKS](https://github.com/DuuMayne/CHECKS)** | Standalone check library — deterministic pass/fail logic + connectors | The primitive |
| **OCULUS** (this) | Runs checks continuously, stores results, alerts on drift | The monitor |
| **[EXHIBIT](https://github.com/DuuMayne/EXHIBIT)** | Packages evidence for auditors — maps frameworks, generates explainers | The audit response |

**How they connect:** OCULUS has its own connectors and evaluators built in. CHECKS is a related standalone library with the same connector/evaluator pattern. When an auditor asks for evidence, EXHIBIT pulls check results from OCULUS (free, already computed) instead of making expensive API calls.

Each tool works independently. You don't need all three. But together they form a feedback loop: OCULUS monitors → EXHIBIT surfaces gaps → you build new checks → coverage improves.

**What it monitors:**
- **Okta:** MFA enrolled for all active users, no users inactive beyond threshold
- **GitHub:** Branch protection on critical repos, no direct pushes to main, secret scanning enabled
- **AWS:** CloudTrail audit logging active, root account has MFA, no stale IAM access keys, all S3 buckets encrypted, no publicly accessible S3 buckets

**Alerts when:** Any control transitions from passing to failing, and again if it remains failing on the next scheduled run.

> **Note:** A mock data mode is available if you want to explore the dashboard before connecting real systems — you don't need API keys to get started.

---

## Table of Contents

1. [What you need before starting](#1-what-you-need-before-starting)
2. [Setup: Docker (recommended)](#2-setup-docker-recommended)
3. [Setup: Local development](#3-setup-local-development)
4. [Getting your API credentials](#4-getting-your-api-credentials)
5. [Configuring Slack alerts](#5-configuring-slack-alerts)
6. [Using the dashboard](#6-using-the-dashboard)
7. [Triggering manual runs](#7-triggering-manual-runs)
8. [Adjusting check frequency](#8-adjusting-check-frequency)
9. [Troubleshooting](#9-troubleshooting)
10. [For developers](#10-for-developers)

---

## 1. What you need before starting

**For Docker setup (recommended):**
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

**For local development:**
- Python 3.12+, Node.js 18+, and a PostgreSQL database

**API credentials (optional for mock mode, required for real data):**
- Okta API token
- GitHub personal access token
- AWS access key with read-only IAM and S3 permissions
- Slack webhook URL (for alerts)

---

## 2. Setup: Docker (recommended)

Docker starts everything — the backend, the dashboard, and the database — with a single command.

### Step 1 — Install Docker Desktop

Download from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) and confirm it's running (whale icon in menu bar/system tray).

### Step 2 — Clone OCULUS

```bash
git clone https://github.com/DuuMayne/OCULUS.git
cd OCULUS
```

### Step 3 — Configure credentials (or skip for mock mode)

```bash
cp .env.example .env
```

Open `.env` in any text editor. You can leave everything blank to start with mock data, or fill in credentials for the systems you want to monitor. See [section 4](#4-getting-your-api-credentials) for how to get each credential.

```
# Leave these blank to use mock data:
OKTA_DOMAIN=your-org.okta.com
OKTA_API_TOKEN=

GITHUB_TOKEN=

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=us-east-1

# Optional — Slack alerts:
SLACK_WEBHOOK_URL=
```

### Step 4 — Start OCULUS

```bash
docker compose up -d --build
```

This starts three containers: the database, the backend API, and the frontend. The `--build` step takes 3–5 minutes the first time.

### Step 5 — Open the dashboard

- **Dashboard:** [http://localhost:3000](http://localhost:3000)
- **API docs** (optional): [http://localhost:8000/docs](http://localhost:8000/docs)

**To stop:**
```bash
docker compose down
```

**To update:**
```bash
git pull
docker compose up -d --build
```

---

## 3. Setup: Local development

Use this if you want to modify the code or run without Docker. This setup is more involved — Docker is recommended unless you need to make code changes.

### Prerequisites

Install:
- Python 3.12 (`python3 --version`)
- Node.js 18+ (`node --version`)
- PostgreSQL 16 (`psql --version`)

### Step 1 — Set up the database

```bash
createdb oculus
psql -c "CREATE USER oculus WITH PASSWORD 'oculus'; GRANT ALL ON DATABASE oculus TO oculus;"
```

### Step 2 — Set up the backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Copy and configure the environment file:
```bash
cp ../.env.example ../.env
# Edit .env with your credentials
```

Run database migrations and seed the control definitions:
```bash
export DATABASE_URL=postgresql://oculus:oculus@localhost:5432/oculus
alembic upgrade head
python -m app.seed
```

Start the backend:
```bash
uvicorn app.main:app --reload --port 8000
```

### Step 3 — Set up the frontend (new terminal)

```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)**.

---

## 4. Getting your API credentials

### Okta

1. Log into your Okta admin console (e.g. `yourorg-admin.okta.com`)
2. Go to **Security → API → Tokens**
3. Click **Create Token** → name it "OCULUS"
4. Copy the token — you won't see it again

Set `OKTA_DOMAIN` to your Okta domain (e.g. `yourcompany.okta.com`, without `https://`).

### GitHub

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click **Generate new token (classic)**
3. Name it "OCULUS", set expiration to 1 year
4. Select scopes: `repo` (read), `read:org`
5. Click **Generate token** and copy it

### AWS

OCULUS only reads from AWS — it never modifies anything. You need an IAM user or role with read-only permissions.

**Recommended: create a dedicated IAM user**
1. In the AWS console, go to **IAM → Users → Create user**
2. Name it `oculus-readonly`
3. Attach these managed policies:
   - `ReadOnlyAccess` (covers CloudTrail, IAM, S3)
4. Go to the user's **Security credentials** tab → **Create access key**
5. Copy the **Access Key ID** and **Secret Access Key**

Set `AWS_DEFAULT_REGION` to your primary AWS region (e.g. `us-east-1`).

---

## 5. Configuring Slack alerts

OCULUS sends Slack messages when a control fails for the first time, and again if it's still failing on the next run.

### Create a Slack webhook

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App → From scratch**
2. Name it "OCULUS Alerts" and select your workspace
3. Go to **Incoming Webhooks** → toggle **Activate Incoming Webhooks** on
4. Click **Add New Webhook to Workspace** → choose the channel (e.g. `#security-alerts`)
5. Copy the webhook URL (starts with `https://hooks.slack.com/services/...`)

Set `SLACK_WEBHOOK_URL` to that URL in your `.env` file.

**Example alert:**
```
⚠️ OCULUS: Control Failed
Control: MFA Enforced (Okta)
Status: FAIL
Failing resources: user@company.com, admin@company.com
Time: 2026-06-08 14:32:11 UTC
```

---

## 6. Using the dashboard

The main dashboard shows all 10 controls at a glance:
- **Green checkmark** — last run passed
- **Red X** — last run failed; click to see which resources are failing
- **Gray clock** — never run (click the control to trigger a manual run)

Click any control to see:
- Current status and which specific resources are failing
- The full run history (every check with timestamp and evidence)
- A raw evidence snapshot from the last run (the exact data returned by the API)

The **Admin** page shows whether your Okta, GitHub, and AWS credentials are working. A green dot means the connector authenticated successfully on the last run.

---

## 7. Triggering manual runs

By default, OCULUS checks all controls every 6 hours. To trigger an immediate check:

**From the dashboard:** Click a control → **Run Now** button.

**Via the API:**

The API uses UUIDs to identify controls. First, list controls to find their IDs:
```bash
# List all controls and their IDs
curl http://localhost:8000/api/controls | jq '.[] | {id, key}'
```

Then trigger a run for a specific control by its UUID:
```bash
# Trigger a run for a specific control by ID
curl -X POST http://localhost:8000/api/controls/<uuid>/run
```

For example, if the `mfa_enforced` control has ID `a1b2c3d4-...`:
```bash
curl -X POST http://localhost:8000/api/controls/a1b2c3d4-.../run
```

---

## 8. Adjusting check frequency

The default schedule is every 6 hours (21,600 seconds). To change it:

**Via the API:**
```bash
# Check every hour (3600 seconds):
curl -X PATCH http://localhost:8000/api/controls/mfa-enforced/cadence \
  -H "Content-Type: application/json" \
  -d '{"cadence_seconds": 3600}'
```

**Or set a global default** by changing `DEFAULT_CADENCE_SECONDS` in your `.env` file and restarting.

Recommended schedules:
- High-priority controls (MFA, root access): every 1–2 hours
- Medium-priority (branch protection, encryption): every 6 hours
- Low-priority: every 24 hours

---

## 9. Troubleshooting

### Dashboard shows "mock data" even after setting credentials

The mock fallback activates when a connector can't authenticate. Check:
1. Your `.env` file has the correct values (no extra spaces, no quotes around values)
2. The container was restarted after you edited `.env`: `docker compose restart backend`
3. Check connector status at the bottom of the Connectors page for the specific error

### "Connection refused" to the backend

The containers may still be starting. Wait 30 seconds and refresh. If it persists:
```bash
docker compose logs backend
```
Look for any error message on startup.

### Okta connector failing

- Confirm `OKTA_DOMAIN` has no `https://` prefix (just `yourorg.okta.com`)
- The API token needs Read Only Admin or Super Admin privileges
- Tokens expire — generate a new one if it's been more than 30 days

### GitHub connector failing

- Personal access tokens expire — check if yours needs renewal at [github.com/settings/tokens](https://github.com/settings/tokens)
- The token needs `repo` (read) and `read:org` scopes

### AWS connector failing

- Verify the access key ID and secret are copied correctly (no trailing spaces)
- The IAM user needs at minimum: `AmazonS3ReadOnlyAccess`, `CloudTrailReadOnlyAccess`, `IAMReadOnlyAccess`
- Check `AWS_DEFAULT_REGION` matches where your resources are deployed

### Controls not running on schedule

Check that the scheduler is running:
```bash
curl http://localhost:8000/api/health
```
The response should include `"scheduler_running": true`.

---

## 10. For developers

### Adding a new control

1. Create an evaluator in `backend/app/evaluators/` — it's a pure function that takes connector data and returns `pass`/`fail` with a list of failing resources
2. Add a connector call in the appropriate `backend/app/connectors/` file if new data is needed
3. Register the control definition in `backend/app/seed.py`
4. Run `python -m app.seed` to add it to the database

### Adding a new connector

1. Create `backend/app/connectors/my_system.py` with a class extending `BaseConnector`
2. Add credential checks to `backend/app/config.py`
3. Update `.env.example` with the new variables

### Tech stack
- **Backend:** Python 3.12, FastAPI, SQLAlchemy 2.0, Alembic, APScheduler
- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **Database:** PostgreSQL 16

### Dev workflow

```bash
make install    # install deps + pre-commit hooks (one-time)
make check      # run lint + security + tests (before committing)
make format     # auto-fix style issues
make dev        # start frontend dev server
```

Pre-commit hooks run automatically — `ruff` (lint/format) and `bandit` (security) gate every commit.

### API documentation

Interactive API docs are available at [http://localhost:8000/docs](http://localhost:8000/docs) when running locally.

---

## License

| What | License |
|---|---|
| Source code | [Elastic License 2.0](LICENSE) |
| Documentation & templates | [CC BY-NC 4.0](LICENSE-docs) |

Free for anyone to use, fork, and build on — including commercially within your own organization. The one restriction: you cannot offer this software as a paid hosted or managed service. See [LICENSE](LICENSE) for full terms.

Copyright 2026 Adam Duman