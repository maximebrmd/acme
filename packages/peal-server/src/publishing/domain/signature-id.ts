import { Schema } from "effect";

import { Uuid7Schema } from "#shared/domain/ids.ts";

/** A signature's id: a UUIDv7, so signatures list oldest first. */
export const SignatureIdSchema = Uuid7Schema.pipe(Schema.brand("SignatureId"));

export type SignatureId = typeof SignatureIdSchema.Type;
