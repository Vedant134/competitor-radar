"use client";

import type { KeyboardEvent, MouseEvent } from "react";
import type { ActiveDotProps, DotItemDotProps } from "recharts";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { opportunityStageOptions } from "@/lib/opportunities/metadata";
import type { Opportunity, OpportunityDrilldownScope } from "@/lib/opportunities/types";

interface SummaryMetric {
  id: string;
  label: string;
  aggregate: "count" | "sum" | "avg" | "percent_true";
  format?: "number" | "currency" | "percent";
  getValue: (opportunity: Opportunity) => unknown;
}

interface DashboardChart {
  id: string;
  label: string;
  description: string;
  kind: "stage" | "timeline" | "created" | "enterprise";
}

interface ChartSliceDatum {
  key: string;
  label: string;
  value: number;
  opportunities: Opportunity[];
  fill?: string;
  name?: string;
  sort?: number;
}

export interface DashboardOverviewProps {
  opportunities: Opportunity[];
  onOpenDrilldown: (scope: OpportunityDrilldownScope) => void;
}

const METRIC_TRENDS: Record<string, { value: string; tone: "success" | "warning" | "muted"; suffix?: string }> = {
  opportunities: { value: "+18%", tone: "success", suffix: "vs last week" },
  arr: { value: "+12%", tone: "success", suffix: "vs last week" },
  confidence: { value: "-4%", tone: "warning", suffix: "vs last week" },
  enterprise: { value: "Steady", tone: "muted" },
};

const CHART_PRIMARY = "var(--chart-1)";
const CHART_SECONDARY = "var(--chart-2)";

const DASHBOARD_SUMMARIES: SummaryMetric[] = [
  {
    id: "opportunities",
    label: "Open Opportunities",
    aggregate: "count",
    getValue: (opportunity) => opportunity.id,
  },
  {
    id: "arr",
    label: "Pipeline ARR",
    aggregate: "sum",
    format: "currency",
    getValue: (opportunity) => opportunity.amount,
  },
  {
    id: "confidence",
    label: "Avg Confidence",
    aggregate: "avg",
    format: "percent",
    getValue: (opportunity) => opportunity.confidence,
  },
  {
    id: "enterprise",
    label: "Enterprise",
    aggregate: "percent_true",
    format: "percent",
    getValue: (opportunity) => opportunity.enterprise,
  },
];

const DASHBOARD_CHARTS: DashboardChart[] = [
  {
    id: "stage_mix",
    label: "Pipeline by Stage",
    description: "Opportunity count grouped by stage.",
    kind: "stage",
  },
  {
    id: "arr_timeline",
    label: "ARR by Close Date",
    description: "Pipeline ARR sequenced by expected close date.",
    kind: "timeline",
  },
  {
    id: "created_growth",
    label: "Pipeline Growth",
    description: "Cumulative opportunities by created date.",
    kind: "created",
  },
  {
    id: "enterprise_mix",
    label: "Enterprise Mix",
    description: "Enterprise and non-enterprise opportunity split.",
    kind: "enterprise",
  },
];

function metricValue(metric: SummaryMetric, opportunities: Opportunity[]) {
  const values = opportunities.map(metric.getValue).filter((value) => value != null && value !== "");
  const numbers = values.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  switch (metric.aggregate) {
    case "count":
      return values.length;
    case "sum":
      return numbers.reduce((sum, value) => sum + value, 0);
    case "avg":
      return numbers.length === 0 ? 0 : numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
    case "percent_true": {
      const trueCount = values.filter((value) => value === true || value === "true" || value === 1).length;
      return values.length === 0 ? 0 : trueCount / values.length;
    }
  }
}

function formatMetric(metric: SummaryMetric, value: number) {
  if (metric.format === "currency") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: value >= 100000 ? 0 : 1,
      notation: value >= 100000 ? "compact" : "standard",
    }).format(value);
  }
  if (metric.format === "percent") {
    const normalized = Math.abs(value) <= 1 ? value : value / 100;
    return new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 0 }).format(normalized);
  }
  return new Intl.NumberFormat("en-US").format(value);
}

