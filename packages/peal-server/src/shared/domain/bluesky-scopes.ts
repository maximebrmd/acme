// What a Bluesky account's OAuth scopes let Peal write, by the atproto
// permission spec (atproto.com/specs/permission, read 2026-11-11): a
// `repo` scope names its collections, positionally (`repo:<nsid>`) or as
// `collection` parameters, `*` for all, and the actions it allows
// (`create`, `update`, `delete`; all when it names none). The PDS checks
// every write of `com.atproto.repo.applyWrites` against them, with no
// `rpc` scope of its own. `transition:generic`, the scope of sessions from
// before granular permissions, allows every write. A scope that does not
// decode grants nothing: scopes are what the account's server answered.

import { Option } from "effect";

/** The collection of a thread's reply gate. */
export const threadgateCollection = "app.bsky.feed.threadgate";

/** The collection of a post's quote gate. */
export const postgateCollection = "app.bsky.feed.postgate";

/**
 * The scopes Peal asks for to write a post's gates with the post: the
 * channels context adds them to its sign-in, and publishing gates a post
 * only on a channel that granted them (`createsRecords`).
 */
export const blueskyGateScopes = [
  `repo:${threadgateCollection}?action=create`,
  `repo:${postgateCollection}?action=create`,
] as const;

const genericScope = "transition:generic";

const repoScope = /^repo(?::(?<positional>[^?]+))?(?:\?(?<query>.*))?$/u;

// A collection as the scope writes it, none when it does not decode.
const decodeComponent = Option.liftThrowable(decodeURIComponent);

// Whether one scope lets the account's repository take a new record of
// `collection`.
const createsIn = (scope: string, collection: string): boolean => {
  if (scope === genericScope) {
    return true;
  }

  const groups = repoScope.exec(scope)?.groups;

  if (groups === undefined) {
    return false;
  }

  const query = new URLSearchParams(groups["query"] ?? "");
  const { positional } = groups;

  // The collection named before the query, decoded.
  const positioned: Option.Option<readonly string[]> =
    positional === undefined
      ? Option.some([])
      : decodeComponent(positional).pipe(Option.map((name) => [name]));

  if (Option.isNone(positioned)) {
    return false;
  }

  const collections = new Set([
    ...positioned.value,
    ...query.getAll("collection"),
  ]);

  const actions = query.getAll("action");

  return (
    (collections.has(collection) || collections.has("*")) &&
    (actions.length === 0 || actions.includes("create"))
  );
};

/** Whether the scopes let Peal create records of every one of `collections`. */
export const createsRecords = (
  scopes: readonly string[],
  collections: readonly string[]
): boolean =>
  collections.every((collection) =>
    scopes.some((scope) => createsIn(scope, collection))
  );

/**
 * Bluesky's chat service, as a DID service reference: the API directory
 * (docs.bsky.app/docs/advanced-guides/api-directory, read 2026-11-14)
 * names it `did:web:api.bsky.chat#bsky_chat` and says chat calls are
 * "routed via the PDS, and use service proxying". Calls name it in their
 * `atproto-proxy` header, and the scopes that allow them as their `aud`.
 */
export const blueskyChatService = "did:web:api.bsky.chat#bsky_chat";

/**
 * The chat methods the inbox calls (the lexicons under
 * `chat.bsky.convo`): list an account's conversations and read one's
 * messages, send a message, and accept a conversation someone else began
 * before answering it. Nothing else of the account's chat: no leaving,
 * muting, deleting or group.
 */
export const blueskyChatMethods = [
  "chat.bsky.convo.listConvos",
  "chat.bsky.convo.getMessages",
  "chat.bsky.convo.sendMessage",
  "chat.bsky.convo.acceptConvo",
] as const;

export type BlueskyChatMethod = (typeof blueskyChatMethods)[number];

/**
 * The scopes Peal asks for the chat methods, one granular `rpc` scope a
 * method, at the chat service (the permission spec,
 * atproto.com/specs/permission, read 2026-11-14: `rpc:<lxm>?aud=<did>#<service>`,
 * `aud` always required, the fragment written `%23`). The channels context
 * puts them in the client's metadata where the inbox reads Bluesky's
 * messages, and asks them only of an account whose messages a member
 * turns on.
 */
export const blueskyChatScopes = blueskyChatMethods.map(
  (method) => `rpc:${method}?aud=${blueskyChatService.replaceAll("#", "%23")}`
);

const rpcScope = /^rpc(?::(?<positional>[^?]+))?(?:\?(?<query>.*))?$/u;

// Whether one scope allows calling `method` at `audience`, by the
// permission spec: the methods it names (positionally or as `lxm`, `*` for
// all), at the one service its `aud` names (`*` for any), never both
// wildcards.
const allowsIn = (scope: string, method: string, audience: string): boolean => {
  const groups = rpcScope.exec(scope)?.groups;

  if (groups === undefined) {
    return false;
  }

  const { positional } = groups;
  const named = decodeComponent(positional ?? "");

  if (Option.isNone(named)) {
    return false;
  }

  // The query's own escapes (`%23`) are decoded as it is parsed.
  const parameters = new URLSearchParams(groups["query"] ?? "");

  const methods = [
    ...(positional === undefined ? [] : [named.value]),
    ...parameters.getAll("lxm"),
  ];

  const audiences = parameters.getAll("aud");

  if (audiences.length !== 1 || methods.length === 0) {
    return false;
  }

  const [aud] = audiences;
  const anyMethod = methods.includes("*");

  if (aud === "*" && anyMethod) {
    return false;
  }

  return (
    (aud === "*" || aud === audience) && (anyMethod || methods.includes(method))
  );
};

/**
 * Whether the scopes let Peal call `method` at the service `audience`: a
 * granular `rpc` scope that names both, or the transitional scopes of
 * sessions from before granular permissions, where
 * `transition:chat.bsky` allows the chat methods and works only with
 * `transition:generic` (the OAuth spec, atproto.com/specs/oauth, read
 * 2026-11-14).
 */
export const allowsRpc = (
  scopes: readonly string[],
  method: string,
  audience: string
): boolean =>
  (method.startsWith("chat.bsky.") &&
    scopes.includes("transition:chat.bsky") &&
    scopes.includes(genericScope)) ||
  scopes.some((scope) => allowsIn(scope, method, audience));

/**
 * Whether the scopes allow every chat method Peal calls at the chat
 * service: what a Bluesky channel needs before its messages are read.
 */
export const grantsBlueskyChat = (scopes: readonly string[]): boolean =>
  blueskyChatMethods.every((method) =>
    allowsRpc(scopes, method, blueskyChatService)
  );
