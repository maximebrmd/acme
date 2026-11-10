import { Schema } from "effect";

import {
  objectBudget,
  objectName,
  objectSchedule,
  objectStatus,
  CampaignObjectiveSchema,
} from "./ad-object.ts";
import { NetworkObjectIdSchema } from "./ids.ts";

/** A campaign as its network describes it. */
export class SyncedCampaign extends Schema.Class<SyncedCampaign>(
  "peal-server/ads/domain/SyncedCampaign"
)({
  ...objectStatus,
  ...objectBudget,
  ...objectSchedule,
  externalId: NetworkObjectIdSchema,
  name: objectName,
  objective: CampaignObjectiveSchema,
}) {}
