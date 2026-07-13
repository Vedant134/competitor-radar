"use client";

import { useQuery } from "@tanstack/react-query";

export interface RadarNote {
  analyst: string | null;
  note: string | null;
}

export interface RadarCompetitor {
  name: string;
  domain: string | null;
  channelId: string | null;
  latestBriefDate: string | null;
  severity: number | null;
  brief: string | null;
  signals: number;
  notes: RadarNote[];
}

export interface RadarResponse {
  competitors: RadarCompetitor[];
  generatedAt: string;
  connected: boolean;
}

async function fetchRadar(): Promise<RadarResponse> {
  const res = await fetch("/api/radar", { cache: "no-store" });
  if (!res.ok) throw new Error(`Radar request failed (${res.status})`);
  return (await res.json()) as RadarResponse;
}

export function useRadar() {
  return useQuery({
    queryKey: ["radar"],
    queryFn: fetchRadar,
    refetchInterval: 30_000,
  });
}
