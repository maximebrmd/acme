import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

import { AdAccountBusy } from "./ad-account-busy.ts";
import { AdAccountNotFound } from "./ad-account-not-found.ts";
import { AdAccountSpendCapExceeded } from "./ad-account-spend-cap-exceeded.ts";
import { AdAccountUnusable } from "./ad-account-unusable.ts";
import { AdConnectionNotFound } from "./ad-connection-not-found.ts";
import { AdNetworkUnavailable } from "./ad-network-unavailable.ts";
import { AdSignInFailed } from "./ad-sign-in-failed.ts";
import { AdSpendingNotEnabled } from "./ad-spending-not-enabled.ts";
import { AdSpendingUnavailable } from "./ad-spending-unavailable.ts";
import { AdsUnavailable } from "./ads-unavailable.ts";
import { CalendarDaySchema } from "./analytics.ts";
import { Authentication } from "./authentication.ts";
import { BoostInvalid } from "./boost-invalid.ts";
import { BoostKeyReused } from "./boost-key-reused.ts";
import { BoostNotFound } from "./boost-not-found.ts";
import { BoostStateConflict } from "./boost-state-conflict.ts";
import { CeilingCurrencyMismatch } from "./ceiling-currency-mismatch.ts";
import { Forbidden } from "./forbidden.ts";
import { Int64Schema } from "./int64.ts";
import { InvalidDateRange } from "./invalid-date-range.ts";
import { PostNotPromotable } from "./post-not-promotable.ts";
import { SpendCeilingExceeded } from "./spend-ceiling-exceeded.ts";
import { UsageAllowanceReached } from "./usage-allowance-reached.ts";
import { WorkspaceAccess } from "./workspace-access.ts";

// The server's ads context (src/ads/domain) is the source of the
// vocabularies and limits below; a test keeps the two equal.

/** The ad networks Peal reaches. */
export const AdNetworkSchema = Schema.Literal("meta").annotate({
  description:
    "An ad network: `meta` is Meta's, for ads on Facebook and Instagram. Others may join it.",
  identifier: "AdNetwork",
});

export type AdNetwork = typeof AdNetworkSchema.Type;

/** What a server offers of ads, as its operator set it. */
export const AdsModeSchema = Schema.Literals(["off", "read", "spend"]).annotate(
  {
    description:
      "What the server offers of ads: `off` nothing, `read` connecting ad accounts and reading their campaigns and numbers, `spend` boosting too.",
    identifier: "AdsMode",
  }
);

/** The youngest and oldest ages a boost may name; 65 is "65 and over". */
export const minBoostAge = 18;
export const maxBoostAge = 65;

/** The most countries one boost targets. */
export const maxBoostCountries = 25;

/** The longest run of a boost, in days, and how far ahead it may start. */
export const maxBoostRunDays = 90;
export const maxBoostStartAheadDays = 30;

/** The longest text naming who benefits from an ad, or who pays for it. */
export const maxBoostPartyLength = 512;

/** The largest amount Peal keeps, in minor units. */
export const maxAdAmount = 1_000_000_000_000;

/** The most ad accounts one request connects. */
export const maxAdAccountsPerRequest = 25;

/** How many days of an ad's numbers are kept: 13 months. */
export const adInsightRetentionDays = 396;

/**
 * The share over a daily budget an ad network may spend on one day, which
 * Peal counts when it says what a daily budget commits: Meta spends up to
 * 175% of a daily budget in a day.
 */
export const dailyOverspendPercent = 75;

/**
 * The most a daily budget costs in a calendar week, Sunday to Saturday, in
 * days of it: Meta spends at most 7 times a daily budget in a week.
 */
export const weeklySpendLimitDays = 7;

const CurrencySchema = Schema.String.check(
  Schema.isPattern(/^[A-Z]{3}$/u)
).annotate({
  description: "An ISO 4217 currency code, in capitals: `EUR`, `USD`.",
});

const AmountSchema = Int64Schema.check(
  Schema.isBetween({ maximum: maxAdAmount, minimum: 0 })
).annotate({
  description:
    "An amount in the currency's minor units, as the ad network counts them: cents for EUR and USD, yen for JPY. Divide by 10 to the power of the account's `minorUnitDigits` to show it.",
});

/** Money: an amount in minor units, and its currency. */
export const AdMoneySchema = Schema.Struct({
  amount: AmountSchema,
  currency: CurrencySchema,
}).annotate({ identifier: "AdMoney" });

export type AdMoney = typeof AdMoneySchema.Type;

export const AdAccountStatusSchema = Schema.Literals([
  "active",
  "inGracePeriod",
  "unsettled",
  "pendingReview",
  "disabled",
  "closed",
  "unknown",
]).annotate({
  description:
    "Where an ad account stands at its network: `active` can run ads; `inGracePeriod` still runs, with a payment to settle; `unsettled` has a failed payment; `pendingReview` is being checked; `disabled` was turned off by the network; `closed`; `unknown` is a status Peal does not know yet. Only `active` takes a new boost.",
  identifier: "AdAccountStatus",
});

