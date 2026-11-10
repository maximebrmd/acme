import { Schema } from "effect";

import { Uuid7Schema } from "#shared/domain/ids.ts";

/** A person's grant on an ad network, which reaches their ad accounts. */
export const AdGrantIdSchema = Uuid7Schema.pipe(Schema.brand("AdGrantId"));

export type AdGrantId = typeof AdGrantIdSchema.Type;

/** An ad account connected to a workspace. */
export const AdAccountIdSchema = Uuid7Schema.pipe(Schema.brand("AdAccountId"));

export type AdAccountId = typeof AdAccountIdSchema.Type;

/** A boost: one published post promoted on one ad account. */
export const BoostIdSchema = Uuid7Schema.pipe(Schema.brand("BoostId"));

export type BoostId = typeof BoostIdSchema.Type;

/** One request to an ad network that changes something there. */
export const SpendCallIdSchema = Uuid7Schema.pipe(Schema.brand("SpendCallId"));

export type SpendCallId = typeof SpendCallIdSchema.Type;

/**
 * The id an ad network gives one of its objects (an account, a campaign,
 * an ad): digits on Meta, kept as text, never as a number.
 */
export const NetworkObjectIdSchema = Schema.String.check(
  Schema.isPattern(/^[\w.:-]{1,128}$/u)
).pipe(Schema.brand("NetworkObjectId"));

export type NetworkObjectId = typeof NetworkObjectIdSchema.Type;
