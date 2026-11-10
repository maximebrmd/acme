import { Effect } from "effect";

import type { ChannelUnusable } from "#channels/application/channel-unusable.ts";
import { ChannelUnreadable } from "#engagement/application/channel-unreadable.ts";
import type { ReplyFailure } from "#engagement/domain/reply.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";

// What a refusal of the channels context means for engagement.

/** Gone, or turned off: for a read. */
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
  Effect.logWarning("Could not read a channel for engagement", failure).pipe(
    Effect.andThen(Effect.fail(new PlatformUnavailable()))
  );

/**
 * Why nothing was sent, when the channels context gave no token: each
 * comes before any request to the platform.
 */
export const accessFailure = (
  failure:
    | ChannelUnusable
    | DatabaseError
    | PlatformUnavailable
    | { readonly _tag: "TokenExpired" }
): ReplyFailure => {
  if (failure._tag === "ChannelUnusable") {
    return "channelUnavailable";
  }

  return failure._tag === "TokenExpired"
    ? "reconnectNeeded"
    : "platformUnavailable";
};

/** Answers what `onRefused` makes of why no token could be had. */
export const refusedWith =
  <A>(onRefused: (reason: ReplyFailure) => A) =>
  (failure: Parameters<typeof accessFailure>[0]) =>
    Effect.succeed(onRefused(accessFailure(failure)));
