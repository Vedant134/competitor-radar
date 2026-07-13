import type { Metadata } from "next";
import Script from "next/script";
import type { ReactNode } from "react";
import { DataAppShell } from "@/components/data-app-shell";
import { KylonAutoRefresh } from "@/components/kylon-auto-refresh";
import { KylonWorkspaceProvider } from "@/components/providers/kylon-workspace-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { VisualViewportVars } from "@/components/visual-viewport-vars";
import { appDefinition } from "@/lib/app-definition/definition";
import { getKylonWorkspaceContext } from "@/lib/kylon/bridge";
import "./globals.css";

export const metadata: Metadata = {
  title: "Data App Template",
  description: "Operational Kylon data app template for CMS, CRM, and TiDB-backed record workflows.",
};

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const kylonProductUrl = trimTrailingSlash(
    process.env.NEXT_PUBLIC_KYLON_PRODUCT_APP_URL ?? "https://app.kylon.io",
  );
  const kylonBridgeUrl =
    process.env.NEXT_PUBLIC_KYLON_BRIDGE_URL ?? `${kylonProductUrl}/custom-app/v1/bridge.js`;
  const kylonAppId = process.env.NEXT_PUBLIC_KYLON_APP_ID ?? process.env.KYLON_APP_ID;

  return (
    <html lang="en">
      <body>
        <VisualViewportVars />
        <QueryProvider>
          <KylonWorkspaceProvider value={getKylonWorkspaceContext(appDefinition.app.id)}>
            <TooltipProvider>
              <DataAppShell>{children}</DataAppShell>
            </TooltipProvider>
          </KylonWorkspaceProvider>
          <KylonAutoRefresh />
        </QueryProvider>
        <Script
          src={kylonBridgeUrl}
          strategy="afterInteractive"
          data-kylon-origin={kylonProductUrl}
          data-kylon-app-id={kylonAppId}
        />
      </body>
    </html>
  );
}
