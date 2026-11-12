import { DateTime } from "effect";

/**
 * How many days a partner's daily counts (`partner_usage_days`) are kept:
 * the usage ledger's period, so a report of a partner's tenants finds the
 * partner's days as long as it finds the tenants' own. The contract's
 * `usageRetentionDays` says the same, which a test keeps equal.
 */
export const partnerUsageRetentionDays = 400;

/** At `now`, the partner's days before this one are deleted. */
export const partnerUsageCutoff = (now: DateTime.Utc): DateTime.Utc =>
  DateTime.subtract(DateTime.startOf(now, "day"), {
    days: partnerUsageRetentionDays,
  });
