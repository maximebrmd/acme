import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { ChannelConnection } from "#shared/domain/channel-connection.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";

import type { AccountConnectedThere } from "./account-connected-there.ts";
import type { CustomerChannelNotFound } from "./customer-channel-not-found.ts";
import type { CustomerWorkspaceNotFound } from "./customer-workspace-not-found.ts";
import type { WorkspaceBusy } from "./workspace-busy.ts";

/** A channel as it stands in the workspace it was moved to. */
export interface MovedChannel {
  readonly avatarUrl: Option.Option<string>;
  readonly connection: Option.Option<ChannelConnection>;
  readonly displayName: Option.Option<string>;
  readonly handle: string;
  readonly id: string;
  readonly platform: Platform;
  readonly status:
    | { readonly _tag: "active" }
    | { readonly _tag: "disabled"; readonly refreshNeeded: boolean }
    | { readonly _tag: "refreshNeeded" };
  /** When it must be reconnected by, for a token Peal cannot renew. */
  readonly tokenExpiresAt: Option.Option<DateTime.Utc>;
}

/**
 * Moves a channel between two workspaces of one pool, as the channels
 * context moves one (`ChannelMoves`), once nothing is being sent through
 * it for the workspace it leaves (publishing's posts and their changes):
 * refused with `WorkspaceBusy` while a call is in flight.
 */
export class ChannelMover extends Context.Service<
  ChannelMover,
  {
    readonly move: (move: {
      readonly channelId: string;
      readonly from: WorkspaceId;
      /**
       * What the caller checks first, in the move's transaction: that
       * both workspaces are still the partner's.
       */
      readonly inside: Effect.Effect<
        void,
        CustomerWorkspaceNotFound | DatabaseError
      >;
      readonly to: WorkspaceId;
    }) => Effect.Effect<
      MovedChannel,
      | AccountConnectedThere
      | CustomerChannelNotFound
      | CustomerWorkspaceNotFound
      | DatabaseError
      | WorkspaceBusy
    >;
  }
>()("peal-server/workspace/application/ChannelMover") {}
