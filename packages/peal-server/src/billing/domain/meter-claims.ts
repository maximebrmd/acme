import { DateTime, Option, Result, Schema } from "effect";

import type { AllowanceReason } from "#shared/domain/allowance-reached.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { Meter } from "#shared/domain/meter.ts";

import type { Entitlements } from "./entitlements.ts";
import { billableUnits, meterCharge, rateCard } from "./rate-card.ts";
import type { RateCard } from "./rate-card.ts";

/**
 * The meters whose spend past the allowance a billing account bounds with
 * a monthly ceiling of its own: the writing assistant's two (requests and
 * images, one ceiling) and X's. Messages and ads have none.
 */
export const SpendGroupSchema = Schema.Literals(["assistant", "x"]);

export type SpendGroup = typeof SpendGroupSchema.Type;

const groups = {
  assistant: ["assistantImages", "assistantRequests"],
  x: ["xApi"],
} as const satisfies { readonly [G in SpendGroup]: readonly Meter[] };

/** The meters of a group, by name. */
export const metersOf = (group: SpendGroup): readonly Meter[] => groups[group];

/** The group whose ceiling bounds the meter; none for messages and ads. */
export const spendGroupOf = (meter: Meter): Option.Option<SpendGroup> =>
  Option.fromUndefinedOr(
    SpendGroupSchema.literals.find((group) => metersOf(group).includes(meter))
  );

/**
 * What a group spends past its allowances a month unless the account sets
 * otherwise, in cents: nothing for the assistant (it stops at what is
 * included), the rate card's default for X.
 */
export const defaultCeilingOf = (
  group: SpendGroup,
  card: RateCard = rateCard
): number =>
  group === "x"
    ? card.x.defaultCeiling
    : (card.meters.assistantRequests.ceiling ?? 0);

/**
 * Where a billing account stands for its meters: no payment method
 * (`free`), per-account pricing (`payAsYouGo`, billed past each
 * allowance), or a legacy plan, which pays but has no price for a meter:
 * it gets the allowances with a payment method and nothing past them.
 */
export type MeterStanding = "free" | "legacy" | "payAsYouGo";

/**
 * Where entitlements leave a billing account for its meters: per-account
 * pricing while its subscription entitles it, a legacy plan while one
 * does, else no payment method.
 */
export const meterStandingOf = ({
  plan,
  subscription,
}: Pick<Entitlements, "plan" | "subscription">): MeterStanding => {
  if (Option.isNone(subscription)) {
    return "free";
  }

  return Option.contains(plan, "payAsYouGo") ? "payAsYouGo" : "legacy";
};

/**
 * The units of `meter` a billing account has included this month: the
 * rate card's with a payment method, else its allowance without one, none
 * once staff required a payment method (`freeTier` false).
 */
export const includedUnits = (
  meter: Meter,
  standing: MeterStanding,
  freeTier: boolean,
  card: RateCard = rateCard
): number => {
  const terms = card.meters[meter];

  if (standing !== "free") {
    return terms.allowance;
  }

  return freeTier ? terms.allowanceWithout : 0;
};

/** The first instant of the month `now` falls in (UTC). */
export const meterMonthOf = (now: DateTime.Utc): DateTime.Utc =>
  DateTime.startOf(now, "month");

/** When a month's meters count from zero again: the first of the next. */
export const meterResetsAt = (month: DateTime.Utc): DateTime.Utc =>
  DateTime.add(DateTime.startOf(month, "month"), { months: 1 });

/**
 * The identifier of the `events`-th meter event of a holder's meter in a
 * month: every change of what is billed is an event of its own, a rise
 * or a fall, so none repeats another's identifier, and Stripe drops one it
 * received already.
 */
export const meterEventIdentifier = (
  meter: Meter,
  holder: WorkspaceId,
  month: DateTime.Utc,
  events: number
): string =>
  `${meter}:${holder}:${DateTime.formatIsoDateUtc(month).slice(0, 7)}:${events}`;

/** A meter's counts for a holder this month. */
export interface MeterCount {
  readonly meter: Meter;
  readonly used: number;
}

/** What a group's meters cost past their allowances, in cents. */
export const spendOf = (
  counts: readonly MeterCount[],
  card: RateCard = rateCard
): number =>
  counts.reduce(
    (sum, { meter, used }) =>
      sum + meterCharge(meter, billableUnits(meter, used, card), "usd", card),
    0
  );

// The most billable units of `meter` whose charge stays within `cents`.
const billableWithin = (meter: Meter, cents: number, card: RateCard) => {
  if (cents < 0) {
    return 0;
  }

  let low = 0;
  let high = 1;

  while (meterCharge(meter, high, "usd", card) <= cents) {
    low = high;
    high *= 2;

    if (high > Number.MAX_SAFE_INTEGER / 2) {
      return low;
    }
  }

  // meterCharge(low) is within, meterCharge(high) is not.
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);

    if (meterCharge(meter, middle, "usd", card) <= cents) {
      low = middle;
    } else {
      high = middle;
    }
  }

  return low;
};

