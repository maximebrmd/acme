import { DateTime, Effect, Option, Schema } from "effect";

import { CountSchema } from "./post-metrics.ts";

// What a platform tells of an account itself, apart from its posts: how
// many follow it today, and where the platform has account insights, how
// many saw it each day.

const givenBySome = Schema.OptionFromNullOr(CountSchema).pipe(
  Schema.withConstructorDefault(Effect.succeed(Option.none())),
  Schema.withDecodingDefaultKey(Effect.succeed(null))
);

/** A UTC day, written `YYYY-MM-DD`. */
export const UtcDaySchema = Schema.String.check(
  Schema.isPattern(/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/u)
).pipe(Schema.brand("UtcDay"));

export type UtcDay = typeof UtcDaySchema.Type;

/** The UTC day an instant falls on. */
export const utcDayOf = (instant: DateTime.Utc): UtcDay =>
  UtcDaySchema.make(DateTime.formatIsoDateUtc(instant));

/**
 * An account's counters as its platform shows them now: its followers
 * (subscribers on YouTube), the accounts it follows, and the posts it has
 * (videos, Pins). None where the platform gives none, or hides it, which
 * is not zero.
 */
export class AccountCounters extends Schema.Class<AccountCounters>(
  "peal-server/analytics/domain/AccountCounters"
)({
  followers: givenBySome,
  following: givenBySome,
  posts: givenBySome,
}) {}

/**
 * What an account's platform counted for one UTC day: its views (how many
 * times its content was shown) and its reach (how many accounts saw it),
 * each where the platform tells it.
 */
export const AccountDaySchema = Schema.Struct({
  day: UtcDaySchema,
  reach: Schema.OptionFromNullOr(CountSchema),
  views: Schema.OptionFromNullOr(CountSchema),
});

export type AccountDay = typeof AccountDaySchema.Type;

/**
 * What reading an account found: its counters now, and the days its
 * platform counted since the last read, a few at most, which may revise
 * days read before.
 */
export const AccountReadingSchema = Schema.Struct({
  counters: AccountCounters,
  days: Schema.Array(AccountDaySchema).check(Schema.isMaxLength(31)),
});

export type AccountReading = typeof AccountReadingSchema.Type;

/** Whether a reading tells anything at all. */
export const tellsSomething = ({ counters, days }: AccountReading): boolean =>
  Option.isSome(counters.followers) ||
  Option.isSome(counters.following) ||
  Option.isSome(counters.posts) ||
  days.length > 0;
