import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import {
  decodeCursor,
  defaultPageLimit,
  encodeCursor,
} from "@/lib/api/pagination";
import {
  executeQuery,
  hasDatabaseConnection,
  queryRows,
  quoteIdentifier,
  type DbParam,
  type DbRow,
} from "@/lib/db";
import type {
  AppRecordListResponse,
  AppRecordResponse,
  CanonicalFieldValue,
  PaginationParams,
} from "@/lib/app-definition/types";
import {
  readDemoJsonOpportunities,
  writeDemoJsonOpportunities,
} from "@/lib/opportunities/demo-json-provider";
import type {
  OpportunityAttachment,
  OpportunityCustomer,
  OpportunityData,
  OpportunityListResult,
  OpportunityRecord,
} from "@/lib/opportunities/types";

export const opportunityEntityId = "opportunities";

const opportunityTable = "app_opportunities";
const opportunitySelectColumns = [
  "id",
  "created_at",
  "updated_at",
  "title",
  "stage",
  "priority",
  "owner",
  "region",
  "amount",
  "confidence",
  "close_date",
  "enterprise",
  "source_url",
  "contact_email",
  "attachments",
  "customer",
] as const;
const editableOpportunityColumns = new Set<keyof OpportunityData>([
  "title",
  "stage",
  "priority",
  "owner",
  "region",
  "amount",
  "confidence",
  "close_date",
  "enterprise",
  "source_url",
  "contact_email",
  "attachments",
]);

type FilterOperator =
  | "eq"
  | "neq"
  | "contains"
  | "is_empty"
  | "is_not_empty"
  | "lt"
  | "lte"
  | "gt"
  | "gte";

export interface OpportunityListFilter {
  field_id: string;
  operator: FilterOperator;
  value?: unknown;
}

export interface OpportunityListSort {
  field_id: string;
  direction: "asc" | "desc";
}

export interface OpportunityListControls {
  filters: OpportunityListFilter[];
  sorts: OpportunityListSort[];
}

const filterOperators = new Set<FilterOperator>([
  "eq",
  "neq",
  "contains",
  "is_empty",
  "is_not_empty",
  "lt",
  "lte",
  "gt",
  "gte",
]);
const allowedListFields = new Set<string>(opportunitySelectColumns);

interface OpportunityDbRow extends DbRow {
  id: unknown;
  created_at?: unknown;
  updated_at?: unknown;
  title?: unknown;
  stage?: unknown;
  priority?: unknown;
  owner?: unknown;
  region?: unknown;
  amount?: unknown;
  confidence?: unknown;
  close_date?: unknown;
  enterprise?: unknown;
  source_url?: unknown;
  contact_email?: unknown;
  attachments?: unknown;
  customer?: unknown;
}

function textValue(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function booleanValue(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

function dateValue(value: unknown, dateOnly = false): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    const iso = value.toISOString();
    return dateOnly ? iso.slice(0, 10) : iso;
  }
  return String(value);
}

function canonicalDateString(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value);
  return text.length >= 10 ? text.slice(0, 10) : text;
}

function parseJsonValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) return value;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return value;
  }
}

function stringArrayValue(value: unknown): string[] {
  const parsed = parseJsonValue(value);
  if (!Array.isArray(parsed)) return parsed == null ? [] : [String(parsed)];
  return parsed.map((item) => String(item)).filter(Boolean);
}

function canonicalStringArrayValue(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  if (value == null || value === "") return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function canonicalNumberValue(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error("Expected a finite number.");
  }
  return parsed;
}

