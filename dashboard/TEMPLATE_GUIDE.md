# Data App Template — Usage Guide

This file is the usage guide for the agent building on this template. It is
read-only reference material: do not update it for the app, do not treat it as
an app deliverable, and do not delete it. Read it once before writing code —
it replaces exploring the template source file-by-file.

SPA-style Next.js template for TiDB/MySQL-backed internal apps that need
custom pages, dashboards, forms, workflow screens, or semantic App APIs beyond
Kylon Data Viewer. It ships a complete demo entity (`opportunities`) that you
clone and rename into the real app's entities.

## Commands

```bash
pnpm install               # once after template pull
pnpm generate:contracts    # after every lib/app-definition/definition.ts change
pnpm typecheck             # once before pushing; fix what it reports
pnpm dev                   # local dev server; rarely needed
```

`pnpm build` / `pnpm start` exist for the deployment pipeline — do not run
them locally; the preview deployment builds automatically on push and build
errors are retrievable from the deployment logs.

Set `TIDB_DATABASE_URL` or `DATABASE_URL` for real data. Without a DB URL the
demo serves deterministic fixtures from `data/opportunities.seed.json`.

## Structure

- `app/page.tsx`: dashboard home (metrics + charts via `dashboard-overview`).
- `app/opportunities/page.tsx`: demo entity list page (table + filters + dialogs).
- `app/calendar/page.tsx`: date-field calendar view over the demo entity.
- `app/api/opportunities/**`: demo entity list/get/update/delete API routes used by the custom UI and by agents for semantic workflows.
- `app/api/manifest`, `app/api/kylon`, `app/api/openapi.json`: platform plumbing; leave as is.
- `app/layout.tsx`: root layout wiring providers and the app shell.
- `components/data-app-shell.tsx`: top-level shell with tab navigation — register new pages here.
- `components/dashboard-overview.tsx`: demo dashboard composition (metrics, status distribution, time-axis chart, drilldowns).
- `components/opportunity-*.tsx`: demo-entity-specific UI (filter, thread action); replace along with the entity.
- `components/kylon-auto-refresh.tsx`, `components/visual-viewport-vars.tsx`: platform glue; keep.
- `components/providers/`: TanStack Query + Kylon workspace provider; keep.
- `components/ui/`: reusable UI primitives (see the component index below); keep and reuse.
- `lib/opportunities/`: the demo entity module — the pattern you clone per entity (see the checklist below).
- `lib/app-definition/definition.ts`: App metadata, entities, field config, relationships, table mapping, API declarations; the single source `pnpm generate:contracts` builds from.
- `lib/kylon/`: Kylon bridge helpers and workspace member profiles; keep.
- `lib/db.ts`: DB connection/query helpers only; keep.
- `lib/query-keys.ts`: TanStack Query key registry; extend per entity.
- `db/migrations/`: numbered SQL migrations (schema + seed); see the platform rules in the build-app skill.
- `data/opportunities.seed.json`: no-database demo fixtures; replace or drop with the demo entity.
- `generated/`: disposable output of `pnpm generate:contracts`; never hand-edit.

## Add An Entity (the core workflow)

Each entity is one module under `lib/<entity>/` plus its API routes and pages.
Clone the `opportunities` demo per entity and rename; every file has a fixed
role, so this is mechanical:

1. `lib/<entity>/types.ts` — record/data interfaces, field union types, list-control types.
2. `lib/<entity>/metadata.ts` — select options, owner/user lists, option label helpers.
3. `lib/<entity>/server.ts` — SQL queries (list/get/update/delete), WHERE/ORDER builders, row↔record mapping, `to<Entity>Response` envelope. Keep the `created_at`/`updated_at` passthrough: server queries select the timestamp columns and the response envelope forwards them (`createdAt`/`updatedAt` on the client) — time-axis charts depend on it.
4. `lib/<entity>/client.ts` — TanStack Query hooks (list/get/create/update/delete) and field-value mapping.
5. `lib/<entity>/table-config.ts` — Data table column definitions.
6. `app/api/<entity>/**` — route handlers delegating to `server.ts`.
7. `app/<entity>/page.tsx` — list page; register the tab in `components/data-app-shell.tsx`.
8. `lib/app-definition/definition.ts` — declare the entity (fields, table mapping, relationships, `api.*` paths), then `pnpm generate:contracts`.
9. `db/migrations/` — add the entity's `CREATE TABLE` (and seed rows if intentional) as a new numbered file.

Delete the demo (`lib/opportunities/`, `app/opportunities/`, `app/api/opportunities/`, `components/opportunity-*.tsx`, `data/opportunities.seed.json`, demo migrations) once the real entities replace it — or keep it as a reference while building and remove it before pushing.

## UI Component Index

All under `components/ui/`. Before using any component you have not used yet,
read the props interface at the top of its file (one targeted read) — do not
guess props and fix them after typecheck.

- `data-table/` — the table engine: header, rows, card list fallback, column-width persistence (`index.tsx` is the entry).
- `data-types.ts` — canonical field value/type aliases shared by table + field components.
- `field.tsx`, `field-list.tsx`, `field-list-layout.ts` — record detail field grid primitives.
- `field-value.tsx`, `field-value-popover.tsx`, `field-values/` — per-type field renderers/editors (text, number, date, select, checkbox, relation, attachment) with view/edit modes.
- `drilldown-dialog.tsx` — chart→records drilldown dialog (`DrilldownScope` + rows).
- `metrics.tsx` — dashboard summary metric cards (`SummaryMetric[]`).
- `chart.tsx` — Recharts wrapper with themed tooltip/legend.
- `calendar.tsx`, `calendar-view.tsx`, `calendar-utils.ts` — date-picker primitive and month/week event calendar (`CalendarEvent[]`).
- `combobox.tsx` — searchable select for relation/user pickers.
- `overflow-list.tsx` — collapses overflowing chips into a "+N" popover.
- `file-preview.tsx` — attachment preview (image/pdf) with fallback link.
- `alert-dialog.tsx`, `dialog.tsx`, `sheet.tsx`, `popover.tsx`, `hover-card.tsx`, `tooltip.tsx`, `context-menu.tsx`, `dropdown-menu.tsx` — overlay primitives (shadcn-style).
- `button.tsx`, `input.tsx`, `input-group.tsx`, `textarea.tsx`, `select.tsx`, `checkbox.tsx`, `radio-group.tsx`, `switch.tsx`, `slider.tsx`, `toggle.tsx`, `toggle-group.tsx`, `label.tsx` — form primitives.
- `card.tsx`, `tabs.tsx`, `accordion.tsx`, `separator.tsx`, `scroll-area.tsx`, `skeleton.tsx`, `badge.tsx`, `avatar.tsx`, `alert.tsx`, `item.tsx`, `kbd.tsx`, `sonner.tsx` — layout/display primitives and toasts.
- `use-responsive-input.ts` — hook for mobile-friendly input behavior.

## Platform Topics (read the build-app skill references, not template source)

These are platform-wide contracts, documented in the `build-app` skill — read
the referenced file when the app touches the topic; do not reverse-engineer
them from template code:

- Workspace members and `user`/`multi_user` fields → `references/workspace-data.md`.
- Entity/field/relation registration contracts and Data Viewer behavior → `references/data-definition-contracts.md`.
- KylonBridge, in-app Data Viewer buttons, destructive-action confirmation, and other UI conventions → `references/ui-guidelines.md`.
- `db/migrations` rules, the App id placeholder and registration gates, and the develop→push→publish loop → the build-app skill body.

You have now seen the whole template. Start building — do not read template
source files to "understand the project" beyond the targeted reads above.
