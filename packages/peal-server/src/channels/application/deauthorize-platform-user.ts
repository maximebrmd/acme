import { Context, DateTime, Effect, Layer, Option } from "effect";

import { markRefreshNeeded } from "#channels/domain/channel.ts";
import type { Channel } from "#channels/domain/channel.ts";
import { channelsSignedInWith } from "#channels/domain/data-deletion.ts";
import type { MetaAppKind } from "#channels/domain/data-deletion.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

import { ChannelLocks } from "./channel-locks.ts";
import { ChannelNotices } from "./channel-notices.ts";
import { ChannelRepository } from "./channel-repository.ts";
import type { InvalidSignedRequest } from "./invalid-signed-request.ts";
import type { MetaAppNotConfigured } from "./meta-app-not-configured.ts";
import { PlatformUserGrants } from "./platform-user-grants.ts";
import { SignedRequests } from "./signed-requests.ts";

/**
 * Meta's deauthorization callbacks: when one of its users removes Peal from
 * their Facebook or Instagram account, or from Threads, Meta sends a
 * request signed with the app's secret. The tokens Peal holds for the
 * channels that user connected stop working then, so each one, in every
 * workspace, is marked to reconnect, and the members who manage it told,
 * before a post fails on it. Nothing is deleted: that is what a data
 * deletion request asks.
 *
 * A channel changed after the request was made, as by reconnecting it,
 * holds a token the request is not about, and is left as it is: the same
 * request sent again, as Meta retries it or anyone who kept it could,
 * marks nothing the member has since reconnected. Nobody signs in for
 * these: the signature is the authorization.
 */
export class DeauthorizePlatformUser extends Context.Service<
  DeauthorizePlatformUser,
  {
    /** Marks the user's channels to reconnect, and says how many it marked. */
    readonly deauthorize: (
      app: MetaAppKind,
      signedRequest: string
    ) => Effect.Effect<
      number,
      DatabaseError | InvalidSignedRequest | MetaAppNotConfigured
    >;
  }
>()("peal-server/channels/application/DeauthorizePlatformUser") {
  static readonly layer = Layer.effect(
    DeauthorizePlatformUser,
    Effect.gen(function* DeauthorizePlatformUserLive() {
      const others = yield* PlatformUserGrants;
      const signed = yield* SignedRequests;
      const channels = yield* ChannelRepository;
      const locks = yield* ChannelLocks;
      const notices = yield* ChannelNotices;

      // Read again under the channel's lock, so a reconnect or a refresh
      // running meanwhile is never overwritten. Says the channel when this
      // marked it.
      const mark = (
        found: Channel,
        issuedAt: Option.Option<DateTime.Utc>
      ): Effect.Effect<Option.Option<Channel>, DatabaseError> =>
        locks.withLock(
          found.id,
          Effect.gen(function* marking() {
            const current = yield* channels.get(found.id);

            if (Option.isNone(current)) {
              return Option.none<Channel>();
            }

            const channel = current.value;

            const changedSince = Option.exists(issuedAt, (at) =>
              DateTime.isGreaterThan(channel.updatedAt, at)
            );

            const marked = markRefreshNeeded(channel, yield* DateTime.now);

            if (changedSince || marked === channel) {
              return Option.none<Channel>();
            }

            yield* channels.update(marked, Option.none());

            return Option.some(marked);
          })
        );

      const deauthorize = Effect.fn("DeauthorizePlatformUser.deauthorize")(
        function* deauthorize(app: MetaAppKind, signedRequest: string) {
          const { issuedAt, userId } = yield* signed.verify(app, signedRequest);

          // The user's sign-ins to the ad network rest on the same grant.
          yield* others.deauthorized(app, userId);

          const found = yield* channels.restingOn({
            signedIn: channelsSignedInWith(app),
            userId,
          });

          const marked = yield* Effect.forEach(
            found,
            (channel) => mark(channel, issuedAt),
            { concurrency: 1 }
          ).pipe(Effect.map((each) => each.flatMap(Option.toArray)));

          // Told once each is saved: a notice never names a channel that
          // was not marked.
          yield* Effect.forEach(marked, notices.reconnectRequired, {
            discard: true,
          });

          return marked.length;
        }
      );

      return DeauthorizePlatformUser.of({ deauthorize });
    })
  );
}
