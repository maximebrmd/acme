import {
  Api,
  ChannelNotFound,
  ConnectFailed,
  CurrentMember,
  Forbidden,
  OAuthClientNotPublished,
  PlatformUnreachable,
} from "acme-contract";
import type {
  Channel as ChannelView,
  ConnectCallback,
  ConnectFailureReason,
} from "acme-contract";
import { Effect, Match, Option } from "effect";
import { HttpApiBuilder } from "effect/http-api";

import type { ChannelNotFound as MissingChannel } from "#channels/application/channel-not-found.ts";
import { ConnectChannel } from "#channels/application/connect-channel.ts";
import type {
  CompleteConnectFailure,
  StartFailure,
} from "#channels/application/connect-channel.ts";
import { DisconnectChannel } from "#channels/application/disconnect-channel.ts";
import { ListChannels } from "#channels/application/list-channels.ts";
import { OAuthClientDocuments } from "#channels/application/oauth-client-documents.ts";
import type { AuthorizationCallback } from "#channels/application/platform-authorizer.ts";
import type { Channel } from "#channels/domain/channel.ts";
import { actorOf } from "#shared/api/actor.ts";

// What clients see of a channel: never its tokens. The expiry shown is the
// one the user must reconnect by; a token that renews itself has none.
const toView = (channel: Channel): ChannelView => ({
  avatarUrl: Option.getOrNull(channel.avatarUrl),
  displayName: Option.getOrNull(channel.displayName),
  handle: channel.handle,
  id: channel.id,
  platform: channel.platform,
  status: channel.status,
  tokenExpiresAt:
    channel.token._tag === "nonRefreshable" ? channel.token.expiresAt : null,
});

const forbidden = () => Effect.fail(new Forbidden());

const refused = (reason: ConnectFailureReason) =>
  Effect.fail(new ConnectFailed({ reason }));

const callbackOf = (payload: ConnectCallback): AuthorizationCallback => ({
  code: Option.fromUndefinedOr(payload.code),
  error: Option.fromUndefinedOr(payload.error),
  issuer: Option.fromUndefinedOr(payload.iss),
  state: payload.state,
});

// Every way starting a connection can fail, as the contract tells clients.
// A failure that is the server's own (the database, a bug) is a defect: 500.
const startFailure = (failure: StartFailure) =>
  Match.valueTags(failure, {
    AuthorizationFailed: ({ reason }) =>
      Effect.logWarning("A platform did not authorize an account").pipe(
        Effect.annotateLogs({ reason }),
        Effect.andThen(refused("authorizationFailed"))
      ),
    DatabaseError: Effect.die,
    InstanceNotAllowed: () => refused("instanceNotAllowed"),
    InvalidHandle: () => refused("invalidHandle"),
    InvalidInstance: () => refused("invalidInstance"),
    MissingPermission: forbidden,
    MissingTokenKey: () =>
      Effect.logError(
        "A channel was not connected: ACME_TOKEN_KEYS is not set"
      ).pipe(Effect.andThen(refused("notConfigured"))),
    PlatformNotConnectable: ({ reason }) =>
      refused(
        reason === "notConfigured" ? "notConfigured" : "platformNotSupported"
      ),
    PlatformUnavailable: () => Effect.fail(new PlatformUnreachable()),
  });

type Refusal = Effect.Effect<
  never,
  ChannelNotFound | ConnectFailed | Forbidden | PlatformUnreachable
>;

const reconnectFailure = (failure: MissingChannel | StartFailure): Refusal =>
  failure._tag === "ChannelNotFound"
    ? Effect.fail(new ChannelNotFound())
    : startFailure(failure);

// Completing fails as starting does, and also on the callback itself.
const completeFailure = (failure: CompleteConnectFailure): Refusal =>
  Match.valueTags(failure, {
    AuthorizationDenied: () => refused("denied"),
    AuthorizationFailed: startFailure,
    ChannelNotFound: () => Effect.fail(new ChannelNotFound()),
    DatabaseError: startFailure,
    InstanceNotAllowed: startFailure,
    InvalidConnectState: () => refused("invalidState"),
    MissingPermission: startFailure,
    MissingTokenKey: startFailure,
    PlatformNotConnectable: startFailure,
    PlatformUnavailable: startFailure,
    ReconnectAccountMismatch: () => refused("accountMismatch"),
  });

export const ChannelsHandlers = HttpApiBuilder.group(
  Api,
  "channels",
  Effect.fn(function* channelsHandlers(handlers) {
    const listChannels = yield* ListChannels;
    const disconnectChannel = yield* DisconnectChannel;
    const connectChannel = yield* ConnectChannel;

    return handlers.handleAll({
      completeConnect: ({ params, payload }) =>
        Effect.gen(function* completeConnect() {
          const actor = actorOf(yield* CurrentMember);

          const channel = yield* connectChannel
            .complete(actor, params.platform, callbackOf(payload))
            .pipe(Effect.catch(completeFailure));

          return toView(channel);
        }),
      connect: ({ params, payload }) =>
        Effect.gen(function* connect() {
          const actor = actorOf(yield* CurrentMember);

          const authorizationUrl = yield* connectChannel
            .start(actor, params.platform, {
              handle: Option.fromUndefinedOr(payload.handle),
              instance: Option.fromUndefinedOr(payload.instance),
            })
            .pipe(Effect.catch(startFailure));

          return { authorizationUrl };
        }),
      disconnect: ({ params }) =>
        Effect.gen(function* disconnect() {
          const actor = actorOf(yield* CurrentMember);

          yield* disconnectChannel.disconnect(actor, params.channelId).pipe(
            Effect.catchTags({
              ChannelNotFound: () => Effect.fail(new ChannelNotFound()),
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
            })
          );
        }),
      list: () =>
        Effect.gen(function* list() {
          const actor = actorOf(yield* CurrentMember);

          const channels = yield* listChannels.list(actor).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
            })
          );

          return channels.map(toView);
        }),
      reconnect: ({ params }) =>
        Effect.gen(function* reconnect() {
          const actor = actorOf(yield* CurrentMember);

          const authorizationUrl = yield* connectChannel
            .reconnect(actor, params.channelId)
            .pipe(Effect.catch(reconnectFailure));

          return { authorizationUrl };
        }),
    });
  })
);

const notPublished = () => Effect.fail(new OAuthClientNotPublished());

/** The documents that identify Acme's OAuth clients, served to anyone. */
export const ChannelOAuthHandlers = HttpApiBuilder.group(
  Api,
  "channelOAuth",
  Effect.fn(function* channelOAuthHandlers(handlers) {
    const documents = yield* OAuthClientDocuments;

    return handlers.handleAll({
      blueskyClientMetadata: () =>
        Option.match(documents.bluesky, {
          onNone: notPublished,
          onSome: ({ metadata }) => Effect.succeed(metadata),
        }),
      blueskyJwks: () =>
        Option.match(documents.bluesky, {
          onNone: notPublished,
          onSome: ({ jwks }) => Effect.succeed(jwks),
        }),
    });
  })
);
