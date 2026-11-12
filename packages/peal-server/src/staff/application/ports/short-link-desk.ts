import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/** A short link, as staff read it. */
export interface StaffShortLinkSummary {
  readonly channelId: string;
  readonly code: string;
  readonly createdAt: DateTime.Utc;
  readonly destination: string;
  readonly disabledAt: Option.Option<DateTime.Utc>;
  readonly postId: string;
  readonly workspaceId: WorkspaceId;
}

/** The short links of every workspace, by their code, for staff. */
export class ShortLinkDesk extends Context.Service<
  ShortLinkDesk,
  {
    readonly find: (
      code: string
    ) => Effect.Effect<Option.Option<StaffShortLinkSummary>, DatabaseError>;
    /** A workspace's links, newest first, at most `limit`, and how many. */
    readonly ofWorkspace: (
      workspaceId: WorkspaceId,
      limit: number
    ) => Effect.Effect<
      {
        readonly links: readonly StaffShortLinkSummary[];
        readonly total: number;
      },
      DatabaseError
    >;
    /** Turns off every link of the workspace still on; says how many. */
    readonly disableWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<number, DatabaseError>;
    /** Turns it off or on again; none when no link has the code. */
    readonly setDisabled: (
      code: string,
      disabled: boolean
    ) => Effect.Effect<Option.Option<StaffShortLinkSummary>, DatabaseError>;
  }
>()("peal-server/staff/application/ports/ShortLinkDesk") {}
