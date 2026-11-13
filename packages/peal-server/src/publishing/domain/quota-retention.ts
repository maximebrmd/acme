/**
 * How many days the quota ledger (`publishing.quota_usage`) keeps before
 * the current one: a week, past the day any platform counts, so a day goes
 * at the daily run after its seventh. The registry's `quotaLedger` states
 * it (`peal-contract/data-processing`).
 */
export const quotaLedgerKeptDays = 7;
