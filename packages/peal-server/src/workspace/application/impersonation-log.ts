import { Context } from "effect";
import type { Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";

/** A staff member acting as an account. */
export interface Impersonation {
  readonly staffId: UserId;
  /** The account they act as. */
  readonly userId: UserId;
}

/** A change staff asked for while acting as an account. */
export interface ImpersonatedChange extends Impersonation {
  /** The ids the request named, by name (`postId`), never its content. */
  readonly objectIds: Readonly<Record<string, string | undefined>>;
  /**
   * The endpoint, as `group.endpoint` (`posts.update`), or the sign-in
   * service's route, as `auth:/path`.
   */
  readonly operation: string;
  readonly workspaceId: Option.Option<WorkspaceId>;
}

/**
 * The audit log of what staff do while acting as someone, which the staff
 * context keeps.
 */
export class ImpersonationLog extends Context.Service<
  ImpersonationLog,
  {
    readonly changed: (
      change: ImpersonatedChange
    ) => Effect.Effect<void, DatabaseError>;
    /** Staff stopped acting as the account, through `operation`. */
    readonly stopped: (
      impersonation: Impersonation & { readonly operation: string }
    ) => Effect.Effect<void, DatabaseError>;
    /** The server ended a session staff acted as the account in. */
    readonly ended: (
      impersonation: Impersonation
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/workspace/application/ImpersonationLog") {}
