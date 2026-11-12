import { Context } from "effect";
import type { Effect, Option } from "effect";

import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import type { Account } from "#workspace/domain/account.ts";
import type { Membership } from "#workspace/domain/membership.ts";

import type { DirectoryUnavailable } from "./directory-unavailable.ts";

/** Reads users and their memberships. Changes go through Better Auth. */
export class MemberDirectory extends Context.Service<
  MemberDirectory,
  {
    readonly account: (
      userId: UserId
    ) => Effect.Effect<Option.Option<Account>, DirectoryUnavailable>;
    readonly membership: (
      userId: UserId,
      workspaceId: WorkspaceId
    ) => Effect.Effect<Option.Option<Membership>, DirectoryUnavailable>;
    /**
     * The user's place in each of these workspaces, read as `membership`
     * reads one, in one query; a workspace they are not in is left out.
     */
    readonly memberships: (
      userId: UserId,
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<
      ReadonlyMap<WorkspaceId, Membership>,
      DirectoryUnavailable
    >;
  }
>()("peal-server/workspace/application/MemberDirectory") {}
