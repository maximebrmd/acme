import { DateTime, Duration, Option, Result, Schema } from "effect";

import { ActorSubjectSchema } from "#shared/domain/access.ts";
import {
  ChannelIdSchema,
  PostIdSchema,
  PostTargetIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import type { TimeZoneId } from "#shared/domain/time-zone.ts";

import { Audience, reachesEu } from "./audience.ts";
import type { BoostViolation } from "./boost-violation.ts";
import { calendarDays, commitmentOf } from "./commitment.ts";
import {
  AdAccountIdSchema,
  BoostIdSchema,
  NetworkObjectIdSchema,
} from "./ids.ts";
import { InvalidBoostTransition } from "./invalid-boost-transition.ts";
import { InvalidBoost } from "./invalid-boost.ts";
import { AmountSchema, CurrencySchema } from "./money.ts";
import type { Currency } from "./money.ts";
import type { SpecialAdCategory } from "./special-ad-category.ts";

/** A boost's budget: for its whole run, or for each day of it. */
export const BoostBudgetSchema = Schema.Union([
  Schema.TaggedStruct("total", { amount: AmountSchema }),
  Schema.TaggedStruct("daily", { amount: AmountSchema }),
]);

export type BoostBudget = typeof BoostBudgetSchema.Type;

/**
 * What a boost is for. `engagement` is what boosting a post means: more
 * people reacting to, commenting on and sharing that post.
 */
export const BoostObjectiveSchema = Schema.Literals(["engagement"]);

export type BoostObjective = typeof BoostObjectiveSchema.Type;

/**
 * Why a boost failed, with nothing spent: every one of them is found
 * before the network is told to run the ad. Stored and told to members:
 * add one, never rename one.
 */
export const BoostFailureReasonSchema = Schema.Literals([
  // The ad account cannot run ads now (disabled, unpaid, in review).
  "accountUnusable",
  // The account's own spend cap leaves too little room.
  "accountSpendCap",
  // The monthly ceiling was lowered, or spending turned off, meanwhile.
  "ceilingExceeded",
  "spendingOff",
  // The account's currency is not the boost's.
  "currencyMismatch",
  // The network takes no budget this small.
  "budgetTooLow",
  // The post cannot be promoted: deleted, or not one an ad may show.
  "postNotPromotable",
  // The sign-in lacks a permission the network asks for.
  "permissionMissing",
  // The network refused the sign-in's token: sign in again.
  "reconnectNeeded",
  // The network kept refusing for now (a rate limit, an outage).
  "networkUnavailable",
  // The network refused the ad, for a reason of its own (`networkCode`).
  "refused",
  // Peal's server does not offer spending (the operator turned it off).
  "spendingUnavailable",
]);

export type BoostFailureReason = typeof BoostFailureReasonSchema.Type;

/**
 * Where a boost stands:
 *
 * - `requested`: accepted, its budget counted against the ceiling; its
 *   campaign is being made, paused, and spends nothing.
 * - `active`: the network was told to run it, and confirmed.
 * - `paused`: a member paused it; it spends nothing and can run again.
 * - `ended`: its end date passed.
 * - `stopped`: a member stopped it for good.
 * - `failed`: it could not be made; nothing ran.
 * - `unconfirmed`: Peal told the network to run it and could not read
 *   back whether it does. It may be spending: its budget stays counted,
 *   and stopping it settles it.
 */
export const BoostStateSchema = Schema.Union([
  Schema.TaggedStruct("requested", {}),
  Schema.TaggedStruct("active", { since: Schema.DateTimeUtc }),
  Schema.TaggedStruct("paused", { since: Schema.DateTimeUtc }),
  Schema.TaggedStruct("ended", { at: Schema.DateTimeUtc }),
  Schema.TaggedStruct("stopped", { at: Schema.DateTimeUtc }),
  Schema.TaggedStruct("failed", {
    at: Schema.DateTimeUtc,
    networkCode: Schema.Option(Schema.String),
    reason: BoostFailureReasonSchema,
  }),
  Schema.TaggedStruct("unconfirmed", { since: Schema.DateTimeUtc }),
]);

export type BoostState = typeof BoostStateSchema.Type;

/** The objects a boost made at its network, as each is learnt. */
export const BoostObjectsSchema = Schema.Struct({
  adId: Schema.Option(NetworkObjectIdSchema),
  adSetId: Schema.Option(NetworkObjectIdSchema),
  campaignId: Schema.Option(NetworkObjectIdSchema),
});

export type BoostObjects = typeof BoostObjectsSchema.Type;

export const noObjects: BoostObjects = {
  adId: Option.none(),
  adSetId: Option.none(),
  campaignId: Option.none(),
};

/** The platforms whose published posts Peal boosts. */
export const BoostPlatformSchema = Schema.Literals(["facebook", "instagram"]);

export type BoostPlatform = typeof BoostPlatformSchema.Type;

/**
 * One published post promoted on one ad account: what was asked, by whom,
 * what it commits against the ceiling, and where it stands.
 */
export class Boost extends Schema.Class<Boost>("peal-server/ads/domain/Boost")({
  /** The run's first instant at the network, once it ran. */
  activatedAt: Schema.Option(Schema.DateTimeUtc),
  adAccountId: AdAccountIdSchema,
  audience: Audience,
  /** Who benefits from the ad and who pays, for audiences in the EU. */
  beneficiary: Schema.Option(Schema.NonEmptyString),
  budget: BoostBudgetSchema,
  channelId: ChannelIdSchema,
  /**
   * The most the boost can cost, in minor units, counted against the
   * ceiling while it runs and after. It only ever goes down.
   */
  committed: AmountSchema,
  createdAt: Schema.DateTimeUtc,
  currency: CurrencySchema,
  endsAt: Schema.DateTimeUtc,
  id: BoostIdSchema,
  /** The caller's key: the same key answers the same boost. */
  idempotencyKey: Schema.NonEmptyString,
  objective: BoostObjectiveSchema,
  objects: BoostObjectsSchema,
  payer: Schema.Option(Schema.NonEmptyString),
  platform: BoostPlatformSchema,
  postId: PostIdSchema,
  /** Who asked for it: a member, or a key. Kept for the audit trail. */
  requestedBy: Schema.Option(ActorSubjectSchema),
  startsAt: Schema.DateTimeUtc,
  state: BoostStateSchema,
  targetId: PostTargetIdSchema,
  updatedAt: Schema.DateTimeUtc,
  workspaceId: WorkspaceIdSchema,
}) {}

/** The shortest run: a day. A daily budget needs a longer one. */
export const minRun = Duration.hours(24);

/** The longest run Peal takes. */
export const maxRunDays = 90;

/** How far ahead a run may start. */
export const maxStartAheadDays = 30;

/** The longest text naming who benefits from an ad, or who pays for it. */
export const maxPartyLength = 512;

/** What a member or an application asks a boost to be. */
export interface BoostRequest {
  readonly audience: Audience;
  readonly beneficiary: Option.Option<string>;
  readonly budget: BoostBudget;
  readonly currency: Currency;
  readonly endsAt: DateTime.Utc;
  readonly payer: Option.Option<string>;
  readonly specialAdCategory: SpecialAdCategory;
  /** When the run starts: now when none. */
  readonly startsAt: Option.Option<DateTime.Utc>;
}

/** A boost that passed Peal's rules: its run, and what it commits. */
export interface BoostPlan {
  readonly committed: number;
  readonly days: number;
  readonly endsAt: DateTime.Utc;
  readonly startsAt: DateTime.Utc;
}

const runViolations = (
  request: BoostRequest,
  startsAt: DateTime.Utc,
  now: DateTime.Utc
): readonly BoostViolation[] => {
  const { budget, endsAt } = request;

  if (
    DateTime.isLessThanOrEqualTo(endsAt, startsAt) ||
    DateTime.isLessThanOrEqualTo(endsAt, now)
  ) {
    return ["endsBeforeStart"];
  }

  const run = DateTime.distance(startsAt, endsAt);

  // Meta takes a daily budget only for a run longer than 24 hours.
  const tooShort =
    budget._tag === "daily"
      ? Duration.isLessThanOrEqualTo(run, minRun)
      : Duration.isLessThan(run, minRun);

  return [
    ...(tooShort ? (["runTooShort"] as const) : []),
    ...(Duration.isGreaterThan(run, Duration.days(maxRunDays))
      ? (["runTooLong"] as const)
      : []),
    ...(Duration.isGreaterThan(
      DateTime.distance(now, startsAt),
      Duration.days(maxStartAheadDays)
    )
      ? (["startsTooFarAhead"] as const)
      : []),
  ];
};

/**
 * Checks a boost against Peal's own rules, on an account's currency and
 * time zone, and says what it would commit. Nothing here asks the network:
 * a boost is validated in Peal, never by a trial request, which networks
 * count as a write.
 */
export const planBoost = (
  request: BoostRequest,
  account: { readonly currency: Currency; readonly timeZone: TimeZoneId },
  now: DateTime.Utc
): Result.Result<BoostPlan, InvalidBoost> => {
  // A run asked to start in the past starts now.
  const startsAt = request.startsAt.pipe(
    Option.filter((asked) => DateTime.isGreaterThan(asked, now)),
    Option.getOrElse(() => now)
  );

  const { audience } = request;

  const violations: readonly BoostViolation[] = [
    ...(request.currency === account.currency
      ? []
      : (["currencyMismatch"] as const)),
    ...(request.budget.amount > 0 ? [] : (["budgetEmpty"] as const)),
    ...runViolations(request, startsAt, now),
    ...(audience.ageMin > audience.ageMax ? (["ageRange"] as const) : []),
    ...(request.specialAdCategory === "none"
      ? []
      : (["specialCategory"] as const)),
    ...(reachesEu(audience) &&
    (Option.isNone(request.beneficiary) || Option.isNone(request.payer))
      ? (["beneficiaryRequired"] as const)
      : []),
  ];

  const [first, ...others] = violations;

  if (first !== undefined) {
    return Result.fail(new InvalidBoost({ violations: [first, ...others] }));
  }

  return Result.succeed({
    committed: commitmentOf(
      request.budget,
      startsAt,
      request.endsAt,
      account.timeZone
    ),
    days: calendarDays(startsAt, request.endsAt, account.timeZone),
    endsAt: request.endsAt,
    startsAt,
  });
};

/**
 * The states whose budget counts against the ceiling: every boost that
 * ran, runs or may run. Only one that failed before running counts
 * nothing.
 */
export const countsAgainstCeiling = (state: BoostState): boolean =>
  state._tag !== "failed";

/** Whether the boost is over for good. */
export const isFinal = (state: BoostState): boolean =>
  state._tag === "ended" || state._tag === "stopped" || state._tag === "failed";

/** Whether the boost may be spending now, as far as Peal knows. */
export const maySpend = (state: BoostState): boolean =>
  state._tag === "active" || state._tag === "unconfirmed";

const refuse = (boost: Boost, action: string) =>
  Result.fail(new InvalidBoostTransition({ action, from: boost.state._tag }));

type Fields = ConstructorParameters<typeof Boost>[0];

const moved = (boost: Boost, changes: Partial<Fields>, now: DateTime.Utc) =>
  new Boost({
    activatedAt: boost.activatedAt,
    adAccountId: boost.adAccountId,
    audience: boost.audience,
    beneficiary: boost.beneficiary,
    budget: boost.budget,
    channelId: boost.channelId,
    committed: boost.committed,
    createdAt: boost.createdAt,
    currency: boost.currency,
    endsAt: boost.endsAt,
    id: boost.id,
    idempotencyKey: boost.idempotencyKey,
    objective: boost.objective,
    objects: boost.objects,
    payer: boost.payer,
    platform: boost.platform,
    postId: boost.postId,
    requestedBy: boost.requestedBy,
    startsAt: boost.startsAt,
    state: boost.state,
    targetId: boost.targetId,
    workspaceId: boost.workspaceId,
    ...changes,
    updatedAt: now,
  });

/** The boost with the network's objects it has made so far. */
export const withObjects = (
  boost: Boost,
  objects: BoostObjects,
  now: DateTime.Utc
): Boost => moved(boost, { objects }, now);

/** The network confirmed the boost runs. */
export const activated = (
  boost: Boost,
  now: DateTime.Utc
): Result.Result<Boost, InvalidBoostTransition> =>
  boost.state._tag === "requested" ||
  boost.state._tag === "paused" ||
  boost.state._tag === "unconfirmed"
    ? Result.succeed(
        moved(
          boost,
          {
            activatedAt: Option.orElse(boost.activatedAt, () =>
              Option.some(now)
            ),
            state: { _tag: "active", since: now },
          },
          now
        )
      )
    : refuse(boost, "activate");

/** Peal told the network to run the boost and could not read the answer. */
export const unconfirmed = (
  boost: Boost,
  now: DateTime.Utc
): Result.Result<Boost, InvalidBoostTransition> =>
  boost.state._tag === "requested" || boost.state._tag === "paused"
    ? Result.succeed(
        moved(
          boost,
          {
            activatedAt: Option.orElse(boost.activatedAt, () =>
              Option.some(now)
            ),
            state: { _tag: "unconfirmed", since: now },
          },
          now
        )
      )
    : refuse(boost, "leave unconfirmed");

/**
 * The boost could not be made. Only one that never ran fails: it then
 * commits nothing.
 */
export const failed = (
  boost: Boost,
  reason: BoostFailureReason,
  networkCode: Option.Option<string>,
  now: DateTime.Utc
): Result.Result<Boost, InvalidBoostTransition> =>
  boost.state._tag === "requested"
    ? Result.succeed(
        moved(
          boost,
          {
            committed: 0,
            state: { _tag: "failed", at: now, networkCode, reason },
          },
          now
        )
      )
    : refuse(boost, "fail");

/** A member paused the boost, and the network confirmed. */
export const paused = (
  boost: Boost,
  now: DateTime.Utc
): Result.Result<Boost, InvalidBoostTransition> => {
  if (boost.state._tag === "paused") {
    return Result.succeed(boost);
  }

  return boost.state._tag === "active" || boost.state._tag === "unconfirmed"
    ? Result.succeed(
        moved(boost, { state: { _tag: "paused", since: now } }, now)
      )
    : refuse(boost, "pause");
};

/**
 * What a boost stopped at `now` can have cost at most. A total budget
 * stays whole: the network may have spent all of it. A daily budget counts
 * the days it ran, with the share the network may add on each. One that
 * never ran cost nothing.
 */
export const committedWhenStopped = (
  boost: Boost,
  now: DateTime.Utc,
  timeZone: TimeZoneId
): number => {
  if (Option.isNone(boost.activatedAt)) {
    return 0;
  }

  if (boost.budget._tag === "total") {
    return boost.committed;
  }

  const until = DateTime.isLessThan(now, boost.endsAt) ? now : boost.endsAt;

  const ran = commitmentOf(
    boost.budget,
    boost.activatedAt.value,
    until,
    timeZone
  );

  return Math.min(boost.committed, ran);
};

/**
 * A member stopped the boost for good, and the network confirmed it no
 * longer runs. Stopping a stopped boost changes nothing.
 */
export const stopped = (
  boost: Boost,
  now: DateTime.Utc,
  timeZone: TimeZoneId
): Result.Result<Boost, InvalidBoostTransition> => {
  if (boost.state._tag === "stopped") {
    return Result.succeed(boost);
  }

  return boost.state._tag === "failed" || boost.state._tag === "ended"
    ? refuse(boost, "stop")
    : Result.succeed(
        moved(
          boost,
          {
            committed: committedWhenStopped(boost, now, timeZone),
            state: { _tag: "stopped", at: now },
          },
          now
        )
      );
};

/** The boost's end date passed: the network runs it no longer. */
export const ended = (
  boost: Boost,
  now: DateTime.Utc
): Result.Result<Boost, InvalidBoostTransition> =>
  (boost.state._tag === "active" ||
    boost.state._tag === "paused" ||
    boost.state._tag === "unconfirmed") &&
  DateTime.isGreaterThanOrEqualTo(now, boost.endsAt)
    ? Result.succeed(moved(boost, { state: { _tag: "ended", at: now } }, now))
    : refuse(boost, "end");

/**
 * The name every object of a boost carries at its network: a key Peal
 * chose before the first request, so a request whose answer was lost is
 * found again by it rather than sent twice. It names nothing of the post.
 */
export const networkNameOf = (boostId: string): string =>
  `Peal boost ${boostId}`;
