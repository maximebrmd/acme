import { Option, Result, Schema } from "effect";

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

// The direct messages' permissions: a key that holds them reads and
// answers private correspondence with no further leave, so it is the
// owner's leave itself.
const messagePermissions: ReadonlySet<Permission> = new Set([
  "engagement:readMessages",
  "engagement:message",
]);

// An owner (`organization:secure`) in their own session: not an
// application acting for them, nor staff acting as them.
const ownerInPerson = (actor: Actor) =>
  actor.subject._tag === "user" &&
  actor.subject.clientId === undefined &&
  Option.isNone(actor.subject.impersonatedBy) &&
  can(actor, "organization:secure");

/**
 * The permissions a member may give a new API key, once each and in
 * vocabulary order: only ones they hold themselves, so a key never does
 * more than its creator could, and never one only a person in their own
 * session uses (`personOnlyPermissions`: deciding what ads may spend).
 * The direct messages' (`engagement:readMessages`, `engagement:message`)
 * only an owner in person gives, as they let an application in.
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

  const correspondence = ownerInPerson(actor)
    ? undefined
    : requested.find((permission) => messagePermissions.has(permission));

  if (correspondence !== undefined) {
    return Result.fail(
      new PermissionNotGrantable({ permission: correspondence })
    );
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
