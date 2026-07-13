# The agent team

Competitor Radar is a multi-agent pipeline. The agents are not separate services — they are
distinct **roles**, each with its own prompt and job, chained by the orchestrator
(`radar-pipeline/run_daily.py`). Each competitor flows through the whole team once per day.

```
                         Competitive Radar  (orchestrator / run_daily.py)
                                     │
        ┌────────────────┬───────────┴───────────┬─────────────────┐
      Scout          Collector                 Memory
   (Nimble map)   (Nimble extract)        (App DB / TiDB)
        └──────┬─────────┘
               ▼
        ┌──────────── Analyst panel ────────────┐
     Pricing   ·   Hiring   ·  Changelog  ·  Content     (each = Claude)
        └───────────────────┬────────────────────┘
                            ▼
                       Strategist    → severity 1–5 + brief
                            ▼
                       Playbook      → battlecard + internal alert
                            ▼
                Slack / Email / Dashboard  (channel post + this app)
```

---

## Scout
- **Job:** find the pages worth reading on a competitor's site.
- **How:** `POST sdk.nimbleway.com/v1/map` on the competitor domain → all URLs, then classify
  each by type (pricing / careers / changelog / blog / other) with URL pattern matching.
- **Output:** a shortlist of URLs per page type, saved to `tracked_urls`.

## Collector
- **Job:** turn those URLs into clean, analyzable text.
- **How:** `POST sdk.nimbleway.com/v1/extract` per page → markdown.
- **Output:** page markdown saved to `raw_extracts`.

## Memory
- **Job:** persistence + context across days.
- **How:** the App's TiDB database. The Strategist reads the **trailing 4 weeks** of notes so it
  can tell a one-off blip from a building trend.
- **Tables:** `tracked_urls`, `raw_extracts`, `analyst_notes`, `strategy_briefs`, `customers`.

## Analyst panel (4 agents, Claude)
Each analyst reads only its page type and writes one concise note (or "No signal"). Exact
instructions from `run_daily.py`:

| Analyst | Reads | Instruction |
|---|---|---|
| **Pricing Analyst** | pricing | List every pricing tier, price, and feature visible. Flag new tiers, price changes, or removed features. |
| **Hiring Analyst** | careers | List open roles and departments. Identify hiring clusters (multiple roles in one area = investment signal). |
| **Changelog Analyst** | changelog | List concrete product changes. Separate real new features from bug fixes. Flag strategic direction. |
| **Content Analyst** | blog | Identify repeated themes and messaging. What is emphasized? Note positioning or messaging shifts. |

Output: rows in `analyst_notes` (one per analyst per competitor per day).

## Strategist (Claude)
- **Job:** synthesize the four analyst notes + the trailing 4 weeks into one brief and score it.
- **Signal it looks for:** convergence — hiring + pricing + content pointing the same way — and
  trends building over weeks.
- **Severity scale:** `1–2` routine noise · `3` notable · `4–5` act today.
- **Output:** strict JSON `{severity, brief}`; briefs with **severity ≥ 3** are saved to
  `strategy_briefs`.

## Playbook (Claude)
- **Job:** turn a high-severity brief into something the customer's team can use *today*.
- **How:** for each severity-≥3 brief (highest first), draft a short battlecard line or tagged
  internal alert (≤90 words), then post it to that customer's channel.
- **Output:** a channel message: `🚨 Competitor Radar — sev N · <Competitor>` with the signal and
  the play. Also surfaced on the dashboard.

---

## Where each agent lives in the code

- **Scout, Collector, Analysts, Strategist:** `radar-pipeline/analyze.py` (Nimble + Claude,
  no workspace dependency — testable in isolation) and orchestrated in `run_daily.py`.
- **Memory, Playbook, scheduling, channel posting:** `radar-pipeline/run_daily.py`.
- **Delivery surface:** `dashboard/` (the live app) + channel messages.
