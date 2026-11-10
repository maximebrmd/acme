import { Schema } from "effect";

import {
  objectBudget,
  objectName,
  objectSchedule,
  objectStatus,
} from "./ad-object.ts";
import { NetworkObjectIdSchema } from "./ids.ts";

/** An ad set (a campaign's group of ads, with its budget and schedule). */
export class SyncedAdSet extends Schema.Class<SyncedAdSet>(
  "peal-server/ads/domain/SyncedAdSet"
)({
  ...objectStatus,
  ...objectBudget,
  ...objectSchedule,
  campaignExternalId: NetworkObjectIdSchema,
  externalId: NetworkObjectIdSchema,
  name: objectName,
}) {}
