import { Option } from "effect";
import type {
  LivePostBlocker,
  LivePostChange,
  PlatformCapabilities,
  Post,
  PostContent,
  PostTarget,
} from "peal-contract";

/**
 * Where a channel of a post stands for a member who may remove it from
 * the platform:
 *
 * - `none`: nothing to offer, as it is not live there.
 * - `removed`: Peal deleted it from the platform.
 * - `removing`: a removal is pending.
 * - `editing`: an edit of its text is pending: neither is offered.
 * - `failed`: the last removal gave up (`code`); asking again deletes what
 *   is left.
 * - `offered`: it can be removed.
 * - `blocked`: the platform does not let Peal (`by` says why).
 */
export type LiveState =
  | { readonly _tag: "none" }
  | { readonly _tag: "removed" }
  | { readonly _tag: "removing" }
  | { readonly _tag: "editing" }
  | { readonly _tag: "failed"; readonly code: string | null }
  | { readonly _tag: "offered" }
  | { readonly _tag: "blocked"; readonly by: LivePostBlocker | null };

/**
 * Where an edit of a channel's text stands for a member who may make it:
 *
 * - `none`: nothing to offer, as it is not live there, or was removed.
 * - `busy`: another change of it (a removal) is pending.
 * - `editing`: an edit is pending.
 * - `failed`: the last edit gave up (`code`); the post says what it said.
 * - `offered`: it can be edited.
 * - `blocked`: the platform does not let Peal (`by` says why).
 */
export type EditState =
  | { readonly _tag: "none" }
  | { readonly _tag: "busy" }
  | { readonly _tag: "editing" }
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
    return Option.exists(latest, ({ kind }) => kind === "edit")
      ? { _tag: "editing" }
      : { _tag: "removing" };
  }

  if (Option.isNone(ability)) {
    return { _tag: "none" };
  }

  if (!ability.value.unpublish) {
    return { _tag: "blocked", by: ability.value.unpublishBlockedBy ?? null };
  }

  // A failed edit leaves the post as it was, and removal offered.
  return Option.match(
    latest.pipe(
      Option.filter(
        ({ kind, status }) => status === "failed" && kind === "unpublish"
      )
    ),
    {
      onNone: (): LiveState => ({ _tag: "offered" }),
      onSome: ({ code }): LiveState => ({ _tag: "failed", code }),
    }
  );
};

/**
 * Where an edit of the target's text stands, from its status, the changes
 * asked of it and what its platform lets Peal do (`livePost`, none while
 * the capabilities are not read).
 */
export const editStateOf = (
  target: PostTarget,
  changes: readonly LivePostChange[],
  ability: Option.Option<PlatformCapabilities["livePost"]>
): EditState => {
  if (target.status !== "published" || target.removedAt !== null) {
    return { _tag: "none" };
  }

  const latest = latestChangeOf(changes, target.id);

  if (Option.exists(latest, ({ status }) => status === "pending")) {
    return Option.exists(latest, ({ kind }) => kind === "edit")
      ? { _tag: "editing" }
      : { _tag: "busy" };
  }

  if (Option.isNone(ability)) {
    return { _tag: "none" };
  }

  if (!ability.value.edit) {
    return { _tag: "blocked", by: ability.value.editBlockedBy ?? null };
  }

  return Option.match(
    latest.pipe(
      Option.filter(
        ({ kind, status }) => status === "failed" && kind === "edit"
      )
    ),
    {
      onNone: (): EditState => ({ _tag: "offered" }),
      onSome: ({ code }): EditState => ({ _tag: "failed", code }),
    }
  );
};

/**
 * The text of the post's part at `part` (from 0) on a channel: its own
 * there, or the part's; empty for a part the post does not have.
 */
export const partTextOn = (
  content: Pick<PostContent, "followUps" | "overrides" | "text">,
  part: number,
  channelId: string
): string => {
  const chosen = part === 0 ? content : (content.followUps ?? []).at(part - 1);

  if (chosen === undefined) {
    return "";
  }

  return (
    chosen.overrides.find((override) => override.channelId === channelId)
      ?.text ?? chosen.text
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
