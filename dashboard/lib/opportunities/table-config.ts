import type { DrilldownScope } from "@/components/ui/drilldown-dialog";
import type { DataColumn, DataField, DataValue } from "@/components/ui/data-types";
import {
  opportunityOwners,
  opportunityPriorityOptions,
  opportunityRegionOptions,
  opportunityStageOptions,
} from "@/lib/opportunities/metadata";
import type {
  Opportunity,
  OpportunityDrilldownScope,
  OpportunityOption,
} from "@/lib/opportunities/types";

function optionConfig(options: readonly OpportunityOption[]) {
  return options.map((option) => ({
    id: option.value,
    label: option.label,
    color: option.color,
  }));
}

export const opportunityColumns = [
  {
    key: "title",
    label: "Opportunity",
    type: "text",
    sortable: true,
    width: 280,
    editable: true,
  },
  {
    key: "stage",
    label: "Stage",
    type: "select",
    sortable: true,
    width: 132,
    editable: true,
    config: { options: optionConfig(opportunityStageOptions) },
  },
  {
    key: "priority",
    label: "Priority",
    type: "select",
    sortable: true,
    width: 112,
    editable: true,
    config: { options: optionConfig(opportunityPriorityOptions) },
  },
  {
    key: "ownerIds",
    label: "Owner",
    type: "multi_user",
    width: 184,
    editable: true,
    config: {
      user_source: "app",
      users: opportunityOwners.map((owner) => ({
        id: owner.id,
        name: owner.name,
        email: owner.email,
      })),
    },
  },
  {
    key: "region",
    label: "Region",
    type: "select",
    sortable: true,
    width: 116,
    editable: true,
    config: { options: optionConfig(opportunityRegionOptions) },
  },
  {
    key: "amount",
    label: "ARR",
    type: "currency",
    sortable: true,
    width: 120,
    editable: true,
    config: { currency: "USD" },
  },
  {
    key: "confidence",
    label: "Confidence",
    type: "percent",
    sortable: true,
    width: 124,
    editable: true,
  },
  {
    key: "closeDate",
    label: "Close Date",
    type: "date",
    sortable: true,
    width: 132,
    editable: true,
    config: { include_time: false, date_format: "MMM D, YYYY" },
  },
  {
    key: "enterprise",
    label: "Enterprise",
    type: "checkbox",
    sortable: true,
    width: 108,
    editable: true,
  },
  {
    key: "sourceUrl",
    label: "Source",
    type: "url",
    width: 180,
    editable: true,
  },
  {
    key: "contactEmail",
    label: "Contact",
    type: "email",
    width: 184,
    editable: true,
  },
  {
    key: "attachments",
    label: "Files",
    type: "attachment",
    width: 168,
    config: {
      attachment: { source: "app_file", label_field: "fileName", url_field: "url" },
      max_visible: 2,
    },
  },
  {
    key: "customer",
    label: "Customer",
    type: "relation",
    width: 180,
    config: { relation_label_field: "label" },
  },
] satisfies DataColumn<Opportunity>[];

export const opportunityDetailFields = opportunityColumns satisfies DataField[];

export function opportunityValues(opportunity: Opportunity): Record<string, DataValue> {
  return {
    title: opportunity.title,
    stage: opportunity.stage,
    priority: opportunity.priority,
    ownerIds: opportunity.ownerIds,
    region: opportunity.region,
    amount: opportunity.amount,
    confidence: opportunity.confidence,
    closeDate: opportunity.closeDate,
    enterprise: opportunity.enterprise,
    sourceUrl: opportunity.sourceUrl,
    contactEmail: opportunity.contactEmail,
    attachments: opportunity.attachments,
    customer: opportunity.customer,
  };
}

export function opportunityRowsScope(
  scope: OpportunityDrilldownScope | null,
): DrilldownScope<Opportunity> | null {
  if (!scope) return null;
  return {
    id: scope.id,
    label: scope.label,
    description: scope.description,
    rows: scope.opportunities,
  };
}
