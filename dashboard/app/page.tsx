"use client";

import { Radar, ExternalLink, Signal, CalendarDays } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRadar, type RadarCompetitor } from "@/lib/radar/client";

const SEVERITY: Record<number, { label: string; cls: string }> = {
  5: { label: "Critical", cls: "bg-red-600 text-white" },
  4: { label: "High", cls: "bg-orange-500 text-white" },
  3: { label: "Notable", cls: "bg-amber-400 text-amber-950" },
  2: { label: "Low", cls: "bg-slate-300 text-slate-800" },
  1: { label: "Routine", cls: "bg-slate-200 text-slate-600" },
};

function SeverityBadge({ severity }: { severity: number | null }) {
  if (severity == null) {
    return <Badge className="bg-slate-200 text-slate-600">No brief yet</Badge>;
  }
  const s = SEVERITY[severity] ?? SEVERITY[3];
  return <Badge className={s.cls}>Sev {severity} · {s.label}</Badge>;
}

function CompetitorCard({ c }: { c: RadarCompetitor }) {
  return (
    <Card className="flex flex-col overflow-hidden border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 border-b bg-slate-50/70 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg font-semibold text-slate-900">{c.name}</h3>
            <SeverityBadge severity={c.severity} />
          </div>
          {c.domain ? (
            <a
              href={`https://${c.domain}`}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
            >
              {c.domain}
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Signal className="h-3.5 w-3.5" /> {c.signals} signals
          </span>
          {c.latestBriefDate ? (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" /> {c.latestBriefDate}
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 py-4">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Strategist brief</p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
            {c.brief ?? "No brief generated yet — the next radar sweep will populate this."}
          </p>
        </div>
        {c.notes.length > 0 ? (
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Analyst signals</p>
            <ul className="space-y-1.5">
              {c.notes.slice(0, 4).map((n, i) => (
                <li key={i} className="text-sm text-slate-600">
                  <span className="font-medium text-slate-800">{n.analyst ?? "Analyst"}:</span>{" "}
                  {n.note ? (n.note.length > 180 ? `${n.note.slice(0, 180)}…` : n.note) : "—"}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CardsSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-64 rounded-xl" />
      ))}
    </div>
  );
}

export default function Home() {
  const { data, isPending, isError, error } = useRadar();

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/40 px-4 py-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Radar className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Competitor Radar</h1>
            <p className="text-sm text-slate-500">
              Live competitive intelligence for Scale AI · severity 3+ briefs
              {data?.generatedAt ? ` · updated ${new Date(data.generatedAt).toLocaleTimeString()}` : ""}
            </p>
          </div>
        </header>

        {isError ? (
          <Alert variant="danger">
            <AlertTitle>Unable to load radar</AlertTitle>
            <AlertDescription>{error instanceof Error ? error.message : "Request failed."}</AlertDescription>
          </Alert>
        ) : isPending ? (
          <CardsSkeleton />
        ) : data.competitors.length === 0 ? (
          <Alert>
            <AlertTitle>No competitors tracked yet</AlertTitle>
            <AlertDescription>Add a competitor and run a sweep to populate the radar.</AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {data.competitors.map((c) => (
              <CompetitorCard key={c.name} c={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
