import type { DateTime } from "effect";
import { Option, Result, Schema } from "effect";

import type { Permission } from "#shared/domain/access.ts";
import {
  ChannelIdSchema,
  PostIdSchema,
  UserIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import type {
  ChannelId,
  PostId,
  UserId,
  WorkspaceId,
} from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";

import { InvalidChangeTransition } from "./invalid-change-transition.ts";
import type { ChangeAction } from "./invalid-change-transition.ts";
import { LivePostChangeIdSchema } from "./live-post-change-id.ts";
import type { LivePostChangeId } from "./live-post-change-id.ts";
import { editBlocker, unpublishBlocker } from "./live-post-support.ts";
import { PostOriginSchema } from "./post-origin.ts";
import type { PostOrigin } from "./post-origin.ts";
import { PostTargetIdSchema } from "./post-target-id.ts";
import type { PostTargetId } from "./post-target-id.ts";
import { livePartsOf } from "./post-target.ts";
import type { PostTarget } from "./post-target.ts";
import { PostTextSchema } from "./post-text.ts";

/**
 * What it takes to change a post that is live: the permission that
 * publishes it (owners, admins, editors; keys and applications given it;
 * an OAuth client with `workspace:publish`), and no other. An owner's
 * decision: change it here alone.
 */
export const livePostChangePermission: Permission = "post:publish";

/**
 * What a change does to a post live on a channel: `unpublish` deletes it
 * from the platform, every part of it; `edit` replaces the text of one of
 * its parts, nothing else. Stored with the change: add a member, never
 * rename or remove one.
 */
export const LivePostChangeKindSchema = Schema.Literals(["unpublish", "edit"]);

export type LivePostChangeKind = typeof LivePostChangeKindSchema.Type;

/**
 * Where a change stands: `pending` while its job deletes the parts left,
 * `done` once none is, `failed` when the job gave up (`failureCode` says
 * why); a member may then ask again, which takes up the parts left.
 */
export const LivePostChangeStatusSchema = Schema.Literals([
  "pending",
  "done",
  "failed",
]);

export type LivePostChangeStatus = typeof LivePostChangeStatusSchema.Type;

/**
 * A part of the post to delete from the platform, or to edit there: its
 * place in the post, from 0, and the platform's id for it. Ids and
 * places, never content.
 */
export const PartToRemoveSchema = Schema.Struct({
  index: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  platformPostId: PlatformPostIdSchema,
});

export type PartToRemove = typeof PartToRemoveSchema.Type;

/**
 * Why a target cannot be changed now:
 *
 * - `notPublished`: it is not live there (still sending, failed, waiting
 *   to be checked, cancelled).
 * - `alreadyRemoved`: Peal deleted it from the platform already.
 * - `noPlatformId`: Peal has no id for it, or for one of its parts, as for
 *   a post a member confirmed by hand.
 * - `notSupported`: the platform has no call for it, or Peal lacks the
 *   permission (`./live-post-support.ts`).
 * - `changeInProgress`: another change of the target is pending.
 * - `channelUnavailable`: the channel is disconnected, turned off, or must
 *   be reconnected.
 * - `boostRunning`: a boost that is not over shows the post.
 * - `approvalRequired`: the member's posts wait for an approval, and an
 *   edit would put words nobody reviewed out at once.
 *
 * An edit is refused `noPlatformId` too for a part the post does not have
 * live there.
 */
export const LivePostRefusalSchema = Schema.Literals([
  "notPublished",
  "alreadyRemoved",
  "noPlatformId",
  "notSupported",
  "changeInProgress",
  "channelUnavailable",
  "boostRunning",
  "approvalRequired",
]);

export type LivePostRefusal = typeof LivePostRefusalSchema.Type;

/**
 * A change a member, a key or an application asked of a post that is live
 * on one channel, and where it stands. The parts left are deleted in
 * order, the last part of a thread first, so a removal that stops midway
 * leaves a shorter thread that still reads from its start. An edit has
 * one part left, the one whose text it replaces with `text`, which the
 * change holds only while it is pending: Peal keeps no text of a change
 * that ended, and none of the text it replaced.
 *
 * | From    | To                                         |
 * | ------- | ------------------------------------------ |
 * | pending | pending (a part removed), done, failed     |
 * | done    | nothing                                    |
 * | failed  | nothing: asking again makes a new change   |
 */
export class LivePostChange extends Schema.Class<LivePostChange>(
  "peal-server/publishing/domain/LivePostChange"
)({
  // Whether the platform said a part was gone already when it was asked
  // to delete it: someone deleted it there before.
  alreadyGone: Schema.Boolean,
  channelId: ChannelIdSchema,
  // The reason the job gave up: a code of Peal's (`unavailable`,
  // `rateLimited`, `tokenExpired`, `channelUnavailable`) or the platform's.
  // Never content.
  failureCode: Schema.Option(Schema.String),
  finishedAt: Schema.Option(Schema.DateTimeUtc),
  id: LivePostChangeIdSchema,
  kind: LivePostChangeKindSchema,
  partsLeft: Schema.Array(PartToRemoveSchema),
  postId: PostIdSchema,
  requestedAt: Schema.DateTimeUtc,
  // The member who asked; none for an API key.
  requestedBy: Schema.Option(UserIdSchema),
  requestedVia: Schema.Option(PostOriginSchema),
  status: LivePostChangeStatusSchema,
  targetId: PostTargetIdSchema,
  // The new text of an edit while it is pending; none for a removal, and
  // once the change ended.
  text: Schema.Option(PostTextSchema),
  workspaceId: WorkspaceIdSchema,
}) {}

type Transition = Result.Result<LivePostChange, InvalidChangeTransition>;

const rejected = (
  change: LivePostChange,
  action: ChangeAction
): Result.Result<never, InvalidChangeTransition> =>
  Result.fail(
    new InvalidChangeTransition({
      action,
      changeId: change.id,
      from: change.status,
    })
  );

const withFields = (
  change: LivePostChange,
  fields: Partial<
    Pick<
      LivePostChange,
      | "alreadyGone"
      | "failureCode"
      | "finishedAt"
      | "partsLeft"
      | "status"
      | "text"
    >
  >
): LivePostChange =>
  new LivePostChange({
    alreadyGone: fields.alreadyGone ?? change.alreadyGone,
    channelId: change.channelId,
    failureCode: fields.failureCode ?? change.failureCode,
    finishedAt: fields.finishedAt ?? change.finishedAt,
    id: change.id,
    kind: change.kind,
    partsLeft: fields.partsLeft ?? change.partsLeft,
    postId: change.postId,
    requestedAt: change.requestedAt,
    requestedBy: change.requestedBy,
    requestedVia: change.requestedVia,
    status: fields.status ?? change.status,
    targetId: change.targetId,
    text: fields.text ?? change.text,
    workspaceId: change.workspaceId,
  });

/**
 * The parts of a published target to delete, last first, each with the
 * platform's id for it, or why it cannot be removed now. `platform` is its
 * channel's, none when the channel cannot be used (disconnected, turned
 * off, to reconnect). `latest` is the newest change asked of the target: a
 * pending one stands in the way, and one that failed left the parts it had
 * not deleted, which are those to delete now (the others are gone).
 */
export const removable = (
  target: PostTarget,
  platform: Option.Option<Platform>,
  latest: Option.Option<LivePostChange>
): Result.Result<readonly PartToRemove[], LivePostRefusal> => {
  const { status } = target;

  if (status._tag !== "published") {
    return Result.fail("notPublished");
  }

  if (status.removedAt !== undefined) {
    return Result.fail("alreadyRemoved");
  }

  if (Option.exists(latest, (change) => change.status === "pending")) {
    return Result.fail("changeInProgress");
  }

  if (Option.isNone(platform)) {
    return Result.fail("channelUnavailable");
  }

  if (Option.isSome(unpublishBlocker(platform.value))) {
    return Result.fail("notSupported");
  }

  const failed = latest.pipe(
    Option.filter(
      (change) => change.status === "failed" && change.kind === "unpublish"
    )
  );

  if (Option.isSome(failed)) {
    return Result.succeed(failed.value.partsLeft);
  }

  const parts: PartToRemove[] = [];

  for (const part of livePartsOf(target).toReversed()) {
    if (Option.isNone(part.platformPostId)) {
      return Result.fail("noPlatformId");
    }

    parts.push({
      index: part.index,
      platformPostId: part.platformPostId.value,
    });
  }

  return parts.length === 0
    ? Result.fail("noPlatformId")
    : Result.succeed(parts);
};

/** A request to delete `parts` of a live post, waiting for its job. */
export const requestUnpublish = (request: {
  readonly channelId: ChannelId;
  readonly id: LivePostChangeId;
  readonly now: DateTime.Utc;
  readonly parts: readonly PartToRemove[];
  readonly postId: PostId;
  readonly requestedBy: Option.Option<UserId>;
  readonly requestedVia: Option.Option<PostOrigin>;
  readonly targetId: PostTargetId;
  readonly workspaceId: WorkspaceId;
}): LivePostChange =>
  new LivePostChange({
    alreadyGone: false,
    channelId: request.channelId,
    failureCode: Option.none(),
    finishedAt: Option.none(),
    id: request.id,
    kind: "unpublish",
    partsLeft: request.parts,
    postId: request.postId,
    requestedAt: request.now,
    requestedBy: request.requestedBy,
    requestedVia: request.requestedVia,
    status: "pending",
    targetId: request.targetId,
    text: Option.none(),
    workspaceId: request.workspaceId,
  });

/**
 * The part at `part` of a published target, with the platform's id for
 * it, to replace its text, or why it cannot be edited now: as `removable`
 * answers, with the platform's edit blocker, and `noPlatformId` for a
 * part Peal has no id for or that is not live there. A target whose
 * removal failed is still live, and may be edited.
 */
export const editable = (
  target: PostTarget,
  platform: Option.Option<Platform>,
  part: number,
  latest: Option.Option<LivePostChange>
): Result.Result<PartToRemove, LivePostRefusal> => {
  const { status } = target;

  if (status._tag !== "published") {
    return Result.fail("notPublished");
  }

  if (status.removedAt !== undefined) {
    return Result.fail("alreadyRemoved");
  }

  if (Option.exists(latest, (change) => change.status === "pending")) {
    return Result.fail("changeInProgress");
  }

  if (Option.isNone(platform)) {
    return Result.fail("channelUnavailable");
  }

  if (Option.isSome(editBlocker(platform.value))) {
    return Result.fail("notSupported");
  }

  const live = livePartsOf(target).find(({ index }) => index === part);

  if (live === undefined || Option.isNone(live.platformPostId)) {
    return Result.fail("noPlatformId");
  }

  return Result.succeed({
    index: live.index,
    platformPostId: live.platformPostId.value,
  });
};

/** A request to replace the text of `part` of a live post with `text`. */
export const requestEdit = (request: {
  readonly channelId: ChannelId;
  readonly id: LivePostChangeId;
  readonly now: DateTime.Utc;
  readonly part: PartToRemove;
  readonly postId: PostId;
  readonly requestedBy: Option.Option<UserId>;
  readonly requestedVia: Option.Option<PostOrigin>;
  readonly targetId: PostTargetId;
  readonly text: string;
  readonly workspaceId: WorkspaceId;
}): LivePostChange =>
  new LivePostChange({
    alreadyGone: false,
    channelId: request.channelId,
    failureCode: Option.none(),
    finishedAt: Option.none(),
    id: request.id,
    kind: "edit",
    partsLeft: [request.part],
    postId: request.postId,
    requestedAt: request.now,
    requestedBy: request.requestedBy,
    requestedVia: request.requestedVia,
    status: "pending",
    targetId: request.targetId,
    text: Option.some(request.text),
    workspaceId: request.workspaceId,
  });

/**
 * The part at `index` is no longer on the platform: deleted now, or found
 * gone already (`alreadyGone`). Recording it again changes nothing, so a
 * step run twice records it once.
 */
export const partRemoved = (
  change: LivePostChange,
  index: number,
  alreadyGone: boolean
): Transition => {
  if (change.status !== "pending" || change.kind !== "unpublish") {
    return rejected(change, "removePart");
  }

  if (!change.partsLeft.some((part) => part.index === index)) {
    return Result.succeed(change);
  }

  return Result.succeed(
    withFields(change, {
      alreadyGone: change.alreadyGone || alreadyGone,
      partsLeft: change.partsLeft.filter((part) => part.index !== index),
    })
  );
};

/**
 * The platform shows the edit's text on the part at `index`. Recording it
 * again changes nothing. The text stays until the change is done, for
 * the post to take it then.
 */
export const partEdited = (
  change: LivePostChange,
  index: number
): Transition => {
  if (change.status !== "pending" || change.kind !== "edit") {
    return rejected(change, "editPart");
  }

  return Result.succeed(
    withFields(change, {
      partsLeft: change.partsLeft.filter((part) => part.index !== index),
    })
  );
};

/**
 * Every part is off the platform, or edited: the change is done, and
 * keeps no text.
 */
export const finishChange = (
  change: LivePostChange,
  now: DateTime.Utc
): Transition =>
  change.status === "pending" && change.partsLeft.length === 0
    ? Result.succeed(
        withFields(change, {
          finishedAt: Option.some(now),
          status: "done",
          text: Option.none(),
        })
      )
    : rejected(change, "finish");

/**
 * The job gave up, with `code`: the parts left stay, for a member who asks
 * again, and an edit's text goes (asking again gives it anew).
 */
export const failChange = (
  change: LivePostChange,
  code: string,
  now: DateTime.Utc
): Transition =>
  change.status === "pending"
    ? Result.succeed(
        withFields(change, {
          failureCode: Option.some(code),
          finishedAt: Option.some(now),
          status: "failed",
          text: Option.none(),
        })
      )
    : rejected(change, "fail");
