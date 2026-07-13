import type {
  OpportunityOption,
  OpportunityPriority,
  OpportunityRegion,
  OpportunityStage,
} from "@/lib/opportunities/types";

export const opportunityStageOptions = [
  { value: "qualified", label: "Qualified", color: "blue" },
  { value: "solution", label: "Solution", color: "purple" },
  { value: "proposal", label: "Proposal", color: "amber" },
  { value: "commit", label: "Commit", color: "green" },
] satisfies OpportunityOption<OpportunityStage>[];

export const opportunityPriorityOptions = [
  { value: "p0", label: "P0", color: "rose" },
  { value: "p1", label: "P1", color: "orange" },
  { value: "p2", label: "P2", color: "cyan" },
] satisfies OpportunityOption<OpportunityPriority>[];

export const opportunityRegionOptions = [
  { value: "apac", label: "APAC", color: "green" },
  { value: "emea", label: "EMEA", color: "indigo" },
  { value: "na", label: "NA", color: "pink" },
] satisfies OpportunityOption<OpportunityRegion>[];

export const opportunityOwners = [
  { id: "u_chen", name: "An Chen", email: "an@example.com" },
  { id: "u_rahman", name: "Maya Rahman", email: "maya@example.com" },
  { id: "u_sato", name: "Ren Sato", email: "ren@example.com" },
  { id: "u_ng", name: "Elena Ng", email: "elena@example.com" },
  { id: "u_lee", name: "Jordan Lee", email: "jordan@example.com" },
  { id: "u_iyer", name: "Priya Iyer", email: "priya@example.com" },
  { id: "u_haddad", name: "Omar Haddad", email: "omar@example.com" },
] as const;

export function opportunityOptionLabel(options: readonly OpportunityOption[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value;
}

export function opportunityOwnerName(ownerId: string) {
  return opportunityOwners.find((owner) => owner.id === ownerId)?.name ?? ownerId;
}
