import "server-only";

import { constants as fsConstants } from "node:fs";
import { access, copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { OpportunityRecord } from "@/lib/opportunities/types";

// Agent note: this provider exists only to make the demo template editable without a database.
// In a production app, remove this demo JSON data provider and wire the resource to the real database provider.
const jsonSeedPath = join(/* turbopackIgnore: true */ process.cwd(), "data", "opportunities.seed.json");
const jsonRuntimeDir = join(/* turbopackIgnore: true */ process.cwd(), ".data");
const jsonRuntimePath = join(jsonRuntimeDir, "opportunities.json");

function isOpportunityRecord(value: unknown): value is OpportunityRecord {
  return (
    value != null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof (value as { id?: unknown }).id === "string" &&
    (value as { data?: unknown }).data != null &&
    typeof (value as { data?: unknown }).data === "object" &&
    !Array.isArray((value as { data?: unknown }).data)
  );
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function ensureDemoJsonDataFile() {
  if (await pathExists(jsonRuntimePath)) return;
  await mkdir(jsonRuntimeDir, { recursive: true });
  await copyFile(jsonSeedPath, jsonRuntimePath);
}

export async function readDemoJsonOpportunities(): Promise<OpportunityRecord[]> {
  await ensureDemoJsonDataFile();
  const raw = await readFile(jsonRuntimePath, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed) || !parsed.every(isOpportunityRecord)) {
    throw new Error(`Invalid opportunity data file: ${jsonRuntimePath}`);
  }
  return parsed;
}

export async function writeDemoJsonOpportunities(records: OpportunityRecord[]) {
  await mkdir(jsonRuntimeDir, { recursive: true });
  const tmpPath = `${jsonRuntimePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmpPath, `${JSON.stringify(records, null, 2)}\n`, "utf8");
  await rename(tmpPath, jsonRuntimePath);
}
