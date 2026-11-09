import { Context } from "effect";
import type { Effect, Option } from "effect";

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
  }
>()("acme-server/workspace/application/WorkspaceRoster") {}
