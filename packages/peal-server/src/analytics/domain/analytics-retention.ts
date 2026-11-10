import { Duration } from "effect";

import type { Platform } from "#shared/domain/platform.ts";

// How long analytics keeps what it read. A post's counts and an account's
// days are kept two years, unless the platform's terms for developers
// allow less: then its cap applies, and the retention job enforces it.

/** How long a platform's numbers are kept, unless its terms say less. */
export const keptFor = Duration.days(730);

/**
 * The platforms whose terms cap how long their numbers may be stored:
 *
 * - LinkedIn: its Marketing API's data storage requirements let "Organization
 *   Pages' Admin and Reporting Data" (followers, the summary of social
 *   actions) be stored one year.
 * - Pinterest: its developer guidelines forbid storing what the API gives,
 *   but for analytics of an account whose holder granted access; its API
 *   serves 90 days of them, and Peal keeps no more.
 * - Google Business Profile: its policies let content be stored 30
 *   calendar days at most. Peal reads no number there today; the cap is
 *   here for the day it does.
 */
export const platformCaps: Partial<Record<Platform, Duration.Duration>> = {
  googleBusiness: Duration.days(30),
  linkedin: Duration.days(365),
  pinterest: Duration.days(90),
};

/** How long the numbers read on a platform are kept. */
export const retentionOf = (platform: Platform): Duration.Duration =>
  platformCaps[platform] ?? keptFor;

/**
 * How long the posts of a channel that left its workspace are kept after
 * it did: platforms ask that what an account allowed be
 * deleted once it withdraws (YouTube's developer policies give 30 days).
 * The account's own days go at once, with the channel.
 */
export const disconnectedKeptFor = Duration.days(30);

/**
 * How long the count of the reads a platform bills is kept: past the
 * month the platform invoices, for the operator to check it against.
 */
export const paidReadsKeptFor = Duration.days(35);
