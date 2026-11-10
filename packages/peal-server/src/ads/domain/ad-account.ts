import { Schema } from "effect";

import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";

import { AdAccountStatusSchema } from "./ad-account-status.ts";
import { AdNetworkSchema } from "./ad-network.ts";
import {
  AdAccountIdSchema,
  AdGrantIdSchema,
  NetworkObjectIdSchema,
} from "./ids.ts";
import { AmountSchema, CurrencySchema } from "./money.ts";

/**
 * Whether Peal's reads of the account work: `reconnectNeeded` once the
 * network refused the grant's token, until the person signs in again.
 */
export const AdAccountAccessSchema = Schema.Literals([
  "working",
  "reconnectNeeded",
]);

export type AdAccountAccess = typeof AdAccountAccessSchema.Type;

/** An ad account connected to a workspace. */
export class AdAccount extends Schema.Class<AdAccount>(
  "peal-server/ads/domain/AdAccount"
)({
  access: AdAccountAccessSchema,
  amountSpent: Schema.Option(AmountSchema),
  connectedAt: Schema.DateTimeUtc,
  /** The member who connected it, none once their account is closed. */
  connectedBy: Schema.Option(UserIdSchema),
  currency: CurrencySchema,
  /** The account's id at its network: digits, without Meta's `act_`. */
  externalId: NetworkObjectIdSchema,
  grantId: AdGrantIdSchema,
  id: AdAccountIdSchema,
  name: Schema.String,
  network: AdNetworkSchema,
  spendCap: Schema.Option(AmountSchema),
  status: AdAccountStatusSchema,
  /** When a sync last read it whole; none before the first. */
  syncedAt: Schema.Option(Schema.DateTimeUtc),
  timeZone: TimeZoneIdSchema,
  workspaceId: WorkspaceIdSchema,
}) {}
