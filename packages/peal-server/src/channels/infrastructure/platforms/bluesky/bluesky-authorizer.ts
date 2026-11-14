import {
  FetchResponseError,
  OAuthResolverError,
  OAuthResponseError,
} from "@atproto/oauth-client-node";
import type {
  NodeSavedSession,
  NodeSavedState,
} from "@atproto/oauth-client-node";
import { Effect, Match, Option, Redacted, Schema } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";

import { AuthorizationFailed } from "#channels/application/authorization-failed.ts";
import { InstanceNotAllowed } from "#channels/application/instance-not-allowed.ts";
import { InvalidHandle } from "#channels/application/invalid-handle.ts";
import type {
  AuthorizedAccount,
  IssuedTokens,
  PlatformAuthorizer,
} from "#channels/application/platform-authorizer.ts";
import { AvatarUrlSchema } from "#channels/domain/avatar-url.ts";
import { tokenPolicies } from "#channels/domain/token-policy.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { TokenExpired } from "#shared/domain/token-expired.ts";
import { OutboundRequestRefused } from "#shared/infrastructure/platforms/outbound-request-refused.ts";
import type { PublicFetch } from "#shared/infrastructure/platforms/public-http.ts";

import {
  blueskyScope,
  blueskySignInScope,
  makeBlueskyClient,
  memoryStore,
} from "./bluesky-client.ts";
import type { BlueskyClientOptions } from "./bluesky-client.ts";
import { parseSavedSession, parseSavedState } from "./saved-oauth-data.ts";

export interface BlueskyAuthorizerOptions extends Omit<
  BlueskyClientOptions,
  "fetch"
> {
  /** The public API that serves profiles, read without a token. */
  readonly appViewUrl: string;
  /** The server to sign in at when the member gives no handle. */
  readonly defaultService: string;
}

// What went wrong on the wire while the client worked, which its own errors
// do not tell apart: Peal refused a request, or a server did not answer.
interface WireTrouble {
  readonly refused: Option.Option<OutboundRequestRefused>;
  readonly unreachable: boolean;
}

const isRefusal = Schema.is(OutboundRequestRefused);

// Wraps the fetch for one operation, noting what failed on the wire.
const observed = (fetch: PublicFetch) => {
  let trouble: WireTrouble = { refused: Option.none(), unreachable: false };

  const watch = async (
    input: Request | URL | string,
    init?: RequestInit
  ): Promise<Response> => {
    try {
      return await fetch(input, init);
    } catch (error) {
      const refusal = Option.some(
        error instanceof TypeError ? error.cause : undefined
      ).pipe(Option.filter(isRefusal));

      trouble = Option.isSome(refusal)
        ? { ...trouble, refused: refusal }
        : { ...trouble, unreachable: true };

      throw error;
    }
  };

  const watching: PublicFetch = Object.assign(watch, {
    preconnect: fetch.preconnect,
  });

  return { fetch: watching, trouble: () => trouble };
};

// What the client's failure came to, from what happened on the wire and
// the library's own errors.
type ClientFailure =
  | { readonly _tag: "refused"; readonly refusal: OutboundRequestRefused }
  | { readonly _tag: "rejected"; readonly reason: string }
  | { readonly _tag: "unknownIdentity" }
  | { readonly _tag: "unreachable" };

// The error and the causes it wraps: the library wraps a server's answer in
// its resolvers' errors, and the DID resolver's.
const causeChain = (error: Error, depth = 0): readonly Error[] =>
  error.cause instanceof Error && depth < 16
    ? [error, ...causeChain(error.cause, depth + 1)]
    : [error];

const isTransientStatus = (status: number) => status >= 500 || status === 429;

// A server that answered it was busy or broken, at any step: the PLC
// directory, a PDS, or an authorization server's metadata or endpoints.
const isTransient = (error: Error) =>
  (error instanceof OAuthResponseError && isTransientStatus(error.status)) ||
  (error instanceof FetchResponseError &&
    isTransientStatus(error.response.status));

const failureOf = (trouble: WireTrouble, cause: unknown): ClientFailure => {
  if (Option.isSome(trouble.refused)) {
    return { _tag: "refused", refusal: trouble.refused.value };
  }

  if (
    trouble.unreachable ||
    (cause instanceof Error && causeChain(cause).some(isTransient))
  ) {
    return { _tag: "unreachable" };
  }

  return cause instanceof OAuthResolverError
    ? { _tag: "unknownIdentity" }
    : { _tag: "rejected", reason: String(cause) };
};

// A server Peal may not call is the member's to fix; a lookup that failed
// for now is the network's.
const refusalFailure = (refusal: OutboundRequestRefused) =>
  Match.value(refusal.reason).pipe(
    Match.when("lookupFailed", () => new PlatformUnavailable()),
    Match.when("unknownHost", () => new InvalidHandle()),
    Match.orElse(() => new InstanceNotAllowed({ host: refusal.host }))
  );

