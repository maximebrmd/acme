import { DateTime, Option, Result, Schema } from "effect";

import type { AllowanceReason } from "#shared/domain/allowance-reached.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { Meter } from "#shared/domain/meter.ts";

import { unverifiedThreshold } from "./account-days.ts";
import type { Entitlements } from "./entitlements.ts";
import {
  billableUnits,
  meterCharge,
  rateCard,
  unconfirmedMeters,
} from "./rate-card.ts";
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
 * allowance), per-account pricing whose payment is failing (`pastDue`:
 * the allowances with a payment method, nothing past them while Stripe
 * retries), or a legacy plan, which pays but has no price for a meter:
 * the allowances with a payment method and nothing past them.
 */
export type MeterStanding = "free" | "legacy" | "pastDue" | "payAsYouGo";

/**
 * Where a plan and its subscription's status leave a billing account for
 * its meters: per-account pricing while its subscription entitles it
 * (past due apart), a legacy plan while one does, else no payment method.
 */
export const meterStandingOf = ({
  plan,
  status,
}: {
  readonly plan: Option.Option<string>;
  readonly status: Option.Option<string>;
}): MeterStanding => {
  if (Option.isNone(status)) {
    return "free";
  }

  if (!Option.contains(plan, "payAsYouGo")) {
    return "legacy";
  }

  return status.value === "past_due" ? "pastDue" : "payAsYouGo";
};

/** The same, from a billing account's entitlements. */
export const standingOfEntitlements = ({
  plan,
  subscription,
}: Pick<Entitlements, "plan" | "subscription">): MeterStanding =>
  meterStandingOf({
    plan,
    status: subscription.pipe(Option.map(({ status }) => status)),
  });

/**
 * What a billing account none of whose invoices was paid spends past its
 * allowances a month at most, across every meter: the threshold its
 * subscription invoices at until then (`unverifiedThreshold`), so a card
 * that never pays never costs Peal more. None once an invoice was paid.
 */
export const spendCapOf = (verified: boolean): Option.Option<number> =>
  verified ? Option.none() : Option.some(unverifiedThreshold);

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

/**
 * What earlier months billed, in cents: each month's meters priced apart,
 * as each was invoiced for its own month.
 */
export const spendOfMonths = (
  months: readonly (MeterCount & { readonly month: DateTime.Utc })[],
  card: RateCard = rateCard
): number => {
  const byMonth = new Map<number, MeterCount[]>();

  for (const { meter, month, used } of months) {
    const key = DateTime.toEpochMillis(month);

    byMonth.set(key, [...(byMonth.get(key) ?? []), { meter, used }]);
  }

  return [...byMonth.values()].reduce(
    (sum, counts) => sum + spendOf(counts, card),
    0
  );
};

/**
 * The first month whose meters a subscription that never paid still owes:
 * the month it began (its current period's when Stripe gave no start).
 */
export const unpaidSinceOf = (subscription: {
  readonly currentPeriodStart: Option.Option<DateTime.Utc>;
  readonly startedAt: Option.Option<DateTime.Utc>;
}): Option.Option<DateTime.Utc> =>
  subscription.startedAt.pipe(
    Option.orElse(() => subscription.currentPeriodStart),
    Option.map(meterMonthOf)
  );

// The most billable units of `meter` whose price, unrounded, stays within
// `cents`: a unit that rounds to nothing still costs its share.
const billableWithin = (meter: Meter, cents: number, card: RateCard) => {
  const price = card.prices.usd.meters[meter];

  return cents <= 0 || price.cents === 0
    ? 0
    : Math.floor((cents * price.per) / price.cents);
};

/** What bounds a meter this month, as `mostUnits` reads it. */
export interface MeterTermsAsked {
  /** The group's ceiling in cents, or none where the meter has none. */
  readonly ceiling: Option.Option<number>;
  /** The holder's counts this month, of every meter. */
  readonly counts: readonly MeterCount[];
  readonly freeTier: boolean;
  /** The cap on what is billed and unpaid, until a first invoice is paid. */
  readonly spendCap: Option.Option<number>;
  readonly standing: MeterStanding;
  /**
   * What the months before this one billed since the subscription began,
   * in cents, while no invoice was paid: unpaid still, so the cap counts
   * it (0 once one was paid, or without a cap).
   */
  readonly unpaidBefore: number;
}

/** The most units of a meter, and what set it. */
export interface MeterBound {
  /** `cap` when the cap on what is unpaid left less than the ceiling. */
  readonly by: "cap" | "ceiling" | "included";
  readonly most: number;
}

/**
 * The most units of `meter` the account may use this month and what set
 * it: its included units, and for per-account pricing, those past them
 * that what bounds it pays for: the group's ceiling (its own group's other
 * meters counted), and until a first invoice is paid the cap across every
 * meter on what is billed and unpaid (`spendCap`: every other meter
 * counted, and what the months before billed since the subscription
 * began, `unpaidBefore`); none for no end. A meter whose price is not
 * confirmed (`unconfirmedMeters`) bills nothing past its allowance,
 * whatever the ceiling.
 */
