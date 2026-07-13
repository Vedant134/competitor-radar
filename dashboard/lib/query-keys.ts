export type QueryParams = Readonly<
  Record<string, string | number | boolean | null | undefined>
>;

export const queryKeys = {
  workspaceMembers: () => ["workspace", "members"] as const,
  opportunities: {
    all: () => ["opportunities"] as const,
    lists: () => [...queryKeys.opportunities.all(), "list"] as const,
    list: (params: QueryParams = {}) =>
      [...queryKeys.opportunities.lists(), params] as const,
    infiniteList: (params: QueryParams = {}) =>
      [...queryKeys.opportunities.lists(), "infinite", params] as const,
  },
};
