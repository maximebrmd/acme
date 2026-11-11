import { Option } from "effect";
import type {
  LivePostBlocker,
  LivePostChange,
  PlatformCapabilities,
  Post,
  PostTarget,
} from "peal-contract";

/**
 * Where a channel of a post stands for a member who may remove it from
 * the platform:
 *
 * - `none`: nothing to offer, as it is not live there.
 * - `removed`: Peal deleted it from the platform.
 * - `removing`: a removal is pending.
 * - `failed`: the last removal gave up (`code`); asking again deletes what
 *   is left.
 * - `offered`: it can be removed.
 * - `blocked`: the platform does not let Peal (`by` says why).
 */
export type LiveState =
  | { readonly _tag: "none" }
  | { readonly _tag: "removed" }
  | { readonly _tag: "removing" }
  | { readonly _tag: "failed"; readonly code: string | null }
  | { readonly _tag: "offered" }
  | { readonly _tag: "blocked"; readonly by: LivePostBlocker | null };

/** The latest change asked of the target, if any. */
export const latestChangeOf = (
  changes: readonly LivePostChange[],
  targetId: string
): Option.Option<LivePostChange> =>
  Option.fromUndefinedOr(
    changes
      .filter((change) => change.targetId === targetId)
      .toSorted((a, b) => b.id.localeCompare(a.id))[0]
  );

/**
 * Where the target stands, from its status, the changes asked of it and
 * what its platform lets Peal do (`livePost` of its capabilities, none
 * while they are not read).
 */
export const liveStateOf = (
  target: PostTarget,
  changes: readonly LivePostChange[],
  ability: Option.Option<PlatformCapabilities["livePost"]>
): LiveState => {
  if (target.status !== "published") {
    return { _tag: "none" };
  }

  if (target.removedAt !== null) {
    return { _tag: "removed" };
  }

  const latest = latestChangeOf(changes, target.id);

  if (Option.exists(latest, ({ status }) => status === "pending")) {
    return { _tag: "removing" };
  }

  if (Option.isNone(ability)) {
    return { _tag: "none" };
  }

  if (!ability.value.unpublish) {
    return { _tag: "blocked", by: ability.value.unpublishBlockedBy ?? null };
  }

  return Option.match(
    latest.pipe(Option.filter(({ status }) => status === "failed")),
    {
      onNone: (): LiveState => ({ _tag: "offered" }),
      onSome: ({ code }): LiveState => ({ _tag: "failed", code }),
    }
  );
};

/** Whether a removal of the post is still going, so the page reads again. */
export const isRemoving = (changes: readonly LivePostChange[]): boolean =>
  changes.some(({ status }) => status === "pending");

/**
 * Whether Peal removed the post from every channel it went live on: the
 * calendar shows it dimmed.
 */
export const isRemovedEverywhere = (post: Pick<Post, "targets">): boolean => {
  const live = post.targets.filter(({ status }) => status === "published");

  return live.length > 0 && live.every(({ removedAt }) => removedAt !== null);
};
