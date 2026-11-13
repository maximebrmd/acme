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

import { AdConnections } from "#ads/application/ad-connections.ts";
import { AdReports, auditPageSize } from "#ads/application/ad-reports.ts";
import { boostPageSize, Boosts } from "#ads/application/boosts.ts";
import { SpendAuthorizations } from "#ads/application/spend-authorizations.ts";
import { actorOf } from "#shared/api/actor.ts";
import { allowanceRefusal } from "#shared/api/allowance-reached.ts";
import { forbidden } from "#shared/api/forbidden.ts";

import {
  askedRange,
  askOf,
  reportView,
  spendDecisionOf,
  toAccountView,
  toAdRowView,
  toAuditView,
  toBoostDetailView,
  toBoostView,
  toCampaignView,
  toConnectionView,
  toDayView,
  toPerformanceView,
  toQuoteView,
  toReachableView,
  toSpendingView,
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

const boostRefusals = {
  AccountSpendCapExceeded: capExceeded,
  AdAccountNotFound: accountNotFound,
  AdAccountUnusable: accountUnusable,
  DatabaseError: Effect.die,
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
  DatabaseError: Effect.die,
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
    const allowanceReached = yield* allowanceRefusal;

    const control = (boostId: string, action: "pause" | "resume" | "stop") =>
      CurrentMember.pipe(
        Effect.flatMap((member) =>
          boosts.control(actorOf(member), boostId, action)
        ),
        Effect.map(toBoostView)
      );

    // Pausing and stopping spend nothing: the refusals of what spends
    // never come to them.
    const reduced =
      (action: "pause" | "stop") =>
      ({ params }: { readonly params: { readonly boostId: string } }) =>
        control(params.boostId, action).pipe(
          Effect.catchTags({
            ...controlRefusals,
            AccountSpendCapExceeded: Effect.die,
            SpendCeilingExceeded: Effect.die,
            SpendingNotEnabled: Effect.die,
            SpendingUnavailable: Effect.die,
          })
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
          Effect.catchTags({
            DatabaseError: Effect.die,
            MissingPermission: forbidden,
          })
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
            DatabaseError: Effect.die,
            MissingPermission: forbidden,
            PersonRequired: forbidden,
          })
        ),
      connect: ({ params }) =>
        CurrentMember.pipe(
          Effect.flatMap((member) =>
            connections.begin(actorOf(member), params.network)
          ),
          Effect.map((authorizationUrl) => ({ authorizationUrl })),
          Effect.catchTags({
            AdsUnavailable: adsUnavailable,
            DatabaseError: Effect.die,
            MissingPermission: forbidden,
            PersonRequired: forbidden,
          })
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
            DatabaseError: Effect.die,
            MissingPermission: forbidden,
            PersonRequired: forbidden,
          })
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
          Effect.catchTags({
            ...boostRefusals,
            AllowanceReached: allowanceReached,
            BoostKeyReused: keyReused,
          })
        ),
      disconnect: ({ params }) =>
        CurrentMember.pipe(
          Effect.flatMap((member) =>
            connections.disconnect(actorOf(member), params.connectionId)
          ),
          Effect.catchTags({
            AdAccountBusy: accountBusy,
            AdConnectionNotFound: connectionNotFound,
            DatabaseError: Effect.die,
            MissingPermission: forbidden,
          })
        ),
      getAccount: ({ params }) =>
        CurrentMember.pipe(
          Effect.flatMap((member) =>
            spending.standing(actorOf(member), params.accountId)
          ),
          Effect.map(toSpendingView),
          Effect.catchTags({
            AdAccountNotFound: accountNotFound,
            DatabaseError: Effect.die,
            MissingPermission: forbidden,
          })
        ),
      getBoost: ({ params }) =>
        CurrentMember.pipe(
          Effect.flatMap((member) =>
            boosts.get(actorOf(member), params.boostId)
          ),
          Effect.map(toBoostDetailView),
          Effect.catchTags({
            BoostNotFound: boostNotFound,
            DatabaseError: Effect.die,
            MissingPermission: forbidden,
          })
        ),
      listAccounts: () =>
        CurrentMember.pipe(
          Effect.flatMap((member) => connections.accounts(actorOf(member))),
          Effect.map((accounts) => accounts.map(toAccountView)),
          Effect.catchTags({
            DatabaseError: Effect.die,
            MissingPermission: forbidden,
          })
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
          Effect.map((report) => reportView(report, toAdRowView)),
          Effect.catchTags({
            AdAccountNotFound: accountNotFound,
            DatabaseError: Effect.die,
            InvalidAdRange: invalidRange,
            MissingPermission: forbidden,
          })
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
          Effect.catchTags({
            DatabaseError: Effect.die,
            MissingPermission: forbidden,
          })
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
          Effect.map((report) => reportView(report, toCampaignView)),
          Effect.catchTags({
            AdAccountNotFound: accountNotFound,
            DatabaseError: Effect.die,
            InvalidAdRange: invalidRange,
            MissingPermission: forbidden,
          })
        ),
      listConnections: () =>
        CurrentMember.pipe(
          Effect.flatMap((member) => connections.list(actorOf(member))),
          Effect.map((listed) => listed.map(toConnectionView)),
          Effect.catchTags({
            DatabaseError: Effect.die,
            MissingPermission: forbidden,
          })
        ),
      listInsights: ({ params, query }) =>
        CurrentMember.pipe(
          Effect.flatMap((member) =>
            reports.days(actorOf(member), params.accountId, askedRange(query))
          ),
          Effect.map((report) => reportView(report, toDayView)),
          Effect.catchTags({
            AdAccountNotFound: accountNotFound,
            DatabaseError: Effect.die,
            InvalidAdRange: invalidRange,
            MissingPermission: forbidden,
          })
        ),
      pauseBoost: reduced("pause"),
      postPerformance: ({ params }) =>
        CurrentMember.pipe(
          Effect.flatMap((member) =>
            reports.ofPost(actorOf(member), params.postId)
          ),
          Effect.map(toPerformanceView),
          Effect.catchTags({
            DatabaseError: Effect.die,
            MissingPermission: forbidden,
          })
        ),
      quoteBoost: ({ payload }) =>
        CurrentMember.pipe(
          Effect.flatMap((member) =>
            boosts.quote(actorOf(member), askOf(payload))
          ),
          Effect.map(toQuoteView),
          Effect.catchTags(boostRefusals)
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
            DatabaseError: Effect.die,
            MissingPermission: forbidden,
            PersonRequired: forbidden,
          })
        ),
      removeAccount: ({ params }) =>
        CurrentMember.pipe(
          Effect.flatMap((member) =>
            connections.removeAccount(actorOf(member), params.accountId)
          ),
          Effect.catchTags({
            AdAccountBusy: accountBusy,
            AdAccountNotFound: accountNotFound,
            DatabaseError: Effect.die,
            MissingPermission: forbidden,
          })
        ),
      resumeBoost: ({ params }) =>
        control(params.boostId, "resume").pipe(
          Effect.catchTags(controlRefusals)
        ),
      setSpending: ({ params, payload }) =>
        CurrentMember.pipe(
          Effect.flatMap((member) =>
            spending.decide(
              actorOf(member),
              params.accountId,
              spendDecisionOf(payload)
            )
          ),
          Effect.map(toSpendingView),
          Effect.catchTags({
            AdAccountBusy: accountBusy,
            AdAccountNotFound: accountNotFound,
            CeilingCurrencyMismatch: ceilingMismatch,
            DatabaseError: Effect.die,
            MissingPermission: forbidden,
            PersonRequired: forbidden,
            SpendingUnavailable: spendingUnavailable,
          })
        ),
      status: () =>
        CurrentMember.pipe(
          Effect.flatMap((member) => connections.status(actorOf(member))),
          Effect.catchTags({
            MissingPermission: forbidden,
          })
        ),
      stopBoost: reduced("stop"),
    });
  })
);
