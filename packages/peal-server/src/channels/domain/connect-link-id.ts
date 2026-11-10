import { Schema } from "effect";

import { Uuid7Schema } from "#shared/domain/ids.ts";

/** A connect link's id: what its workspace reads it by, never its token. */
export const ConnectLinkIdSchema = Uuid7Schema.pipe(
  Schema.brand("ConnectLinkId")
);

export type ConnectLinkId = typeof ConnectLinkIdSchema.Type;