export const AdAccessSchema = Schema.Literals([
  "working",
  "reconnectNeeded",
]).annotate({
  description:
    "Whether Peal's reads of the ad network work: `reconnectNeeded` once the network refused the sign-in's token, until its person signs in again.",
  identifier: "AdAccess",
});

/** A sign-in to an ad network. */
export const AdConnectionSchema = Schema.Struct({
  access: AdAccessSchema,
  createdAt: Schema.DateTimeUtc,
  // When the network said the sign-in ends; null when it gave no end.
  expiresAt: Schema.NullOr(Schema.DateTimeUtc),
  // The member who signed in; null once their account is closed.
  grantedBy: Schema.NullOr(Schema.String),
  id: Schema.String,
  // Whether its person allowed what making and running ads takes, on a
  // server that offers spending.
  maySpend: Schema.Boolean,
  network: AdNetworkSchema,
}).annotate({ identifier: "AdConnection" });

export type AdConnection = typeof AdConnectionSchema.Type;

/** Why Peal cannot connect an ad account a sign-in reaches. */
export const AdAccountUnsupportedSchema = Schema.Literal(
  "timeZoneUnknown"
).annotate({
  description:
    "Why Peal cannot connect an ad account: `timeZoneUnknown`, the network gave a time zone Peal does not know. Others may join it.",
  identifier: "AdAccountUnsupported",
});

/** An ad account a sign-in reaches, before it is connected. */
export const ReachableAdAccountSchema = Schema.Struct({
  // Whether the workspace already connects it.
  connected: Schema.Boolean,
  currency: CurrencySchema,
  // The account's id at its network, which `connectAccounts` takes.
  externalId: Schema.String,
  name: Schema.String,
  // The account's own cap at its network; null without one.
  spendCap: Schema.NullOr(AmountSchema),
  status: AdAccountStatusSchema,
  // Null when the network gave a zone Peal does not know.
  timeZone: Schema.NullOr(Schema.String),
  // Why Peal cannot connect it; null when it can.
  unsupported: Schema.NullOr(AdAccountUnsupportedSchema),
}).annotate({ identifier: "ReachableAdAccount" });

export type ReachableAdAccount = typeof ReachableAdAccountSchema.Type;

/** An ad account connected to the workspace. */
export const AdAccountSchema = Schema.Struct({
  access: AdAccessSchema,
  // What the account spent against its own cap, as last read.
  amountSpent: Schema.NullOr(AmountSchema),
  connectedAt: Schema.DateTimeUtc,
  connectionId: Schema.String,
  currency: CurrencySchema,
  externalId: Schema.String,
  id: Schema.String,
  // How many decimal digits separate the currency's unit from the minor
  // unit amounts are in: 2 for most, 0 for currencies without one.
  minorUnitDigits: Schema.Literals([0, 2]),
  // The most its boosts made through Peal may commit in a calendar month
  // of its time zone; null while spending is off.
  monthlyCeiling: Schema.NullOr(AmountSchema),
  name: Schema.String,
  network: AdNetworkSchema,
  // On a server that bills, where the billing account used the managed
  // ads its month allows: until when new ads of the account are not
  // tracked (their numbers are not read; ads already counted, and those
  // of boosts made through Peal, keep updating), the first of next month
  // UTC; null while they are. Given where the workspace's accounts are
  // listed or connected; older servers leave it out.
  newAdsUntrackedUntil: Schema.optionalKey(Schema.NullOr(Schema.DateTimeUtc)),
  // The account's own cap at its network; null without one.
  spendCap: Schema.NullOr(AmountSchema),
  // Whether an owner allowed it to spend through Peal.
  spendingEnabled: Schema.Boolean,
  status: AdAccountStatusSchema,
  // When its campaigns and numbers were last read whole.
  syncedAt: Schema.NullOr(Schema.DateTimeUtc),
  timeZone: Schema.String,
}).annotate({ identifier: "AdAccount" });

export type AdAccount = typeof AdAccountSchema.Type;

/** An ad account's spending as it stands. */
export const AdSpendingSchema = Schema.Struct({
  account: AdAccountSchema,
  // What the boosts made through Peal commit in the current calendar month
  // of the account's zone: above the ceiling when it was lowered under
  // running boosts.
  committedThisMonth: AmountSchema,
}).annotate({ identifier: "AdSpending" });

export type AdSpending = typeof AdSpendingSchema.Type;

/** What an owner decides of an ad account's spending. */
export const AdSpendingDecisionSchema = Schema.Struct({
  enabled: Schema.Boolean,
  // Required to turn spending on, in the account's currency.
  monthlyCeiling: Schema.optionalKey(AdMoneySchema),
}).annotate({ identifier: "AdSpendingDecision" });

