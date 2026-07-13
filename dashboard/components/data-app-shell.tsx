"use client";

import type { ReactNode } from "react";

export interface DataAppShellProps {
  children: ReactNode;
}

export function DataAppShell({ children }: DataAppShellProps) {
  return (
    <main className="h-screen overflow-hidden bg-background">
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    </main>
  );
}
