# How Nimble is used for scraping

Nimble is the layer that turns a competitor's **domain** into clean, analyzable page content.
The pipeline uses the Nimble Web API with a bearer token (`NIMBLE_API_KEY`) and hits two
endpoints. See `radar-pipeline/analyze.py`.

## 1. Site discovery — `POST https://sdk.nimbleway.com/v1/map`

Given a competitor's root domain, Nimble returns the full list of URLs on the site.

```python
def nmap(u):
    return http("https://sdk.nimbleway.com/v1/map", "POST",
                {"url": u},
                {"Authorization": f"Bearer {NIMBLE}"})

links = [l["url"] for l in nmap(f"https://{dom}").get("links", []) ...]
```

We then classify each URL by type (pricing / careers / changelog / blog / other) with URL
pattern matching, and pick the few pages that matter per analyst.

## 2. Content extraction — `POST https://sdk.nimbleway.com/v1/extract`

For each selected page, Nimble fetches and returns the page content as **markdown** — handling
the rendering, anti-bot, and cleanup that make raw `requests.get()` unreliable on modern sites.

```python
def nextract(u):
    b = {"url": u, "formats": ["markdown"]}
    d = http("https://sdk.nimbleway.com/v1/extract", "POST", b,
             {"Authorization": f"Bearer {NIMBLE}"})
    # -> markdown content for the page
```

The extracted markdown is stored in the `raw_extracts` table and fed to the analyst agents.

## Why Nimble and not plain HTTP

Competitor sites (pricing, careers, changelogs) are JS-rendered, gated, or bot-protected.
Nimble's `map` + `extract` gives reliable structured discovery and clean markdown without us
maintaining headless browsers or proxy rotation. So: **yes — the API key is exactly what pulls
the live data from the internet.** `map` finds the pages, `extract` reads them, and everything
downstream (analysts, strategist, playbook) runs on that extracted content.

## What we observed in real runs

- **Pricing pages** frequently extract empty or show "Contact us" — itself a signal (a
  competitor hiding tiers is often mid-repackaging). The Pricing Analyst flags this explicitly.
- **Careers pages** are the richest strategy signal: role clusters (e.g. Labelbox hiring 6
  agent/RL engineers + 5 forward-deployed leads) exposed an unannounced agent-platform push
  before any launch.
