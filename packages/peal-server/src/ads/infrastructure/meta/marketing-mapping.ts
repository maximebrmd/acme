import { DateTime, Option, Schema } from "effect";

import { AdAccountFacts } from "#ads/domain/ad-account-facts.ts";
import type { AdAccountStatus } from "#ads/domain/ad-account-status.ts";
import type {
  AdObjectStatus,
  CampaignObjective,
} from "#ads/domain/ad-object.ts";
import { NetworkObjectIdSchema } from "#ads/domain/ids.ts";
import { InsightDay } from "#ads/domain/insight-day.ts";
import {
  CurrencySchema,
  maxAmount,
  minorUnitDigits,
  minorUnitsOf,
} from "#ads/domain/money.ts";
import type { Currency } from "#ads/domain/money.ts";
import { SyncedAdSet } from "#ads/domain/synced-ad-set.ts";
import { SyncedAd } from "#ads/domain/synced-ad.ts";
import { SyncedCampaign } from "#ads/domain/synced-campaign.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import { LocalDateSchema } from "#shared/domain/wall-clock.ts";

import type {
  AccountSchema,
  AdSchema,
  AdSetSchema,
  CampaignSchema,
  InsightSchema,
} from "./marketing-schemas.ts";

// "Ad Account" reference, `account_status`: 1 ACTIVE, 2 DISABLED,
// 3 UNSETTLED, 7 PENDING_RISK_REVIEW, 8 PENDING_SETTLEMENT,
// 9 IN_GRACE_PERIOD, 100 PENDING_CLOSURE, 101 CLOSED.
const accountStatuses: ReadonlyMap<number, AdAccountStatus> = new Map([
  [1, "active"],
  [2, "disabled"],
  [3, "unsettled"],
  [7, "pendingReview"],
  [8, "unsettled"],
  [9, "inGracePeriod"],
  [100, "closed"],
  [101, "closed"],
]);

// `effective_status` of campaigns, ad sets and ads.
const objectStatuses: ReadonlyMap<string, AdObjectStatus> = new Map([
  ["ACTIVE", "active"],
  ["PAUSED", "paused"],
  ["CAMPAIGN_PAUSED", "paused"],
  ["ADSET_PAUSED", "paused"],
  ["PENDING_REVIEW", "inReview"],
  ["PREAPPROVED", "inReview"],
  ["IN_PROCESS", "inReview"],
  ["DISAPPROVED", "rejected"],
  ["WITH_ISSUES", "withIssues"],
  ["PENDING_BILLING_INFO", "withIssues"],
  ["ARCHIVED", "archived"],
  ["DELETED", "deleted"],
]);

// The six objectives of today, and the older names still read.
const objectives: ReadonlyMap<string, CampaignObjective> = new Map([
  ["OUTCOME_AWARENESS", "awareness"],
  ["OUTCOME_TRAFFIC", "traffic"],
  ["OUTCOME_ENGAGEMENT", "engagement"],
  ["OUTCOME_LEADS", "leads"],
  ["OUTCOME_APP_PROMOTION", "appPromotion"],
  ["OUTCOME_SALES", "sales"],
  ["REACH", "awareness"],
  ["BRAND_AWARENESS", "awareness"],
  ["LINK_CLICKS", "traffic"],
  ["POST_ENGAGEMENT", "engagement"],
  ["PAGE_LIKES", "engagement"],
  ["LEAD_GENERATION", "leads"],
  ["APP_INSTALLS", "appPromotion"],
  ["CONVERSIONS", "sales"],
]);

const wholeNumber = /^\d{1,15}$/u;

// A budget or a cap, which the API writes in the currency's minor units
// ("the ad account currency's minimum denomination", "basic unit of the
// currency"): a whole number. One written with a decimal point is read as
// whole units of the currency, which is the larger of the two readings.
const minorUnits = (
  written: string | undefined,
  currency: Currency
): Option.Option<number> => {
  if (written === undefined) {
    return Option.none();
  }

  const amount = wholeNumber.test(written)
    ? Number(written)
    : minorUnitsOf(written, minorUnitDigits("meta", currency));

  return amount === undefined || amount > maxAmount
    ? Option.none()
    : Option.some(amount);
};

const positive = (amount: Option.Option<number>) =>
  amount.pipe(Option.filter((value) => value > 0));

const decodeZone = Schema.decodeUnknownOption(TimeZoneIdSchema);
const decodeCurrency = Schema.decodeUnknownOption(CurrencySchema);
const decodeId = Schema.decodeUnknownOption(NetworkObjectIdSchema);
const decodeDay = Schema.decodeUnknownOption(LocalDateSchema);

/**
 * An ad account as the domain has it; none when its id or its currency is
 * not one Peal can keep, and the account is then left out.
 */
