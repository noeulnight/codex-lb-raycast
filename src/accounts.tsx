import { Action, ActionPanel, Color, Detail, Icon, LaunchProps, List } from "@raycast/api";
import { Account, formatDate, formatNumber, formatTimeLeft, useAccounts } from "./lib";

type Context = { accountId?: string };

export default function Command(props: LaunchProps<{ launchContext?: Context }>) {
  const { accounts, error, isLoading, revalidate } = useAccounts();
  const selectedAccount = accounts.find((account) => account.accountId === props.launchContext?.accountId);

  if (props.launchContext?.accountId) {
    if (selectedAccount) return <AccountDetail account={selectedAccount} onRefresh={revalidate} />;
    return <Detail isLoading={isLoading} markdown={error ? `# Could not load account\n\n${error.message}` : ""} />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search accounts">
      {error ? (
        <List.EmptyView title="Could not load accounts" description={error.message} icon={Icon.ExclamationMark} />
      ) : (
        accounts.map((account) => {
          const quota = mainQuota(account);
          return (
            <List.Item
              key={account.accountId}
              id={account.accountId}
              title={account.displayName}
              subtitle={account.email}
              icon={{ source: Icon.Circle, tintColor: account.status === "active" ? Color.Green : Color.Orange }}
              accessories={quota ? [{ text: quota.label }, { tag: `${Math.round(quota.remaining)}%` }] : []}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Account Details"
                    icon={Icon.Sidebar}
                    target={<AccountDetail account={account} onRefresh={revalidate} />}
                  />
                  <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
                  <Action.CopyToClipboard title="Copy Account ID" content={account.accountId} />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

function AccountDetail({ account, onRefresh }: { account: Account; onRefresh: () => void }) {
  const request = account.requestUsage;
  const quotas = [
    ["Session", account.usage?.primaryRemainingPercent, account.resetAtPrimary],
    ["Weekly", account.usage?.secondaryRemainingPercent, account.resetAtSecondary],
    ["Monthly", account.usage?.monthlyRemainingPercent, account.resetAtMonthly],
    ...(account.additionalQuotas ?? []).map((quota) => {
      const window = quota.primaryWindow ?? quota.secondaryWindow;
      return [
        quota.displayLabel || quota.limitName,
        window ? 100 - window.usedPercent : null,
        window?.resetAt,
      ] as const;
    }),
  ].filter((quota): quota is readonly [string, number, string | number | null | undefined] => quota[1] != null);

  const markdown = quotas
    .map(
      ([label, remaining, resetAt]) => `## ${label}

**${Math.round(remaining)}% remaining**

Resets in ${formatTimeLeft(resetAt)}  
${formatDate(resetAt)}`,
    )
    .join("\n\n---\n\n");

  return (
    <Detail
      navigationTitle={account.displayName}
      markdown={`# ${account.displayName}\n\n${markdown || "No quota data"}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Account">
            <Detail.Metadata.TagList.Item text={account.planType} color={Color.Purple} />
            <Detail.Metadata.TagList.Item
              text={account.status}
              color={account.status === "active" ? Color.Green : Color.Orange}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Email" text={account.email} icon={Icon.Envelope} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Requests" text={formatNumber(request?.requestCount)} />
          <Detail.Metadata.Label title="Tokens" text={formatNumber(request?.totalTokens)} />
          <Detail.Metadata.Label title="Cached Tokens" text={formatNumber(request?.cachedInputTokens)} />
          <Detail.Metadata.Label title="Cost" text={request ? `$${request.totalCostUsd.toFixed(2)}` : "—"} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Reset Credits" text={formatNumber(account.availableResetCredits)} />
          <Detail.Metadata.Label title="Last Refreshed" text={formatDate(account.lastRefreshAt)} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />
          <Action.CopyToClipboard title="Copy Account ID" content={account.accountId} />
        </ActionPanel>
      }
    />
  );
}

function mainQuota(account: Account): { label: string; remaining: number } | null {
  const quotas = [
    ["Session", account.usage?.primaryRemainingPercent],
    ["Weekly", account.usage?.secondaryRemainingPercent],
    ["Monthly", account.usage?.monthlyRemainingPercent],
  ] as const;
  const quota = quotas.find(([, remaining]) => remaining != null);
  return quota?.[1] == null ? null : { label: quota[0], remaining: quota[1] };
}