function canonicalBooleanValue(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

function canonicalTextValue(value: unknown): string | null {
  if (value == null) return null;
  return String(value);
}

function canonicalAttachmentValue(value: unknown): OpportunityAttachment[] {
  return attachmentValue(value);
}

function attachmentFromValue(item: unknown): OpportunityAttachment | null {
  const primitiveFileId = textValue(item);
  if (primitiveFileId) {
    return {
      id: primitiveFileId,
      fileName: primitiveFileId,
      workspaceFileId: primitiveFileId,
    };
  }
  if (item === null || typeof item !== "object" || Array.isArray(item)) return null;

  const record = item as Record<string, unknown>;
  const id = textValue(record.id) ?? undefined;
  const workspaceFileId =
    textValue(record.workspaceFileId) ??
    textValue(record.fileId) ??
    textValue(record.workspace_file_id) ??
    undefined;
  return {
    id,
    fileName:
      textValue(record.fileName) ??
      textValue(record.filename) ??
      textValue(record.name) ??
      textValue(record.label) ??
      workspaceFileId ??
      id ??
      "Untitled file",
    contentType: textValue(record.contentType) ?? textValue(record.mimeType) ?? undefined,
    url: textValue(record.url) ?? undefined,
    previewUrl: textValue(record.previewUrl) ?? undefined,
    directUrl: textValue(record.directUrl) ?? undefined,
    downloadUrl: textValue(record.downloadUrl) ?? undefined,
    workspaceId: textValue(record.workspaceId) ?? undefined,
    workspaceFileId,
    size: typeof record.size === "number" ? record.size : undefined,
  };
}

function attachmentValue(value: unknown): OpportunityAttachment[] {
  const parsed = parseJsonValue(value);
  if (parsed == null || parsed === "") return [];
  const values = Array.isArray(parsed) ? parsed : [parsed];
  return values
    .map(attachmentFromValue)
    .filter((item): item is OpportunityAttachment => item !== null);
}

function customerValue(value: unknown): OpportunityCustomer | null {
  const parsed = parseJsonValue(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

  const item = parsed as Record<string, unknown>;
  const label = textValue(item.label) ?? textValue(item.name) ?? textValue(item.id);
  if (!label) return null;

  return {
    id: textValue(item.id) ?? undefined,
    label,
  };
}

function rowToOpportunity(row: OpportunityDbRow): OpportunityRecord {
  return {
    id: String(row.id),
    createdAt: dateValue(row.created_at) ?? undefined,
    updatedAt: dateValue(row.updated_at) ?? undefined,
    data: {
      title: textValue(row.title) ?? String(row.id),
      stage: textValue(row.stage) ?? "qualified",
      priority: textValue(row.priority) ?? "p2",
      owner: stringArrayValue(row.owner),
      region: textValue(row.region) ?? "na",
      amount: numberValue(row.amount),
      confidence: numberValue(row.confidence),
      close_date: dateValue(row.close_date, true),
      enterprise: booleanValue(row.enterprise),
      source_url: textValue(row.source_url),
      contact_email: textValue(row.contact_email),
      attachments: attachmentValue(row.attachments),
      customer: customerValue(row.customer),
    },
  };
}

function normalizeOpportunityUpdate(input: Record<string, unknown>): Partial<OpportunityData> {
  const out: Partial<OpportunityData> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!editableOpportunityColumns.has(key as keyof OpportunityData)) continue;
    switch (key as keyof OpportunityData) {
      case "owner":
        out.owner = canonicalStringArrayValue(value);
        break;
      case "amount":
      case "confidence":
        out[key] = canonicalNumberValue(value);
        break;
      case "enterprise":
        out.enterprise = canonicalBooleanValue(value);
        break;
      case "close_date":
        out.close_date = canonicalDateString(value);
        break;
      case "title":
      case "stage":
      case "priority":
      case "region":
      case "source_url":
      case "contact_email":
        out[key] = canonicalTextValue(value);
        break;
      case "attachments":
        out.attachments = canonicalAttachmentValue(value);
        break;
      case "customer":
        break;
    }
  }
  return out;
}

function dbValue(value: unknown): DbParam {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (value instanceof Date) return value;
  return JSON.stringify(value);
}

function selectSql() {
  return opportunitySelectColumns
    .map((column) => `${quoteIdentifier(column)} as ${quoteIdentifier(column)}`)
    .join(", ");
}

function pagedResult(
  opportunities: OpportunityRecord[],
  pagination: PaginationParams,
  offset: number,
): OpportunityListResult {
  const page = opportunities.slice(offset, offset + pagination.limit);
  const hasMore = offset + pagination.limit < opportunities.length;
  return {
    opportunities: page,
    pagination: {
      limit: pagination.limit,
      ...(hasMore ? { nextCursor: encodeCursor(offset + pagination.limit) } : {}),
      hasMore,
    },
  };
}