export const AdObjectStatusSchema = Schema.Literals([
  "active",
  "paused",
  "inReview",
  "rejected",
  "withIssues",
  "archived",
  "deleted",
  "unknown",
]).annotate({
  description:
    "Whether a campaign or an ad runs, in Peal's words, whatever its network calls it (`rawStatus` keeps the network's): `active`; `paused`, itself or by what holds it; `inReview`; `rejected` by the network; `withIssues`, until something is fixed; `archived` or `deleted`, kept for their numbers; `unknown`.",
  identifier: "AdObjectStatus",
});

export const CampaignObjectiveSchema = Schema.Literals([
  "awareness",
  "traffic",
  "engagement",
  "leads",
  "appPromotion",
  "sales",
  "other",
]).annotate({ identifier: "CampaignObjective" });

/** What some ads did over some days. */
export const PaidTotalsSchema = Schema.Struct({
  clicks: Int64Schema,
  impressions: Int64Schema,
  // The sum of each day's reach: someone seen on several days counts each.
  reach: Int64Schema,
  // Reactions, comments and shares the network counts on the post; null
  // when it reported none, which is not zero.
  results: Schema.NullOr(Int64Schema),
  // In the account's minor units.
  spend: AmountSchema,
}).annotate({ identifier: "PaidTotals" });

export type PaidTotals = typeof PaidTotalsSchema.Type;

export const AdCampaignSchema = Schema.Struct({
  dailyBudget: Schema.NullOr(AmountSchema),
  endsAt: Schema.NullOr(Schema.DateTimeUtc),
  externalId: Schema.String,
  name: Schema.String,
  objective: CampaignObjectiveSchema,
  rawStatus: Schema.String,
  startsAt: Schema.NullOr(Schema.DateTimeUtc),
  status: AdObjectStatusSchema,
  syncedAt: Schema.DateTimeUtc,
  totalBudget: Schema.NullOr(AmountSchema),
  totals: PaidTotalsSchema,
}).annotate({ identifier: "AdCampaign" });

export const AdSchema = Schema.Struct({
  adSetExternalId: Schema.String,
  campaignExternalId: Schema.String,
  externalId: Schema.String,
  name: Schema.String,
  // The workspace's own post the ad promotes, when it is one.
  postId: Schema.NullOr(Schema.String),
  rawStatus: Schema.String,
  status: AdObjectStatusSchema,
  totals: PaidTotalsSchema,
}).annotate({ identifier: "Ad" });

const reportOf = <A, I>(rows: Schema.Codec<A, I>) => ({
  account: AdAccountSchema,
  // The days covered, on the account's calendar, both included.
  from: CalendarDaySchema,
  rows: Schema.Array(rows),
  to: CalendarDaySchema,
});

export const AdCampaignReportSchema = Schema.Struct(
  reportOf(AdCampaignSchema)
).annotate({ identifier: "AdCampaignReport" });

export const AdReportSchema = Schema.Struct(reportOf(AdSchema)).annotate({
  identifier: "AdReport",
});

export const AdInsightDaySchema = Schema.Struct({
  day: CalendarDaySchema,
  totals: PaidTotalsSchema,
}).annotate({ identifier: "AdInsightDay" });

export const AdInsightReportSchema = Schema.Struct(
  reportOf(AdInsightDaySchema)
).annotate({ identifier: "AdInsightReport" });

/** A boost's budget: for its whole run, or for each day of it. */
export const BoostBudgetSchema = Schema.Struct({
  amount: AmountSchema.check(Schema.isGreaterThan(0)),
  kind: Schema.Literals(["total", "daily"]),
}).annotate({
  description:
    "A boost's budget in the ad account's minor units: `total` for its whole run, or `daily` for each day of it.",
  identifier: "BoostBudget",
});

/** Who a boost is shown to. */
export const BoostAudienceSchema = Schema.Struct({
  ageMax: Schema.Int.check(
    Schema.isBetween({ maximum: maxBoostAge, minimum: minBoostAge })
  ),
  ageMin: Schema.Int.check(
    Schema.isBetween({ maximum: maxBoostAge, minimum: minBoostAge })
  ),
  countries: Schema.Array(
    Schema.String.check(Schema.isPattern(/^[A-Z]{2}$/u))
  ).check(Schema.isBetweenLength(1, maxBoostCountries), Schema.isUnique()),
}).annotate({
  description: `Who a boost is shown to: people in some countries (ISO 3166-1 alpha-2 codes in capitals, ${maxBoostCountries} at most), between two ages (${minBoostAge} to ${maxBoostAge}, ${maxBoostAge} meaning "${maxBoostAge} and over"). Nothing finer.`,
  identifier: "BoostAudience",
});

export const SpecialAdCategorySchema = Schema.Literals([
  "none",
  "housing",
  "employment",
  "financialProductsServices",
  "issuesElectionsPolitics",
]).annotate({
  description:
    "What the advertiser declares the ad is about. Peal boosts `none` only: an ad about housing, employment, financial products and services, or social issues, elections or politics is refused, as each restricts targeting in ways Peal does not handle.",
  identifier: "SpecialAdCategory",
});

const party = Schema.String.check(
  Schema.isBetweenLength(1, maxBoostPartyLength)
);

