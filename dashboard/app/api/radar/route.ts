import { NextResponse } from "next/server";
import { hasDatabaseConnection, queryRows } from "@/lib/db";
import type { RowDataPacket } from "mysql2/promise";

export const dynamic = "force-dynamic";

interface CustomerRow extends RowDataPacket {
  competitor_name: string;
  competitor_domain: string | null;
  channel_id: string | null;
}
interface BriefRow extends RowDataPacket {
  competitor_name: string;
  brief_date: string | null;
  severity: number | null;
  brief: string | null;
}
interface CountRow extends RowDataPacket {
  competitor_name: string;
  c: number;
}
interface NoteRow extends RowDataPacket {
  competitor_name: string;
  analyst: string | null;
  note: string | null;
  note_date: string | null;
}

export async function GET() {
  if (!hasDatabaseConnection()) {
    return NextResponse.json({ competitors: [], generatedAt: new Date().toISOString(), connected: false });
  }

  try {
    const customers = await queryRows<CustomerRow>(
      `SELECT competitor_name, MAX(competitor_domain) AS competitor_domain, MAX(channel_id) AS channel_id
         FROM customers GROUP BY competitor_name`,
    );

    // Latest brief per competitor (by most recent date, then highest severity).
    const briefs = await queryRows<BriefRow>(
      `SELECT b.competitor_name, b.brief_date, b.severity, b.brief
         FROM strategy_briefs b
         JOIN (SELECT competitor_name, MAX(brief_date) AS md FROM strategy_briefs GROUP BY competitor_name) x
           ON x.competitor_name = b.competitor_name AND x.md = b.brief_date
        ORDER BY b.severity DESC, b.id DESC`,
    );
    const latestBrief = new Map<string, BriefRow>();
    for (const b of briefs) {
      if (!latestBrief.has(b.competitor_name)) latestBrief.set(b.competitor_name, b);
    }

    const counts = await queryRows<CountRow>(
      `SELECT competitor_name, COUNT(*) AS c FROM raw_extracts GROUP BY competitor_name`,
    );
    const countByComp = new Map<string, number>();
    for (const r of counts) countByComp.set(r.competitor_name, Number(r.c));

    const notes = await queryRows<NoteRow>(
      `SELECT n.competitor_name, n.analyst, n.note, n.note_date
         FROM analyst_notes n
         JOIN (SELECT competitor_name, MAX(note_date) AS md FROM analyst_notes GROUP BY competitor_name) x
           ON x.competitor_name = n.competitor_name AND x.md = n.note_date`,
    );
    const notesByComp = new Map<string, { analyst: string | null; note: string | null }[]>();
    for (const n of notes) {
      const arr = notesByComp.get(n.competitor_name) ?? [];
      arr.push({ analyst: n.analyst, note: n.note });
      notesByComp.set(n.competitor_name, arr);
    }

    const competitors = customers
      .map((c) => {
        const b = latestBrief.get(c.competitor_name);
        return {
          name: c.competitor_name,
          domain: c.competitor_domain,
          channelId: c.channel_id,
          latestBriefDate: b?.brief_date ?? null,
          severity: b?.severity != null ? Number(b.severity) : null,
          brief: b?.brief ?? null,
          signals: countByComp.get(c.competitor_name) ?? 0,
          notes: notesByComp.get(c.competitor_name) ?? [],
        };
      })
      .sort((a, z) => (z.severity ?? -1) - (a.severity ?? -1) || a.name.localeCompare(z.name));

    return NextResponse.json({ competitors, generatedAt: new Date().toISOString(), connected: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Radar query failed", competitors: [], connected: true },
      { status: 500 },
    );
  }
}