function buildStageData(opportunities: Opportunity[]): ChartSliceDatum[] {
  const rows: ChartSliceDatum[] = opportunityStageOptions.map((option) => {
    const matchingOpportunities = opportunities.filter((opportunity) => opportunity.stage === option.value);
    return {
      key: option.value,
      label: option.label,
      value: matchingOpportunities.length,
      opportunities: matchingOpportunities,
    };
  });

  const configuredStages = new Set<string>(opportunityStageOptions.map((option) => option.value));
  const uncategorizedOpportunities = opportunities.filter(
    (opportunity) => !configuredStages.has(String(opportunity.stage)),
  );
  if (uncategorizedOpportunities.length > 0) {
    rows.push({
      key: "uncategorized",
      label: "Uncategorized",
      value: uncategorizedOpportunities.length,
      opportunities: uncategorizedOpportunities,
    });
  }

  return rows;
}

function timelineBucket(rawDate: string | null | undefined) {
  const date = rawDate ? new Date(rawDate) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return { key: "unscheduled", label: "Unscheduled", sort: Number.MAX_SAFE_INTEGER };
  }

  return {
    key: date.toISOString().slice(0, 10),
    label: date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
    sort: date.getTime(),
  };
}

function buildTimelineData(opportunities: Opportunity[]): ChartSliceDatum[] {
  const grouped = new Map<string, ChartSliceDatum>();

  for (const opportunity of opportunities) {
    const bucket = timelineBucket(opportunity.closeDate);
    const current =
      grouped.get(bucket.key) ??
      ({
        key: bucket.key,
        label: bucket.label,
        sort: bucket.sort,
        value: 0,
        opportunities: [],
      } satisfies ChartSliceDatum);

    current.value += opportunity.amount || 0;
    current.opportunities.push(opportunity);
    grouped.set(bucket.key, current);
  }

  return Array.from(grouped.values()).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
}

// Relies on the entity API passing record created_at through to the client.
function buildCreatedGrowthData(opportunities: Opportunity[]): ChartSliceDatum[] {
  const dated = opportunities
    .map((opportunity) => ({ opportunity, bucket: timelineBucket(opportunity.createdAt) }))
    .filter(({ bucket }) => bucket.key !== "unscheduled")
    .sort((a, b) => a.bucket.sort - b.bucket.sort);

  const rows: ChartSliceDatum[] = [];
  const createdSoFar: Opportunity[] = [];
  for (const { opportunity, bucket } of dated) {
    createdSoFar.push(opportunity);
    const current = rows[rows.length - 1];
    if (current && current.key === bucket.key) {
      current.value = createdSoFar.length;
      current.opportunities = [...createdSoFar];
    } else {
      rows.push({
        key: bucket.key,
        label: bucket.label,
        sort: bucket.sort,
        value: createdSoFar.length,
        opportunities: [...createdSoFar],
      });
    }
  }
  return rows;
}

function buildEnterpriseData(opportunities: Opportunity[]): ChartSliceDatum[] {
  const enterpriseOpportunities = opportunities.filter((opportunity) => opportunity.enterprise);
  const nonEnterpriseOpportunities = opportunities.filter((opportunity) => !opportunity.enterprise);
  return [
    {
      key: "enterprise",
      label: "Enterprise",
      name: "Enterprise",
      value: enterpriseOpportunities.length,
      opportunities: enterpriseOpportunities,
      fill: "var(--color-enterprise)",
    },
    {
      key: "nonEnterprise",
      label: "Non-enterprise",
      name: "Non-enterprise",
      value: nonEnterpriseOpportunities.length,
      opportunities: nonEnterpriseOpportunities,
      fill: "var(--color-nonEnterprise)",
    },
  ];
}

function chartConfig(label: string): ChartConfig {
  return {
    value: { label, color: CHART_PRIMARY },
  };
}

const booleanChartConfig = {
  value: { label: "Opportunities" },
  enterprise: { label: "Enterprise", color: CHART_PRIMARY },
  nonEnterprise: { label: "Non-enterprise", color: CHART_SECONDARY },
} satisfies ChartConfig;

function chartSliceDatumFromPayload(payload: unknown): ChartSliceDatum | null {
  const candidate =
    payload && typeof payload === "object" && "payload" in payload
      ? (payload as { payload?: unknown }).payload
      : payload;

  if (!candidate || typeof candidate !== "object") return null;
  if (!("opportunities" in candidate) || !Array.isArray(candidate.opportunities)) return null;
  return candidate as ChartSliceDatum;
}

