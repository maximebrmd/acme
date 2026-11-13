import { Duration, Effect, Option } from "effect";
import { CurrentMember } from "peal-contract";
import type { BoostFailureReason, BoostViolation } from "peal-contract";

import {
  askedRange,
  askOf,
  reportView,
  toListedAccountView,
  toBoostDetailView,
  toBoostView,
  toCampaignView,
  toDayView,
  toPerformanceView,
  toQuoteView,
  toSpendingView,
} from "#ads/api/ads-view.ts";
import { AdConnections } from "#ads/application/ad-connections.ts";
import { AdReports } from "#ads/application/ad-reports.ts";
import { boostPageSize, Boosts } from "#ads/application/boosts.ts";
import { SpendAuthorizations } from "#ads/application/spend-authorizations.ts";
import { AdsTools } from "#app/mcp/ads-tools.ts";
import { notAllowed, refuse, usageRefusal } from "#app/mcp/refusals.ts";
import { actorOf } from "#shared/api/actor.ts";

// Why Peal refuses a boost before anything is reserved or sent, in words
// the user can act on. Amounts stay in minor units, as the tools give them.
const violations: Readonly<Record<BoostViolation, string>> = {
  ageRange: "the youngest age is above the oldest",
  beneficiaryRequired:
    "the audience is in the European Union, so the boost must say who benefits from the ad (beneficiary) and who pays for it (payer): ask the user, never guess",
  budgetEmpty: "the budget is zero",
  currencyMismatch: "the budget's currency is not the ad account's",
  endsBeforeStart: "the run ends before it starts, or has already ended",
  runTooLong: "the run is longer than 90 days",
  runTooShort:
    "the run is shorter than a day (a daily budget needs a run longer than a day)",
  specialCategory:
    "the ad is of a special category (housing, employment, financial products or services, or social issues, elections or politics), which Peal does not boost",
  startsTooFarAhead: "the run starts more than 30 days ahead",
};

const noAccount = () => refuse("The workspace has no ad account with this id.");

const noBoost = () => refuse("The workspace has no boost with this id.");

const badRange = () =>
  refuse(
    "The range of days ends before it starts, or spans more than 366 days."
  );

const invalid = ({
  violations: found,
}: {
  readonly violations: readonly BoostViolation[];
}) =>
  refuse(
    `The boost cannot be made, and nothing was reserved or sent: ${found
      .map((name) => violations[name])
      .join("; ")}.`
  );

const overCeiling = (refusal: {
  readonly ceiling: number;
  readonly committed: number;
  readonly currency: string;
  readonly requested: number;
}) =>
  refuse(
    `Refused, with nothing reserved or sent: the ad account's monthly ceiling is ${String(refusal.ceiling)} (minor units of ${refusal.currency}), its boosts already commit ${String(refusal.committed)}, and this one would add ${String(refusal.requested)}. Only an owner of the workspace raises the ceiling, in the web app; otherwise the boost must be smaller. Never work around it by splitting the boost.`
  );

const overCap = (refusal: {
  readonly currency: string;
  readonly requested: number;
  readonly room: number;
}) =>
  refuse(
    `Refused, with nothing reserved or sent: the ad account's own spend cap, set at its network, leaves ${String(refusal.room)} (minor units of ${refusal.currency}) once its boosts are counted, and this one would commit ${String(refusal.requested)}. The cap is changed at the ad network, never by Peal.`
  );

const notEnabled = () =>
  refuse(
    "No owner of the workspace allowed this ad account to spend through Peal. An owner turns spending on, with a monthly ceiling, on the workspace's ads page in the web app: a tool cannot."
  );

const noSpending = () =>
  refuse(
    "This server offers ads for reading only: its operator has not turned spending on. Nothing was spent or changed."
  );

