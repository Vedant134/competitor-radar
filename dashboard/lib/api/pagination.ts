import type { PaginationParams } from "@/lib/app-definition/types";

export const defaultPageLimit = 100;
export const maxPageLimit = 500;

export function encodeCursor(offset: number) {
  return Buffer.from(String(offset), "utf8").toString("base64url");
}

export function decodeCursor(cursor: string | undefined): number | null {
  if (!cursor) return 0;
  try {
    const value = Number(Buffer.from(cursor, "base64url").toString("utf8"));
    return Number.isInteger(value) && value >= 0 ? value : null;
  } catch {
    return null;
  }
}

export function parsePaginationParams(searchParams: URLSearchParams): PaginationParams | null {
  const rawLimit = searchParams.get("limit");
  const limit = rawLimit ? Number(rawLimit) : defaultPageLimit;
  if (!Number.isInteger(limit) || limit < 1 || limit > maxPageLimit) return null;

  const cursor = searchParams.get("cursor") ?? undefined;
  if (decodeCursor(cursor) === null) return null;

  return cursor ? { limit, cursor } : { limit };
}
