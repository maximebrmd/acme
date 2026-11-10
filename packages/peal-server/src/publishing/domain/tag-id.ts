import { Schema } from "effect";

import { Uuid7Schema } from "#shared/domain/ids.ts";

/** A tag's id: a UUIDv7, so a workspace's tags list oldest first. */
export const TagIdSchema = Uuid7Schema.pipe(Schema.brand("TagId"));

export type TagId = typeof TagIdSchema.Type;