const beginFailure = (failure: ClientFailure) =>
  Match.valueTags(failure, {
    refused: ({ refusal }) => refusalFailure(refusal),
    rejected: ({ reason }) => new AuthorizationFailed({ reason }),
    unknownIdentity: () => new InvalidHandle(),
    unreachable: () => new PlatformUnavailable(),
  });

// Once the member is back, every server was already resolved: an identity
// that no longer resolves is the platform failing.
const completeFailure = (failure: ClientFailure) =>
  Match.valueTags(failure, {
    refused: ({ refusal }) =>
      refusal.reason === "lookupFailed"
        ? new PlatformUnavailable()
        : new InstanceNotAllowed({ host: refusal.host }),
    rejected: ({ reason }) => new AuthorizationFailed({ reason }),
    unknownIdentity: () =>
      new AuthorizationFailed({
        reason: "the account's identity did not resolve",
      }),
    unreachable: () => new PlatformUnavailable(),
  });

const ProfileSchema = Schema.Struct({
  avatar: Schema.optionalKey(Schema.String),
  displayName: Schema.optionalKey(Schema.String),
  handle: Schema.String,
});

const decodeAvatar = Schema.decodeUnknownOption(AvatarUrlSchema);

// The handle protocol's name for one that no longer resolves to the DID.
const invalidHandle = "handle.invalid";

const nonEmpty = (value: string | undefined) =>
  Option.fromUndefinedOr(value).pipe(
    Option.filter((text) => text.trim() !== "")
  );

const normalizeHandle = (input: string) => input.trim().replace(/^@/u, "");

// The session as the channel's credential: the library's own saved form.
const tokensOf = (session: NodeSavedSession): IssuedTokens => ({
  accessToken: Redacted.make(JSON.stringify(session)),
  expiresAt: Option.none(),
  refreshToken: Option.none(),
  renewable: true,
  scopes: session.tokenSet.scope.split(" "),
});

/**
 * Bluesky through the AT Protocol's official OAuth client
 * (`@atproto/oauth-client-node`): PAR, PKCE, DPoP and the confidential
 * client's signed token requests are the library's. Peal gives it, for each
 * operation, stores seeded from what Peal keeps encrypted, and keeps what it
 * writes: the pending sign-in becomes the attempt's secret, the session the
 * channel's credential. Every request goes through the outbound guard, since
 * DID documents name the servers it calls.
 */
