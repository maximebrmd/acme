import { Option } from "effect";
import type {
  LivePostChange as LivePostChangeView,
  PostUnpublish as PostUnpublishView,
} from "peal-contract";

import type { PostUnpublish } from "#publishing/application/live-post-changes.ts";
import type { LivePostChange } from "#publishing/domain/live-post-change.ts";

/** A change of a live post, as the API answers it: ids and codes only. */
export const livePostChangeView = (
  change: LivePostChange
): LivePostChangeView => {
  const view: LivePostChangeView = {
    code: Option.getOrNull(change.failureCode),
    finishedAt: Option.getOrNull(change.finishedAt),
    id: change.id,
    kind: change.kind,
    partsLeft: change.partsLeft.length,
    postId: change.postId,
    requestedAt: change.requestedAt,
    status: change.status,
    targetId: change.targetId,
  };

  return change.alreadyGone ? { ...view, alreadyGone: true } : view;
};

/** What asking to unpublish a whole post made, channel by channel. */
export const postUnpublishView = ({
  changes,
  refused,
}: PostUnpublish): PostUnpublishView => ({
  changes: changes.map(livePostChangeView),
  refused: refused.map(({ reason, targetId }) => ({ reason, targetId })),
});
