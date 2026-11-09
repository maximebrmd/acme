import { Context, DateTime, Effect, Layer, Option, Schema } from "effect";

import {
  connectChannel,
  reconnect as reconnectChannel,
} from "#channels/domain/channel.ts";
import type { Channel, ConnectedAccount } from "#channels/domain/channel.ts";
import {
  completableBy,
  startAttempt,
  starterOf,
} from "#channels/domain/connect-attempt.ts";
import { InvalidConnectState } from "#channels/domain/invalid-connect-state.ts";
import { platforms } from "#channels/domain/platform.ts";
import type { Platform } from "#channels/domain/platform.ts";
import { tokenLifetimeOf } from "#channels/domain/token-policy.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { Ids, newId } from "#shared/application/ids.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

import { AuthorizationDenied } from "./authorization-denied.ts";
import { AuthorizationFailed } from "./authorization-failed.ts";
import { ChannelLocks } from "./channel-locks.ts";
import { ChannelNotFound } from "./channel-not-found.ts";
import { ChannelRepository } from "./channel-repository.ts";
import { encryptTokens } from "./channel-tokens.ts";
import { ConnectAttempts } from "./connect-attempts.ts";
import type { MissingTokenKey } from "./missing-token-key.ts";
import { PlatformAuthorizers } from "./platform-authorizer.ts";
import type {
  AuthorizationCallback,
  AuthorizedAccount,
  BeginFailure,
  CompleteFailure,
  PendingAuthorization,
  PlatformAuthorizer,
} from "./platform-authorizer.ts";
import { PlatformNotConnectable } from "./platform-not-connectable.ts";
import { ReconnectAccountMismatch } from "./reconnect-account-mismatch.ts";
import { connectAttemptContext, TokenCipher } from "./token-cipher.ts";

const decodeChannelId = Schema.decodeUnknownOption(ChannelIdSchema);

// The errors platforms send back when the user refuses: OAuth's own
// (RFC 6749, 4.1.2.1), and LinkedIn's, for a member who cancelled signing
// in or refused the permissions.
const denials: ReadonlySet<string> = new Set([
  "access_denied",
  "user_cancelled_authorize",
  "user_cancelled_login",
]);

export type StartFailure =
  | BeginFailure
  | DatabaseError
  | MissingPermission
  | MissingTokenKey
  | PlatformNotConnectable;

export type CompleteConnectFailure =
  | ChannelNotFound
  | CompleteFailure
  | DatabaseError
  | InvalidConnectState
  | MissingPermission
  | MissingTokenKey
  | PlatformNotConnectable
  | ReconnectAccountMismatch;

/** What a member asked to connect. */
export interface ConnectRequest {
  readonly handle: Option.Option<string>;
  readonly instance: Option.Option<string>;
}

/**
 * Connects social accounts to the actor's workspace, in two steps around the
 * platform's sign-in page: `start` (or `reconnect`, for a channel that has
 * one) says where to send the browser, and `complete` takes what the
 * platform sent back. Each needs channel:connect.
 *
 * The attempt between them is bound to the actor and the workspace, expires
 * after a quarter of an hour, and completes once. Its secret, like the
 * channel's tokens, is stored encrypted.
 */
export class ConnectChannel extends Context.Service<
  ConnectChannel,
  {
    /** The platform's sign-in page for a new account. */
    readonly start: (
      actor: Actor,
      platform: Platform,
      request: ConnectRequest
    ) => Effect.Effect<string, StartFailure>;
    /** The platform's sign-in page for the account of a channel. */
    readonly reconnect: (
      actor: Actor,
      channelId: string
    ) => Effect.Effect<string, ChannelNotFound | StartFailure>;
    /**
     * The channel the account became, or the one it reconnected. An account
     * the workspace already has is reconnected rather than added twice.
     */
    readonly complete: (
      actor: Actor,
      platform: Platform,
      callback: AuthorizationCallback
    ) => Effect.Effect<Channel, CompleteConnectFailure>;
    /**
     * The platforms this server can connect, in Acme's order: those with a
     * sign-in flow and the settings it needs. Needs channel:read.
     */
    readonly connectable: (
      actor: Actor
    ) => Effect.Effect<readonly Platform[], MissingPermission>;
    /** Forgets the attempts nobody completed in time, and says how many. */
    readonly purgeExpired: Effect.Effect<number, DatabaseError>;
  }
