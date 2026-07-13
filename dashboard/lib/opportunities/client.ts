"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { appRecordThreadHref, type KylonWorkspaceContext } from "@/lib/kylon/bridge";
import { queryKeys } from "@/lib/query-keys";
import type {
  AppRecordListResponse,
  AppRecordResponse,
  CanonicalFieldValue,
} from "@/lib/app-definition/types";
import type {
  Opportunity,
  OpportunityAttachment,
  OpportunityCustomer,
  OpportunityListPage,
  OpportunityPriority,
} from "@/lib/opportunities/types";

export const opportunityApiPath = "/api/opportunities";
export const DEFAULT_OPPORTUNITY_PAGE_SIZE = 100;

const opportunityThreadEntityId = "opportunities";
const apiFieldByUiField: Record<string, string> = {
  ownerIds: "owner",
  closeDate: "close_date",
  sourceUrl: "source_url",
  contactEmail: "contact_email",
};

type UpdateOpportunityFieldInput = {
  opportunityId: string;
  fieldKey: string;
  value: CanonicalFieldValue;
};

type DeleteOpportunityInput = {
  opportunityId: string;
};

type OpportunityListQueryData = OpportunityListPage | InfiniteData<OpportunityListPage>;

export interface OpportunityListFilters {
  priority?: OpportunityPriority;
}

function textValue(value: CanonicalFieldValue | undefined): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function numberValue(value: CanonicalFieldValue | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function booleanValue(value: CanonicalFieldValue | undefined): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

function stringArrayValue(value: CanonicalFieldValue | undefined): string[] {
  if (!Array.isArray(value)) return value == null ? [] : [String(value)];
  return value.map((item) => String(item)).filter(Boolean);
}

function attachmentFromValue(item: unknown): OpportunityAttachment | null {
  const primitiveFileId = textValue(item as CanonicalFieldValue | undefined);
  if (primitiveFileId) {
    return {
      id: primitiveFileId,
      fileName: primitiveFileId,
      workspaceFileId: primitiveFileId,
    };
  }
  if (item === null || typeof item !== "object" || Array.isArray(item)) return null;

  const record = item as Record<string, unknown>;
  const id = textValue(record.id as CanonicalFieldValue | undefined) ?? undefined;
  const workspaceFileId =
    textValue(record.workspaceFileId as CanonicalFieldValue | undefined) ??
    textValue(record.fileId as CanonicalFieldValue | undefined) ??
    textValue(record.workspace_file_id as CanonicalFieldValue | undefined) ??
    undefined;
  return {
    id,
    fileName:
      textValue(record.fileName as CanonicalFieldValue | undefined) ??
      textValue(record.filename as CanonicalFieldValue | undefined) ??
      textValue(record.name as CanonicalFieldValue | undefined) ??
      textValue(record.label as CanonicalFieldValue | undefined) ??
      workspaceFileId ??
      id ??
      "Untitled file",
    contentType:
      textValue(record.contentType as CanonicalFieldValue | undefined) ??
      textValue(record.mimeType as CanonicalFieldValue | undefined) ??
      undefined,
    url: textValue(record.url as CanonicalFieldValue | undefined) ?? undefined,
    previewUrl: textValue(record.previewUrl as CanonicalFieldValue | undefined) ?? undefined,
    directUrl: textValue(record.directUrl as CanonicalFieldValue | undefined) ?? undefined,
    downloadUrl: textValue(record.downloadUrl as CanonicalFieldValue | undefined) ?? undefined,
    workspaceId: textValue(record.workspaceId as CanonicalFieldValue | undefined) ?? undefined,
    workspaceFileId,
    size: typeof record.size === "number" ? record.size : undefined,
  };
}

function attachmentValue(value: CanonicalFieldValue | undefined): OpportunityAttachment[] {
  if (value == null || value === "") return [];
  const values = Array.isArray(value) ? value : [value];
  return values
    .map(attachmentFromValue)
    .filter((item): item is OpportunityAttachment => item !== null);
}

function customerValue(value: CanonicalFieldValue | undefined): OpportunityCustomer | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const label =
    textValue(value.label as CanonicalFieldValue | undefined) ??
    textValue(value.name as CanonicalFieldValue | undefined) ??
    textValue(value.id as CanonicalFieldValue | undefined);
  if (!label) return null;
  return {
    id: textValue(value.id as CanonicalFieldValue | undefined) ?? undefined,
    label,
  };
}

