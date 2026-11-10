import { Schema } from "effect";

import { Uuid7Schema } from "#shared/domain/ids.ts";

/** A partner account's id: a UUIDv7, as Peal issues them. */
export const PartnerIdSchema = Uuid7Schema.pipe(Schema.brand("PartnerId"));

export type PartnerId = typeof PartnerIdSchema.Type;

/** A partner key's id. */
export const PartnerKeyIdSchema = Uuid7Schema.pipe(
  Schema.brand("PartnerKeyId")
);

export type PartnerKeyId = typeof PartnerKeyIdSchema.Type;
