import { Duration, Effect, Option } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import {
  AdAccountBusy,
  AdAccountNotFound,
  AdAccountSpendCapExceeded,
  AdAccountUnusable,
  AdConnectionNotFound,
  AdNetworkUnavailable,
  AdSignInFailed,
  AdSpendingNotEnabled,
  AdSpendingUnavailable,
  AdsUnavailable,
  Api,
  BoostInvalid,
  BoostKeyReused,
  BoostNotFound,
  BoostStateConflict,
  CeilingCurrencyMismatch,
  CurrentMember,
  InvalidDateRange,
  PostNotPromotable,
  SpendCeilingExceeded,
} from "peal-contract";
import type { NewBoost } from "peal-contract";

import { AdConnections } from "#ads/application/ad-connections.ts";
import { AdReports, auditPageSize } from "#ads/application/ad-reports.ts";
import type { AskedRange, Report } from "#ads/application/ad-reports.ts";
import { boostPageSize, Boosts } from "#ads/application/boosts.ts";
import type { BoostAsk } from "#ads/application/boosts.ts";
import { SpendAuthorizations } from "#ads/application/spend-authorizations.ts";
import { Audience } from "#ads/domain/audience.ts";
import { CurrencySchema, minorUnitDigits, Money } from "#ads/domain/money.ts";
import { actorOf } from "#shared/api/actor.ts";
import { forbidden } from "#shared/api/forbidden.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";

import {
  dayOf,
  dayView,
  toAccountView,
  toAuditView,
  toBoostView,
  toConnectionView,
  toOrganicView,
  toReachableView,
  toSpendingView,
  toStepView,
  toTotalsView,
} from "./ads-view.ts";

const adsUnavailable = () => Effect.fail(new AdsUnavailable());
const spendingUnavailable = () => Effect.fail(new AdSpendingUnavailable());
const spendingNotEnabled = () => Effect.fail(new AdSpendingNotEnabled());
const connectionNotFound = () => Effect.fail(new AdConnectionNotFound());
const accountNotFound = () => Effect.fail(new AdAccountNotFound());
const boostNotFound = () => Effect.fail(new BoostNotFound());
const invalidRange = () => Effect.fail(new InvalidDateRange());
const keyReused = () => Effect.fail(new BoostKeyReused());

const signInFailed = ({
  reason,
}: {
  readonly reason: AdSignInFailed["reason"];
}) => Effect.fail(new AdSignInFailed({ reason }));

const accountBusy = ({ boosts }: { readonly boosts: number }) =>
  Effect.fail(new AdAccountBusy({ boosts }));

const accountUnusable = ({
  reason,
}: {
  readonly reason: AdAccountUnusable["reason"];
}) => Effect.fail(new AdAccountUnusable({ reason }));

const notPromotable = ({
  reason,
}: {
  readonly reason: PostNotPromotable["reason"];
}) => Effect.fail(new PostNotPromotable({ reason }));

const stateConflict = ({ state }: { readonly state: string }) =>
  Effect.fail(new BoostStateConflict({ state }));

const boostInvalid = ({
  violations,
}: {
  readonly violations: BoostInvalid["violations"];
}) => Effect.fail(new BoostInvalid({ violations }));

const ceilingMismatch = ({
  accountCurrency,
}: {
  readonly accountCurrency: string;
}) => Effect.fail(new CeilingCurrencyMismatch({ accountCurrency }));

const ceilingExceeded = (refusal: {
  readonly ceiling: number;
  readonly committed: number;
  readonly currency: string;
  readonly requested: number;
}) =>
  Effect.fail(
    new SpendCeilingExceeded({
      ceiling: refusal.ceiling,
      committed: refusal.committed,
      currency: refusal.currency,
      requested: refusal.requested,
    })
  );

const capExceeded = (refusal: {
  readonly currency: string;
  readonly requested: number;
  readonly room: number;
}) =>
  Effect.fail(
    new AdAccountSpendCapExceeded({
      currency: refusal.currency,
      requested: refusal.requested,
      room: refusal.room,
    })
  );

