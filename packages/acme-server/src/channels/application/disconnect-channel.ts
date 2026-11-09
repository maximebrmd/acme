import { Context, Duration, Effect, Layer, Option, Schema } from "effect";

import type { Channel } from "#channels/domain/channel.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

import type { ChannelCredentials } from "./channel-credentials.ts";
import { ChannelNotFound } from "./channel-not-found.ts";
import { ChannelRepository } from "./channel-repository.ts";
import { decryptTokens } from "./channel-tokens.ts";
import { PlatformAuthorizers } from "./platform-authorizer.ts";
import { TokenCipher } from "./token-cipher.ts";

const decodeChannelId = Schema.decodeUnknownOption(ChannelIdSchema);

// The longest a disconnect waits on the platform to forget Acme's grant.
const revokeTimeout = Duration.seconds(10);

/**
 * Disconnects a channel of the actor's workspace: the channel and its tokens
 * are deleted. Needs channel:disconnect. An id that names no channel of the
 * workspace, including one that is not a channel id at all, is
 * ChannelNotFound.
 *
 * Once it is gone, a platform that asks to be told (TikTok) is asked to
 * revoke the tokens it had. That is the platform's business only: a
 * failure is logged, and the channel stays disconnected.
 */
export class DisconnectChannel extends Context.Service<
  DisconnectChannel,
  {
    readonly disconnect: (
      actor: Actor,
      channelId: string
    ) => Effect.Effect<
      void,
      ChannelNotFound | DatabaseError | MissingPermission
    >;
  }
>()("acme-server/channels/application/DisconnectChannel") {
  static readonly layer = Layer.effect(
    DisconnectChannel,
    Effect.gen(function* DisconnectChannelLive() {
      const channels = yield* ChannelRepository;
      const authorizers = yield* PlatformAuthorizers;
      const cipher = yield* TokenCipher;

      // Asks the platform to revoke the removed channel's grant, if it
      // takes such a request; never fails.
      const revoke = (
        channel: Channel,
        stored: Option.Option<ChannelCredentials>
      ) => {
        const revoking = authorizers
          .for(channel.platform)
          .pipe(
            Option.flatMap(({ revoke: revokeOn }) =>
              Option.fromUndefinedOr(revokeOn)
            )
          );

        if (Option.isNone(revoking) || Option.isNone(stored)) {
          return Effect.void;
        }

        return decryptTokens(stored.value, channel.id).pipe(
          Effect.provideService(TokenCipher, cipher),
          Effect.flatMap(revoking.value),
          Effect.timeout(revokeTimeout),
          Effect.tapError((failure) =>
            Effect.logWarning(
              "The platform was not told a disconnected channel's tokens are revoked",
              failure
            ).pipe(
              Effect.annotateLogs({
                channelId: channel.id,
                platform: channel.platform,
              })
            )
          ),
          Effect.ignore,
          Effect.withSpan("DisconnectChannel.revoke", {
            attributes: { platform: channel.platform },
          })
        );
      };

      const disconnect = Effect.fn("DisconnectChannel.disconnect")(
        function* disconnect(actor: Actor, channelId: string) {
          yield* Effect.fromResult(authorize(actor, "channel:disconnect"));

          const id = decodeChannelId(channelId);

          const found = Option.isSome(id)
            ? yield* channels.findById(actor.workspaceId, id.value)
            : Option.none<Channel>();

          if (Option.isNone(found)) {
            return yield* new ChannelNotFound({ channelId });
          }

          const channel = found.value;
          const stored = yield* channels.credentials(channel.id);
          const removed = yield* channels.remove(actor.workspaceId, channel.id);

          if (!removed) {
            return yield* new ChannelNotFound({ channelId });
          }

          return yield* revoke(channel, stored);
        }
      );

      return DisconnectChannel.of({ disconnect });
    })
  );
}
