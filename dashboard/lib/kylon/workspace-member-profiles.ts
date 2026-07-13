import type { DataField, DataUserOption } from "@/components/ui/data-types";

export interface WorkspaceMemberProfile {
  userId: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  memberType?: string;
  role?: string;
}

export type WorkspaceMemberProfileMap = ReadonlyMap<string, WorkspaceMemberProfile>;

function isObjectValue(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stringValue(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

function memberPayloadArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (isObjectValue(payload) && Array.isArray(payload.members)) return payload.members;
  return [];
}

export function normalizeWorkspaceMemberProfiles(payload: unknown): WorkspaceMemberProfile[] {
  const byUserId = new Map<string, WorkspaceMemberProfile>();

  for (const item of memberPayloadArray(payload)) {
    if (!isObjectValue(item)) continue;

    const userId = stringValue(item, ["userId", "user_id", "id"]);
    if (!userId) continue;

    const email = stringValue(item, ["userEmail", "user_email", "email"]);
    const name =
      stringValue(item, ["userName", "user_name", "displayName", "display_name", "name"]) ??
      email ??
      userId;
    const avatarUrl = stringValue(item, [
      "userAvatarUrl",
      "user_avatar_url",
      "avatarUrl",
      "avatar_url",
      "imageUrl",
      "image_url",
    ]);

    byUserId.set(userId, {
      userId,
      name,
      email,
      avatarUrl,
      memberType: stringValue(item, ["memberType", "member_type"]),
      role: stringValue(item, ["role"]),
    });
  }

  return Array.from(byUserId.values());
}

function primitiveUserId(value: unknown): string {
  if (value == null) return "";
  if (isObjectValue(value)) {
    return (
      stringValue(value, ["userId", "user_id", "id", "email", "name", "label"]) ?? ""
    );
  }
  return String(value);
}

function userOptionFromObject(value: unknown): DataUserOption | null {
  if (!isObjectValue(value)) return null;

  const id = stringValue(value, ["userId", "user_id", "id", "email", "name", "label"]);
  const name =
    stringValue(value, ["userName", "user_name", "displayName", "display_name", "name", "label"]) ??
    id;
  if (!id || !name) return null;

  const email = stringValue(value, ["userEmail", "user_email", "email"]);
  const avatarUrl = stringValue(value, [
    "userAvatarUrl",
    "user_avatar_url",
    "avatarUrl",
    "avatar_url",
    "imageUrl",
    "image_url",
  ]);

  return {
    id,
    name,
    email,
    avatar_url: avatarUrl,
  };
}

export function workspaceMemberToUserOption(member: WorkspaceMemberProfile): DataUserOption {
  return {
    id: member.userId,
    name: member.name,
    email: member.email,
    avatar_url: member.avatarUrl,
  };
}

export function resolveUserOption(
  field: DataField,
  raw: unknown,
  workspaceMembers: WorkspaceMemberProfileMap,
): DataUserOption {
  const embeddedUser = userOptionFromObject(raw);
  const id = embeddedUser?.id ?? primitiveUserId(raw);
  const userSource =
    field.config?.user_source ?? (field.config?.users?.length ? "app" : "workspace");

  if (userSource === "workspace") {
    const workspaceMember = workspaceMembers.get(id);
    if (workspaceMember) return workspaceMemberToUserOption(workspaceMember);
  }

  const configuredUser = field.config?.users?.find(
    (user) => user.id === id || user.email === id || user.name === id,
  );
  return configuredUser ?? embeddedUser ?? { id, name: id };
}
