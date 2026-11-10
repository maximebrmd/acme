import { Array as Arr, Effect, Option } from "effect";

import { DuplicateContent } from "#publishing/domain/duplicate-content.ts";
import {
  contentOn,
  duplicateRange,
} from "#publishing/domain/duplicate-window.ts";
import type { PostTarget } from "#publishing/domain/post-target.ts";
import type { Post } from "#publishing/domain/post.ts";

import { ContentFingerprints } from "./content-fingerprints.ts";
import type { TargetContent } from "./content-fingerprints.ts";

// Keeping the same content from going to the same channel twice by
// mistake. It is a protection of its own, beside idempotency keys: a key
// makes one request safe to send again, and this catches the request made
// twice, by a loop or by a client that kept no key.

const contentsOf = (
  post: Post,
  targets: readonly PostTarget[]
): readonly TargetContent[] =>
  targets.map((target) => ({
    channelId: target.channelId,
    content: contentOn(post.content, target.channelId),
    targetId: target.id,
  }));

/**
 * The workspace's other posts that send what the scheduled post sends, to
 * the same channels, within `duplicateWindow` of its time. None for a post
 * that has no time.
 */
export const duplicatesOf = Effect.fn("Publishing.duplicatesOf")(
  function* duplicatesOf(post: Post, targets: readonly PostTarget[]) {
    const { status } = post;

    if (status._tag !== "scheduled") {
      return [];
    }

    return yield* ContentFingerprints.use((fingerprints) =>
      fingerprints.duplicatesOf({
        ...duplicateRange(status.schedule.at),
        contents: contentsOf(post, targets),
        except: Option.some(post.id),
        workspaceId: post.workspaceId,
      })
    );
  }
);

/**
 * Keeps what a post just scheduled sends to each of its channels, so a
 * later one is compared with it. Run in the transaction that schedules it.
 */
export const remember = (post: Post, targets: readonly PostTarget[]) =>
  ContentFingerprints.use((fingerprints) =>
    fingerprints.record(contentsOf(post, targets))
  );

/**
 * Lets a new post through unless another already sends the same content
 * to one of its channels within `duplicateWindow` (DuplicateContent, which
 * undoes the transaction it runs in), then keeps what it sends
 * (`remember`). A caller who means it (`allowDuplicate`) is not checked.
 */
export const admit = Effect.fn("Publishing.admit")(function* admit(
  post: Post,
  targets: readonly PostTarget[],
  allowDuplicate: boolean
) {
  const duplicates = allowDuplicate ? [] : yield* duplicatesOf(post, targets);

  if (Arr.isReadonlyArrayNonEmpty(duplicates)) {
    return yield* new DuplicateContent({ duplicates });
  }

  return yield* remember(post, targets);
});