export const blueskyAuthorizer = Effect.fn("BlueskyAuthorizer.make")(
  function* blueskyAuthorizer(
    options: BlueskyAuthorizerOptions,
    publicFetch: PublicFetch
  ) {
    const http = (yield* HttpClient.HttpClient).pipe(
      HttpClient.filterStatusOk,
      HttpClient.timeout("10 seconds")
    );

    const policy =
      options.mode._tag === "confidential"
        ? tokenPolicies.bluesky
        : tokenPolicies.blueskyLoopback;

    const clientFor = (
      fetch: PublicFetch,
      seeds: {
        readonly sessions?: Iterable<readonly [string, NodeSavedSession]>;
        readonly states?: Iterable<readonly [string, NodeSavedState]>;
      }
    ) => {
      const sessions = memoryStore(seeds.sessions);
      const states = memoryStore(seeds.states);

      return {
        client: makeBlueskyClient({ ...options, fetch }, { sessions, states }),
        sessions,
        states,
      };
    };

    const profileOf = (did: string) =>
      http
        .get(new URL("/xrpc/app.bsky.actor.getProfile", options.appViewUrl), {
          urlParams: { actor: did },
        })
        .pipe(
          Effect.flatMap(HttpClientResponse.schemaBodyJson(ProfileSchema)),
          Effect.option
        );

    // A reconnect signs in to the channel's DID; otherwise to the handle, or
    // at the default server, which asks the member for one.
    const signInWith = (
      request: Parameters<PlatformAuthorizer["begin"]>[0]
    ): string =>
      request.reconnecting.pipe(
        Option.map((channel) => channel.accountId),
        Option.orElse(() =>
          request.handle.pipe(
            Option.map(normalizeHandle),
            Option.filter((handle) => handle !== "")
          )
        ),
        Option.getOrElse(() => options.defaultService)
      );

    // What a sign-in asks (`blueskySignInScope`): publishing's scopes,
    // and within the client's metadata the repost's and the chat's only
    // for a member who asks for them, or a reconnect of a channel that
    // granted them.
    const scopeFor = (
      request: Parameters<PlatformAuthorizer["begin"]>[0]
    ): string =>
      blueskySignInScope(
        options.scope ?? blueskyScope,
        { messages: request.messages ?? false, reposts: request.reposts ?? false },
        request.reconnecting.pipe(Option.map((channel) => channel.scopes))
      );

    const begin: PlatformAuthorizer["begin"] = (request) =>
      Effect.gen(function* beginning() {
        const wire = observed(publicFetch);
        const { client, states } = clientFor(wire.fetch, {});

        const url = yield* Effect.tryPromise({
          catch: (cause) => beginFailure(failureOf(wire.trouble(), cause)),
          try: async () =>
            await client.authorize(signInWith(request), {
              scope: scopeFor(request),
            }),
        });

        const [pending] = states.values;

        if (pending === undefined) {
          return yield* new AuthorizationFailed({
            reason: "the client kept no pending sign-in",
          });
        }

        const [state, saved] = pending;

        return {
          authorizationUrl: url.href,
          instance: Option.none(),
          secret: Redacted.make(JSON.stringify(saved)),
          state,
        };
      });

    const complete: PlatformAuthorizer["complete"] = ({ callback, secret }) =>
      Effect.gen(function* completing() {
        const saved = parseSavedState(Redacted.value(secret));

        if (Option.isNone(saved)) {
          return yield* new AuthorizationFailed({
            reason: "the pending sign-in could not be read",
          });
        }

        const wire = observed(publicFetch);

        const { client, sessions } = clientFor(wire.fetch, {
          states: [[callback.state, saved.value]],
        });

        const params = new URLSearchParams({ state: callback.state });

        if (Option.isSome(callback.code)) {
          params.set("code", callback.code.value);
        }

        if (Option.isSome(callback.issuer)) {
          params.set("iss", callback.issuer.value);
        }

        const { session } = yield* Effect.tryPromise({
          catch: (cause) => completeFailure(failureOf(wire.trouble(), cause)),
          try: async () => await client.callback(params),
        });

        const stored = sessions.values.get(session.did);

        if (stored === undefined) {
          return yield* new AuthorizationFailed({
            reason: "the client kept no session",
          });
        }

        // The DID document names the handle; the public profile, the name
        // and picture, when the app view answers.
        const identity = yield* Effect.tryPromise({
          catch: (cause) => completeFailure(failureOf(wire.trouble(), cause)),
          try: async () => await client.identityResolver.resolve(session.did),
        });

        const profile = yield* profileOf(session.did);

        const handle =
          identity.handle === invalidHandle
            ? profile.pipe(
                Option.map(({ handle: shown }) => shown),
                Option.getOrElse(() => session.did)
              )
            : identity.handle;

        const account: AuthorizedAccount = {
          accountId: session.did,
          avatarUrl: profile.pipe(
            Option.flatMap(({ avatar }) => Option.fromUndefinedOr(avatar)),
            Option.flatMap(decodeAvatar)
          ),
          displayName: profile.pipe(
            Option.flatMap(({ displayName }) => nonEmpty(displayName))
          ),
          handle: `@${handle}`,
          tokens: tokensOf(stored),
        };

        return account;
      });

    // Forces a refresh of the stored session. A rotated session is kept even
    // if the client failed after the server answered, since the old refresh
    // token no longer works.
    const refresh: PlatformAuthorizer["refresh"] = (channel, tokens) =>
      Effect.gen(function* refreshing() {
        const saved = parseSavedSession(Redacted.value(tokens.accessToken));

        if (Option.isNone(saved)) {
          return yield* new TokenExpired();
        }

        const did = saved.value.tokenSet.sub;
        const wire = observed(publicFetch);

        const { client, sessions } = clientFor(wire.fetch, {
          sessions: [[did, saved.value]],
        });

        const failure = yield* Effect.tryPromise({
          catch: (cause) => failureOf(wire.trouble(), cause),
          try: async () => await client.restore(did, true),
        }).pipe(Effect.flip, Effect.option);

        const renewed = Option.fromUndefinedOr(sessions.values.get(did)).pipe(
          Option.filter((session) => session !== saved.value)
        );

        if (Option.isSome(renewed)) {
          return tokensOf(renewed.value);
        }

        const unavailable = failure.pipe(
          Option.exists(
            (found) =>
              found._tag === "unreachable" ||
              (found._tag === "refused" &&
                found.refusal.reason === "lookupFailed")
          )
        );

        if (unavailable) {
          return yield* new PlatformUnavailable();
        }

        yield* Effect.logWarning("Bluesky refused to refresh a session").pipe(
          Effect.annotateLogs({
            channelId: channel.id,
            failure: failure.pipe(
              Option.match({
                onNone: () => "the session was not renewed",
                onSome: (found) => found._tag,
              })
            ),
          })
        );

        return yield* new TokenExpired();
      });

    const authorizer: PlatformAuthorizer = {
      begin,
      complete,
      platform: "bluesky",
      policy,
      refresh,
    };

    return authorizer;
  }
);
