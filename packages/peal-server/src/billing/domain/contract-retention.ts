import { DateTime } from "effect";

/**
 * How long billing keeps the orders and withdrawals of a workspace once it
 * is erased: 5 years, the time a consumer has to sue over the contract, or
 * dispute a charge, from the day they knew of it (art. 2224 of the Code
 * civil; L110-4 of the Code de commerce), and Peal to show the request to
 * start at once, the withdrawal information it gave (CRD art. 7(3), 8(8))
 * and what it refunded. Erasing the workspace ends the contract at the
 * latest; while it exists, they stay with it.
 */
export const contractRetention = { years: 5 } as const;

/** Records of a workspace erased before this instant are purged at `now`. */
export const contractCutoff = (now: DateTime.Utc): DateTime.Utc =>
  DateTime.subtract(now, contractRetention);
