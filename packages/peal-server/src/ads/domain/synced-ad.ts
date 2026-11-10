import { Schema } from "effect";

import { objectName, objectStatus } from "./ad-object.ts";
import { NetworkObjectIdSchema } from "./ids.ts";

/**
 * An ad, with the post it shows when it promotes one that exists: the
 * platform's own id of that post, which publishing knows its targets by.
 */
export class SyncedAd extends Schema.Class<SyncedAd>(
  "peal-server/ads/domain/SyncedAd"
)({
  ...objectStatus,
  adSetExternalId: NetworkObjectIdSchema,
  campaignExternalId: NetworkObjectIdSchema,
  externalId: NetworkObjectIdSchema,
  name: objectName,
  /** The Instagram media the ad shows, if it promotes one. */
  promotedInstagramMediaId: Schema.Option(Schema.NonEmptyString),
  /** The Facebook Page post the ad shows, if it promotes one. */
  promotedPagePostId: Schema.Option(Schema.NonEmptyString),
}) {}