/** What a boost is asked to be. */
export const NewBoostSchema = Schema.Struct({
  accountId: Schema.String,
  audience: BoostAudienceSchema,
  // Who benefits from the ad: required when the audience is in the
  // European Union.
  beneficiary: Schema.optionalKey(party),
  budget: BoostBudgetSchema,
  // The channel the post is boosted on, among those it was published on.
  channelId: Schema.String,
  // The budget's currency, which must be the ad account's.
  currency: CurrencySchema,
  // When the run ends: required, a boost never runs without an end.
  endsAt: Schema.DateTimeUtc,
  // Who pays for the ad: required when the audience is in the European
  // Union.
  payer: Schema.optionalKey(party),
  postId: Schema.String,
  specialAdCategory: SpecialAdCategorySchema,
  // When the run starts: now when left out.
  startsAt: Schema.optionalKey(Schema.DateTimeUtc),
}).annotate({ identifier: "NewBoost" });

export type NewBoost = typeof NewBoostSchema.Type;

/** What a boost as asked would cost at most, and the room it has. */
export const BoostQuoteSchema = Schema.Struct({
  // What the account's own cap leaves after its boosts; null without one.
  capRoom: Schema.NullOr(AmountSchema),
  ceiling: AmountSchema,
  // The most the boost can cost: what is counted against the ceiling.
  commitment: AmountSchema,
  // What the account's other boosts commit in the fullest calendar month
  // the run touches.
  committed: AmountSchema,
  currency: CurrencySchema,
  // The calendar days of the account's zone the run touches.
  days: Schema.Int,
  endsAt: Schema.DateTimeUtc,
  minorUnitDigits: Schema.Literals([0, 2]),
  startsAt: Schema.DateTimeUtc,
}).annotate({ identifier: "BoostQuote" });

export const BoostStateSchema = Schema.Literals([
  "requested",
  "active",
  "paused",
  "ended",
  "stopped",
  "failed",
  "unconfirmed",
]).annotate({
  description:
    "Where a boost stands: `requested`, accepted and being made, paused, spending nothing; `active`, running; `paused` by a member; `ended`, its end date passed; `stopped` by a member, for good; `failed`, it could not be made and nothing ran; `unconfirmed`, Peal told the network to run it and could not read back whether it does: it may be spending, its budget stays counted, and stopping it settles it.",
  identifier: "BoostState",
});

export type BoostState = typeof BoostStateSchema.Type;

export const BoostFailureReasonSchema = Schema.Literals([
  "accountUnusable",
  "accountSpendCap",
  "ceilingExceeded",
  "spendingOff",
  "currencyMismatch",
  "budgetTooLow",
  "postNotPromotable",
  "permissionMissing",
  "reconnectNeeded",
  "networkUnavailable",
  "refused",
  "spendingUnavailable",
]).annotate({
  description:
    "Why a boost failed, with nothing spent: `accountUnusable`, the ad account cannot run ads now; `accountSpendCap`, its own cap leaves too little room; `ceilingExceeded` or `spendingOff`, the ceiling was lowered or spending turned off meanwhile; `currencyMismatch`; `budgetTooLow`, under the network's minimum; `postNotPromotable`, the post was deleted or cannot be shown as an ad; `permissionMissing`, the sign-in lacks a permission; `reconnectNeeded`, the network refused the sign-in; `networkUnavailable`, the network kept refusing for now; `refused`, for a reason of the network's own (`networkCode`); `spendingUnavailable`, the server no longer offers spending.",
  identifier: "BoostFailureReason",
});

export type BoostFailureReason = typeof BoostFailureReasonSchema.Type;

/** A boost: one published post promoted on one ad account. */
export const BoostSchema = Schema.Struct({
  accountId: Schema.String,
  audience: BoostAudienceSchema,
  beneficiary: Schema.NullOr(Schema.String),
  budget: BoostBudgetSchema,
  channelId: Schema.String,
  // The most it can cost, in minor units, counted against the ceiling.
  committed: AmountSchema,
  createdAt: Schema.DateTimeUtc,
  currency: CurrencySchema,
  endsAt: Schema.DateTimeUtc,
  // Why it failed; null unless `state` is `failed`.
  failureReason: Schema.NullOr(BoostFailureReasonSchema),
  id: Schema.String,
  // The network's own code for a refusal; null otherwise.
  networkCode: Schema.NullOr(Schema.String),
  // What the boost is for: more people reacting to the post. Others may
  // join it.
  objective: Schema.Literal("engagement"),
  payer: Schema.NullOr(Schema.String),
  platform: Schema.Literals(["facebook", "instagram"]),
  postId: Schema.String,
  startsAt: Schema.DateTimeUtc,
  state: BoostStateSchema,
  // Since when it stands there.
  stateAt: Schema.DateTimeUtc,
  updatedAt: Schema.DateTimeUtc,
}).annotate({ identifier: "Boost" });

export type Boost = typeof BoostSchema.Type;

