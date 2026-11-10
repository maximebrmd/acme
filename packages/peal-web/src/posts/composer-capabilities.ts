import type { ApprovalPolicy, Permission, Post } from "peal-contract";

/** The post as the composer has it, and who looks at it. */
export interface ComposerSubject {
  /**
   * Which of the workspace's posts wait for an approval; never, when left
   * out, as on a server that answers no policy.
   */
  readonly approvalPolicy?: ApprovalPolicy | undefined;
  readonly permissions: readonly Permission[];
  /** None for a new post. */
  readonly post: Post | undefined;
  /** Whether a new post was saved since the page opened. */
  readonly saved: boolean;
  /** The signed-in user. */
  readonly userId: string;
}

// Whether what a member with these rights schedules waits for an approval.
const waitsUnder = (
  policy: ApprovalPolicy,
  can: (permission: Permission) => boolean
) =>
  policy === "always" ||
  (policy === "contributorsAndApplications" && !can("post:schedule"));

// Who may discard a draft: those with post:delete, or its author while
// they may edit drafts.
const mayDiscard = (
  can: (permission: Permission) => boolean,
  authored: boolean
) => can("post:delete") || (authored && can("post:update"));

/**
 * What the member may do with the post, as it is. A new post is created by
 * its first save, and updated by the next ones. A draft is discarded by
 * those with post:delete, or by its author while they may edit drafts; a
 * post saved here is the viewer's own.
 *
 * Where the workspace asks for approvals, those who write drafts may ask
 * for a post to go out, which then waits (`willWait`), and act on a post
 * that waits; a scheduled post stays with those who may schedule. Those who
 * may approve decide on a post that waits (`canDecide`).
 */
export const capabilitiesOf = ({
  approvalPolicy = "never",
  permissions,
  post,
  saved,
  userId,
}: ComposerSubject) => {
  const status = post?.status ?? "draft";
  const can = (permission: Permission) => permissions.includes(permission);
  const exists = post !== undefined || saved;
  const authored = post === undefined || post.authorId === userId;
  const waiting = status === "awaitingApproval";
  const draft = status === "draft";

  // Whoever may schedule, and, where posts wait, whoever writes drafts.
  const mayAsk =
    can("post:schedule") || (approvalPolicy !== "never" && can("post:create"));

  // A post that waits is its asker's to move, take back or cancel; a
  // scheduled one stays with those who may schedule.
  const held =
    (waiting && mayAsk) || (status === "scheduled" && can("post:schedule"));

  return {
    // A draft is discarded rather than cancelled.
    canCancel: held,
    canDecide: waiting && can("post:approve"),
    canDiscard: exists && draft && mayDiscard(can, authored),
    canReschedule: held,
    canSchedule: draft && mayAsk,
    canUnschedule: held,
    canWrite: draft && can(exists ? "post:update" : "post:create"),
    status,
    // Whether what this member schedules here waits for an approval.
    willWait: waitsUnder(approvalPolicy, can),
  };
};
