import { DateTime, Duration } from "effect";

import type { WorkspaceId } from "#shared/domain/ids.ts";

import { accountsMonthly, billableAccountDays } from "./rate-card.ts";

/**
 * A billing account's accounts on a UTC day, kept on its billing
 * workspace (the holder): the most connected at once that day (`peak`),
 * and how many of those account-days were reported to Stripe.
 */
export interface AccountDay {
  readonly day: DateTime.Utc;
  readonly holder: WorkspaceId;
  readonly peak: number;
  readonly reported: number;
}

/**
 * The identifier of the meter event that reports a day's account-days up
 * to `peak`: the same fact never makes two events, and Stripe drops one it
 * received already.
 */
export const accountDayIdentifier = (
  holder: WorkspaceId,
  day: DateTime.Utc,
  peak: number
): string => `acc:${holder}:${DateTime.formatIsoDateUtc(day)}:${peak}`;

/**
 * The account-days of the day's peak not yet reported: none on the 31st,
 * which bills nothing (`billableAccountDays`).
 */
export const unreportedOf = ({
  day,
  peak,
  reported,
}: Pick<AccountDay, "day" | "peak" | "reported">): number =>
  Math.max(0, billableAccountDays(day, peak) - reported);

/** The account-days these days bill, the 31st left out. */
export const accountDaysOf = (
  days: readonly Pick<AccountDay, "day" | "peak">[]
): number =>
  days.reduce((sum, { day, peak }) => sum + billableAccountDays(day, peak), 0);

/**
 * What one more account costs a month, in cents, for a billing account
 * that holds `pooled`: the ladder's band it would fall in.
 */
export const nextAccountMonthly = (pooled: number): number =>
  accountsMonthly(pooled + 1) - accountsMonthly(pooled);

/**
 * How old an event may be and still be stamped with the instant it
 * describes: an older one is stamped with the time it is sent, so it is
 * billed in the period it reaches Stripe in, at the same price, rather than
 * lost in a period already invoiced.
 */
export const stampWindow = Duration.hours(1);

/** The instant a meter event is stamped with, when sent at `now`. */
export const stampOf = (
  occurredAt: DateTime.Utc,
  now: DateTime.Utc
): DateTime.Utc =>
  DateTime.isGreaterThan(occurredAt, now) ||
  DateTime.isLessThan(occurredAt, DateTime.subtractDuration(now, stampWindow))
    ? now
    : occurredAt;
