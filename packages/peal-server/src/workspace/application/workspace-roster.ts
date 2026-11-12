import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import type { Locale } from "#shared/domain/locale.ts";
import type { Ban } from "#workspace/domain/ban.ts";

import type { DirectoryUnavailable } from "./directory-unavailable.ts";

/** A member of a workspace, as notices need them. */
export interface RosterMember {
  readonly ban: Option.Option<Ban>;
  readonly email: string;
  readonly locale: Locale;
  /** The member's roles, as Better Auth stores them. */
  readonly role: string;
  readonly userId: UserId;
}

/** A page of workspaces, in the order of their ids. */
export interface WorkspacePageRequest {
  /** The last workspace of the page before; none for the first page. */
  readonly after: Option.Option<WorkspaceId>;
  /** Only the workspaces created before this instant. */
  readonly createdBefore: DateTime.Utc;
  readonly limit: number;
}

/** How many members a workspace has. */
export interface WorkspaceSeatCount {
  readonly members: number;
  readonly workspaceId: WorkspaceId;
}

/** Reads a workspace's members. Changes go through Better Auth. */
export class WorkspaceRoster extends Context.Service<
  WorkspaceRoster,
  {
    /** The workspace's name and members, if it exists. */
    readonly members: (workspaceId: WorkspaceId) => Effect.Effect<
      Option.Option<{
        readonly members: readonly RosterMember[];
        readonly name: string;
      }>,
      DirectoryUnavailable
    >;
    /**
     * A page of every workspace and how many members each has, in one
     * query, for jobs that go through them all.
     */
    readonly seatsPage: (
      request: WorkspacePageRequest
    ) => Effect.Effect<readonly WorkspaceSeatCount[], DirectoryUnavailable>;
    /**
     * How many members each of these workspaces has, as `members` lists
     * them, in one query; one without any is left out.
     */
    readonly seatsIn: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<ReadonlyMap<WorkspaceId, number>, DirectoryUnavailable>;
  }
>()("peal-server/workspace/application/WorkspaceRoster") {}