/** How a request Peal sent the network for a boost ended. */
export const BoostStepOutcomeSchema = Schema.Literals([
  "done",
  "refused",
  "found",
  "absent",
  "unknown",
]).annotate({
  description:
    "How a request to the ad network ended: `done`, confirmed; `refused`, the network answered that nothing changed; `found` or `absent`, its answer was lost and looking the object up found it done, or not; `unknown`, the look-up could not tell.",
  identifier: "BoostStepOutcome",
});

/** A request Peal sent the network for a boost, from its journal. */
export const BoostStepSchema = Schema.Struct({
  finishedAt: Schema.NullOr(Schema.DateTimeUtc),
  networkCode: Schema.NullOr(Schema.String),
  // `done`, `refused`, `found` or `absent` when a lost answer was looked
  // up, `unknown` when the lookup could not tell; null while in flight.
  outcome: Schema.NullOr(BoostStepOutcomeSchema),
  startedAt: Schema.DateTimeUtc,
  step: Schema.Literals([
    "createCampaign",
    "createAdSet",
    "createAd",
    "activateAd",
    "activateAdSet",
    "activateCampaign",
    "pause",
    "resume",
  ]),
}).annotate({ identifier: "BoostStep" });

export const BoostDetailSchema = Schema.Struct({
  boost: BoostSchema,
  steps: Schema.Array(BoostStepSchema),
}).annotate({ identifier: "BoostDetail" });

export const BoostPageSchema = Schema.Struct({
  boosts: Schema.Array(BoostSchema),
  nextCursor: Schema.NullOr(Schema.String),
}).annotate({ identifier: "BoostPage" });

/** A post's organic counts on one channel, as analytics last read them. */
export const OrganicCountsSchema = Schema.Struct({
  channelId: Schema.String,
  // Null where the platform tells none, which is not zero.
  impressions: Schema.NullOr(Schema.Int),
  likes: Schema.NullOr(Schema.Int),
  // Null before the first read, or where the platform's counts are not
  // read: the counts are then null too.
  readAt: Schema.NullOr(Schema.DateTimeUtc),
  replies: Schema.NullOr(Schema.Int),
  reposts: Schema.NullOr(Schema.Int),
}).annotate({ identifier: "OrganicCounts" });

/** A published post's organic and paid numbers, side by side. */
export const PostAdPerformanceSchema = Schema.Struct({
  boosts: Schema.Array(BoostSchema),
  organic: Schema.Array(OrganicCountsSchema),
  // One entry per ad account, as amounts of different currencies never add.
  paid: Schema.Array(
    Schema.Struct({
      account: AdAccountSchema,
      ads: Schema.Int,
      totals: PaidTotalsSchema,
    })
  ),
}).annotate({ identifier: "PostAdPerformance" });

export const AdAuditActionSchema = Schema.Literals([
  "accountConnected",
  "accountDisconnected",
  "spendingEnabled",
  "spendingDisabled",
  "ceilingChanged",
  "boostRequested",
  "boostStarted",
  "boostUnconfirmed",
  "boostFailed",
  "boostPaused",
  "boostResumed",
  "boostStopped",
  "boostEnded",
]).annotate({ identifier: "AdAuditAction" });

/** A line of the ads audit trail. */
export const AdAuditEntrySchema = Schema.Struct({
  accountId: Schema.NullOr(Schema.String),
  action: AdAuditActionSchema,
  // Amounts in minor units, by name: `ceiling`, `previousCeiling`,
  // `budget`, `committed`.
  amounts: Schema.Record(Schema.String, Int64Schema),
  at: Schema.DateTimeUtc,
  boostId: Schema.NullOr(Schema.String),
  // Who did it: a member, or an API key; null for what Peal's own jobs
  // found (a start confirmed, an end, a failure), and once the member's
  // account is closed.
  by: Schema.NullOr(
    Schema.Struct({
      id: Schema.String,
      kind: Schema.Literals(["user", "apiKey"]),
      // The application that acted for the member, when one did.
      viaClient: Schema.NullOr(Schema.String),
    })
  ),
  currency: Schema.NullOr(Schema.String),
  id: Schema.String,
}).annotate({ identifier: "AdAuditEntry" });

export const AdAuditPageSchema = Schema.Struct({
  entries: Schema.Array(AdAuditEntrySchema),
  nextCursor: Schema.NullOr(Schema.String),
}).annotate({ identifier: "AdAuditPage" });

const workspace = { workspaceId: Schema.String };
const account = { ...workspace, accountId: Schema.String };
const connection = { ...workspace, connectionId: Schema.String };
const boost = { ...workspace, boostId: Schema.String };

const days = {
  from: Schema.optionalKey(CalendarDaySchema),
  to: Schema.optionalKey(CalendarDaySchema),
};

const rangeNote =
  "over the days `from` to `to` of the account's calendar, both included and at most 366 days: the last 30 when left out";

const controlErrors = [
  Forbidden,
  BoostNotFound,
  BoostStateConflict,
  AdAccountUnusable,
  AdNetworkUnavailable,
] as const;