function opportunityWithFieldValue(
  opportunity: Opportunity,
  fieldKey: string,
  value: CanonicalFieldValue,
): Opportunity {
  switch (fieldKey) {
    case "title":
      return { ...opportunity, title: textValue(value) ?? "" };
    case "stage":
      return { ...opportunity, stage: textValue(value) ?? opportunity.stage };
    case "priority":
      return { ...opportunity, priority: textValue(value) ?? opportunity.priority };
    case "ownerIds":
      return { ...opportunity, ownerIds: stringArrayValue(value) };
    case "region":
      return { ...opportunity, region: textValue(value) ?? opportunity.region };
    case "amount":
      return { ...opportunity, amount: numberValue(value) };
    case "confidence":
      return { ...opportunity, confidence: numberValue(value) };
    case "closeDate":
      return { ...opportunity, closeDate: textValue(value) };
    case "enterprise":
      return { ...opportunity, enterprise: booleanValue(value) };
    case "sourceUrl":
      return { ...opportunity, sourceUrl: textValue(value) };
    case "contactEmail":
      return { ...opportunity, contactEmail: textValue(value) };
    case "attachments":
      return { ...opportunity, attachments: attachmentValue(value) };
    case "customer":
      return { ...opportunity, customer: customerValue(value) };
    default:
      if (fieldKey in opportunity) {
        return { ...opportunity, [fieldKey]: value } as Opportunity;
      }
      return opportunity;
  }
}

function optimisticOpportunity(
  opportunity: Opportunity,
  variables: UpdateOpportunityFieldInput,
): Opportunity {
  return {
    ...opportunityWithFieldValue(opportunity, variables.fieldKey, variables.value),
    updatedAt: new Date().toISOString(),
  };
}

function updateOpportunityPage(
  page: OpportunityListPage,
  variables: UpdateOpportunityFieldInput,
): OpportunityListPage {
  let changed = false;
  const opportunities = page.opportunities.map((opportunity) => {
    if (opportunity.id !== variables.opportunityId) return opportunity;
    changed = true;
    return optimisticOpportunity(opportunity, variables);
  });

  return changed ? { ...page, opportunities } : page;
}

function isInfiniteOpportunityListData(
  data: OpportunityListQueryData,
): data is InfiniteData<OpportunityListPage> {
  return Array.isArray((data as InfiniteData<OpportunityListPage>).pages);
}

function updateOpportunityListQueryData(
  data: OpportunityListQueryData | undefined,
  variables: UpdateOpportunityFieldInput,
): OpportunityListQueryData | undefined {
  if (!data) return data;
  if (isInfiniteOpportunityListData(data)) {
    return {
      ...data,
      pages: data.pages.map((page) => updateOpportunityPage(page, variables)),
    };
  }
  return updateOpportunityPage(data, variables);
}

function removeOpportunityFromPage(page: OpportunityListPage, opportunityId: string): OpportunityListPage {
  const opportunities = page.opportunities.filter((opportunity) => opportunity.id !== opportunityId);
  return opportunities.length === page.opportunities.length ? page : { ...page, opportunities };
}

function removeOpportunityFromListQueryData(
  data: OpportunityListQueryData | undefined,
  opportunityId: string,
): OpportunityListQueryData | undefined {
  if (!data) return data;
  if (isInfiniteOpportunityListData(data)) {
    return {
      ...data,
      pages: data.pages.map((page) => removeOpportunityFromPage(page, opportunityId)),
    };
  }
  return removeOpportunityFromPage(data, opportunityId);
}

export function opportunityFromResponse(response: AppRecordResponse): Opportunity {
  return {
    id: response.record_id,
    title: textValue(response.data.title) ?? response.record_id,
    stage: textValue(response.data.stage) ?? "qualified",
    priority: textValue(response.data.priority) ?? "p2",
    ownerIds: stringArrayValue(response.data.owner),
    region: textValue(response.data.region) ?? "na",
    amount: numberValue(response.data.amount),
    confidence: numberValue(response.data.confidence),
    closeDate: textValue(response.data.close_date),
    enterprise: booleanValue(response.data.enterprise),
    sourceUrl: textValue(response.data.source_url),
    contactEmail: textValue(response.data.contact_email),
    attachments: attachmentValue(response.data.attachments),
    customer: customerValue(response.data.customer),
    createdAt: response.created_at,
    updatedAt: response.updated_at,
  };
}

