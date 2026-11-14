import { Result, Schema } from "effect";

import { PermissionSchema } from "#shared/domain/access.ts";
import type { Permission } from "#shared/domain/access.ts";

import { PartnerIdSchema, PartnerKeyIdSchema } from "./partner-id.ts";
import { PermissionNotGrantable } from "./permission-not-grantable.ts";

/** What every partner key starts with, which tells it from other keys. */
export const partnerKeyPrefix = "peal_partner_";

/**
 * What a partner key may do with the partner's workspaces themselves:
 * list and read them, create and change them, and offboard them, which
 * erases everything they hold.
 */
export const PartnerScopeSchema = Schema.Literals([
  "workspaces:read",
  "workspaces:write",
  "workspaces:delete",
]);

export type PartnerScope = typeof PartnerScopeSchema.Type;

/**
 * What a partner key may be given in the workspaces its partner owns: what
 * a product does for its customers (channels, media, posts, analytics,
 * the comments under their posts and the replies to them, which are
 * public messages from the account as posts are,
 * the writing assistant, webhooks, reading the plan's usage), and reading
 * the activity log, which in a workspace without members nobody else
 * reads. Never what
 * only people do: members and invitations, API keys, billing changes,
 * deleting through the workspace itself.
 */
export const partnerKeyPermissions: readonly Permission[] = [
  "activity:read",
  "analytics:read",
  "assistant:use",
  "assistant:configure",
  "billing:read",
  "channel:read",
  "channel:connect",
  "channel:disconnect",
  "engagement:read",
  "engagement:reply",
  "engagement:message",
  "engagement:readMessages",
  "media:read",
  "media:upload",
  "media:delete",
  "post:read",
  "post:create",
  "post:update",
  "post:delete",
  "post:schedule",
  "post:approve",
  "post:publish",
  "webhook:read",
  "webhook:manage",
];

/** How long a partner key's name may be. */
export const maxPartnerKeyNameLength = 80;

/**
 * A partner key, as it is listed. The key itself is shown once, when it is
 * created, and stored only as its SHA-256. It acts in every workspace its
 * partner owns, with `permissions`, and on those workspaces themselves
 * with `scopes`; never in the partner's home workspace, nor anywhere else.
 */
export class PartnerKey extends Schema.Class<PartnerKey>(
  "peal-server/workspace/domain/PartnerKey"
)({
  createdAt: Schema.DateTimeUtc,
  expiresAt: Schema.Option(Schema.DateTimeUtc),
  id: PartnerKeyIdSchema,
  name: Schema.String,
  partnerId: PartnerIdSchema,
  permissions: Schema.Array(PermissionSchema),
  scopes: Schema.Array(PartnerScopeSchema),
  // Its first characters, prefix included, to tell keys apart.
  start: Schema.String,
}) {}

/**
 * The permissions a new partner key takes, once each and in vocabulary
 * order: only those a partner key may ever hold.
 */
export const grantableToPartnerKey = (
  requested: readonly Permission[]
): Result.Result<readonly Permission[], PermissionNotGrantable> => {
  const refused = requested.find(
    (permission) => !partnerKeyPermissions.includes(permission)
  );

  return refused === undefined
    ? Result.succeed(
        partnerKeyPermissions.filter((permission) =>
          requested.includes(permission)
        )
      )
    : Result.fail(new PermissionNotGrantable({ permission: refused }));
};

/** The scopes asked for, once each and in vocabulary order. */
export const distinctScopes = (
  requested: readonly PartnerScope[]
): readonly PartnerScope[] =>
  PartnerScopeSchema.literals.filter((scope) => requested.includes(scope));
