import { DateTime } from "effect";
import type { Post, PostStatus } from "peal-contract";

/** What the composer knows when it decides whether to offer "Publish now". */
export interface PublishNowState {
  /** Whether the member may reschedule the post. */
  readonly canReschedule: boolean;
  /** Whether the member may schedule the draft. */
  readonly canSchedule: boolean;
  /** How many channels the post goes to. */
  readonly channels: number;
  /**
   * Whether the workspace's approval policy is known: until it is, the
   * post might wait for an approval, so nothing is offered.
   */
  readonly policyKnown: boolean;
  /** Whether every channel's platform takes the post as it is. */
  readonly publishable: boolean;
  /** Whether another action of the composer runs. */
  readonly running: boolean;
  readonly status: PostStatus;
  /** Whether what this member schedules waits for an approval. */
  readonly willWait: boolean;
}

/** Whether "Publish now" shows, beside which action, and whether it acts. */
export type PublishNow =
  | { readonly _tag: "none" }
  | {
      readonly _tag: "offered";
      readonly enabled: boolean;
      readonly from: "draft" | "scheduled";
    };

/**
 * "Publish now" schedules a draft, or moves a scheduled post, to now. It is
 * not offered where the post would wait for an approval: held with its
 * time, it would go back to draft once approved after it (`scheduleGrace`),
 * so the button could not do what it says. It waits, as Schedule does,
 * until every channel takes the post, and for a channel to go to.
 */
export const publishNowOf = ({
  canReschedule,
  canSchedule,
  channels,
  policyKnown,
  publishable,
  running,
  status,
  willWait,
}: PublishNowState): PublishNow => {
  const enabled = publishable && !running && channels > 0;

  if (willWait || !policyKnown) {
    return { _tag: "none" };
  }

  if (status === "draft" && canSchedule) {
    return { _tag: "offered", enabled, from: "draft" };
  }

  return status === "scheduled" && canReschedule
    ? { _tag: "offered", enabled, from: "scheduled" }
    : { _tag: "none" };
};

/**
 * Whether a scheduled post's time has come: it goes out once its job
 * starts, which its page waits for (a post published now, for one).
 */
export const isDue = (
  { schedule, status }: Pick<Post, "schedule" | "status">,
  now: DateTime.Utc
): boolean =>
  status === "scheduled" &&
  schedule !== null &&
  DateTime.isLessThanOrEqualTo(schedule.at, now);
