# Architecture notes

## Data model (per-App TiDB)

- `customers` — one row per (customer, competitor) with `competitor_domain` and `channel_id`
  (which channel that competitor's briefs post to).
- `tracked_urls` — discovered URLs with a `page_type`.
- `raw_extracts` — Nimble-extracted page markdown.
- `analyst_notes` — one note per analyst per competitor per day.
- `strategy_briefs` — the Strategist's brief + severity (only severity ≥ 3 is posted).

## Idempotency

`run_daily.py` skips a competitor that already has extracts dated today, so re-running the same
day is safe and cheap.

## Routing

Playbook posts each brief to `customers.channel_id` (falling back to a default channel), so a
multi-customer deployment fans out to per-customer channels automatically.

## Severity threshold

Posting threshold is **severity ≥ 3**. Change it in one place in `run_daily.py` (the Playbook
section) — the Strategist always scores 1–5; the threshold only controls what gets posted.

## Scheduling

A Kylon workflow recreates the pipeline files at run time and executes `run_daily.py` daily at
07:00 PT. Scripts are self-contained so the workflow environment needs no persistent checkout.
