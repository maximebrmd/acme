import { Result } from "effect";

import { can } from "./access.ts";
import type { Actor, Permission } from "./access.ts";
import { MissingPermission } from "./missing-permission.ts";

/** The actor, if they may do this, for use cases to check before acting. */
export const authorize = (
  actor: Actor,
  permission: Permission
): Result.Result<Actor, MissingPermission> =>
  can(actor, permission)
    ? Result.succeed(actor)
    : Result.fail(new MissingPermission({ permission }));
