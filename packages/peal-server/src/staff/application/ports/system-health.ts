import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { PostId, WorkspaceId } from "#shared/domain/ids.ts";

import type { ChannelHealth } from "./workspace-health.ts";

/** A scheduled post due soon. */
export interface DuePost {
  readonly channels: number;
  readonly postId: PostId;
  readonly scheduledAt: DateTime.Utc;
  readonly workspaceId: WorkspaceId;
}

/** What the system page reads of the server and every workspace. */
export class SystemHealth extends Context.Service<
  SystemHealth,
  {
    /** Whether the database answers, within a couple of seconds. */
    readonly ready: Effect.Effect<boolean>;
    /** The release the server runs, if it was told. */
    readonly release: Option.Option<string>;
    readonly due: (range: {
      readonly from: DateTime.Utc;
      readonly limit: number;
      readonly to: DateTime.Utc;
    }) => Effect.Effect<
      { readonly posts: readonly DuePost[]; readonly total: number },
      DatabaseError
    >;
    /** Posts still scheduled for a time before `before`. */
    readonly overdue: (
      before: DateTime.Utc
    ) => Effect.Effect<number, DatabaseError>;
    /** Channels to reconnect, now or soon, in every workspace. */
    readonly failingChannels: (
      limit: number
    ) => Effect.Effect<readonly ChannelHealth[], DatabaseError>;
  }
>()("peal-server/staff/application/SystemHealth") {}
