import type { BbPluginApi } from "@get-bb/plugin-sdk";
import type { ProviderUsage, UsageWindow } from "../contract";
import {
  usageLimitsKey,
  vendorDisplayName,
  type NativeLimitVendor,
} from "./providerFamily";

const USAGE_LIMITS_TIMEOUT_MS = 3_000;

type LimitStatus = {
  status: string;
  planLabel?: string | null;
  message?: string;
  windows?: Array<{
    label: string;
    usedPercent: number;
    resetsAt: string | null;
    cost?: { usedUsdCents: number; limitUsdCents: number };
  }>;
};

export async function nativeUsage(args: {
  bb: BbPluginApi;
  hostId: string | undefined;
  providerId: string;
  family: NativeLimitVendor;
}): Promise<ProviderUsage> {
  const limits = await args.bb.sdk.system.usageLimits({
    hostId: args.hostId,
    signal: AbortSignal.timeout(USAGE_LIMITS_TIMEOUT_MS),
  });
  const key = usageLimitsKey(args.family);
  const row = limits[key] as LimitStatus | undefined;
  const name = vendorDisplayName(args.family);
  if (!row) {
    return {
      id: args.providerId,
      name,
      status: "error",
      planLabel: null,
      message: "Usage limits unavailable.",
      windows: [],
    };
  }

  const status = mapStatus(row.status);
  const windows: UsageWindow[] = (row.windows ?? []).map((window) => ({
    label: window.label,
    usedPercent: window.usedPercent,
    resetsAt: window.resetsAt,
    cost: window.cost,
  }));

  return {
    id: args.providerId,
    name,
    status,
    planLabel: row.planLabel ?? null,
    message:
      status === "ok" ? null : (row.message ?? messageFor(status, name)),
    windows,
  };
}

function mapStatus(status: string): ProviderUsage["status"] {
  if (
    status === "ok" ||
    status === "not_installed" ||
    status === "unauthenticated" ||
    status === "expired" ||
    status === "error"
  ) {
    return status;
  }
  return "error";
}

function messageFor(
  status: ProviderUsage["status"],
  name: string,
): string | null {
  if (status === "unauthenticated" || status === "expired") {
    return `Sign in to ${name} to see usage.`;
  }
  if (status === "not_installed") return `${name} is not installed.`;
  return null;
}
