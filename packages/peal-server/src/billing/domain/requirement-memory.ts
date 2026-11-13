import { DateTime } from "effect";

/**
 * How long billing remembers, once an account closes, a keyed pseudonym of
 * its email address when staff required a payment method of that person,
 * so the same address signing up again has no free tier: 2 years, as long
 * as a trial is remembered, a legitimate interest in keeping the free tier
 * to one per person, past which the pseudonym is deleted.
 */
export const requirementMemory = { years: 2 } as const;

/** Requirements forgotten before this instant are deleted at `now`. */
export const requirementMemoryCutoff = (now: DateTime.Utc): DateTime.Utc =>
  DateTime.subtract(now, requirementMemory);
