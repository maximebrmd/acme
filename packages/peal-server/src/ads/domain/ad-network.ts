import { Schema } from "effect";

/**
 * The ad networks Peal reaches. Stored with every account and object: add
 * one, never rename one.
 */
export const AdNetworkSchema = Schema.Literals(["meta"]);

export type AdNetwork = typeof AdNetworkSchema.Type;