function parseJsonArrayParam(value: string | null): unknown[] | null {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function parseListFilters(value: string | null): OpportunityListFilter[] | null {
  const items = parseJsonArrayParam(value);
  if (!items) return null;
  const filters: OpportunityListFilter[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const record = item as Record<string, unknown>;
    if (typeof record.field_id !== "string" || !allowedListFields.has(record.field_id)) return null;
    if (typeof record.operator !== "string" || !filterOperators.has(record.operator as FilterOperator)) {
      return null;
    }
    filters.push({
      field_id: record.field_id,
      operator: record.operator as FilterOperator,
      ...(record.value !== undefined ? { value: record.value } : {}),
    });
  }
  return filters;
}

function parseListSorts(value: string | null): OpportunityListSort[] | null {
  const items = parseJsonArrayParam(value);
  if (!items) return null;
  const sorts: OpportunityListSort[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const record = item as Record<string, unknown>;
    if (typeof record.field_id !== "string" || !allowedListFields.has(record.field_id)) return null;
    if (record.direction !== "asc" && record.direction !== "desc") return null;
    sorts.push({ field_id: record.field_id, direction: record.direction });
  }
  return sorts;
}

export function parseOpportunityListControls(searchParams: URLSearchParams): OpportunityListControls | null {
  const filters = parseListFilters(searchParams.get("filters"));
  const sorts = parseListSorts(searchParams.get("sorts"));
  if (!filters || !sorts) return null;
  return { filters, sorts };
}

function recordFieldValue(opportunity: OpportunityRecord, fieldId: string): unknown {
  return fieldId === "id" ? opportunity.id : opportunity.data[fieldId];
}

function compareValues(left: unknown, right: unknown): number {
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) return leftNumber - rightNumber;
  return String(left ?? "").localeCompare(String(right ?? ""));
}

function matchesFilter(value: unknown, filter: OpportunityListFilter): boolean {
  const empty = value == null || value === "" || (Array.isArray(value) && value.length === 0);
  const expected = filter.value;
  switch (filter.operator) {
    case "is_empty":
      return empty;
    case "is_not_empty":
      return !empty;
    case "eq":
      return String(value ?? "") === String(expected ?? "");
    case "neq":
      return String(value ?? "") !== String(expected ?? "");
    case "contains":
      return String(value ?? "").toLowerCase().includes(String(expected ?? "").toLowerCase());
    case "lt":
      return compareValues(value, expected) < 0;
    case "lte":
      return compareValues(value, expected) <= 0;
    case "gt":
      return compareValues(value, expected) > 0;
    case "gte":
      return compareValues(value, expected) >= 0;
  }
}

function filterAndSortOpportunities(
  opportunities: OpportunityRecord[],
  controls: OpportunityListControls,
) {
  const filtered = opportunities.filter((opportunity) =>
    controls.filters.every((filter) => matchesFilter(recordFieldValue(opportunity, filter.field_id), filter)),
  );
  if (controls.sorts.length === 0) return filtered;
  return [...filtered].sort((left, right) => {
    for (const sort of controls.sorts) {
      const result = compareValues(recordFieldValue(left, sort.field_id), recordFieldValue(right, sort.field_id));
      if (result !== 0) return sort.direction === "asc" ? result : -result;
    }
    return left.id.localeCompare(right.id);
  });
}

function whereSql(controls: OpportunityListControls) {
  const clauses: string[] = [];
  const params: DbParam[] = [];

  for (const filter of controls.filters) {
    const column = quoteIdentifier(filter.field_id);
    switch (filter.operator) {
      case "is_empty":
        clauses.push(`(${column} is null or ${column} = '')`);
        break;
      case "is_not_empty":
        clauses.push(`(${column} is not null and ${column} <> '')`);
        break;
      case "contains":
        clauses.push(`lower(cast(${column} as char)) like ?`);
        params.push(`%${String(filter.value ?? "").toLowerCase()}%`);
        break;
      case "eq":
        clauses.push(`${column} = ?`);
        params.push(dbValue(filter.value));
        break;
      case "neq":
        clauses.push(`${column} <> ?`);
        params.push(dbValue(filter.value));
        break;
      case "lt":
        clauses.push(`${column} < ?`);
        params.push(dbValue(filter.value));
        break;
      case "lte":
        clauses.push(`${column} <= ?`);
        params.push(dbValue(filter.value));
        break;
      case "gt":
        clauses.push(`${column} > ?`);
        params.push(dbValue(filter.value));
        break;
      case "gte":
        clauses.push(`${column} >= ?`);
        params.push(dbValue(filter.value));
        break;
    }
  }

  return {
    sql: clauses.length > 0 ? ` where ${clauses.join(" and ")}` : "",
    params,
  };
}

function orderSql(controls: OpportunityListControls) {
  const clauses = controls.sorts.map(
    (sort) => `${quoteIdentifier(sort.field_id)} ${sort.direction === "desc" ? "desc" : "asc"}`,
  );
  clauses.push(`${quoteIdentifier("id")} asc`);
  return ` order by ${clauses.join(", ")}`;
}

