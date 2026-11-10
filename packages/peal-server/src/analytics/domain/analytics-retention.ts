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
 * How long the numbers of a channel that left its workspace are kept after
 * it did, its account's days and its posts' counts alike: platforms ask
 * that what an account allowed be deleted once it withdraws, and the
 * strictest Peal reads gives 7 calendar days (YouTube's developer
 * policies, III.D.2: a revocation "through the API Client's own
 * mechanism", which disconnecting a channel is; 30 days are for one made
 * on Google's own page). One figure for every platform. Until then they
 * are no longer read nor reported, and the same account connected again
 * to the workspace takes them back.
 */
export const disconnectedKeptFor = Duration.days(7);

/**
 * How long the count of the reads a platform bills is kept: past the
 * month the platform invoices, for the operator to check it against.
 */
export const paidReadsKeptFor = Duration.days(35);
