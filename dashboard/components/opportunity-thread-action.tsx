"use client";

import { ListTree } from "lucide-react";
import { useKylonWorkspaceContext } from "@/components/providers/kylon-workspace-provider";
import { Button } from "@/components/ui/button";
import { openKylonUrl } from "@/lib/kylon/bridge";
import { opportunityThreadHref } from "@/lib/opportunities/client";
import type { Opportunity } from "@/lib/opportunities/types";

export function OpportunityThreadAction({ opportunity }: { opportunity: Opportunity }) {
  const kylonWorkspace = useKylonWorkspaceContext();
  if (!kylonWorkspace) return null;
  const href = opportunityThreadHref(kylonWorkspace, opportunity.id);

  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      onClick={() => {
        if (!openKylonUrl(href)) window.location.assign(href);
      }}
    >
      <ListTree className="icon-14" />
      Discuss in thread
    </Button>
  );
}
