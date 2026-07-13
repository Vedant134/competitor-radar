export interface KylonWorkspaceContext {
  productUrl: string;
  appId: string;
  channelId: string;
}

export type KylonLinkTarget = "_self" | "_blank";

export interface KylonPreviewFile {
  id?: string | null;
  source?: "app_file" | "workspace_file" | string | null;
  workspaceId?: string | null;
  workspaceFileId?: string | null;
  name?: string | null;
  contentType?: string | null;
  previewUrl?: string | null;
  directUrl?: string | null;
  downloadUrl?: string | null;
}

declare global {
  interface Window {
    KylonBridge?: {
      navigate?: (href: string, target?: KylonLinkTarget) => boolean;
      previewFile?: (file: KylonPreviewFile, onFallback?: () => void) => boolean;
      /**
       * Register a handler invoked when the Kylon shell asks the embedded App
       * to refresh its data (e.g. after an agent updates App data from the
       * App's thread). Returns an unsubscribe function.
       */
      onRefresh?: (handler: () => void) => () => void;
    };
  }
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getKylonWorkspaceContext(appId: string): KylonWorkspaceContext {
  const channelId =
    process.env.NEXT_PUBLIC_KYLON_CHANNEL_ID ?? process.env.KYLON_CHANNEL_ID ?? "demo";

  return {
    productUrl: trimTrailingSlash(
      process.env.NEXT_PUBLIC_KYLON_PRODUCT_APP_URL ?? "https://app.kylon.io",
    ),
    appId: process.env.NEXT_PUBLIC_KYLON_APP_ID ?? process.env.KYLON_APP_ID ?? appId,
    channelId,
  };
}

export function appRecordThreadHref(
  context: KylonWorkspaceContext,
  entityId: string,
  recordId: string,
) {
  const targetId = [context.appId, entityId, recordId].join("/");
  return `${context.productUrl}/channel/${context.channelId}/thread/app_record/${encodeURIComponent(targetId)}`;
}

export function openKylonUrl(href: string, target: KylonLinkTarget = "_self") {
  if (typeof window === "undefined") return false;
  return window.KylonBridge?.navigate?.(href, target) ?? false;
}

export function previewKylonFile(file: KylonPreviewFile, onFallback?: () => void) {
  if (typeof window === "undefined") return false;
  return window.KylonBridge?.previewFile?.(file, onFallback) ?? false;
}
