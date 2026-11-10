import { Config } from "effect";

/**
 * `X_ANALYTICS`: whether the server reads counts on X, false unless set. X
 * bills the server's app for each post and each account a read returns
 * (pay per use), so the operator turns it on knowingly. Analytics reads
 * with it, and publishing tells clients what each channel offers.
 */
export const xAnalyticsConfig = Config.Boolean("X_ANALYTICS").pipe(
  Config.withDefault(false)
);