export const factsOf = (
  account: typeof AccountSchema.Type
): Option.Option<AdAccountFacts> =>
  Option.gen(function* mappingAccount() {
    const currency = yield* decodeCurrency(account.currency);
    const externalId = yield* decodeId(account.account_id);

    return new AdAccountFacts({
      amountSpent: minorUnits(account.amount_spent, currency),
      currency,
      externalId,
      name: (account.name ?? "").slice(0, 512),
      // "A value of 0 means no spending-cap."
      spendCap: positive(minorUnits(account.spend_cap, currency)),
      status: accountStatuses.get(account.account_status ?? -1) ?? "unknown",
      timeZone: Option.fromUndefinedOr(account.timezone_name).pipe(
        Option.flatMap(decodeZone)
      ),
    });
  });

const instant = (written: string | undefined) =>
  Option.fromUndefinedOr(written).pipe(Option.flatMap(DateTime.make));

const stateOf = (object: {
  readonly effective_status?: string;
  readonly name?: string;
  readonly status?: string;
}) => {
  const raw = object.effective_status ?? object.status ?? "";

  return {
    name: (object.name ?? "").slice(0, 1024),
    rawStatus: raw.slice(0, 64),
    status: objectStatuses.get(raw) ?? ("unknown" as const),
  };
};

export const campaignOf = (
  campaign: typeof CampaignSchema.Type,
  currency: Currency
): Option.Option<SyncedCampaign> =>
  decodeId(campaign.id).pipe(
    Option.map(
      (externalId) =>
        new SyncedCampaign({
          ...stateOf(campaign),
          dailyBudget: positive(minorUnits(campaign.daily_budget, currency)),
          endsAt: instant(campaign.stop_time),
          externalId,
          objective: objectives.get(campaign.objective ?? "") ?? "other",
          startsAt: instant(campaign.start_time),
          totalBudget: positive(minorUnits(campaign.lifetime_budget, currency)),
        })
    )
  );

export const adSetOf = (
  adSet: typeof AdSetSchema.Type,
  currency: Currency
): Option.Option<SyncedAdSet> =>
  Option.gen(function* mappingAdSet() {
    return new SyncedAdSet({
      ...stateOf(adSet),
      campaignExternalId: yield* decodeId(adSet.campaign_id),
      dailyBudget: positive(minorUnits(adSet.daily_budget, currency)),
      endsAt: instant(adSet.end_time),
      externalId: yield* decodeId(adSet.id),
      startsAt: instant(adSet.start_time),
      totalBudget: positive(minorUnits(adSet.lifetime_budget, currency)),
    });
  });

const nonEmpty = (written: string | undefined) =>
  Option.fromUndefinedOr(written).pipe(Option.filter((value) => value !== ""));

export const adOf = (ad: typeof AdSchema.Type): Option.Option<SyncedAd> =>
  Option.gen(function* mappingAd() {
    return new SyncedAd({
      ...stateOf(ad),
      adSetExternalId: yield* decodeId(ad.adset_id),
      campaignExternalId: yield* decodeId(ad.campaign_id),
      externalId: yield* decodeId(ad.id),
      promotedInstagramMediaId: nonEmpty(
        ad.creative?.effective_instagram_media_id
      ),
      promotedPagePostId: nonEmpty(ad.creative?.effective_object_story_id),
    });
  });

const maxCount = 2_147_483_647;

const count = (written: string | undefined): Option.Option<number> =>
  Option.fromUndefinedOr(written).pipe(
    Option.filter((value) => wholeNumber.test(value)),
    Option.map(Number),
    Option.filter((value) => value <= maxCount)
  );

const dayPattern = /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})$/u;

const dayOf = (written: string) =>
  Option.fromNullishOr(dayPattern.exec(written)?.groups).pipe(
    Option.flatMap((groups) =>
      decodeDay({
        day: Number(groups["day"]),
        month: Number(groups["month"]),
        year: Number(groups["year"]),
      })
    )
  );

// What boosting a post is for: the reactions, comments and shares the
// network counts on it.
const resultAction = "post_engagement";

/**
 * A day of an ad's numbers; none when a value cannot be kept as it is
 * written, and the row is then left out rather than guessed.
 */
export const insightOf = (
  row: typeof InsightSchema.Type,
  currency: Currency
): Option.Option<InsightDay> =>
  Option.gen(function* mappingDay() {
    // "spend" is in the currency's units, with decimals: read digit by
    // digit, rounded up.
    const spend = yield* Option.fromUndefinedOr(
      minorUnitsOf(row.spend ?? "0", minorUnitDigits("meta", currency))
    );

    return new InsightDay({
      adExternalId: yield* decodeId(row.ad_id),
      clicks: yield* count(row.clicks ?? "0"),
      day: yield* dayOf(row.date_start),
      impressions: yield* count(row.impressions ?? "0"),
      reach: yield* count(row.reach ?? "0"),
      results: Option.fromUndefinedOr(
        row.actions?.find(({ action_type: type }) => type === resultAction)
      ).pipe(Option.flatMap(({ value }) => count(value))),
      spend,
    });
  });
