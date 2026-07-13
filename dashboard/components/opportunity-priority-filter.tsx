"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { opportunityPriorityOptions } from "@/lib/opportunities/metadata";
import type { OpportunityPriority } from "@/lib/opportunities/types";

export type OpportunityPriorityFilterValue = "all" | OpportunityPriority;

export function OpportunityPriorityFilter({
  value,
  onValueChange,
}: {
  value: OpportunityPriorityFilterValue;
  onValueChange: (value: OpportunityPriorityFilterValue) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(nextValue) => {
        if (!nextValue) return;
        onValueChange(nextValue as OpportunityPriorityFilterValue);
      }}
      aria-label="Filter opportunities by priority"
    >
      <ToggleGroupItem value="all" aria-label="Show all priorities">
        All
      </ToggleGroupItem>
      {opportunityPriorityOptions.map((priority) => (
        <ToggleGroupItem
          key={priority.value}
          value={priority.value}
          aria-label={`Show ${priority.label} opportunities`}
        >
          {priority.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