const unusable = ({ reason }: { readonly reason: string }) =>
  refuse(
    {
      permission:
        "The ad account's sign-in did not allow making and running ads: the person who signed in to the ad network signs in again, in the web app, and allows it.",
      reconnectNeeded:
        "The ad network refused the ad account's sign-in: the person who signed in signs in again, in the web app.",
      status:
        "The ad account cannot run ads at the moment (its network disabled it, a payment is due, or it is in review): the user looks at it at the ad network.",
    }[reason] ?? "The ad account cannot take a boost now."
  );

const notPromotable = ({ reason }: { readonly reason: string }) =>
  refuse(
    {
      connection:
        "The post's Instagram account was connected through Instagram Login, which cannot run ads: it is connected through its Facebook Page instead, in the web app.",
      notPublished:
        "The post is not published on that channel, or the channel was disconnected since: only a post Peal published can be boosted, on the channel it was published on.",
      platform:
        "Peal boosts posts on Facebook Pages and Instagram only: the post's channel is on another platform.",
    }[reason] ?? "The post cannot be boosted."
  );

const conflict = ({ state }: { readonly state: string }) =>
  refuse(
    `The boost is ${state}: a boost that failed, ended or was stopped does not run again, only a paused one resumes, and one not yet made can only be stopped.`
  );

const keyReused = () =>
  refuse(
    "This idempotencyKey already names another boost of the workspace, which asked for something else: nothing was made. A new boost takes a new key; list_boosts shows what exists."
  );

// The network did not confirm: nothing is known to have changed.
const networkBusy = ({
  retryAfter,
}: {
  readonly retryAfter?: Duration.Duration;
}) =>
  refuse(
    `The ad network did not answer, asked to slow down, or could not confirm the change: the boost stands where it did (read it with get_boost before anything else)${
      retryAfter === undefined
        ? ""
        : `; the network asked to wait ${String(Math.ceil(Duration.toSeconds(retryAfter)))} seconds`
    }. Asking the same thing again later is safe.`
  );

const boostRefusals = {
  AccountSpendCapExceeded: overCap,
  AdAccountNotFound: noAccount,
  AdAccountUnusable: unusable,
  DatabaseError: Effect.die,
  InvalidBoost: invalid,
  MissingPermission: notAllowed("spend on ads"),
  PostNotPromotable: notPromotable,
  SpendCeilingExceeded: overCeiling,
  SpendingNotEnabled: notEnabled,
  SpendingUnavailable: noSpending,
};

const controlRefusals = {
  AccountSpendCapExceeded: overCap,
  AdAccountUnusable: unusable,
  AdNetworkUnavailable: networkBusy,
  BoostNotFound: noBoost,
  BoostStateConflict: conflict,
  DatabaseError: Effect.die,
  MissingPermission: notAllowed("change a boost"),
  SpendCeilingExceeded: overCeiling,
  SpendingNotEnabled: notEnabled,
  SpendingUnavailable: noSpending,
};

const readRefusals = {
  AdAccountNotFound: noAccount,
  DatabaseError: Effect.die,
  InvalidAdRange: badRange,
  MissingPermission: notAllowed("read ads"),
};

/** Every reason a boost can fail for, typed by the contract. */
export const boostFailureWords: Readonly<Record<BoostFailureReason, string>> = {
  accountSpendCap: "the ad account's own spend cap leaves too little room",
  accountUnusable: "the ad account cannot run ads at the moment",
  budgetTooLow: "the budget is under the ad network's minimum",
  ceilingExceeded: "the monthly ceiling leaves too little room",
  currencyMismatch: "its currency is not the ad account's",
  networkUnavailable: "the ad network did not answer for too long",
  permissionMissing: "the sign-in to the ad network lacks a permission",
  postNotPromotable: "the post cannot be shown as an ad",
  reconnectNeeded: "the ad network refused the sign-in",
  refused: "the ad network refused it (networkCode says how)",
  spendingOff: "spending was turned off for the ad account",
  spendingUnavailable: "the server no longer offers spending on ads",
};

