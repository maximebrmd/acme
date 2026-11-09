import { Option } from "effect";
import type { DateTime } from "effect";

import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";
import type {
  ChannelHealth,
  ChannelState,
} from "#staff/application/ports/workspace-health.ts";

/** What the channels context's ChannelOversight answers with, as read here. */
export interface OverseenChannel {
  readonly handle: string;
  readonly id: ChannelId;
  readonly platform: Platform;
  readonly status: ChannelState;
  readonly token:
    | { readonly _tag: "nonExpiring" }
    | {
        readonly _tag: "nonRefreshable" | "refreshable";
        readonly expiresAt: DateTime.Utc;
      };
  readonly workspaceId: WorkspaceId;
}

/**
 * What staff see of a channel: its account, whether it posts, and when a
 * token that cannot be renewed runs out. Never its tokens or scopes.
 */
export const healthOf = (channel: OverseenChannel): ChannelHealth => ({
  handle: channel.handle,
  id: channel.id,
  platform: channel.platform,
  status: channel.status,
  tokenExpiresAt:
    channel.token._tag === "nonRefreshable"
      ? Option.some(channel.token.expiresAt)
      : Option.none(),
  workspaceId: channel.workspaceId,
});
