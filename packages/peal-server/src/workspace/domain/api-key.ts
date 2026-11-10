import { Result, Schema } from "effect";

import { can, PermissionSchema } from "#shared/domain/access.ts";
import type { Actor, Permission } from "#shared/domain/access.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { MissingPermission } from "#shared/domain/missing-permission.ts";

import { personOnlyPermissions } from "./oauth-grant.ts";
import { PermissionNotGrantable } from "./permission-not-grantable.ts";

/**
 * An API key of a workspace, as it is listed. The key itself is shown once,
 * when it is created, and stored only hashed.
 */
export class ApiKey extends Schema.Class<ApiKey>(
  "peal-server/workspace/domain/ApiKey"
)({
  createdAt: Schema.DateTimeUtc,
  expiresAt: Schema.Option(Schema.DateTimeUtc),
  id: Schema.NonEmptyString,
  name: Schema.String,
  permissions: Schema.Array(PermissionSchema),
  // Its first characters, prefix included, to tell keys apart.
  start: Schema.Option(Schema.String),
  workspaceId: WorkspaceIdSchema,
}) {}

/**
 * The permissions a member may give a new API key, once each and in
 * vocabulary order: only ones they hold themselves, so a key never does
 * more than its creator could, and never one only a person in their own
 * session uses (`personOnlyPermissions`: deciding what ads may spend).
 */
export const grantableBy = (
  actor: Actor,
  requested: readonly Permission[]
): Result.Result<
  readonly Permission[],
  MissingPermission | PermissionNotGrantable
> => {
  const personal = requested.find((permission) =>
    personOnlyPermissions.has(permission)
  );

  if (personal !== undefined) {
    return Result.fail(new PermissionNotGrantable({ permission: personal }));
  }

  const missing = requested.find((permission) => !can(actor, permission));

  return missing === undefined
    ? Result.succeed(
        PermissionSchema.literals.filter((permission) =>
          requested.includes(permission)
        )
      )
    : Result.fail(new MissingPermission({ permission: missing }));
};
