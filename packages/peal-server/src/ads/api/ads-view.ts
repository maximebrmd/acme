import type { DateTime } from "effect";
import { Option } from "effect";
import type {
  AdAccount as AdAccountView,
  AdConnection as AdConnectionView,
  AdSpending as AdSpendingView,
  Boost as BoostView,
  PaidTotals as PaidTotalsView,
  ReachableAdAccount as ReachableAdAccountView,
} from "peal-contract";

import type {
  AdConnection,
  OfferedAccount,
} from "#ads/application/ad-connections.ts";
import type { AuthorizedAccount } from "#ads/application/ports/account-store.ts";
import type {
  AuditEntry,
  SpendCall,
} from "#ads/application/ports/boost-store.ts";
import type { OrganicOnChannel } from "#ads/application/ports/organic-counts.ts";
import type { PaidTotals } from "#ads/application/ports/read-model.ts";
import type { SpendStanding } from "#ads/application/spend-authorizations.ts";
import type { Boost } from "#ads/domain/boost.ts";
import { minorUnitDigits } from "#ads/domain/money.ts";
import type { LocalDate } from "#shared/domain/wall-clock.ts";

// The views the ads endpoints and the MCP tools answer: ids, names,
// statuses, counts and amounts. Never a token, nor who saw an ad.

/** A calendar day as the API writes one: `2026-11-10`. */
export const dayView = ({ day, month, year }: LocalDate) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const dayPattern = /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})$/u;

/** The day a `YYYY-MM-DD` names. */
export const dayOf = (written: string): LocalDate => {
  const groups = dayPattern.exec(written)?.groups;

  return {
    day: Number(groups?.["day"]),
    month: Number(groups?.["month"]),
    year: Number(groups?.["year"]),
  };
};

export const toConnectionView = ({
  grant,
  maySpend,
}: AdConnection): AdConnectionView => ({
  access: grant.access,
  createdAt: grant.createdAt,
  expiresAt: Option.getOrNull(grant.expiresAt),
  grantedBy: Option.getOrNull(grant.grantedBy),
  id: grant.id,
  maySpend,
  network: grant.network,
});

export const toReachableView = ({
  connected,
  facts,
  unsupported,
}: OfferedAccount): ReachableAdAccountView => ({
  connected,
  currency: facts.currency,
  externalId: facts.externalId,
  name: facts.name,
  spendCap: Option.getOrNull(facts.spendCap),
  status: facts.status,
  timeZone: Option.getOrNull(facts.timeZone),
  unsupported: Option.getOrNull(unsupported),
});

export const toAccountView = ({
  account,
  authorization,
}: AuthorizedAccount): AdAccountView => ({
  access: account.access,
  amountSpent: Option.getOrNull(account.amountSpent),
  connectedAt: account.connectedAt,
  connectionId: account.grantId,
  currency: account.currency,
  externalId: account.externalId,
  id: account.id,
  minorUnitDigits: minorUnitDigits(account.network, account.currency),
  monthlyCeiling:
    authorization._tag === "on" ? authorization.monthlyCeiling : null,
  name: account.name,
  network: account.network,
  spendCap: Option.getOrNull(account.spendCap),
  spendingEnabled: authorization._tag === "on",
  status: account.status,
  syncedAt: Option.getOrNull(account.syncedAt),
  timeZone: account.timeZone,
});

export const toSpendingView = ({
  account,
  committedThisMonth,
}: SpendStanding): AdSpendingView => ({
  account: toAccountView(account),
  committedThisMonth,
});

export const toTotalsView = (totals: PaidTotals): PaidTotalsView => ({
  clicks: totals.clicks,
  impressions: totals.impressions,
  reach: totals.reach,
  results: Option.getOrNull(totals.results),
  spend: totals.spend,
});

const stateAtOf = (boost: Boost): DateTime.Utc => {
  const { state } = boost;

  if (state._tag === "requested") {
    return boost.createdAt;
  }

  return "at" in state ? state.at : state.since;
};

/**
 * A boost as the API, the MCP tools and the webhooks' receivers read it:
 * what was asked and where it stands. The objects it made at its network
 * are not part of it.
 */
export const toBoostView = (boost: Boost): BoostView => {
  const { state } = boost;
  const failure = state._tag === "failed" ? state : undefined;

  return {
    accountId: boost.adAccountId,
    audience: {
      ageMax: boost.audience.ageMax,
      ageMin: boost.audience.ageMin,
      countries: boost.audience.countries,
    },
    beneficiary: Option.getOrNull(boost.beneficiary),
    budget: { amount: boost.budget.amount, kind: boost.budget._tag },
    channelId: boost.channelId,
    committed: boost.committed,
    createdAt: boost.createdAt,
    currency: boost.currency,
    endsAt: boost.endsAt,
    failureReason: failure?.reason ?? null,
    id: boost.id,
    networkCode:
      failure === undefined ? null : Option.getOrNull(failure.networkCode),
    objective: boost.objective,
    payer: Option.getOrNull(boost.payer),
    platform: boost.platform,
    postId: boost.postId,
    startsAt: boost.startsAt,
    state: state._tag,
    stateAt: stateAtOf(boost),
    updatedAt: boost.updatedAt,
  };
};

export const toStepView = (call: SpendCall) => ({
  finishedAt: Option.getOrNull(call.finishedAt),
  networkCode: Option.getOrNull(call.networkCode),
  outcome: Option.getOrNull(call.outcome),
  startedAt: call.startedAt,
  step: call.step,
});

export const toOrganicView = ({ channelId, counts }: OrganicOnChannel) => {
  const read = Option.getOrUndefined(counts);

  return {
    channelId,
    impressions: read === undefined ? null : Option.getOrNull(read.impressions),
    likes: read?.likes ?? null,
    readAt: read?.readAt ?? null,
    replies: read?.replies ?? null,
    reposts: read?.reposts ?? null,
  };
};

export const toAuditView = (entry: AuditEntry) => ({
  accountId: Option.getOrNull(entry.accountId),
  action: entry.action,
  amounts: entry.amounts,
  at: entry.at,
  boostId: Option.getOrNull(entry.boostId),
  by: entry.by.pipe(
    Option.map((by) =>
      by._tag === "apiKey"
        ? { id: by.apiKeyId, kind: "apiKey" as const, viaClient: null }
        : {
            id: by.userId,
            kind: "user" as const,
            viaClient: by.clientId ?? null,
          }
    ),
    Option.getOrNull
  ),
  currency: Option.getOrNull(entry.currency),
  id: entry.id,
});
