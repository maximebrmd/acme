import { Schema } from "effect";

import { Uuid7Schema } from "#shared/domain/ids.ts";

/** A stored image or video. */
export const MediaAssetIdSchema = Uuid7Schema.pipe(
  Schema.brand("MediaAssetId")
);

export type MediaAssetId = typeof MediaAssetIdSchema.Type;