/**
 * The most units of `meter` the account may use this month: its included
 * units, and for one that pays per-account pricing, those past them that
 * its ceiling pays for once the group's other meters are counted; none
 * for no end (a meter without a ceiling, paid for).
 */
export const mostUnits = (
  meter: Meter,
  {
    ceiling,
    counts,
    freeTier,
    standing,
  }: {
    readonly ceiling: Option.Option<number>;
    readonly counts: readonly MeterCount[];
    readonly freeTier: boolean;
    readonly standing: MeterStanding;
  },
  card: RateCard = rateCard
): Option.Option<number> => {
  const included = includedUnits(meter, standing, freeTier, card);

  if (standing !== "payAsYouGo") {
    return Option.some(included);
  }

  if (Option.isNone(ceiling) || Option.isNone(spendGroupOf(meter))) {
    return Option.none();
  }

  const others = spendOf(
    counts.filter((count) => count.meter !== meter),
    card
  );

  return Option.some(
    card.meters[meter].allowance +
      billableWithin(meter, ceiling.value - others, card)
  );
};

/** What a claim may do, as its holder's month stands. */
export interface ClaimAsked {
  /** The group's ceiling in cents, or none where the meter has none. */
  readonly ceiling: Option.Option<number>;
  /** The holder's counts this month of the meter's group (or the meter). */
  readonly counts: readonly MeterCount[];
  readonly freeTier: boolean;
  readonly meter: Meter;
  readonly standing: MeterStanding;
  readonly units: number;
}

/** A claim granted: the meter's count after it. */
export interface ClaimGranted {
  readonly used: number;
}

/** A claim refused: why, and what the meter allows. */
export interface ClaimRefused {
  readonly allowed: number;
  readonly reason: AllowanceReason;
  readonly used: number;
}

/**
 * Whether `units` more of a meter are granted: within the units included,
 * or for per-account pricing past them, unless the meter's group would
 * pass its ceiling. Past what is included, an account without a payment
 * method is told to add one; a legacy plan, which has no price for a
 * meter, and an account at its ceiling are at their ceiling.
 */
export const decideClaim = (
  asked: ClaimAsked,
  card: RateCard = rateCard
): Result.Result<ClaimGranted, ClaimRefused> => {
  const { counts, meter, standing, units } = asked;

  const used = counts.find((count) => count.meter === meter)?.used ?? 0;
  const after = used + units;
  const most = mostUnits(meter, asked, card);

  if (Option.isNone(most) || after <= most.value) {
    return Result.succeed({ used: after });
  }

  return Result.fail({
    allowed: most.value,
    reason: standing === "free" ? "paymentMethodRequired" : "ceilingReached",
    used,
  });
};

/**
 * The meters the billing page shows: every one but X's, which comes with
 * its pass-through.
 */
export const shownMeters: readonly Meter[] = [
  "outboundMessages",
  "managedAds",
  "assistantRequests",
  "assistantImages",
];

/** A meter of a billing account this month, as its billing page tells it. */
export interface MeterMonth {
  readonly allowance: number;
  /** The units past the allowance billed: none without per-account pricing. */
  readonly billable: number;
  /** The group's ceiling in cents; none for a meter without one. */
  readonly ceiling: Option.Option<number>;
  /** What `billable` costs so far, in cents. */
  readonly charge: number;
  readonly group: Option.Option<SpendGroup>;
  readonly meter: Meter;
  readonly most: Option.Option<number>;
  readonly resetsAt: DateTime.Utc;
  readonly used: number;
}

/** The billing account's meters this month, from its counts and ceilings. */
export const meterMonthsOf = (
  {
    ceilings,
    counts,
    freeTier,
    month,
    standing,
  }: {
    readonly ceilings: ReadonlyMap<SpendGroup, number>;
    readonly counts: readonly MeterCount[];
    readonly freeTier: boolean;
    readonly month: DateTime.Utc;
    readonly standing: MeterStanding;
  },
  card: RateCard = rateCard
): readonly MeterMonth[] =>
  shownMeters.map((meter) => {
    const group = spendGroupOf(meter);
    const used = counts.find((count) => count.meter === meter)?.used ?? 0;

    const ceiling = group.pipe(
      Option.map(
        (named) => ceilings.get(named) ?? defaultCeilingOf(named, card)
      )
    );

    const billable =
      standing === "payAsYouGo" ? billableUnits(meter, used, card) : 0;

    return {
      allowance: includedUnits(meter, standing, freeTier, card),
      billable,
      ceiling,
      charge: meterCharge(meter, billable, "usd", card),
      group,
      meter,
      most: mostUnits(meter, { ceiling, counts, freeTier, standing }, card),
      resetsAt: meterResetsAt(month),
      used,
    };
  });