/**
 * Ads: connecting ad accounts, reading their campaigns and numbers, and
 * boosting a published post. Off unless the server's operator turned ads
 * on. Everything that spends is the owners' and admins' (ads:spend),
 * within a monthly ceiling an owner set, and is never done by staff acting
 * as a member; an OAuth client needs the scopes workspace:publish and
 * workspace:ads for it.
 */
export class AdsApi extends HttpApiGroup.make("ads")
  .add(
    HttpApiEndpoint.get("status", "/", {
      error: Forbidden,
      params: workspace,
      success: Schema.Struct({
        mode: AdsModeSchema,
        networks: Schema.Array(AdNetworkSchema),
      }).annotate({ identifier: "AdsStatus" }),
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Says what this server offers of ads (`off`, `read` or `spend`) and on which networks. Needs ads:read.",
        summary: "Get what the server offers of ads",
      })
    ),
    HttpApiEndpoint.get("listConnections", "/connections", {
      error: Forbidden,
      params: workspace,
      success: Schema.Array(AdConnectionSchema),
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Lists the workspace's sign-ins to ad networks, oldest first: who signed in, whether the network still takes the sign-in, and whether it may run ads. Never a token. Needs ads:read.",
        summary: "List ad network sign-ins",
      })
    ),
    HttpApiEndpoint.post("connect", "/connections/:network", {
      error: [Forbidden, AdsUnavailable],
      params: { ...workspace, network: AdNetworkSchema },
      success: Schema.Struct({ authorizationUrl: Schema.String }).annotate({
        identifier: "AdSignIn",
      }),
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Starts a sign-in to an ad network and answers the page to send the member's browser to. The sign-in asks for reading only on a server that offers no spending. Only a person does this, signed in to Peal in their own session, who manages ad accounts (ads:manage): never an API key, an application or staff acting as them.",
        summary: "Start an ad network sign-in",
      })
    ),
    HttpApiEndpoint.post("completeConnect", "/connections/:network/callback", {
      error: [Forbidden, AdsUnavailable, AdSignInFailed, AdNetworkUnavailable],
      params: { ...workspace, network: AdNetworkSchema },
      payload: Schema.Struct({
        code: Schema.optionalKey(Schema.String),
        error: Schema.optionalKey(Schema.String),
        state: Schema.String,
      }).annotate({ identifier: "AdSignInCallback" }),
      success: Schema.Struct({
        accounts: Schema.Array(ReachableAdAccountSchema),
        connection: AdConnectionSchema,
      }).annotate({ identifier: "AdSignInResult" }),
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Completes a sign-in with what the network's page sent back, and answers the ad accounts it reaches. Nothing is connected yet: `connectAccounts` connects those chosen. A sign-in is completed once, within 15 minutes, by who started it. Needs ads:manage, in person.",
        summary: "Complete an ad network sign-in",
      })
    ),
    HttpApiEndpoint.get(
      "reachableAccounts",
      "/connections/:connectionId/accounts",
      {
        error: [
          Forbidden,
          AdsUnavailable,
          AdConnectionNotFound,
          AdNetworkUnavailable,
        ],
        params: connection,
        success: Schema.Array(ReachableAdAccountSchema),
      }
    ).annotateMerge(
      OpenApi.annotations({
        description:
          "Lists the ad accounts a sign-in reaches now, as the network gives them: currency, time zone, status and spend cap, and whether the workspace already connects each. Only who signed in reads it (ads:manage, in person).",
        summary: "List the ad accounts a sign-in reaches",
      })
    ),
    HttpApiEndpoint.post(
      "connectAccounts",
      "/connections/:connectionId/accounts",
      {
        error: [
          Forbidden,
          AdsUnavailable,
          AdConnectionNotFound,
          AdAccountNotFound,
          AdNetworkUnavailable,
        ],
        params: connection,
        payload: Schema.Struct({
          externalIds: Schema.Array(Schema.String).check(
            Schema.isBetweenLength(1, maxAdAccountsPerRequest)
          ),
        }).annotate({ identifier: "AdAccountsToConnect" }),
        success: Schema.Array(AdAccountSchema),
      }
    ).annotateMerge(
      OpenApi.annotations({
        description: `Connects some of the ad accounts a sign-in reaches, ${maxAdAccountsPerRequest} at most, by the ids the network gives them. The network is asked again which accounts the sign-in reaches: one it does not reach is \`AdAccountNotFound\`, and nothing is connected. An account connected before stays as it is. Spending is off on every new account until an owner turns it on. Only who signed in does this (ads:manage, in person).`,
        summary: "Connect ad accounts",
      })
    ),
    HttpApiEndpoint.delete("disconnect", "/connections/:connectionId", {
      error: [Forbidden, AdConnectionNotFound, AdAccountBusy],
      params: connection,
      success: HttpApiSchema.NoContent,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Removes a sign-in, its token, the ad accounts it connects and what was read of them; their boosts' records stay with the workspace, and what they committed still counts once the same account is connected again. Refused while one of their boosts runs, may run, is paused or is being made (`AdAccountBusy`): stop them first. What runs at the network that Peal did not make is left as it is. Needs ads:manage.",
        summary: "Remove an ad network sign-in",
      })
    ),
    HttpApiEndpoint.get("listAccounts", "/accounts", {
      error: Forbidden,
      params: workspace,
      success: Schema.Array(AdAccountSchema),
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Lists the workspace's connected ad accounts, oldest first, with whether each may spend through Peal and its monthly ceiling. Needs ads:read.",
        summary: "List ad accounts",
      })
    ),
    HttpApiEndpoint.get("getAccount", "/accounts/:accountId", {
      error: [Forbidden, AdAccountNotFound],
      params: account,
      success: AdSpendingSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Shows an ad account with what its boosts made through Peal commit in the current calendar month of its time zone. Needs ads:read.",
        summary: "Get an ad account and its spending",
      })
    ),
    HttpApiEndpoint.delete("removeAccount", "/accounts/:accountId", {
      error: [Forbidden, AdAccountNotFound, AdAccountBusy],
      params: account,
      success: HttpApiSchema.NoContent,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Disconnects an ad account: what was read of it goes with it, and its boosts' records stay with the workspace, so what they committed still counts against the ceiling once the same account is connected again. Refused while one of its boosts runs, may run, is paused or is being made (`AdAccountBusy`), as a paused campaign may run again. Needs ads:manage.",
        summary: "Disconnect an ad account",
      })
    ),
    HttpApiEndpoint.put("setSpending", "/accounts/:accountId/spending", {
      error: [
        Forbidden,
        AdAccountNotFound,
        AdSpendingUnavailable,
        CeilingCurrencyMismatch,
        AdAccountBusy,
      ],
      params: account,
      payload: AdSpendingDecisionSchema,
      success: AdSpendingSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Decides whether an ad account may spend through Peal, and how much: `enabled` with a `monthlyCeiling` in the account's currency, the most its boosts may commit in one calendar month of its time zone. A ceiling may always be lowered, under running boosts too: they run on, and nothing new starts or resumes until there is room. Turning spending off is refused while a boost runs or may run (`AdAccountBusy`). Only an owner does this, signed in to Peal in their own session (ads:authorize): never an admin, an API key, an application or staff acting as an owner. Peal never turns spending on or raises a ceiling on its own.",
        summary: "Allow an ad account to spend, with a monthly ceiling",
      })
    ),
    HttpApiEndpoint.get("listCampaigns", "/accounts/:accountId/campaigns", {
      error: [Forbidden, AdAccountNotFound, InvalidDateRange],
      params: account,
      query: days,
      success: AdCampaignReportSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Lists an ad account's campaigns as last read from its network (every hour), those made outside Peal included, with what their ads did ${rangeNote}. A thousand at most. Needs ads:read.`,
        summary: "List an ad account's campaigns",
      })
    ),
    HttpApiEndpoint.get("listAds", "/accounts/:accountId/ads", {
      error: [Forbidden, AdAccountNotFound, InvalidDateRange],
      params: account,
      query: { ...days, campaignId: Schema.optionalKey(Schema.String) },
      success: AdReportSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Lists an ad account's ads as last read, those of one campaign with \`campaignId\` (the network's id), each with the workspace's own post it promotes when it is one, and what it did ${rangeNote}. A thousand at most. Needs ads:read.`,
        summary: "List an ad account's ads",
      })
    ),
    HttpApiEndpoint.get("listInsights", "/accounts/:accountId/insights", {
      error: [Forbidden, AdAccountNotFound, InvalidDateRange],
      params: account,
      query: days,
      success: AdInsightReportSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Sums what an ad account's ads did each day: spend, impressions, reach, clicks and results, ${rangeNote}. A day is kept ${adInsightRetentionDays} days. Needs ads:read.`,
        summary: "Get an ad account's daily numbers",
      })
    ),
    HttpApiEndpoint.get("postPerformance", "/posts/:postId", {
      error: Forbidden,
      params: { ...workspace, postId: Schema.String },
      success: PostAdPerformanceSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Shows a published post's organic counts on each channel beside what the ads that promote it did, by ad account, and its boosts. Paid numbers are part of what a platform counts on the post: the two are shown side by side, never summed. The organic side is empty for someone who may not read analytics. Needs ads:read.",
        summary: "Get a post's organic and paid numbers",
      })
    ),
    HttpApiEndpoint.post("quoteBoost", "/boosts/quote", {
      error: [
        Forbidden,
        AdSpendingUnavailable,
        AdAccountNotFound,
        AdAccountUnusable,
        AdSpendingNotEnabled,
        PostNotPromotable,
        BoostInvalid,
        SpendCeilingExceeded,
        AdAccountSpendCapExceeded,
      ],
      params: workspace,
      payload: NewBoostSchema,
      success: BoostQuoteSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Checks a boost as \`createBoost\` would, and says what it would commit and the room it has, without reserving or sending anything: show it before the last step. A total budget commits its amount; a daily budget commits, for each calendar week of the account's zone (Sunday to Saturday) the run touches, its amount and ${dailyOverspendPercent}% more for each day of the run in that week, which the network may spend on any day, and never more than ${weeklySpendLimitDays} times its amount, the most the network spends in a week. Needs ads:spend.`,
        summary: "Check a boost and what it would commit",
      })
    ),
    HttpApiEndpoint.post("createBoost", "/boosts", {
      error: [
        Forbidden,
        AdSpendingUnavailable,
        AdAccountNotFound,
        AdAccountUnusable,
        AdSpendingNotEnabled,
        PostNotPromotable,
        BoostInvalid,
        SpendCeilingExceeded,
        AdAccountSpendCapExceeded,
        BoostKeyReused,
        UsageAllowanceReached,
      ],
      headers: {
        "idempotency-key": Schema.String.check(Schema.isBetweenLength(1, 255)),
      },
      params: workspace,
      payload: NewBoostSchema,
      success: BoostSchema.pipe(HttpApiSchema.status(202)),
    }).annotateMerge(
      OpenApi.annotations({
        description: `**Spends money.** Boosts a post the workspace published on a Facebook Page, or on an Instagram account connected through its Page, as an ad on Meta: it spends up to the budget, from the ad account's payment method, until \`endsAt\`. The \`Idempotency-Key\` header is required: the same key with the same request answers the boost it made, and never makes another. The boost is accepted as \`requested\`, its budget counted against the ceiling, and made in the background, paused, then run; read it to see how that ended. It is refused, with nothing reserved or sent, when the server offers no spending, no owner allowed the account to spend, the account or its sign-in cannot run ads, the post cannot be boosted, the boost breaks Peal's rules (an end date within ${maxBoostRunDays} days is required), or the monthly ceiling or the account's own spend cap has no room. On a server that bills, it is refused the same way while the billing account, without a payment method, used the managed ads its month includes (UsageAllowanceReached \`paymentMethodRequired\`); running boosts are never touched. Needs ads:spend; never staff acting as a member.`,
        summary: "Boost a published post",
      })
    ),
    HttpApiEndpoint.get("listBoosts", "/boosts", {
      error: Forbidden,
      params: workspace,
      query: {
        cursor: Schema.optionalKey(Schema.String),
        postId: Schema.optionalKey(Schema.String),
      },
      success: BoostPageSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Lists the workspace's boosts, newest first, 50 a page, those of one post with `postId`. Pass the page's `nextCursor` as `cursor` for the next one. Needs ads:read.",
        summary: "List boosts",
      })
    ),
    HttpApiEndpoint.get("getBoost", "/boosts/:boostId", {
      error: [Forbidden, BoostNotFound],
      params: boost,
      success: BoostDetailSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Shows a boost and the journal of the requests Peal sent the network for it, each with how it ended. Needs ads:read.",
        summary: "Get a boost",
      })
    ),
    HttpApiEndpoint.post("pauseBoost", "/boosts/:boostId/pause", {
      error: controlErrors,
      params: boost,
      success: BoostSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Pauses a boost that runs or may run: its campaign is told to pause, and the boost is `paused` once the network confirms. Asked twice, it is done once. Its budget stays counted against the ceiling. Needs ads:spend or ads:manage.",
        summary: "Pause a boost",
      })
    ),
    HttpApiEndpoint.post("resumeBoost", "/boosts/:boostId/resume", {
      error: [
        ...controlErrors,
        AdSpendingUnavailable,
        AdSpendingNotEnabled,
        SpendCeilingExceeded,
        AdAccountSpendCapExceeded,
      ],
      params: boost,
      success: BoostSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "**Spends money.** Runs a paused boost again, until its end. Resuming spends, so it is checked as a new boost is: spending still allowed, the account usable, and the ceiling, as it now is, not passed by what the account's boosts commit. Needs ads:spend.",
        summary: "Resume a paused boost",
      })
    ),
    HttpApiEndpoint.post("stopBoost", "/boosts/:boostId/stop", {
      error: controlErrors,
      params: boost,
      success: BoostSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Stops a boost for good: its campaign is told to pause, and the boost is `stopped` once the network confirms; one not yet made is never made. Asked twice, it is done once. A stopped boost does not run again. What it committed is counted down to what it can have cost: nothing if it never ran, the days it ran for a daily budget, its whole budget for a total one. Needs ads:spend or ads:manage.",
        summary: "Stop a boost",
      })
    ),
    HttpApiEndpoint.get("auditTrail", "/audit", {
      error: Forbidden,
      params: workspace,
      query: { cursor: Schema.optionalKey(Schema.String) },
      success: AdAuditPageSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Lists the ads audit trail, newest first, 100 a page: every decision about spending and every change to a boost, with who made it and the amounts. Kept 13 months. Answers to owners alone (ads:authorize).",
        summary: "List the ads audit trail",
      })
    )
  )
  .middleware(WorkspaceAccess)
  .middleware(Authentication)
  .prefix("/api/workspaces/:workspaceId/ads") {}
