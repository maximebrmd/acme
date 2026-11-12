import { Schema } from "effect";

import { Uuid7Schema } from "#shared/domain/ids.ts";

/** A short link's id: a UUIDv7, so a workspace's links page newest first. */
export const ShortLinkIdSchema = Uuid7Schema.pipe(Schema.brand("ShortLinkId"));

export type ShortLinkId = typeof ShortLinkIdSchema.Type;
