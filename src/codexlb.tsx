import { Color, Icon, LaunchType, MenuBarExtra, launchCommand } from "@raycast/api";
import { Account, formatTimeLeft, useAccounts } from "./lib";

export default function Command() {
  const { accounts, error, isLoading, revalidate } = useAccounts();
  const poolRemaining = pooledRemainingPercent(accounts);

  const openDetails = (accountId?: string) => {
    void launchCommand({ name: "accounts", type: LaunchType.UserInitiated, context: { accountId } });
  };

  return (
    <MenuBarExtra
      icon={Icon.Gauge}
      title={poolRemaining == null ? "Codex" : `${Math.round(poolRemaining)}%`}
      tooltip={error ? `CodexLB: ${error.message}` : "CodexLB account usage"}
      isLoading={isLoading}
    >
      {error ? (
        <MenuBarExtra.Item title="Could not load accounts" subtitle={error.message} onAction={revalidate} />
      ) : (
        accounts.map((account) => (
          <AccountSection key={account.accountId} account={account} onOpen={() => openDetails(account.accountId)} />
        ))
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="View Details" icon={Icon.Sidebar} onAction={() => openDetails()} />
        <MenuBarExtra.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function AccountSection({ account, onOpen }: { account: Account; onOpen: () => void }) {
  const windows = [
    ["Session", account.usage?.primaryRemainingPercent, account.resetAtPrimary],
    ["Weekly", account.usage?.secondaryRemainingPercent, account.resetAtSecondary],
    ["Monthly", account.usage?.monthlyRemainingPercent, account.resetAtMonthly],
  ] as const;
  const request = account.requestUsage;

  return (
    <MenuBarExtra.Section title={`${account.displayName}  ${account.planType} · ${account.status}`}>
      {windows.flatMap(([label, remaining, resetAt]) =>
        remaining == null
          ? []
          : [
              <MenuBarExtra.Item
                key={label}
                title={`${label}  ${Math.round(remaining)}% left`}
                subtitle={`Resets in ${formatTimeLeft(resetAt)}`}
                icon={quotaIcon(remaining)}
                onAction={onOpen}
              />,
            ],
      )}
      {(account.additionalQuotas ?? []).flatMap((quota) => {
        const window = quota.primaryWindow ?? quota.secondaryWindow;
        if (!window) return [];
        const remaining = 100 - window.usedPercent;
        return [
          <MenuBarExtra.Item
            key={quota.limitName}
            title={`${quota.displayLabel || quota.limitName}  ${Math.round(remaining)}% left`}
            subtitle={`Resets in ${formatTimeLeft(window.resetAt)}`}
            icon={quotaIcon(remaining)}
            onAction={onOpen}
          />,
        ];
      })}
      {request && (
        <MenuBarExtra.Item
          title="Usage"
          subtitle={`$${request.totalCostUsd.toFixed(2)} · ${compactNumber(request.totalTokens)} tokens`}
          icon={Icon.BarChart}
          onAction={onOpen}
        />
      )}
    </MenuBarExtra.Section>
  );
}

function pooledRemainingPercent(accounts: Account[]): number | null {
  const windows = [
    ["capacityCreditsPrimary", "remainingCreditsPrimary"],
    ["capacityCreditsSecondary", "remainingCreditsSecondary"],
    ["capacityCreditsMonthly", "remainingCreditsMonthly"],
  ] as const;
  const pooled = windows.flatMap(([capacityKey, remainingKey]) => {
    const known = accounts.filter((account) => account[capacityKey] != null && account[remainingKey] != null);
    const capacity = known.reduce((sum, account) => sum + (account[capacityKey] ?? 0), 0);
    const remaining = known.reduce((sum, account) => sum + (account[remainingKey] ?? 0), 0);
    return capacity > 0 ? [(remaining / capacity) * 100] : [];
  });
  return pooled.length ? Math.min(...pooled) : null;
}

function quotaIcon(percent: number) {
  return {
    source: percent > 50 ? Icon.CircleProgress75 : percent > 20 ? Icon.CircleProgress50 : Icon.CircleProgress25,
    tintColor: percent > 50 ? Color.Green : percent > 20 ? Color.Orange : Color.Red,
  };
}

function compactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
