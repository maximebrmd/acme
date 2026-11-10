import { Option, Result, Schema } from "effect";
import type { DateTime } from "effect";

import {
  PostIdSchema,
  UserIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";

import { ApprovalChanged } from "./approval-changed.ts";
import { ApprovalNotPending } from "./approval-not-pending.ts";
import { ApprovalRequestIdSchema } from "./review-ids.ts";
import { ReviewerSchema } from "./reviewer.ts";
import type { Reviewer } from "./reviewer.ts";

/**
 * How whoever asked reached Peal: a member in the web app (`member`), an
 * API key (`apiKey`) or an OAuth client acting for a member
 * (`application`). Stored: add a name, never rename or remove one.
 */
export const RequestOriginSchema = Schema.Literals([
  "member",
  "apiKey",
  "application",
]);

export type RequestOrigin = typeof RequestOriginSchema.Type;

/**
 * Where a request is: `pending`; `approved`; `changesRequested`, which sent
 * the post back to draft; or `withdrawn`, when the post stopped waiting
 * though nobody decided (taken back to draft, cancelled, or scheduled by
 * someone who may). Stored: add a name, never rename or remove one.
 */
export const RequestStatusSchema = Schema.Literals([
  "pending",
  "approved",
  "changesRequested",
  "withdrawn",
]);

export type RequestStatus = typeof RequestStatusSchema.Type;

/**
 * Someone asked for a post to go out at a time, in a workspace where it
 * needs an approval first: who asked, for what the post said then
 * (`subjectHash`, the SHA-256 of publishing's `approvalSubject`), and what
 * was decided, by whom and when. These rows are the record of who approved
 * what: a decided one never changes.
 *
 * An approval stands for the post while the post still says what it said
 * (`covers`): a change to its text, its media or their alt text, the text
 * it has on a channel, its channels or its options on one makes another
 * subject, and the post waits again. Its time is not part of it.
 */
export class ApprovalRequest extends Schema.Class<ApprovalRequest>(
  "peal-server/review/domain/ApprovalRequest"
)({
  decision: Schema.Option(
    Schema.Struct({ at: Schema.DateTimeUtc, by: ReviewerSchema })
  ),
  id: ApprovalRequestIdSchema,
  postId: PostIdSchema,
  requestedAt: Schema.DateTimeUtc,
  // The member who asked; none when an API key did.
  requestedBy: Schema.Option(UserIdSchema),
  requestedVia: RequestOriginSchema,
  // The time asked for, in the zone it was chosen in.
  scheduledAt: Schema.DateTimeUtc,
  status: RequestStatusSchema,
  subjectHash: Schema.NonEmptyString,
  timeZone: TimeZoneIdSchema,
  workspaceId: WorkspaceIdSchema,
}) {}

type Transition = Result.Result<ApprovalRequest, ApprovalNotPending>;

/**
 * The request a reviewer was shown before deciding: which one, and what its
 * post said then.
 */
export interface ShownRequest {
  readonly requestId: string;
  readonly subjectHash: string;
}

/**
 * The request, when it is the one the reviewer was shown, for what its post
 * said then. A decision is for what was read: a post asked again, or that
 * changed while it waited, is looked at again (ApprovalChanged).
 */
export const asShown = (
  request: ApprovalRequest,
  shown: ShownRequest
): Result.Result<ApprovalRequest, ApprovalChanged> =>
  request.id === shown.requestId && request.subjectHash === shown.subjectHash
    ? Result.succeed(request)
    : Result.fail(new ApprovalChanged({ postId: request.postId }));

/** The request with some of what its life changes. */
export const changed = (
  request: ApprovalRequest,
  change: Partial<
    Pick<
      ApprovalRequest,
      | "decision"
      | "requestedBy"
      | "requestedVia"
      | "scheduledAt"
      | "status"
      | "subjectHash"
      | "timeZone"
    >
  >
): ApprovalRequest =>
  new ApprovalRequest({
    decision: change.decision ?? request.decision,
    id: request.id,
    postId: request.postId,
    requestedAt: request.requestedAt,
    requestedBy: change.requestedBy ?? request.requestedBy,
    requestedVia: change.requestedVia ?? request.requestedVia,
    scheduledAt: change.scheduledAt ?? request.scheduledAt,
    status: change.status ?? request.status,
    subjectHash: change.subjectHash ?? request.subjectHash,
    timeZone: change.timeZone ?? request.timeZone,
    workspaceId: request.workspaceId,
  });

const decided = (
  request: ApprovalRequest,
  status: RequestStatus,
  by: Reviewer,
  now: DateTime.Utc
): Transition =>
  request.status === "pending"
    ? Result.succeed(
        changed(request, { decision: Option.some({ at: now, by }), status })
      )
    : Result.fail(new ApprovalNotPending({ postId: request.postId }));

/** Approves what the request asks for. */
export const approve = (
  request: ApprovalRequest,
  by: Reviewer,
  now: DateTime.Utc
): Transition => decided(request, "approved", by, now);

/** Sends the post back for changes. */
export const requestChanges = (
  request: ApprovalRequest,
  by: Reviewer,
  now: DateTime.Utc
): Transition => decided(request, "changesRequested", by, now);

/**
 * The request once its post stopped waiting without a decision. One already
 * decided stays as it is.
 */
export const withdraw = (request: ApprovalRequest): ApprovalRequest =>
  request.status === "pending"
    ? changed(request, { status: "withdrawn" })
    : request;

/**
 * Whether an approval given through an application (an API key, an OAuth
 * client) is taken: only for what a member asked for in person. What an
 * application asked for waits for a person, or the policy that holds
 * applications' posts would hold nothing: the application that scheduled a
 * post would approve it.
 */
export const takesApplicationApproval = (request: ApprovalRequest): boolean =>
  request.requestedVia === "member";

/** Whether the request is an approval of the post as `subjectHash` says it. */
export const covers = (request: ApprovalRequest, subjectHash: string) =>
  request.status === "approved" && request.subjectHash === subjectHash;
