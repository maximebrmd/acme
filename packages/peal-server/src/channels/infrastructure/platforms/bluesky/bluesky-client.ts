import {
  AtprotoHandleResolverNode,
  buildAtprotoLoopbackClientMetadata,
  NodeOAuthClient,
  requestLocalLock,
} from "@atproto/oauth-client-node";
import type {
  JoseKey,
  NodeSavedSession,
  NodeSavedState,
  OAuthClientMetadataInput,
} from "@atproto/oauth-client-node";
import { Option } from "effect";

import {
  blueskyChatScopes,
  blueskyGateScopes,
  blueskyRepostScope,
  createsRecords,
  grantsBlueskyChat,
  repostCollection,
} from "#shared/domain/bluesky-scopes.ts";
import type { PublicFetch } from "#shared/infrastructure/platforms/public-http.ts";

/**
 * What Peal asks Bluesky accounts for: to create and delete posts, to
 * create the gates that say who may reply to a thread and whether a post
 * may be quoted (`blueskyGateScopes`), upload images and videos, and check
 * video upload limits. `atproto` is required. The repost's and the chat's
 * scopes are asked apart (`blueskySignInScope`).
 */
export const blueskyScope = [
  "atproto",
  "repo:app.bsky.feed.post?action=create&action=delete",
  ...blueskyGateScopes,
  "blob:image/*",
  "blob:video/*",
  "rpc:com.atproto.repo.uploadBlob?aud=*",
  "rpc:app.bsky.video.getUploadLimits?aud=*",
].join(" ");

/**
 * The most Peal may ask Bluesky accounts for, as its client metadata says,
 * where the inbox reads Bluesky's direct messages (`PEAL_INBOX_MESSAGES`):
 * the chat methods' scopes too (`blueskyChatScopes`). Off, exactly
 * `blueskyScope`. A sign-in asks for the chat scopes only when a member
 * turns a channel's messages on (the authorizer's `scopeFor`); the AT
 * Protocol's consent takes every scope asked or none.
 */
export const blueskyScopeWith = (chat: boolean): string =>
  [
    blueskyScope,
    blueskyRepostScope,
    ...(chat ? blueskyChatScopes : []),
  ].join(" ");

/**
 * What one sign-in asks, within the most the client may ask (`most`, its
 * metadata's): publishing's scopes; the repost's for a member who starts a
 * follow-up rule that reposts there (`reposts`), or a reconnect of a
 * channel that granted it; the chat's for a member who turns the
 * channel's messages on (`messages`), or a reconnect of a channel that
 * granted them. So a reconnect never takes away what a channel granted,
 * and a first sign-in's consent is no wider than publishing needs.
 */
export const blueskySignInScope = (
  most: string,
  ask: { readonly messages?: boolean; readonly reposts?: boolean },
  granted: Option.Option<readonly string[]>
): string => {
  const allowed = new Set(most.split(" "));
  const had = Option.getOrElse(granted, () => []);

  const reposts =
    ask.reposts === true || createsRecords(had, [repostCollection]);

  const chat = ask.messages === true || grantsBlueskyChat(had);

  return [
    blueskyScope,
    ...(reposts ? [blueskyRepostScope] : []),
    ...(chat ? blueskyChatScopes : []),
  ]
    .filter((scope) => scope === blueskyScope || allowed.has(scope))
    .join(" ");
};

/** Where the web app's callback page is, and the client documents. */
export const blueskyPaths = {
  callback: "/connect/bluesky/callback",
  jwks: "/api/channels/oauth/bluesky/jwks.json",
  metadata: "/api/channels/oauth/bluesky/client-metadata.json",
} as const;

/**
 * How Peal runs its Bluesky client:
 *
 * - `confidential`, with keys: the client publishes its metadata and keys
 *   at the public URL, which must be HTTPS without a port, and signs its
 *   token requests (`private_key_jwt`). Sessions last up to two years.
 * - `loopback`, for development: a public client at `http://localhost`
 *   whose redirect is `http://127.0.0.1` on the web app's port. Sessions
 *   last two weeks.
 */
export type BlueskyClientMode =
  | { readonly _tag: "confidential"; readonly keys: readonly JoseKey[] }
  | { readonly _tag: "loopback" };

