import type { Permission, Post } from "acme-contract";

/** The post as the composer has it, and who looks at it. */
export interface ComposerSubject {
  readonly permissions: readonly Permission[];
  /** None for a new post. */
  readonly post: Post | undefined;
  /** Whether a new post was saved since the page opened. */
  readonly saved: boolean;
  /** The signed-in user. */
  readonly userId: string;
}

/**
 * What the member may do with the post, as it is. A new post is created by
 * its first save, and updated by the next ones. A draft is discarded by
 * those with post:delete, or by its author while they may edit drafts; a
 * post saved here is the viewer's own.
 */
export const capabilitiesOf = ({
  permissions,
  post,
  saved,
  userId,
}: ComposerSubject) => {
  const status = post?.status ?? "draft";
  const can = (permission: Permission) => permissions.includes(permission);
  const exists = post !== undefined || saved;
  const authored = post === undefined || post.authorId === userId;

  const canSchedule =
    can("post:schedule") && (status === "draft" || status === "scheduled");

  return {
    canCancel: post !== undefined && canSchedule,
    canDiscard:
      exists &&
      status === "draft" &&
      (can("post:delete") || (authored && can("post:update"))),
    canReschedule: status === "scheduled" && canSchedule,
    canSchedule,
    canUnschedule: status === "scheduled" && can("post:schedule"),
    canWrite: status === "draft" && can(exists ? "post:update" : "post:create"),
    status,
  };
};
