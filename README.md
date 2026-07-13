# Competitor Radar

Autonomous competitive-intelligence system for **Scale AI (YC)**. It sweeps a set of tracked
competitors every day, extracts real signal from their live websites, runs a panel of analyst
agents over that signal, scores severity, and posts an executive brief + recommended playbook
to the team — with a live dashboard for demos.

Built on the Kylon agent workspace. Submitted for the AGTGTM hackathon.

---

## What it does

For every tracked competitor (currently **Encord, Labelbox, SuperAnnotate**):

1. **Scout** — discovers the competitor's site map (pricing, careers, changelog, blog).
2. **Collector** — extracts page content as clean markdown.
3. **Analyst panel** — four specialists read the content:
   - **Pricing Analyst** — tier changes, packaging, price hiding.
   - **Hiring Analyst** — role clusters that reveal strategy (e.g. RL/agent hiring).
   - **Changelog Analyst** — shipped features and product direction.
   - **Content Analyst** — messaging/positioning shifts.
4. **Strategist** — synthesizes the analyst notes into one brief and assigns a **severity 1–5**.
5. **Playbook** — for **severity ≥ 3**, writes a battlecard + internal alert and posts it to the
   customer's own channel.

Severity policy: `1–2` routine (stored, not posted) · `3` notable · `4–5` act today.

## Architecture

```
                         Competitive Radar (orchestrator)
                                     │
        ┌────────────────┬───────────┴───────────┬─────────────────┐
      Scout          Collector                 Memory          (per customer)
        │                │                        │
     site map        markdown            App DB (TiDB): tracked_urls,
    (Nimble map)    (Nimble extract)     raw_extracts, analyst_notes,
        │                │               strategy_briefs
        └──────┬─────────┘
               ▼
        Analyst panel  ──  Pricing · Hiring · Changelog · Content   (Claude)
               │
           Strategist  ──  severity 1–5 + executive brief           (Claude)
               │
          Playbook Agent ── battlecard + internal alert             (Claude)
               │
        ┌──────┴───────┐
     Channel post    Dashboard
   (#customer-...)   (this app)
```

- **Scraping:** [Nimble](https://nimbleway.com) Web API — see `docs/NIMBLE.md`.
- **Reasoning:** Anthropic Claude via the Kylon model proxy.
- **Storage:** per-App TiDB database (five entities), browsable in the workspace.
- **Scheduling:** a Kylon workflow fires the pipeline daily at 07:00 PT.
- **Dashboard:** a Next.js app (`dashboard/`) reading the same TiDB data.

## Repository layout

| Path | What |
|---|---|
| `radar-pipeline/run_daily.py` | Orchestrator: Scout → Collector → Analysts → Strategist → Playbook, persistence, channel posting, per-day idempotency. |
| `radar-pipeline/analyze.py` | Pure fetch + analyze (Nimble + Claude, no workspace dependency). Reusable/testable in isolation. |
| `dashboard/` | Next.js dashboard: one screen with a severity-badged card per competitor (latest brief, playbook, source signals). |
| `docs/NIMBLE.md` | How Nimble is used for scraping. |
| `docs/ARCHITECTURE.md` | Deeper pipeline notes. |

## Running the pipeline

Requires these environment variables (secrets, never committed):

- `NIMBLE_API_KEY` — Nimble Web API key (scraping)
- `P2_API_BASE`, `KYLON_API_TOKEN` — Kylon workspace API (persistence + posting)
- `PROXY_API_BASE` — Kylon model proxy (Claude)

```bash
cd radar-pipeline
python3 run_daily.py            # full daily sweep over all tracked competitors
# or, isolated fetch+analyze for one competitor (no persistence):
python3 analyze.py '{"customers":[{"id":"1","customer_name":"Scale AI","competitor_name":"Encord","competitor_domain":"encord.com"}],"prior_notes":[]}'
```

## Running the dashboard

```bash
cd dashboard
pnpm install
pnpm generate:contracts
pnpm dev
```

The dashboard reads `strategy_briefs`, `customers`, `raw_extracts`, and `analyst_notes`
via `/api/radar` and renders a card per competitor.
