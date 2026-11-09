import { DateTime } from "effect";

/**
 * How long billing remembers, once an account that started a trial closes,
 * a keyed pseudonym of its email address, so the same address signing up
 * again gets no second trial: 2 years, a legitimate interest in keeping the
 * free trial to one per person, past which the pseudonym is deleted.
 */
export const trialMemory = { years: 2 } as const;

/** Pseudonyms forgotten before this instant are deleted at `now`. */
export const trialMemoryCutoff = (now: DateTime.Utc): DateTime.Utc =>
  DateTime.subtract(now, trialMemory);