export interface BlueskyClientOptions {
  /** Only for tests against a local fake: allows plain HTTP servers. */
  readonly allowHttp: boolean;
  /** Resolves handles with `com.atproto.identity.resolveHandle` here; none resolves them with DNS and HTTPS, as the protocol says. */
  readonly handleResolver: Option.Option<string>;
  readonly mode: BlueskyClientMode;
  /** Where did:plc documents are read. */
  readonly plcDirectoryUrl: string;
  /** The web app's origin (PUBLIC_URL). */
  readonly publicUrl: string;
  /** The scopes the client asks for: `blueskyScope` when not said. */
  readonly scope?: string;
  readonly fetch: PublicFetch;
}

/** A store the client reads and writes in memory, seeded by the caller. */
export interface MemoryStore<V> {
  readonly values: Map<string, V>;
  readonly store: {
    readonly del: (key: string) => Promise<void>;
    readonly get: (key: string) => Promise<V | undefined>;
    readonly set: (key: string, value: V) => Promise<void>;
  };
}

export const memoryStore = <V>(
  initial: Iterable<readonly [string, V]> = []
): MemoryStore<V> => {
  const values = new Map<string, V>(initial);

  return {
    store: {
      del: async (key) => {
        values.delete(key);
        await Promise.resolve();
      },
      get: async (key) => await Promise.resolve(values.get(key)),
      set: async (key, value) => {
        values.set(key, value);
        await Promise.resolve();
      },
    },
    values,
  };
};

/** The client's metadata for the mode, as the client and servers see it. */
export const clientMetadataOf = (
  options: Pick<BlueskyClientOptions, "mode" | "publicUrl" | "scope">
): OAuthClientMetadataInput => {
  const { mode, publicUrl } = options;
  const scope = options.scope ?? blueskyScope;

  if (mode._tag === "loopback") {
    const redirect = new URL(blueskyPaths.callback, publicUrl);

    redirect.hostname = "127.0.0.1";

    return buildAtprotoLoopbackClientMetadata({
      redirect_uris: [redirect.href],
      scope,
    });
  }

  return {
    application_type: "web",
    client_id: new URL(blueskyPaths.metadata, publicUrl).href,
    client_name: "Peal",
    client_uri: publicUrl,
    dpop_bound_access_tokens: true,
    grant_types: ["authorization_code", "refresh_token"],
    jwks_uri: new URL(blueskyPaths.jwks, publicUrl).href,
    redirect_uris: [new URL(blueskyPaths.callback, publicUrl).href],
    response_types: ["code"],
    scope,
    token_endpoint_auth_method: "private_key_jwt",
    token_endpoint_auth_signing_alg: "ES256",
  };
};

/**
 * A client for one operation, over stores the operation seeds and reads
 * back: Peal persists pending sign-ins and sessions itself, encrypted, keyed
 * by its own attempts and channels, so two workspaces can hold the same
 * account without sharing a session. Refreshes run under the channel's lock,
 * so the client's own lock only needs to cover this process.
 */
export const makeBlueskyClient = (
  options: BlueskyClientOptions,
  stores: {
    readonly sessions: MemoryStore<NodeSavedSession>;
    readonly states: MemoryStore<NodeSavedState>;
  }
): NodeOAuthClient =>
  new NodeOAuthClient({
    allowHttp: options.allowHttp,
    clientMetadata: clientMetadataOf(options),
    fetch: options.fetch,
    // Handles resolve through DNS, and HTTPS through Peal's guarded fetch.
    // The library's default wraps fetch in an undici dispatcher for its own
    // SSRF checks, which only Node has: on Bun, building it throws.
    handleResolver: options.handleResolver.pipe(
      Option.getOrElse(
        () => new AtprotoHandleResolverNode({ safeFetch: options.fetch })
      )
    ),
    keyset: options.mode._tag === "confidential" ? options.mode.keys : [],
    plcDirectoryUrl: options.plcDirectoryUrl,
    requestLock: requestLocalLock,
    responseMode: "query",
    sessionStore: stores.sessions.store,
    stateStore: stores.states.store,
  });
