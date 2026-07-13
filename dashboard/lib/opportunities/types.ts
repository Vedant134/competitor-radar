import type { CanonicalFieldValue, PaginationResult } from "@/lib/app-definition/types";

export type OpportunityStage = "qualified" | "solution" | "proposal" | "commit";
export type OpportunityPriority = "p0" | "p1" | "p2";
export type OpportunityRegion = "apac" | "emea" | "na";

export interface OpportunityAttachment {
  id?: string;
  fileName: string;
  contentType?: string;
  url?: string;
  previewUrl?: string;
  directUrl?: string;
  downloadUrl?: string;
  workspaceId?: string;
  workspaceFileId?: string;
  size?: number;
}

export interface OpportunityCustomer {
  id?: string;
  label: string;
}

export interface OpportunityData extends Record<string, CanonicalFieldValue> {
  title: string;
  stage: OpportunityStage | string;
  priority: OpportunityPriority | string;
  owner: string[];
  region: OpportunityRegion | string;
  amount: number;
  confidence: number;
  close_date: string | null;
  enterprise: boolean;
  source_url: string | null;
  contact_email: string | null;
  attachments: OpportunityAttachment[];
  customer: OpportunityCustomer | null;
}

export interface OpportunityRecord {
  id: string;
  data: OpportunityData;
  createdAt?: string;
  updatedAt?: string;
}

export interface Opportunity {
  id: string;
  title: string;
  stage: OpportunityStage | string;
  priority: OpportunityPriority | string;
  ownerIds: string[];
  region: OpportunityRegion | string;
  amount: number;
  confidence: number;
  closeDate: string | null;
  enterprise: boolean;
  sourceUrl: string | null;
  contactEmail: string | null;
  attachments: OpportunityAttachment[];
  customer: OpportunityCustomer | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface OpportunityListResult {
  opportunities: OpportunityRecord[];
  pagination: PaginationResult;
}

export interface OpportunityListPage {
  opportunities: Opportunity[];
  pagination: {
    limit: number;
    nextCursor?: string;
    hasMore: boolean;
  };
}

export interface OpportunityDrilldownScope {
  id: string;
  label: string;
  description: string;
  opportunities: Opportunity[];
  opportunity?: Opportunity;
  opportunityOnly?: boolean;
}

export interface OpportunityOption<TValue extends string = string> {
  value: TValue;
  label: string;
  color?: string;
}
