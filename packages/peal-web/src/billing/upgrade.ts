import { Cause, Exit, Option, Schema } from "effect";
import {
  AssistantQuotaExceeded,
  freeAccountsOf,
  PaidPlanSchema,
  planCatalogue,
  PlanLimitReached,
  PlanLimitSchema,
  PlanSchema,
  rateCard,
  withDisplayVat,
} from "peal-contract";
import type { PaidPlan } from "peal-contract";

import type { AuthClientError } from "#auth/errors.ts";

/**
 * A limit a workspace's plan reached, as the upgrade dialog tells it: what
 * was refused, what the workspace holds against what its plan allows, and
 * the smallest plan with room (none on the largest).
 */
export const LimitReachedSchema = Schema.Struct({
  allowed: Schema.Int,
  limit: PlanLimitSchema,
  plan: PlanSchema,
  planWithRoom: Schema.NullOr(PaidPlanSchema),
  used: Schema.Int,
});

export type LimitReached = typeof LimitReachedSchema.Type;

/** Why something was refused that a larger plan allows. */
export type UpgradeReason = LimitReached;

const isLimit = Schema.is(PlanLimitReached);

const isQuota = Schema.is(AssistantQuotaExceeded);

/** A failure of the API, told by its tag. */
interface Tagged {
  readonly _tag: string;
}

const reasonOf = (failure: Tagged): Option.Option<LimitReached> => {
  if (isLimit(failure)) {
    return Option.some({
      allowed: failure.allowed,
      limit: failure.limit,
      plan: failure.plan,
      planWithRoom: failure.planWithRoom,
      used: failure.used,
    });
  }

  // On a server that does not bill, the operator sets the allowance: there
  // is no plan to move to.
  return isQuota(failure) && failure.plan !== null
    ? Option.some({
        allowed: failure.dailyLimit,
        limit: "assistantRequests",
        plan: failure.plan,
        planWithRoom: failure.planWithRoom,
        used: failure.dailyLimit,
      })
    : Option.none();
};

/**
 * The plan limit a request ended on, if it did: every place that sends
 * something a plan can refuse hands it to the upgrade dialog.
 */
export const limitIn = <A, E extends Tagged>(
  exit: Exit.Exit<A, E>
): Option.Option<LimitReached> =>
  Exit.isFailure(exit)
    ? Cause.findErrorOption(exit.cause).pipe(Option.flatMap(reasonOf))
    : Option.none();

/** The same, for a failure already taken out of its exit. */
export const limitOfFailure = reasonOf;

const upgrade = {
  plan: PlanSchema,
  planWithRoom: Schema.NullOr(PaidPlanSchema),
};

const MemberLimitSchema = Schema.Struct({
  ...upgrade,
  allowed: Schema.Int,
  code: Schema.Literal("MEMBER_LIMIT_REACHED"),
  limit: PlanLimitSchema,
  used: Schema.Int,
});

const decodeMemberLimit = Schema.decodeUnknownOption(MemberLimitSchema);

/**
 * The limit an error of the sign-in service's routes names: the members a
 * plan allows, when inviting or joining.
 */
export const limitOfAuthError = (
  error: AuthClientError
): Option.Option<UpgradeReason> =>
  decodeMemberLimit(error).pipe(
    Option.map(
      ({ allowed, limit, plan, planWithRoom, used }): UpgradeReason => ({
        allowed,
        limit,
        plan,
        planWithRoom,
        used,
      })
    )
  );

/** A price in cents, with the VAT shown first and without. */
export interface OfferPrice {
  readonly excluded: number;
  readonly included: number;
}

/** A plan to order, with what it costs each month or each year. */
export interface PlanOffer {
  readonly month: OfferPrice;
  readonly plan: PaidPlan;
  readonly year: OfferPrice;
}

/** `cents` excluding VAT, with the VAT pages show beside (France's). */
export const priced = (cents: number): OfferPrice => ({
  excluded: cents,
  included: withDisplayVat(cents),
});

/** What a legacy plan cost, as Peal published it. */
export const offerOf = (plan: Exclude<PaidPlan, "payAsYouGo">): PlanOffer => {
  // Every legacy paid plan had a price; only the free plan had none.
  const price = planCatalogue[plan].price ?? { month: 0, year: 0 };

  return { month: priced(price.month), plan, year: priced(price.year) };
};

/**
 * What per-account pricing costs, from the rate card, never typed: the
 * accounts free, what each account past them costs a month (with the VAT
 * shown first and without), and the account from which they cost less.
 */
export interface PerAccountOffer {
  readonly free: number;
  readonly lessFrom: number;
  readonly next: OfferPrice;
}

export const perAccountOffer = (): PerAccountOffer => {
  const { bands } = rateCard.prices.usd.accounts;
  const free = freeAccountsOf(rateCard);
  const paid = bands.find(({ monthly }) => monthly > 0);

  return {
    free,
    lessFrom: (paid?.upTo ?? free) + 1,
    next: priced(paid?.monthly ?? 0),
  };
};
