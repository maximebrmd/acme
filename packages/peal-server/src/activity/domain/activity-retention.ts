import { DateTime, Duration } from "effect";

/**
 * How long a workspace's activity log keeps an event: 90 days. Long enough
 * for an owner to find out who changed something they notice weeks later
 * (a post rescheduled, a channel disconnected, a key created), and no
 * longer than knowing who changed what needs: the log names the workspace's
 * members.
 */
export const activityRetention = Duration.days(90);

/** The instant before which, at `now`, the log keeps nothing. */
export const retentionCutoff = (now: DateTime.Utc): DateTime.Utc =>
  DateTime.subtractDuration(now, activityRetention);

/** Whether the log no longer keeps, at `now`, an event that occurred at `occurredAt`. */
export const isExpired = (
  occurredAt: DateTime.Utc,
  now: DateTime.Utc
): boolean => DateTime.isLessThan(occurredAt, retentionCutoff(now));
