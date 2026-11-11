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
