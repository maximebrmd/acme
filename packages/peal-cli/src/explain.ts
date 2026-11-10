import { Match } from "effect";
import type { Schema } from "effect";
import type { HttpClientError } from "effect/http";
import type { HttpApiError } from "effect/http-api";
import type {
  AlreadyMember,
  ApprovalNotPending,
  ChannelCannotPost,
  ChannelNotFound,
  CommentInvalid,
  CommentNotFound,
  ContentViolation,
  Forbidden,
  InvalidDateRange,
  InvalidTimeZone,
  InvitationNotFound,
  PlanLimitReached,
  PlatformUnreachable,
  PostContentInvalid,
  PostNotFound,
  PostNotReviewable,
  PostStatusConflict,
  ReviewLinkNotFound,
  TargetStatusConflict,
  TooManyInvitations,
  TooManyReviewLinks,
  Unauthenticated,
  UnknownChannels,
  UnknownMedia,
  WorkspaceNotFound,
} from "peal-contract";

import { requestFailed } from "#api-request-failed.ts";
import type { ApiRequestFailed } from "#api-request-failed.ts";
import { Refused } from "#refused.ts";
import { SignInExpired } from "#sign-in-expired.ts";

/** Whatever a signed-in command's request may fail with. */
export type ApiFailure =
  | AlreadyMember
  | ApprovalNotPending
  | ChannelCannotPost
  | ChannelNotFound
  | CommentInvalid
  | CommentNotFound
  | Forbidden
  | HttpApiError.BadRequest
  | HttpClientError.HttpClientError
  | InvalidDateRange
  | InvalidTimeZone
  | InvitationNotFound
  | PlanLimitReached
  | PlatformUnreachable
  | PostContentInvalid
  | PostNotFound
  | PostNotReviewable
  | PostStatusConflict
  | ReviewLinkNotFound
  | Schema.SchemaError
  | TargetStatusConflict
  | TooManyInvitations
  | TooManyReviewLinks
  | Unauthenticated
  | UnknownChannels
  | UnknownMedia
  | WorkspaceNotFound;

const limits: Readonly<Record<PlanLimitReached["limit"], string>> = {
  assistantRequests: "assistant requests a day",
  channels: "channels",
  mediaStorage: "bytes of media stored, uploads in progress included",
  members: "members, pending invitations included",
  scheduledPosts: "posts going out a month",
};

// What breaks a rule, with the option field it names and its channel.
const violationOf = (violation: ContentViolation): string => {
  const field = "field" in violation ? ` (${violation.field})` : "";

  return "channelId" in violation
    ? `${violation._tag}${field} on channel ${violation.channelId}`
    : `${violation._tag}${field}`;
};

// What is wrong with a comment, as the user fixes it.
const commentProblems: Readonly<Record<CommentInvalid["problem"], string>> = {
  anchor:
    "it is about a channel the post does not go to, or it is an answer, which is about what its thread is about",
  email: "the email address is not one address",
  name: "the name is empty, or longer than 80 characters",
  parent:
    "it answers a comment that started no thread of this post: answer the first comment of a thread, which is also the one to resolve",
  selection: "the words it quotes are not in the post's text where it says",
  text: "its text is empty, or longer than 2000 characters",
};

const refused = (reason: string) => new Refused({ reason });

/**
 * What a failed request means, as the user reads it: the sign-in to renew,
 * the server to check, or why it refused.
 */
export const explain =
  (url: string) =>
  (failure: ApiFailure): ApiRequestFailed | Refused | SignInExpired =>
    Match.valueTags(failure, {
      AlreadyMember: () => refused("That address belongs to a member already."),
      ApprovalNotPending: () =>
        refused(
          "The post does not wait for an approval: none was asked, or it was already decided, withdrawn or scheduled. peal approvals list shows those that wait."
        ),
      BadRequest: () => refused("Peal could not read the request."),
      ChannelCannotPost: ({ reason }) =>
        refused(
          reason === "disabled"
            ? "The channel is turned off: disconnect it and connect the account again, in the web app, to post to it."
            : "The channel must be reconnected, in the web app, before it can post."
        ),
      ChannelNotFound: () =>
        refused(
          "The workspace has no such channel, or it is not of this platform: peal channels list shows them."
        ),
      CommentInvalid: ({ problem }) =>
        refused(`Peal refused the comment: ${commentProblems[problem]}.`),
      CommentNotFound: () =>
        refused("The post has no such comment: peal review show lists them."),
      Forbidden: () =>
        refused(
          "Peal refused: your role in this workspace does not allow it, or your account was suspended."
        ),
      HttpClientError: requestFailed(url),
      InvalidDateRange: () =>
        refused(
          "The range must end on or after the day it starts, and span 366 days at most."
        ),
      InvalidTimeZone: ({ timeZone }) =>
        refused(
          `${timeZone} is not a time zone Peal knows: give an IANA zone, such as Europe/Paris.`
        ),
      InvitationNotFound: () =>
        refused(
          "The workspace has no pending invitation with that id: it was accepted, declined or revoked."
        ),
      PlanLimitReached: ({ allowed, limit }) =>
        refused(
          `The workspace's plan allows ${String(allowed)} ${limits[limit]}, and has them all. A larger plan makes room: see peal billing.`
        ),
      PlatformUnreachable: () =>
        refused(
          "The platform did not answer, or asked to slow down: try again in a few minutes."
        ),
      PostContentInvalid: ({ violations }) =>
        refused(
          `Peal refused the post: ${violations.map(violationOf).join(", ")}.`
        ),
      PostNotFound: () => refused("The workspace has no such post."),
      PostNotReviewable: ({ status }) =>
        refused(
          status === "cancelled"
            ? "The post was cancelled: nothing is left to review."
            : "The post went out, or is going out: nothing is left to review."
        ),
      PostStatusConflict: ({ status }) =>
        refused(`The post is ${status}, which does not allow this.`),
      ReviewLinkNotFound: () =>
        refused(
          "The workspace has no such review link: peal review links lists a post's."
        ),
      SchemaError: requestFailed(url),
      TargetStatusConflict: ({ status }) =>
        refused(
          `The post is ${status} on that channel: only a failed or unconfirmed post is posted again, and only an unconfirmed one confirmed.`
        ),
      TooManyInvitations: () =>
        refused(
          "The workspace has 100 invitations pending, the most it may: revoke some first."
        ),
      TooManyReviewLinks: ({ limit }) =>
        refused(
          `The post has ${String(limit)} working review links, the most it may: revoke one first.`
        ),
      Unauthenticated: () => new SignInExpired({ url }),
      UnknownChannels: ({ channelIds }) =>
        refused(
          `These channels are not the workspace's: ${channelIds.join(", ")}. peal channels list shows them.`
        ),
      UnknownMedia: ({ mediaIds }) =>
        refused(
          `These media are not the workspace's, or not ready: ${mediaIds.join(", ")}.`
        ),
      WorkspaceNotFound: () =>
        refused("You do not belong to this workspace, or it no longer exists."),
    });
