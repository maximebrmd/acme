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
  ConnectCallback,
  ConnectFailureReason,
  ConnectOutcome as ConnectOutcomeView,
} from "acme-contract";
import { Effect, Match, Option } from "effect";
import { HttpApiBuilder } from "effect/http-api";

import type { ChannelNotFound as MissingChannel } from "#channels/application/channel-not-found.ts";
import { ConnectChannel } from "#channels/application/connect-channel.ts";
import type {
  ChooseFailure,
  CompleteConnectFailure,
  ConnectOutcome,
  StartFailure,
} from "#channels/application/connect-channel.ts";
import { DisconnectChannel } from "#channels/application/disconnect-channel.ts";
import { ListChannels } from "#channels/application/list-channels.ts";
import { OAuthClientDocuments } from "#channels/application/oauth-client-documents.ts";
import type { AuthorizationCallback } from "#channels/application/platform-authorizer.ts";
import { actorOf } from "#shared/api/actor.ts";

import { toChannelView } from "./channel-view.ts";

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
    NoAccountsToConnect: () => refused("noAccounts"),
    PlatformNotConnectable: startFailure,
    PlatformUnavailable: startFailure,
    ReconnectAccountMismatch: () => refused("accountMismatch"),
  });

// Choosing fails as completing does: the choice, like the attempt, is the
// member's own and is used once.
const chooseFailure = (failure: ChooseFailure): Refusal =>
  Match.valueTags(failure, {
    AuthorizationFailed: startFailure,
    ChannelNotFound: () => Effect.fail(new ChannelNotFound()),
    DatabaseError: startFailure,
    InvalidConnectState: () => refused("invalidState"),
    MissingPermission: startFailure,
    MissingTokenKey: startFailure,
    PlatformNotConnectable: startFailure,
    ReconnectAccountMismatch: () => refused("accountMismatch"),
  });

const outcomeView = (outcome: ConnectOutcome): ConnectOutcomeView =>
  outcome._tag === "connected"
    ? { _tag: "connected", channel: toChannelView(outcome.channel) }
    : {
        _tag: "choose",
        accounts: outcome.accounts.map((account) => ({
          accountId: account.accountId,
          avatarUrl: Option.getOrNull(account.avatarUrl),
          connected: account.connected,
          displayName: Option.getOrNull(account.displayName),
          handle: account.handle,
        })),
        expiresAt: outcome.expiresAt,
        selection: outcome.selection,
      };

export const ChannelsHandlers = HttpApiBuilder.group(
  Api,
  "channels",
  Effect.fn(function* channelsHandlers(handlers) {
    const listChannels = yield* ListChannels;
    const disconnectChannel = yield* DisconnectChannel;
    const connectChannel = yield* ConnectChannel;

    return handlers.handleAll({
      chooseAccounts: ({ params, payload }) =>
        Effect.gen(function* chooseAccounts() {
          const actor = actorOf(yield* CurrentMember);

          const channels = yield* connectChannel
            .choose(actor, params.platform, payload)
            .pipe(Effect.catch(chooseFailure));

          return channels.map(toChannelView);
        }),
      completeConnect: ({ params, payload }) =>
        Effect.gen(function* completeConnect() {
          const actor = actorOf(yield* CurrentMember);

          const outcome = yield* connectChannel
            .complete(actor, params.platform, callbackOf(payload))
            .pipe(Effect.catch(completeFailure));

          return outcomeView(outcome);
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

          return channels.map(toChannelView);
        }),
      platforms: () =>
        Effect.gen(function* platforms() {
          const actor = actorOf(yield* CurrentMember);

          const connectable = yield* connectChannel
            .connectable(actor)
            .pipe(Effect.catchTag("MissingPermission", forbidden));

          return { platforms: connectable };
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
