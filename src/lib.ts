import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";

const apiHost = getPreferenceValues<{ apiHost?: string }>().apiHost?.trim() || "http://10.43.144.227:2455";
export const ACCOUNTS_URL = `${apiHost.replace(/\/+$/, "")}/api/accounts`;

type Usage = {
  primaryRemainingPercent: number | null;
  secondaryRemainingPercent: number | null;
  monthlyRemainingPercent?: number | null;
};

type RequestUsage = {
  requestCount: number;
  totalTokens: number;
  cachedInputTokens: number;
  totalCostUsd: number;
};

export type Account = {
  accountId: string;
  email: string;
  displayName: string;
  planType: string;
  status: string;
  usage?: Usage | null;
  resetAtPrimary?: string | null;
  resetAtSecondary?: string | null;
  resetAtMonthly?: string | null;
  lastRefreshAt?: string | null;
  requestUsage?: RequestUsage | null;
  capacityCreditsPrimary?: number | null;
  remainingCreditsPrimary?: number | null;
  capacityCreditsSecondary?: number | null;
  remainingCreditsSecondary?: number | null;
  capacityCreditsMonthly?: number | null;
  remainingCreditsMonthly?: number | null;
  availableResetCredits?: number | null;
  additionalQuotas?: Array<{
    displayLabel?: string | null;
    limitName: string;
    primaryWindow?: { usedPercent: number; resetAt?: number | null } | null;
    secondaryWindow?: { usedPercent: number; resetAt?: number | null } | null;
  }>;
};

type AccountsResponse = { accounts: Account[] };

export function useAccounts() {
  const result = useFetch<AccountsResponse>(ACCOUNTS_URL, {
    parseResponse: async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== "object" || !Array.isArray((payload as AccountsResponse).accounts)) {
        throw new Error("Invalid accounts response");
      }
      return payload as AccountsResponse;
    },
    keepPreviousData: true,
  });

  return { ...result, accounts: result.data?.accounts ?? [] };
}

export function formatDate(value: string | number | null | undefined): string {
  if (value == null) return "—";
  const date = new Date(typeof value === "number" ? value * 1000 : value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function formatNumber(value: number | null | undefined): string {
  return value == null ? "—" : new Intl.NumberFormat("ko-KR").format(value);
}

export function formatTimeLeft(value: string | number | null | undefined): string {
  if (value == null) return "—";
  const resetAt = new Date(typeof value === "number" ? value * 1000 : value).getTime();
  if (Number.isNaN(resetAt)) return "—";
  const minutes = Math.max(0, Math.floor((resetAt - Date.now()) / 60_000));
  if (minutes === 0) return "due now";
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `${days}d${hours > 0 ? ` ${hours}h` : ""} left`;
  if (hours > 0) return `${hours}h${minutes % 60 > 0 ? ` ${minutes % 60}m` : ""} left`;
  return `${minutes}m left`;
}