/** What the ads tools do, through the ads context's use cases. */
export const AdsToolsLive = AdsTools.toLayer(
  Effect.gen(function* adsTools() {
    const connections = yield* AdConnections;
    const spending = yield* SpendAuthorizations;
    const reports = yield* AdReports;
    const boosts = yield* Boosts;
    const refusedByMeter = yield* usageRefusal;

    const actor = CurrentMember.pipe(Effect.map(actorOf));

    const controlled =
      (action: "pause" | "resume" | "stop") =>
      ({ boostId }: { readonly boostId: string }) =>
        actor.pipe(
          Effect.flatMap((who) => boosts.control(who, boostId, action)),
          Effect.map(toBoostView),
          Effect.catchTags(controlRefusals)
        );

    return AdsTools.of({
      boost_post: ({ idempotencyKey, ...asked }) =>
        actor.pipe(
          Effect.flatMap((who) =>
            boosts.request(who, askOf(asked), idempotencyKey).pipe(
              Effect.map(toBoostView),
              Effect.catchTags({
                ...boostRefusals,
                AllowanceReached: refusedByMeter(
                  who.workspaceId,
                  "Nothing was reserved or sent."
                ),
                BoostKeyReused: keyReused,
              })
            )
          )
        ),
      get_ad_account: ({ accountId }) =>
        actor.pipe(
          Effect.flatMap((who) => spending.standing(who, accountId)),
          Effect.map(toSpendingView),
          Effect.catchTags({
            AdAccountNotFound: noAccount,
            DatabaseError: Effect.die,
            MissingPermission: notAllowed("read ads"),
          })
        ),
      get_ad_insights: ({ accountId, ...range }) =>
        actor.pipe(
          Effect.flatMap((who) =>
            reports.days(who, accountId, askedRange(range))
          ),
          Effect.map((report) => reportView(report, toDayView)),
          Effect.catchTags(readRefusals)
        ),
      get_ads_status: () =>
        Effect.gen(function* status() {
          const who = yield* actor;
          const offered = yield* connections.status(who);
          const accounts = yield* connections.accounts(who);

          const until = yield* connections.untrackedUntil(who);

          return {
            ...offered,
            accounts: accounts.map((account) =>
              toListedAccountView(account, until)
            ),
          };
        }).pipe(
          Effect.catchTags({
            DatabaseError: Effect.die,
            MissingPermission: notAllowed("read ads"),
          })
        ),
      get_boost: ({ boostId }) =>
        actor.pipe(
          Effect.flatMap((who) => boosts.get(who, boostId)),
          Effect.map(toBoostDetailView),
          Effect.catchTags({
            BoostNotFound: noBoost,
            DatabaseError: Effect.die,
            MissingPermission: notAllowed("read ads"),
          })
        ),
      get_post_ad_performance: ({ postId }) =>
        actor.pipe(
          Effect.flatMap((who) => reports.ofPost(who, postId)),
          Effect.map(toPerformanceView),
          Effect.catchTags({
            DatabaseError: Effect.die,
            MissingPermission: notAllowed("read ads"),
          })
        ),
      list_ad_campaigns: ({ accountId, ...range }) =>
        actor.pipe(
          Effect.flatMap((who) =>
            reports.campaigns(who, accountId, askedRange(range))
          ),
          Effect.map((report) => reportView(report, toCampaignView)),
          Effect.catchTags(readRefusals)
        ),
      list_boosts: ({ cursor, postId }) =>
        actor.pipe(
          Effect.flatMap((who) =>
            boosts.list(who, {
              before: Option.fromUndefinedOr(cursor),
              postId: Option.fromUndefinedOr(postId),
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
            MissingPermission: notAllowed("read ads"),
          })
        ),
      pause_boost: controlled("pause"),
      quote_boost: (asked) =>
        actor.pipe(
          Effect.flatMap((who) => boosts.quote(who, askOf(asked))),
          Effect.map(toQuoteView),
          Effect.catchTags(boostRefusals)
        ),
      resume_boost: controlled("resume"),
      stop_boost: controlled("stop"),
    });
  })
);
