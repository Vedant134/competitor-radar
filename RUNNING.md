# Running Competitor Radar locally (and in Claude Code)

There are two ways to run this, because the code has two layers:

- **The scraping + analysis pipeline** (Scout → Collector → Analysts → Strategist) — portable.
  Runs anywhere with a Nimble key and an Anthropic key. This is the "agents" part.
- **The full workspace pipeline** (`run_daily.py`) — writes to the Kylon App database, posts
  briefs to channels, and calls the model through the Kylon proxy. It needs the Kylon workspace
  to run as-is.

For running it yourself / in Claude Code, use the portable path first.

---

## Prerequisites

- Python 3.10+
- A **Nimble** API key (scraping) — https://nimbleway.com
- An **Anthropic** API key (the analyst/strategist model) — https://console.anthropic.com

```bash
git clone https://github.com/Vedant134/competitor-radar.git
cd competitor-radar/radar-pipeline

export NIMBLE_API_KEY=your_nimble_key
export ANTHROPIC_API_KEY=your_anthropic_key
# optional: export ANTHROPIC_MODEL=claude-3-5-haiku-latest
```

## Run the pipeline on one competitor (portable)

`analyze_local.py` is the full Scout→Collector→Analysts→Strategist chain, using Nimble for
scraping and Anthropic directly for the agents. No Kylon dependency.

```bash
python3 analyze_local.py '{
  "customers":[{"id":"1","customer_name":"Scale AI","competitor_name":"Encord","competitor_domain":"encord.com"}],
  "prior_notes":[]
}'
```

Output is JSON: the tracked URLs, extracted pages, each analyst note, the severity, and the
strategist brief. Add more competitors by adding entries to `customers`.

## Using it from Claude Code

1. Open the cloned repo in Claude Code.
2. Set `NIMBLE_API_KEY` and `ANTHROPIC_API_KEY` in your shell/environment.
3. Ask Claude Code to run `python3 radar-pipeline/analyze_local.py '<json>'`, or to wrap it in a
   loop over your competitor list.
4. Read `docs/AGENTS.md` — each agent's role and exact prompt is there, so you can tweak any
   analyst's instruction and re-run.

The agents are prompt-defined roles inside the pipeline (see `docs/AGENTS.md`), so "using the
agents" = running the pipeline and editing those role prompts. There is no separate daemon to
install.

---

## Running the FULL workspace pipeline (`run_daily.py`)

This version persists to the App database and posts to channels. It expects the Kylon workspace
environment and these env vars: `NIMBLE_API_KEY`, `P2_API_BASE`, `KYLON_API_TOKEN`,
`PROXY_API_BASE`, and the `workspace_cli` binary. It is meant to run as the scheduled workspace
workflow, not standalone on a laptop. Use `analyze_local.py` for local experimentation; use
`run_daily.py` when you want it wired back into the workspace (dashboard + channel briefs).

## The dashboard

The `dashboard/` app reads the same data and renders one card per competitor. It expects a
`DATABASE_URL` for the App's database; see `dashboard/README` / template guide. For the hackathon
it is already deployed in the workspace — this repo copy is for reference and self-hosting.