function MetricCard({
  metric,
  value,
  onOpen,
}: {
  metric: SummaryMetric;
  value: number;
  onOpen: () => void;
}) {
  const trend = METRIC_TRENDS[metric.id] ?? { value: "Steady", tone: "muted" as const };

  return (
    <button
      type="button"
      className="flex min-w-0 flex-col items-start overflow-hidden rounded-xl border-[0.5px] border-border bg-background px-5 py-3 text-left transition-colors hover:bg-hover-overlay focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring-subtle"
      onClick={onOpen}
    >
      <p className="w-full truncate text-label-md text-tertiary-foreground">{metric.label}</p>
      <p className="mt-1 w-full truncate text-headline-lg text-inverse tabular-nums">{formatMetric(metric, value)}</p>
      <p className="mt-1 w-full truncate text-body-md text-muted-foreground">
        <span
          className={cn(
            trend.tone === "success" && "text-success",
            trend.tone === "warning" && "text-warning",
            trend.tone === "muted" && "text-muted-foreground",
          )}
        >
          {trend.value}
        </span>
        {trend.suffix ? ` ${trend.suffix}` : ""}
      </p>
    </button>
  );
}

function ChartCard({
  chart,
  opportunities,
  layout = "standard",
  onOpen,
}: {
  chart: DashboardChart;
  opportunities: Opportunity[];
  layout?: "wide" | "standard";
  onOpen: (scope: OpportunityDrilldownScope) => void;
}) {
  const stageData = chart.kind === "stage" ? buildStageData(opportunities) : [];
  const lineData =
    chart.kind === "timeline"
      ? buildTimelineData(opportunities)
      : chart.kind === "created"
        ? buildCreatedGrowthData(opportunities)
        : [];
  const enterpriseData = chart.kind === "enterprise" ? buildEnterpriseData(opportunities) : [];
  const enterpriseTotal = enterpriseData.reduce((sum, row) => sum + row.value, 0);
  const openSlice = (row: ChartSliceDatum) => {
    if (row.opportunities.length === 0) return;
    onOpen({
      id: `chart:${chart.id}:${row.key}`,
      label: `${chart.label}: ${row.label}`,
      description: `${row.opportunities.length.toLocaleString()} opportunities backing ${row.label}.`,
      opportunities: row.opportunities,
    });
  };
  const openSliceFromPayload = (payload: unknown) => {
    const row = chartSliceDatumFromPayload(payload);
    if (row) openSlice(row);
  };
  const openSliceFromKeyboard = (event: KeyboardEvent<SVGElement>, row: ChartSliceDatum) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    openSlice(row);
  };
  const renderTimelineDot = (props: DotItemDotProps | ActiveDotProps) => {
    const { cx, cy } = props;
    const payload = props.payload as ChartSliceDatum | undefined;
    if (typeof cx !== "number" || typeof cy !== "number") return null;
    const disabled = !payload || payload.opportunities.length === 0;

    return (
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={CHART_PRIMARY}
        stroke="var(--background)"
        strokeWidth={2}
        className={cn(!disabled && "cursor-pointer")}
        role={disabled ? undefined : "button"}
        tabIndex={disabled ? undefined : 0}
        aria-label={disabled ? undefined : `Open ${payload.label} drilldown`}
        onClick={(event: MouseEvent<SVGCircleElement>) => {
          event.stopPropagation();
          if (payload) openSlice(payload);
        }}
        onKeyDown={(event: KeyboardEvent<SVGCircleElement>) => {
          if (payload) openSliceFromKeyboard(event, payload);
        }}
      />
    );
  };

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-xl border-[0.5px] border-border bg-background p-4 text-left",
        layout === "wide" ? "min-h-[300px] lg:col-span-2" : "min-h-[286px]",
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="truncate text-label-md">{chart.label}</h3>
        <p className="truncate text-body-sm text-muted-foreground">{chart.description}</p>
      </div>
      <div className="mt-3 min-h-0 flex-1">
        {chart.kind === "stage" ? (
          <ChartContainer config={chartConfig("Opportunities")} className="aspect-auto h-[206px] w-full">
            <BarChart data={stageData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={10} />
              <YAxis hide />
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
              <Bar dataKey="value" fill="var(--color-value)" radius={4} isAnimationActive={false}>
                {stageData.map((row) => (
                  <Cell
                    key={row.key}
                    cursor={row.opportunities.length > 0 ? "pointer" : "default"}
                    role={row.opportunities.length > 0 ? "button" : undefined}
                    tabIndex={row.opportunities.length > 0 ? 0 : undefined}
                    aria-label={row.opportunities.length > 0 ? `Open ${row.label} drilldown` : undefined}
                    onClick={(event: MouseEvent<SVGElement>) => {
                      event.stopPropagation();
                      openSlice(row);
                    }}
                    onKeyDown={(event: KeyboardEvent<SVGElement>) => openSliceFromKeyboard(event, row)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : null}

        {chart.kind === "timeline" || chart.kind === "created" ? (
          <ChartContainer
            config={chartConfig(chart.kind === "timeline" ? "ARR" : "Opportunities")}
            className="aspect-auto h-[228px] w-full"
          >
            <LineChart data={lineData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={12} />
              <YAxis hide />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Line
                dataKey="value"
                type="monotone"
                stroke="var(--color-value)"
                strokeWidth={2}
                dot={renderTimelineDot}
                activeDot={renderTimelineDot}
                isAnimationActive={false}
              />
            </LineChart>
          </ChartContainer>
        ) : null}

        {chart.kind === "enterprise" ? (
          <div className="relative h-[206px] w-full">
            <ChartContainer config={booleanChartConfig} className="aspect-auto h-full w-full">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="key" />} />
                <Pie
                  data={enterpriseData}
                  dataKey="value"
                  nameKey="key"
                  innerRadius={54}
                  outerRadius={78}
                  paddingAngle={2}
                  strokeWidth={4}
                  isAnimationActive={false}
                  onClick={openSliceFromPayload}
                >
                  {enterpriseData.map((row) => (
                    <Cell
                      key={row.key}
                      fill={row.fill}
                      cursor={row.opportunities.length > 0 ? "pointer" : "default"}
                      role={row.opportunities.length > 0 ? "button" : undefined}
                      tabIndex={row.opportunities.length > 0 ? 0 : undefined}
                      aria-label={row.opportunities.length > 0 ? `Open ${row.label} drilldown` : undefined}
                      onClick={(event: MouseEvent<SVGElement>) => {
                        event.stopPropagation();
                        openSlice(row);
                      }}
                      onKeyDown={(event: KeyboardEvent<SVGElement>) => openSliceFromKeyboard(event, row)}
                    />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="key" />} />
              </PieChart>
            </ChartContainer>
            <div className="pointer-events-none absolute left-1/2 top-[43%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5 text-center">
              <span className="text-lg font-semibold leading-none text-foreground tabular-nums">{enterpriseTotal.toLocaleString()}</span>
              <span className="text-xs leading-none text-muted-foreground">Opportunities</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function DashboardOverview({ opportunities, onOpenDrilldown }: DashboardOverviewProps) {
  const lineCharts = DASHBOARD_CHARTS.filter((chart) => chart.kind === "timeline" || chart.kind === "created");
  const lowerCharts = DASHBOARD_CHARTS.filter((chart) => chart.kind !== "timeline" && chart.kind !== "created");

  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Opportunity metrics" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {DASHBOARD_SUMMARIES.map((metric) => {
          const value = metricValue(metric, opportunities);
          return (
            <MetricCard
              key={metric.id}
              metric={metric}
              value={value}
              onOpen={() =>
                onOpenDrilldown({
                  id: `metric:${metric.id}`,
                  label: metric.label,
                  description: `Opportunities backing ${metric.label}.`,
                  opportunities,
                })
              }
            />
          );
        })}
      </section>

      <section aria-label="Opportunity charts" className="grid gap-4 lg:grid-cols-2">
        {lineCharts.map((chart) => (
          <ChartCard
            key={chart.id}
            chart={chart}
            opportunities={opportunities}
            layout="wide"
            onOpen={(scope) =>
              onOpenDrilldown({
                ...scope,
                description: `${scope.description} ${chart.description}`,
              })
            }
          />
        ))}
        {lowerCharts.map((chart) => (
          <ChartCard
            key={chart.id}
            chart={chart}
            opportunities={opportunities}
            onOpen={(scope) =>
              onOpenDrilldown({
                ...scope,
                description: `${scope.description} ${chart.description}`,
              })
            }
          />
        ))}
      </section>
    </div>
  );
}
