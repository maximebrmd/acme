import { Effect, Layer, Option, Schema } from "effect";

import { ChannelMoves } from "#channels/application/channel-moves.ts";
import { PostRecords } from "#publishing/application/post-records.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import { AccountConnectedThere } from "#workspace/application/account-connected-there.ts";
import { ChannelMover } from "#workspace/application/channel-mover.ts";
import type { MovedChannel } from "#workspace/application/channel-mover.ts";
import { CustomerChannelNotFound } from "#workspace/application/customer-channel-not-found.ts";
import { WorkspaceBusy } from "#workspace/application/workspace-busy.ts";

const decodeChannelId = Schema.decodeUnknownOption(ChannelIdSchema);

/**
 * ChannelMover through the channels context's ChannelMoves, once
 * publishing says no call is in flight through the channel for the
 * workspace it leaves (`PostRecords.ensureChannelIdle`), which holds its
 * posts' targets on the channel until the move commits: a post that comes
 * due meanwhile then finds the channel gone, as after a disconnection. A
 * token that does not open, or a server without its keys, is the server's
 * own failure.
 */
export const ContextChannelMoverLive = Layer.effect(
  ChannelMover,
  Effect.gen(function* ContextChannelMover() {
    const moves = yield* ChannelMoves;
    const posts = yield* PostRecords;

    return ChannelMover.of({
      move: ({ channelId, from, inside, to }) =>
        Option.match(decodeChannelId(channelId), {
          onNone: () => Effect.fail(new CustomerChannelNotFound()),
          onSome: (id) =>
            moves
              .move({
                channelId: id,
                from,
                inside: inside.pipe(
                  Effect.andThen(
                    posts
                      .ensureChannelIdle(from, id)
                      .pipe(
                        Effect.catchTag("PostsPublishing", () =>
                          Effect.fail(new WorkspaceBusy({ workspaceId: from }))
                        )
                      )
                  )
                ),
                to,
              })
              .pipe(
                Effect.map((channel): MovedChannel => ({
                  avatarUrl: channel.avatarUrl,
                  connection: channel.connection,
                  displayName: channel.displayName,
                  handle: channel.handle,
                  id: channel.id,
                  platform: channel.platform,
                  status: channel.status,
                  tokenExpiresAt:
                    channel.token._tag === "nonRefreshable"
                      ? Option.some(channel.token.expiresAt)
                      : Option.none(),
                })),
                Effect.catchTags({
                  ChannelAccountTaken: ({ channelId: there }) =>
                    Effect.fail(
                      new AccountConnectedThere({ channelId: there })
                    ),
                  ChannelNotFound: () =>
                    Effect.fail(new CustomerChannelNotFound()),
                  MalformedEncryptedToken: Effect.die,
                  MissingTokenKey: Effect.die,
                  TokenAuthenticationFailed: Effect.die,
                  UnknownTokenKey: Effect.die,
                })
              ),
        }),
    });
  })
);
