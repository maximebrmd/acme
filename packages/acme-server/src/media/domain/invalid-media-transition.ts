import { Schema } from "effect";

import { MediaAssetIdSchema } from "./media-asset-id.ts";
import { MediaStatusNameSchema } from "./media-status.ts";

/** The transitions of `./media-asset.ts`, by name. */
export const MediaActionSchema = Schema.Literals([
  "markUploaded",
  "markReady",
  "markRejected",
]);

export type MediaAction = typeof MediaActionSchema.Type;

/** A transition the asset's current status does not allow. */
export class InvalidMediaTransition extends Schema.TaggedError<InvalidMediaTransition>()(
  "InvalidMediaTransition",
  {
    action: MediaActionSchema,
    assetId: MediaAssetIdSchema,
    from: MediaStatusNameSchema,
  }
) {
  override get message(): string {
    return `Cannot ${this.action} media ${this.assetId} while it is ${this.from}`;
  }
}
