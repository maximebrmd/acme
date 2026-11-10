import { Schema } from "effect";

/**
 * What a server offers of ads, as its operator set it (`PEAL_ADS`):
 *
 * - `off`: nothing. The default: an operator turns ads on once its app at
 *   the network has the access they take.
 * - `read`: ad accounts connect, and their campaigns and numbers are read.
 *   The sign-in asks for reading only, and nothing spends.
 * - `spend`: boosting too, for the accounts an owner allowed to spend.
 */
export const AdsModeSchema = Schema.Literals(["off", "read", "spend"]);

export type AdsMode = typeof AdsModeSchema.Type;