// An outside failure answered 503 is logged as a warning first.
const networkUnavailable = ({
  retryAfter,
}: {
  readonly retryAfter?: Duration.Duration;
}) =>
  Effect.logWarning("An ad network did not answer, or asked to wait").pipe(
    Effect.andThen(
      Effect.fail(
        new AdNetworkUnavailable({
          retryAfterSeconds:
            retryAfter === undefined
              ? null
              : Math.ceil(Duration.toSeconds(retryAfter)),
        })
      )
    )
  );

const askedRange = (query: {
  readonly from?: string;
  readonly to?: string;
}): AskedRange => ({
  from: Option.fromUndefinedOr(query.from).pipe(Option.map(dayOf)),
  to: Option.fromUndefinedOr(query.to).pipe(Option.map(dayOf)),
});

const reportView = <A, B>(report: Report<A>, row: (item: A) => B) => ({
  account: toAccountView(report.account),
  from: dayView(report.range.from),
  rows: report.rows.map(row),
  to: dayView(report.range.to),
});

// What the API takes for a boost, as the use case reads it.
const askOf = (payload: NewBoost): BoostAsk => ({
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

const boostRefusals = {
  AccountSpendCapExceeded: capExceeded,
  AdAccountNotFound: accountNotFound,
  AdAccountUnusable: accountUnusable,
  InvalidBoost: boostInvalid,
  MissingPermission: forbidden,
  PostNotPromotable: notPromotable,
  SpendCeilingExceeded: ceilingExceeded,
  SpendingNotEnabled: spendingNotEnabled,
  SpendingUnavailable: spendingUnavailable,
};

const controlRefusals = {
  AccountSpendCapExceeded: capExceeded,
  AdAccountUnusable: accountUnusable,
  AdNetworkUnavailable: networkUnavailable,
  BoostNotFound: boostNotFound,
  BoostStateConflict: stateConflict,
  MissingPermission: forbidden,
  SpendCeilingExceeded: ceilingExceeded,
  SpendingNotEnabled: spendingNotEnabled,
  SpendingUnavailable: spendingUnavailable,
};

// A failure of the server's own (the database, a bug) is a defect: 500.
export const AdsHandlers = HttpApiBuilder.group(
  Api,
  "ads",
  Effect.fn(function* adsHandlers(handlers) {
    const connections = yield* AdConnections;
    const spending = yield* SpendAuthorizations;
    const reports = yield* AdReports;
    const boosts = yield* Boosts;

    const controlled =
      (action: "pause" | "resume" | "stop") =>
      ({ params }: { readonly params: { readonly boostId: string } }) =>
        CurrentMember.pipe(
          Effect.flatMap((member) =>
            boosts.control(actorOf(member), params.boostId, action)
          ),
          Effect.map(toBoostView),
          Effect.catchTags(controlRefusals),
          Effect.orDie
        );

    return handlers.handleAll({
      auditTrail: ({ query }) =>
        CurrentMember.pipe(
          Effect.flatMap((member) =>
            reports.auditTrail(
              actorOf(member),
              Option.fromUndefinedOr(query.cursor)
            )
          ),
          Effect.map((entries) => ({
            entries: entries.map(toAuditView),
            nextCursor:
              entries.length === auditPageSize
                ? (entries.at(-1)?.id ?? null)
                : null,
          })),
          Effect.catchTags({ MissingPermission: forbidden }),
          Effect.orDie
        ),
      completeConnect: ({ params, payload }) =>
        CurrentMember.pipe(
          Effect.flatMap((member) =>
            connections.complete(actorOf(member), {
              code: Option.fromUndefinedOr(payload.code),
              error: Option.fromUndefinedOr(payload.error),
              network: params.network,
              state: payload.state,
            })
          ),
          Effect.map(({ accounts, connection }) => ({
            accounts: accounts.map(toReachableView),
            connection: toConnectionView(connection),
          })),
          Effect.catchTags({
            AdNetworkUnavailable: networkUnavailable,
            AdSignInFailed: signInFailed,
            AdsUnavailable: adsUnavailable,
            MissingPermission: forbidden,
            PersonRequired: forbidden,
          }),
          Effect.orDie
        ),
      connect: ({ params }) =>
        CurrentMember.pipe(
          Effect.flatMap((member) =>
            connections.begin(actorOf(member), params.network)
          ),
          Effect.map((authorizationUrl) => ({ authorizationUrl })),
          Effect.catchTags({
            AdsUnavailable: adsUnavailable,
            MissingPermission: forbidden,
            PersonRequired: forbidden,
          }),
          Effect.orDie
        ),
      connectAccounts: ({ params, payload }) =>
        CurrentMember.pipe(
          Effect.flatMap((member) =>
            connections.connect(
              actorOf(member),
              params.connectionId,
              payload.externalIds
            )
          ),
          Effect.map((accounts) => accounts.map(toAccountView)),
          Effect.catchTags({
            AdAccountNotFound: accountNotFound,
            AdConnectionNotFound: connectionNotFound,
            AdNetworkUnavailable: networkUnavailable,
            AdsUnavailable: adsUnavailable,
            MissingPermission: forbidden,
            PersonRequired: forbidden,
          }),
          Effect.orDie
        ),
      createBoost: ({ headers, payload }) =>
        CurrentMember.pipe(
          Effect.flatMap((member) =>
            boosts.request(
              actorOf(member),
              askOf(payload),
              headers["idempotency-key"]
            )
          ),
          Effect.map(toBoostView),
          Effect.catchTags({ ...boostRefusals, BoostKeyReused: keyReused }),
          Effect.orDie
        ),
      disconnect: ({ params }) =>
        CurrentMember.pipe(
          Effect.flatMap((member) =>
            connections.disconnect(actorOf(member), params.connectionId)
          ),
          Effect.catchTags({
            AdAccountBusy: accountBusy,
            AdConnectionNotFound: connectionNotFound,
            MissingPermission: forbidden,
          }),
          Effect.orDie
        ),
      getAccount: ({ params }) =>
        CurrentMember.pipe(
          Effect.flatMap((member) =>
            spending.standing(actorOf(member), params.accountId)
          ),
          Effect.map(toSpendingView),
          Effect.catchTags({
            AdAccountNotFound: accountNotFound,
            MissingPermission: forbidden,
          }),
          Effect.orDie
        ),
      getBoost: ({ params }) =>
        CurrentMember.pipe(
          Effect.flatMap((member) =>
            boosts.get(actorOf(member), params.boostId)
          ),
          Effect.map(({ boost, calls }) => ({
            boost: toBoostView(boost),
            steps: calls.map(toStepView),
          })),
          Effect.catchTags({
            BoostNotFound: boostNotFound,
            MissingPermission: forbidden,
          }),
          Effect.orDie
        ),
      listAccounts: () =>
        CurrentMember.pipe(
          Effect.flatMap((member) => connections.accounts(actorOf(member))),
          Effect.map((accounts) => accounts.map(toAccountView)),
          Effect.catchTags({ MissingPermission: forbidden }),
          Effect.orDie
        ),
      listAds: ({ params, query }) =>
        CurrentMember.pipe(
          Effect.flatMap((member) =>
            reports.ads(
              actorOf(member),
              params.accountId,
              Option.fromUndefinedOr(query.campaignId),
              askedRange(query)
            )
          ),
          Effect.map((report) =>
            reportView(report, (ad) => ({
              adSetExternalId: ad.adSetExternalId,
              campaignExternalId: ad.campaignExternalId,
              externalId: ad.externalId,
              name: ad.name,
              postId: Option.getOrNull(ad.postId),
              rawStatus: ad.rawStatus,
              status: ad.status,
              totals: toTotalsView(ad.totals),
            }))
          ),
          Effect.catchTags({
            AdAccountNotFound: accountNotFound,
            InvalidAdRange: invalidRange,
            MissingPermission: forbidden,
          }),
          Effect.orDie
        ),
      listBoosts: ({ query }) =>
        CurrentMember.pipe(
          Effect.flatMap((member) =>
            boosts.list(actorOf(member), {
              before: Option.fromUndefinedOr(query.cursor),
              postId: Option.fromUndefinedOr(query.postId),
            })
          ),
          Effect.map((listed) => ({
            boosts: listed.map(toBoostView),
            nextCursor:
              listed.length === boostPageSize
                ? (listed.at(-1)?.id ?? null)
                : null,
          })),
          Effect.catchTags({ MissingPermission: forbidden }),
          Effect.orDie
        ),
      listCampaigns: ({ params, query }) =>
        CurrentMember.pipe(
          Effect.flatMap((member) =>
            reports.campaigns(
              actorOf(member),
              params.accountId,
              askedRange(query)
            )
          ),
          Effect.map((report) =>
            reportView(report, (campaign) => ({
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
            }))
          ),
          Effect.catchTags({
            AdAccountNotFound: accountNotFound,
            InvalidAdRange: invalidRange,
            MissingPermission: forbidden,
          }),
          Effect.orDie
        ),
      listConnections: () =>
        CurrentMember.pipe(
          Effect.flatMap((member) => connections.list(actorOf(member))),
          Effect.map((listed) => listed.map(toConnectionView)),
          Effect.catchTags({ MissingPermission: forbidden }),
          Effect.orDie
        ),
      listInsights: ({ params, query }) =>
        CurrentMember.pipe(
          Effect.flatMap((member) =>
            reports.days(actorOf(member), params.accountId, askedRange(query))
          ),
          Effect.map((report) =>
            reportView(report, ({ day, ...totals }) => ({
              day: dayView(day),
              totals: toTotalsView(totals),
            }))
          ),
          Effect.catchTags({
            AdAccountNotFound: accountNotFound,
            InvalidAdRange: invalidRange,
            MissingPermission: forbidden,
          }),
          Effect.orDie
        ),
      pauseBoost: controlled("pause"),
      postPerformance: ({ params }) =>
        CurrentMember.pipe(
          Effect.flatMap((member) =>
            reports.ofPost(actorOf(member), params.postId)
          ),
          Effect.map((performance) => ({
            boosts: performance.boosts.map(toBoostView),
            organic: performance.organic.map(toOrganicView),
            paid: performance.paid.map(({ account, ads, totals }) => ({
              account: toAccountView(account),
              ads,
              totals: toTotalsView(totals),
            })),
          })),
          Effect.catchTags({ MissingPermission: forbidden }),
          Effect.orDie
        ),
      quoteBoost: ({ payload }) =>
        CurrentMember.pipe(
          Effect.flatMap((member) =>
            boosts.quote(actorOf(member), askOf(payload))
          ),
          Effect.map(({ account, plan, room }) => ({
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
          })),
          Effect.catchTags(boostRefusals),
          Effect.orDie
        ),
      reachableAccounts: ({ params }) =>
        CurrentMember.pipe(
          Effect.flatMap((member) =>
            connections.reachable(actorOf(member), params.connectionId)
          ),
          Effect.map((accounts) => accounts.map(toReachableView)),
          Effect.catchTags({
            AdConnectionNotFound: connectionNotFound,
            AdNetworkUnavailable: networkUnavailable,
            AdsUnavailable: adsUnavailable,
            MissingPermission: forbidden,
            PersonRequired: forbidden,
          }),
          Effect.orDie
        ),
      removeAccount: ({ params }) =>
        CurrentMember.pipe(
          Effect.flatMap((member) =>
            connections.removeAccount(actorOf(member), params.accountId)
          ),
          Effect.catchTags({
            AdAccountBusy: accountBusy,
            AdAccountNotFound: accountNotFound,
            MissingPermission: forbidden,
          }),
          Effect.orDie
        ),
      resumeBoost: controlled("resume"),
      setSpending: ({ params, payload }) =>
        CurrentMember.pipe(
          Effect.flatMap((member) =>
            spending.decide(
              actorOf(member),
              params.accountId,
              payload.enabled && payload.monthlyCeiling !== undefined
                ? {
                    _tag: "on",
                    monthlyCeiling: new Money({
                      amount: payload.monthlyCeiling.amount,
                      currency: CurrencySchema.make(
                        payload.monthlyCeiling.currency
                      ),
                    }),
                  }
                : { _tag: "off" }
            )
          ),
          Effect.map(toSpendingView),
          Effect.catchTags({
            AdAccountBusy: accountBusy,
            AdAccountNotFound: accountNotFound,
            CeilingCurrencyMismatch: ceilingMismatch,
            MissingPermission: forbidden,
            PersonRequired: forbidden,
            SpendingUnavailable: spendingUnavailable,
          }),
          Effect.orDie
        ),
      status: () =>
        CurrentMember.pipe(
          Effect.flatMap((member) => connections.status(actorOf(member))),
          Effect.catchTags({ MissingPermission: forbidden }),
          Effect.orDie
        ),
      stopBoost: controlled("stop"),
    });
  })
);
