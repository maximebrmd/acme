import type { DateTime } from "effect";
import { Option } from "effect";
import type {
  NewBoost,
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
import type {
  AskedRange,
  PostPerformance,
  Report,
} from "#ads/application/ad-reports.ts";
import type { BoostAsk, BoostQuote } from "#ads/application/boosts.ts";
import type { AuthorizedAccount } from "#ads/application/ports/account-store.ts";
import type {
  AuditEntry,
  SpendCall,
} from "#ads/application/ports/boost-store.ts";
import type { OrganicOnChannel } from "#ads/application/ports/organic-counts.ts";
import type {
  AdRow,
  CampaignRow,
  DayTotals,
  PaidTotals,
} from "#ads/application/ports/read-model.ts";
import type {
  SpendDecision,
  SpendStanding,
} from "#ads/application/spend-authorizations.ts";
import { Audience } from "#ads/domain/audience.ts";
import type { Boost } from "#ads/domain/boost.ts";
import { CurrencySchema, minorUnitDigits, Money } from "#ads/domain/money.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
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

/** The days a query asks a report for. */
export const askedRange = (query: {
  readonly from?: string;
  readonly to?: string;
}): AskedRange => ({
  from: Option.fromUndefinedOr(query.from).pipe(Option.map(dayOf)),
  to: Option.fromUndefinedOr(query.to).pipe(Option.map(dayOf)),
});

export const reportView = <A, B>(report: Report<A>, row: (item: A) => B) => ({
  account: toAccountView(report.account),
  from: dayView(report.range.from),
  rows: report.rows.map(row),
  to: dayView(report.range.to),
});

export const toCampaignView = (campaign: CampaignRow) => ({
  dailyBudget: Option.getOrNull(campaign.dailyBudget),
  endsAt: Option.getOrNull(campaign.endsAt),
  externalId: campaign.externalId,
  name: campaign.name,
  objective: campaign.objective,
  rawStatus: campaign.rawStatus,
  startsAt: Option.getOrNull(campaign.startsAt),
  status: campaign.status,
  syncedAt: campaign.syncedAt,
  totalBudget: Option.getOrNull(campaign.totalBudget),
  totals: toTotalsView(campaign.totals),
});

export const toAdRowView = (ad: AdRow) => ({
  adSetExternalId: ad.adSetExternalId,
  campaignExternalId: ad.campaignExternalId,
  externalId: ad.externalId,
  name: ad.name,
  postId: Option.getOrNull(ad.postId),
  rawStatus: ad.rawStatus,
  status: ad.status,
  totals: toTotalsView(ad.totals),
});

export const toDayView = ({ day, ...totals }: DayTotals) => ({
  day: dayView(day),
  totals: toTotalsView(totals),
});

export const toPerformanceView = (performance: PostPerformance) => ({
  boosts: performance.boosts.map(toBoostView),
  organic: performance.organic.map(toOrganicView),
  paid: performance.paid.map(({ account, ads, totals }) => ({
    account: toAccountView(account),
    ads,
    totals: toTotalsView(totals),
  })),
});

export const toQuoteView = ({ account, plan, room }: BoostQuote) => ({
  capRoom: Option.getOrNull(room.capRoom),
  ceiling: room.ceiling,
  commitment: plan.committed,
  committed: room.committed,
  currency: account.account.currency,
  days: plan.days,
  endsAt: plan.endsAt,
  minorUnitDigits: minorUnitDigits(
    account.account.network,
    account.account.currency
  ),
  startsAt: plan.startsAt,
});

export const toBoostDetailView = ({
  boost,
  calls,
}: {
  readonly boost: Boost;
  readonly calls: readonly SpendCall[];
}) => ({ boost: toBoostView(boost), steps: calls.map(toStepView) });

/** What the API takes for a boost, as the use case reads it. */
export const askOf = (payload: NewBoost): BoostAsk => ({
  accountId: payload.accountId,
  audience: new Audience(payload.audience),
  beneficiary: Option.fromUndefinedOr(payload.beneficiary),
  budget: { _tag: payload.budget.kind, amount: payload.budget.amount },
  // An id that names no channel finds no post published on it.
  channelId: ChannelIdSchema.make(payload.channelId, { disableChecks: true }),
  currency: CurrencySchema.make(payload.currency),
  endsAt: payload.endsAt,
  payer: Option.fromUndefinedOr(payload.payer),
  postId: payload.postId,
  specialAdCategory: payload.specialAdCategory,
  startsAt: Option.fromUndefinedOr(payload.startsAt),
});

/** What an owner decided, as the use case reads it. */
export const spendDecisionOf = (payload: {
  readonly enabled: boolean;
  readonly monthlyCeiling?: {
    readonly amount: number;
    readonly currency: string;
  };
}): SpendDecision =>
  payload.enabled && payload.monthlyCeiling !== undefined
    ? {
        _tag: "on",
        monthlyCeiling: new Money({
          amount: payload.monthlyCeiling.amount,
          currency: CurrencySchema.make(payload.monthlyCeiling.currency),
        }),
      }
    : { _tag: "off" };