function opportunityListFromResponse(response: AppRecordListResponse): OpportunityListPage {
  return {
    opportunities: response.records.map(opportunityFromResponse),
    pagination: {
      limit: response.pagination.limit,
      nextCursor: response.pagination.next_cursor,
      hasMore: response.pagination.has_more,
    },
  };
}

async function fetchOpportunityList({
  pageSize,
  cursor,
  filters = {},
}: {
  pageSize: number;
  cursor?: string;
  filters?: OpportunityListFilters;
}): Promise<OpportunityListPage> {
  const url = new URL(opportunityApiPath, window.location.origin);
  url.searchParams.set("limit", String(pageSize));
  if (cursor) url.searchParams.set("cursor", cursor);
  if (filters.priority) url.searchParams.set("priority", filters.priority);

  const response = await fetch(url, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Failed to load opportunities: ${response.status}`);
  }

  return opportunityListFromResponse((await response.json()) as AppRecordListResponse);
}

export function useOpportunities(
  pageSize = DEFAULT_OPPORTUNITY_PAGE_SIZE,
  filters: OpportunityListFilters = {},
) {
  const query = useQuery({
    queryKey: queryKeys.opportunities.list({ limit: pageSize, priority: filters.priority }),
    queryFn: () => fetchOpportunityList({ pageSize, filters }),
  });

  return {
    ...query,
    opportunities: query.data?.opportunities ?? [],
  };
}

export function useInfiniteOpportunities(
  pageSize = DEFAULT_OPPORTUNITY_PAGE_SIZE,
  filters: OpportunityListFilters = {},
) {
  const query = useInfiniteQuery({
    queryKey: queryKeys.opportunities.infiniteList({ limit: pageSize, priority: filters.priority }),
    queryFn: ({ pageParam }) =>
      fetchOpportunityList({
        pageSize,
        cursor: pageParam,
        filters,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
  });

  return {
    ...query,
    opportunities: query.data?.pages.flatMap((page) => page.opportunities) ?? [],
  };
}

async function patchOpportunityField({
  opportunityId,
  fieldKey,
  value,
}: UpdateOpportunityFieldInput): Promise<Opportunity> {
  const apiField = apiFieldByUiField[fieldKey] ?? fieldKey;
  const response = await fetch(`${opportunityApiPath}/${encodeURIComponent(opportunityId)}`, {
    method: "PATCH",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ data: { [apiField]: value } }),
  });
  if (!response.ok) {
    throw new Error(`Failed to update opportunity: ${response.status}`);
  }
  return opportunityFromResponse((await response.json()) as AppRecordResponse);
}

export function useUpdateOpportunityField() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: patchOpportunityField,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.opportunities.lists() });
      const previousLists = queryClient.getQueriesData<OpportunityListQueryData>({
        queryKey: queryKeys.opportunities.lists(),
      });

      queryClient.setQueriesData<OpportunityListQueryData>(
        { queryKey: queryKeys.opportunities.lists() },
        (data) => updateOpportunityListQueryData(data, variables),
      );

      return { previousLists };
    },
    onError: (_error, _variables, context) => {
      context?.previousLists.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.lists() });
    },
  });
}

async function deleteOpportunityRequest({ opportunityId }: DeleteOpportunityInput): Promise<void> {
  const response = await fetch(`${opportunityApiPath}/${encodeURIComponent(opportunityId)}`, {
    method: "DELETE",
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Failed to delete opportunity: ${response.status}`);
  }
}

export function useDeleteOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteOpportunityRequest,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.opportunities.lists() });
      const previousLists = queryClient.getQueriesData<OpportunityListQueryData>({
        queryKey: queryKeys.opportunities.lists(),
      });

      queryClient.setQueriesData<OpportunityListQueryData>(
        { queryKey: queryKeys.opportunities.lists() },
        (data) => removeOpportunityFromListQueryData(data, variables.opportunityId),
      );

      return { previousLists };
    },
    onError: (_error, _variables, context) => {
      context?.previousLists.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.lists() });
    },
  });
}

export function opportunityThreadHref(context: KylonWorkspaceContext, opportunityId: string) {
  return appRecordThreadHref(context, opportunityThreadEntityId, opportunityId);
}
