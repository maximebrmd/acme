import type {
  AlreadyMember,
  ContentViolation,
  Forbidden,
  InvalidDateRange,
  InvalidTimeZone,
  InvitationNotFound,
  PlanLimitReached,
  PostContentInvalid,
  PostNotFound,
  PostStatusConflict,
  TargetStatusConflict,
  TooManyInvitations,
  Unauthenticated,
  UnknownChannels,
  UnknownMedia,
  WorkspaceNotFound,
} from "acme-contract";
import { Match } from "effect";
import type { Schema } from "effect";
import type { HttpClientError } from "effect/http";
import type { HttpApiError } from "effect/http-api";

import { requestFailed } from "#api-request-failed.ts";
import type { ApiRequestFailed } from "#api-request-failed.ts";
import { Refused } from "#refused.ts";
import { SignInExpired } from "#sign-in-expired.ts";

/** Whatever a signed-in command's request may fail with. */
export type ApiFailure =
  | AlreadyMember
  | Forbidden
  | HttpApiError.BadRequest
  | HttpClientError.HttpClientError
  | InvalidDateRange
  | InvalidTimeZone
  | InvitationNotFound
  | PlanLimitReached
  | PostContentInvalid
  | PostNotFound
  | PostStatusConflict
  | Schema.SchemaError
  | TargetStatusConflict
  | TooManyInvitations
  | Unauthenticated
  | UnknownChannels
  | UnknownMedia
  | WorkspaceNotFound;

const limits: Readonly<Record<PlanLimitReached["limit"], string>> = {
  assistantRequests: "assistant requests a day",
  channels: "channels",
  members: "members, pending invitations included",
  scheduledPosts: "posts going out a month",
};

const violationOf = (violation: ContentViolation): string =>
  "channelId" in violation
    ? `${violation._tag} on channel ${violation.channelId}`
    : violation._tag;

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
      BadRequest: () => refused("Acme could not read the request."),
      Forbidden: () =>
        refused(
          "Acme refused: your role in this workspace does not allow it, or your account was suspended."
        ),
      HttpClientError: requestFailed(url),
      InvalidDateRange: () =>
        refused(
          "The range must end on or after the day it starts, and span 366 days at most."
        ),
      InvalidTimeZone: ({ timeZone }) =>
        refused(
          `${timeZone} is not a time zone Acme knows: give an IANA zone, such as Europe/Paris.`
        ),
      InvitationNotFound: () =>
        refused(
          "The workspace has no pending invitation with that id: it was accepted, declined or revoked."
        ),
      PlanLimitReached: ({ allowed, limit }) =>
        refused(
          `The workspace's plan allows ${String(allowed)} ${limits[limit]}, and has them all. A larger plan makes room: see acme billing.`
        ),
      PostContentInvalid: ({ violations }) =>
        refused(
          `Acme refused the post: ${violations.map(violationOf).join(", ")}.`
        ),
      PostNotFound: () => refused("The workspace has no such post."),
      PostStatusConflict: ({ status }) =>
        refused(`The post is ${status}, which does not allow this.`),
      SchemaError: requestFailed(url),
      TargetStatusConflict: ({ status }) =>
        refused(
          `The post is ${status} on that channel: only a failed or unconfirmed post is posted again, and only an unconfirmed one confirmed.`
        ),
      TooManyInvitations: () =>
        refused(
          "The workspace has 100 invitations pending, the most it may: revoke some first."
        ),
      Unauthenticated: () => new SignInExpired({ url }),
      UnknownChannels: ({ channelIds }) =>
        refused(
          `These channels are not the workspace's: ${channelIds.join(", ")}. acme channels list shows them.`
        ),
      UnknownMedia: ({ mediaIds }) =>
        refused(
          `These media are not the workspace's, or not ready: ${mediaIds.join(", ")}.`
        ),
      WorkspaceNotFound: () =>
        refused("You do not belong to this workspace, or it no longer exists."),
    });