export const meterBound = (
  meter: Meter,
  {
    ceiling,
    counts,
    freeTier,
    spendCap,
    standing,
    unpaidBefore,
  }: MeterTermsAsked,
  card: RateCard = rateCard
): Option.Option<MeterBound> => {
  const included = includedUnits(meter, standing, freeTier, card);

  if (standing !== "payAsYouGo" || unconfirmedMeters.includes(meter)) {
    return Option.some({ by: "included", most: included });
  }

  const group = spendGroupOf(meter);
  const others = counts.filter((count) => count.meter !== meter);

  const byGroup = group.pipe(
    Option.flatMap((named) =>
      ceiling.pipe(
        Option.map(
          (cents) =>
            cents -
            spendOf(
              others.filter((count) =>
                Option.contains(spendGroupOf(count.meter), named)
              ),
              card
            )
        )
      )
    )
  );

  const byCap = spendCap.pipe(
    Option.map((cents) => cents - unpaidBefore - spendOf(others, card))
  );

  // The tightest of the two; the ceiling's words when they are equal.
  const tightest: Option.Option<{
    readonly by: "cap" | "ceiling";
    readonly room: number;
  }> = Option.match(byCap, {
    onNone: () => byGroup.pipe(Option.map((room) => ({ by: "ceiling", room }))),
    onSome: (capRoom) =>
      Option.isSome(byGroup) && byGroup.value <= capRoom
        ? Option.some({ by: "ceiling", room: byGroup.value })
        : Option.some({ by: "cap", room: capRoom }),
  });

  return tightest.pipe(
    Option.map(({ by, room }) => ({
      by,
      most: card.meters[meter].allowance + billableWithin(meter, room, card),
    }))
  );
};

/** The most units of `meter` the account may use this month (`meterBound`). */
export const mostUnits = (
  meter: Meter,
  asked: MeterTermsAsked,
  card: RateCard = rateCard
): Option.Option<number> =>
  meterBound(meter, asked, card).pipe(Option.map(({ most }) => most));

/** The shares of a ceiling, in percent, its billing managers are told of. */
export const ceilingNotices = [80, 100] as const;

/**
 * The shares of `ceiling` (`ceilingNotices`) a spend that went from
 * `before` to `after` cents reached, in cents: none for a ceiling of
 * nothing, which nothing reaches.
 */
export const ceilingSharesReached = (
  before: number,
  after: number,
  ceiling: number
): readonly number[] =>
  ceiling <= 0
    ? []
    : ceilingNotices.filter(
        (percent) =>
          before * 100 < percent * ceiling && after * 100 >= percent * ceiling
      );

/** Why a meter refuses, by standing. */
export const reasons = {
  free: "paymentMethodRequired",
  legacy: "planAllowance",
  pastDue: "paymentFailed",
  payAsYouGo: "ceilingReached",
} as const satisfies { readonly [S in MeterStanding]: AllowanceReason };

/**
 * Why a meter refuses past its bound: the cap on what is unpaid in words
 * of its own, else its standing's.
 */
export const refusalOf = (
  bound: MeterBound,
  standing: MeterStanding
): AllowanceReason =>
  bound.by === "cap" ? "spendCapReached" : reasons[standing];

/** What a claim may do, as its holder's month stands. */
export interface ClaimAsked extends MeterTermsAsked {
  readonly meter: Meter;
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
 * or for per-account pricing past them, unless that would pass what
 * bounds it (`meterBound`). Past what is included, an account without a
 * payment method is told to add one, a legacy plan that its plan holds no
 * more, a past due one that its payment failed, and one that pays that it
 * reached its ceiling, or the cap on what is unpaid until its first
 * invoice is paid.
 */
export const decideClaim = (
  asked: ClaimAsked,
  card: RateCard = rateCard
): Result.Result<ClaimGranted, ClaimRefused> => {
  const { counts, meter, standing, units } = asked;

  const used = counts.find((count) => count.meter === meter)?.used ?? 0;
  const after = used + units;
  const bound = meterBound(meter, asked, card);

  if (Option.isNone(bound) || after <= bound.value.most) {
    return Result.succeed({ used: after });
  }

  return Result.fail({
    allowed: bound.value.most,
    reason: refusalOf(bound.value, standing),
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
    meters = shownMeters,
    month,
    spendCap,
    standing,
    unpaidBefore,
  }: {
    readonly ceilings: ReadonlyMap<SpendGroup, number>;
    readonly counts: readonly MeterCount[];
    readonly freeTier: boolean;
    readonly meters?: readonly Meter[];
    readonly month: DateTime.Utc;
    readonly spendCap: Option.Option<number>;
    readonly standing: MeterStanding;
    readonly unpaidBefore: number;
  },
  card: RateCard = rateCard
): readonly MeterMonth[] =>
  meters.map((meter) => {
    const group = spendGroupOf(meter);
    const used = counts.find((count) => count.meter === meter)?.used ?? 0;

    const ceiling = group.pipe(
      Option.map(
        (named) => ceilings.get(named) ?? defaultCeilingOf(named, card)
      )
    );

    const billable =
      standing === "payAsYouGo" || standing === "pastDue"
        ? billableUnits(meter, used, card)
        : 0;

    return {
      allowance: includedUnits(meter, standing, freeTier, card),
      billable,
      ceiling,
      charge: meterCharge(meter, billable, "usd", card),
      group,
      meter,
      most: mostUnits(
        meter,
        { ceiling, counts, freeTier, spendCap, standing, unpaidBefore },
        card
      ),
      resetsAt: meterResetsAt(month),
      used,
    };
  });
