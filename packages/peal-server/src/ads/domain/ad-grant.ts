import { Schema } from "effect";

import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";

import { AdAccountAccessSchema } from "./ad-account.ts";
import { AdNetworkSchema } from "./ad-network.ts";
import { AdGrantIdSchema } from "./ids.ts";

/**
 * A person's sign-in to an ad network for a workspace: what reaches the ad
 * accounts they chose to connect. Its token is kept apart, encrypted. A
 * person signs in once per workspace and network: signing in again renews
 * the same grant.
 */
export class AdGrant extends Schema.Class<AdGrant>(
  "peal-server/ads/domain/AdGrant"
)({
  access: AdAccountAccessSchema,
  createdAt: Schema.DateTimeUtc,
  /** When the network said the token ends; none when it gave no end. */
  expiresAt: Schema.Option(Schema.DateTimeUtc),
  /** The member who signed in, none once their account is closed. */
  grantedBy: Schema.Option(UserIdSchema),
  id: AdGrantIdSchema,
  network: AdNetworkSchema,
  /** The person's id at the network, which a data deletion request names. */
  platformUserId: Schema.NonEmptyString,
  /** What the person allowed, in the network's words. */
  scopes: Schema.Array(Schema.NonEmptyString),
  updatedAt: Schema.DateTimeUtc,
  workspaceId: WorkspaceIdSchema,
}) {}
