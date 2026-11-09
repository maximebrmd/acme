import { Effect } from "effect";

import { ChannelUnreadable } from "#analytics/application/channel-unreadable.ts";
import type { ChannelUnusable } from "#channels/application/channel-unusable.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";

// What a refusal of the channels context means for reading counts: the
// channel left the workspace, is off or needs reconnecting, or the
// database did not answer and the next run tries again.

/** Gone, or turned off. */
export const unusable = ({ reason }: ChannelUnusable) =>
  Effect.fail(
    new ChannelUnreadable({
      reason: reason === "notFound" ? "disconnected" : "paused",
    })
  );

/** The token stopped working: nothing is read until the channel is reconnected. */
export const needsReconnect = () =>
  Effect.fail(new ChannelUnreadable({ reason: "paused" }));

/** The channels context could not read the channel: for now. */
export const databaseDown = (failure: DatabaseError) =>
  Effect.logWarning("Could not read a channel for analytics", failure).pipe(
    Effect.andThen(Effect.fail(new PlatformUnavailable()))
  );