>()("acme-server/channels/application/ConnectChannel") {
  static readonly layer = Layer.effect(
    ConnectChannel,
    Effect.gen(function* ConnectChannelLive() {
      const authorizers = yield* PlatformAuthorizers;
      const attempts = yield* ConnectAttempts;
      const channels = yield* ChannelRepository;
      const cipher = yield* TokenCipher;
      const locks = yield* ChannelLocks;
      const ids = yield* Ids;
      const tokenServices = Effect.provideService(TokenCipher, cipher);

      const authorizerFor = (
        platform: Platform
      ): Effect.Effect<PlatformAuthorizer, PlatformNotConnectable> =>
        Option.match(authorizers.for(platform), {
          onNone: () =>
            Effect.fail(
              new PlatformNotConnectable({
                platform,
                reason: authorizers.unconfigured.has(platform)
                  ? "notConfigured"
                  : "notSupported",
              })
            ),
          onSome: Effect.succeed,
        });

      const saveAttempt = Effect.fn("ConnectChannel.saveAttempt")(
        function* saveAttempt(
          actor: Actor,
          platform: Platform,
          pending: PendingAuthorization,
          channelId: Option.Option<ChannelId>
        ) {
          const now = yield* DateTime.now;

          const attempt = startAttempt(
            {
              actor,
              channelId,
              instance: pending.instance,
              platform,
              state: pending.state,
            },
            now
          );

          const secret = yield* cipher.encryptSecret(
            pending.secret,
            connectAttemptContext(pending.state)
          );

          yield* attempts.save(attempt, secret);

          return pending.authorizationUrl;
        }
      );

      const start = Effect.fn("ConnectChannel.start")(function* start(
        actor: Actor,
        platform: Platform,
        request: ConnectRequest
      ) {
        yield* Effect.fromResult(authorize(actor, "channel:connect"));

        const authorizer = yield* authorizerFor(platform);

        const pending = yield* authorizer.begin({
          handle: request.handle,
          instance: request.instance,
          reconnecting: Option.none(),
        });

        return yield* saveAttempt(actor, platform, pending, Option.none());
      });

      const findChannel = Effect.fn("ConnectChannel.findChannel")(
        function* findChannel(actor: Actor, channelId: string) {
          const id = decodeChannelId(channelId);

          const found = Option.isSome(id)
            ? yield* channels.findById(actor.workspaceId, id.value)
            : Option.none<Channel>();

          if (Option.isNone(found)) {
            return yield* new ChannelNotFound({ channelId });
          }

          return found.value;
        }
      );

      const reconnect = Effect.fn("ConnectChannel.reconnect")(
        function* reconnect(actor: Actor, channelId: string) {
          yield* Effect.fromResult(authorize(actor, "channel:connect"));

          const channel = yield* findChannel(actor, channelId);
          const authorizer = yield* authorizerFor(channel.platform);

          const pending = yield* authorizer.begin({
            handle: Option.none(),
            instance: Option.none(),
            reconnecting: Option.some(channel),
          });

          return yield* saveAttempt(
            actor,
            channel.platform,
            pending,
            Option.some(channel.id)
          );
        }
      );

      // Saves the account's new tokens on a channel the workspace has,
      // re-read under the channel's lock so a refresh running meanwhile is
      // neither lost nor able to overwrite them.
      const reconnectTo = Effect.fn("ConnectChannel.reconnectTo")(
        function* reconnectTo(
          channelId: ChannelId,
          actor: Actor,
          account: AuthorizedAccount,
          connected: ConnectedAccount
        ) {
          return yield* locks.withLock(
            channelId,
            Effect.gen(function* reconnectLocked() {
              const current = yield* channels.findById(
                actor.workspaceId,
                channelId
              );

              if (Option.isNone(current)) {
                return yield* new ChannelNotFound({ channelId });
              }

              if (current.value.accountId !== account.accountId) {
                return yield* new ReconnectAccountMismatch({ channelId });
              }

              const now = yield* DateTime.now;
              const channel = reconnectChannel(current.value, connected, now);

              const credentials = yield* encryptTokens(
                account.tokens,
                channel.id
              ).pipe(tokenServices);

              yield* channels.update(channel, Option.some(credentials));

              return channel;
            })
          );
        }
      );

      const addChannel = Effect.fn("ConnectChannel.addChannel")(
        function* addChannel(
          actor: Actor,
          platform: Platform,
          account: AuthorizedAccount,
          connected: ConnectedAccount
        ) {
          const id = yield* newId(ChannelIdSchema).pipe(
            Effect.provideService(Ids, ids)
          );

          const now = yield* DateTime.now;

          const channel = connectChannel(
            {
              ...connected,
              accountId: account.accountId,
              id,
              platform,
              workspaceId: actor.workspaceId,
            },
            now
          );

          const credentials = yield* encryptTokens(account.tokens, id).pipe(
            tokenServices
          );

          yield* channels.insert(channel, credentials);

          return channel;
        }
      );

      const complete = Effect.fn("ConnectChannel.complete")(function* complete(
        actor: Actor,
        platform: Platform,
        returned: AuthorizationCallback
      ) {
        yield* Effect.fromResult(authorize(actor, "channel:connect"));

        const taken = yield* attempts.take(returned.state, {
          platform,
          startedBy: starterOf(actor.subject),
          workspaceId: actor.workspaceId,
        });

        if (Option.isNone(taken)) {
          return yield* new InvalidConnectState();
        }

        const now = yield* DateTime.now;

        const attempt = yield* Effect.fromResult(
          completableBy(taken.value.attempt, actor, platform, now)
        );

        const authorizer = yield* authorizerFor(platform);

        if (Option.isSome(returned.error)) {
          return yield* denials.has(returned.error.value)
            ? new AuthorizationDenied()
            : new AuthorizationFailed({ reason: returned.error.value });
        }

        // The secret was encrypted by this server a few minutes ago: failing
        // to decrypt it is a bug or a keyring changed under it, not something
        // the member can fix.
        const secret = yield* cipher
          .decryptSecret(
            taken.value.secret,
            connectAttemptContext(attempt.state)
          )
          .pipe(Effect.orDie);

        const account = yield* authorizer.complete({
          attempt,
          callback: returned,
          secret,
        });

        const connected: ConnectedAccount = {
          avatarUrl: account.avatarUrl,
          displayName: account.displayName,
          handle: account.handle,
          scopes: account.tokens.scopes,
          token: tokenLifetimeOf(authorizer.policy, account.tokens, now),
        };

        if (Option.isSome(attempt.channelId)) {
          return yield* reconnectTo(
            attempt.channelId.value,
            actor,
            account,
            connected
          );
        }

        const existing = yield* channels.findByAccount(
          actor.workspaceId,
          platform,
          account.accountId
        );

        if (Option.isSome(existing)) {
          return yield* reconnectTo(
            existing.value.id,
            actor,
            account,
            connected
          );
        }

        return yield* addChannel(actor, platform, account, connected).pipe(
          // Connected from another tab meanwhile: this one reconnects it.
          Effect.catchTag("ChannelAlreadyConnected", () =>
            Effect.gen(function* raced() {
              const other = yield* channels.findByAccount(
                actor.workspaceId,
                platform,
                account.accountId
              );

              if (Option.isNone(other)) {
                return yield* new AuthorizationFailed({
                  reason: "the channel was removed while connecting",
                });
              }

              return yield* reconnectTo(
                other.value.id,
                actor,
                account,
                connected
              );
            })
          )
        );
      });

      const purgeExpired = DateTime.now.pipe(
        Effect.flatMap((now) => attempts.purgeExpired(now)),
        Effect.withSpan("ConnectChannel.purgeExpired")
      );

      const connectable = Effect.fn("ConnectChannel.connectable")(
        function* connectable(actor: Actor) {
          yield* Effect.fromResult(authorize(actor, "channel:read"));

          return platforms.filter((platform) =>
            Option.isSome(authorizers.for(platform))
          );
        }
      );

      return ConnectChannel.of({
        complete,
        connectable,
        purgeExpired,
        reconnect,
        start,
      });
    })
  );
}
