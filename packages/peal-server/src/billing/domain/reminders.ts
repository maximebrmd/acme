import { DateTime, Duration, Match, Option } from "effect";

import type { Subscription } from "./subscription.ts";

/**
 * How long before a yearly plan renews its members are told: 45 days, so
 * between three months and one month before the last day to refuse the
 * renewal, which here is the renewal itself, as Code de la consommation
 * L215-1 asks of a contract that renews on its own.
 */
export const renewalNotice = Duration.days(45);

/**
 * The renewal notice goes out once, on the first run within this long
 * after `renewalNotice` before the renewal: a run missed for days still
 * sends it more than 32 days before, so always "one month" before at
 * least, whatever the month's length (one month before 31 March is 28
 * February, 31 days earlier).
 */
export const renewalWindow = Duration.days(13);

/** How long before a trial ends its members are told. */
export const trialNotice = Duration.days(3);

/**
 * How long after a subscription starts its confirmation may still go out:
 * the hourly run sends it within the hour, and a run missed for a while
 * still sends it.
 */
export const startedNotice = Duration.days(2);

/** A reminder due for a subscription. */
export type Reminder =
  | {
      readonly _tag: "started";
      readonly startedAt: DateTime.Utc;
      readonly subscription: Subscription;
    }
  | {
      readonly _tag: "renewal";
      readonly renewsAt: DateTime.Utc;
      readonly subscription: Subscription;
    }
  | {
      readonly _tag: "trialEnding";
      readonly endsAt: DateTime.Utc;
      readonly subscription: Subscription;
    };

const within = (
  instant: DateTime.Utc,
  now: DateTime.Utc,
  from: Duration.Duration,
  to: Duration.Duration
): boolean => {
  const left = DateTime.toEpochMillis(instant) - DateTime.toEpochMillis(now);

  return left > Duration.toMillis(from) && left <= Duration.toMillis(to);
};

const ago = (instant: DateTime.Utc, now: DateTime.Utc) =>
  DateTime.toEpochMillis(now) - DateTime.toEpochMillis(instant);

/** The confirmation of a subscription that started within `startedNotice`. */
export const confirmationOf = (
  subscription: Subscription,
  now: DateTime.Utc
): Option.Option<Reminder> =>
  subscription.startedAt.pipe(
    Option.filter(
      (startedAt) =>
        (subscription.status === "active" ||
          subscription.status === "trialing") &&
        ago(startedAt, now) >= 0 &&
        ago(startedAt, now) <= Duration.toMillis(startedNotice)
    ),
    Option.map((startedAt): Reminder => ({
      _tag: "started",
      startedAt,
      subscription,
    }))
  );

/**
 * The reminder the subscription is due at `now`, if any: a yearly plan
 * that will renew (active, not cancelled) within `renewalNotice` but not
 * yet within `renewalNotice` less `renewalWindow`; a trial ending within
 * `trialNotice`.
 */
export const reminderOf = (
  subscription: Subscription,
  now: DateTime.Utc
): Option.Option<Reminder> => {
  if (subscription.status === "trialing") {
    return subscription.trialEnd.pipe(
      Option.filter((endsAt) =>
        within(endsAt, now, Duration.zero, trialNotice)
      ),
      Option.map((endsAt): Reminder => ({
        _tag: "trialEnding",
        endsAt,
        subscription,
      }))
    );
  }

  if (
    subscription.status !== "active" ||
    subscription.interval !== "year" ||
    subscription.cancelAtPeriodEnd
  ) {
    return Option.none();
  }

  return subscription.currentPeriodEnd.pipe(
    Option.filter((renewsAt) =>
      within(
        renewsAt,
        now,
        Duration.subtract(renewalNotice, renewalWindow),
        renewalNotice
      )
    ),
    Option.map((renewsAt): Reminder => ({
      _tag: "renewal",
      renewsAt,
      subscription,
    }))
  );
};

/**
 * The key a reminder is told under, once: by subscription and the instant
 * it is about, so each renewal of a yearly plan is told once.
 */
export const reminderKey = (reminder: Reminder): string => {
  const id = reminder.subscription.stripeSubscriptionId;

  return Match.valueTags(reminder, {
    renewal: ({ renewsAt }) =>
      `subscription:${id}:renewal:${DateTime.toEpochMillis(renewsAt)}`,
    started: () => `subscription:${id}:started`,
    trialEnding: () => `subscription:${id}:trial-ending`,
  });
};