export async function listOpportunities(
  pagination: PaginationParams = { limit: defaultPageLimit },
  controls: OpportunityListControls = { filters: [], sorts: [] },
): Promise<OpportunityListResult> {
  noStore();

  const offset = decodeCursor(pagination.cursor);
  if (offset === null) {
    return { opportunities: [], pagination: { limit: pagination.limit, hasMore: false } };
  }

  if (!hasDatabaseConnection()) {
    return pagedResult(filterAndSortOpportunities(await readDemoJsonOpportunities(), controls), pagination, offset);
  }

  const where = whereSql(controls);
  const rows = await queryRows<OpportunityDbRow>(
    `select ${selectSql()} from ${quoteIdentifier(opportunityTable)}${where.sql} ${orderSql(controls)} limit ? offset ?`,
    [...where.params, pagination.limit + 1, offset],
  );
  const hasMore = rows.length > pagination.limit;

  return {
    opportunities: rows.slice(0, pagination.limit).map(rowToOpportunity),
    pagination: {
      limit: pagination.limit,
      ...(hasMore ? { nextCursor: encodeCursor(offset + pagination.limit) } : {}),
      hasMore,
    },
  };
}

export async function getOpportunity(opportunityId: string): Promise<OpportunityRecord | null> {
  noStore();

  if (!hasDatabaseConnection()) {
    return (await readDemoJsonOpportunities()).find((opportunity) => opportunity.id === opportunityId) ?? null;
  }

  const rows = await queryRows<OpportunityDbRow>(
    `select ${selectSql()} from ${quoteIdentifier(opportunityTable)} where ${quoteIdentifier("id")} = ? limit 1`,
    [opportunityId],
  );

  return rows[0] ? rowToOpportunity(rows[0]) : null;
}

export async function updateOpportunity(
  opportunityId: string,
  data: Record<string, unknown>,
): Promise<OpportunityRecord | null> {
  noStore();

  const updates = normalizeOpportunityUpdate(data);
  if (Object.keys(updates).length === 0) {
    return getOpportunity(opportunityId);
  }

  if (!hasDatabaseConnection()) {
    const records = await readDemoJsonOpportunities();
    const index = records.findIndex((opportunity) => opportunity.id === opportunityId);
    if (index < 0) return null;
    const next: OpportunityRecord = {
      ...records[index],
      updatedAt: new Date().toISOString(),
      data: {
        ...records[index].data,
        ...updates,
      } as OpportunityData,
    };
    records[index] = next;
    await writeDemoJsonOpportunities(records);
    return next;
  }

  const entries = Object.entries(updates);
  const setSql = entries.map(([key]) => `${quoteIdentifier(key)} = ?`).join(", ");
  await executeQuery(
    `update ${quoteIdentifier(opportunityTable)} set ${setSql}, ${quoteIdentifier("updated_at")} = current_timestamp where ${quoteIdentifier("id")} = ?`,
    [...entries.map(([, value]) => dbValue(value)), opportunityId],
  );
  return getOpportunity(opportunityId);
}

export async function deleteOpportunity(opportunityId: string): Promise<boolean> {
  noStore();

  if (!hasDatabaseConnection()) {
    const records = await readDemoJsonOpportunities();
    const remaining = records.filter((opportunity) => opportunity.id !== opportunityId);
    if (remaining.length === records.length) return false;
    await writeDemoJsonOpportunities(remaining);
    return true;
  }

  const existing = await getOpportunity(opportunityId);
  if (!existing) return false;
  await executeQuery(
    `delete from ${quoteIdentifier(opportunityTable)} where ${quoteIdentifier("id")} = ?`,
    [opportunityId],
  );
  return true;
}

export function toOpportunityResponse(opportunity: OpportunityRecord): AppRecordResponse {
  return {
    entity_id: opportunityEntityId,
    record_id: opportunity.id,
    data: {
      id: opportunity.id,
      ...opportunity.data,
    } satisfies Record<string, CanonicalFieldValue>,
    ...(opportunity.createdAt ? { created_at: opportunity.createdAt } : {}),
    ...(opportunity.updatedAt ? { updated_at: opportunity.updatedAt } : {}),
  };
}

export function toOpportunityListResponse(result: OpportunityListResult): AppRecordListResponse {
  return {
    entity_id: opportunityEntityId,
    records: result.opportunities.map(toOpportunityResponse),
    pagination: {
      limit: result.pagination.limit,
      ...(result.pagination.nextCursor ? { next_cursor: result.pagination.nextCursor } : {}),
      has_more: result.pagination.hasMore,
    },
  };
}
