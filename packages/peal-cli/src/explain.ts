import { Match } from "effect";
import type { Schema } from "effect";
import type { HttpClientError } from "effect/http";
import type { HttpApiError } from "effect/http-api";
import type {
  AlreadyMember,
  ChannelCannotPost,
  ChannelNotFound,
  ContentViolation,
  Forbidden,
  InvalidDateRange,
  InvalidTimeZone,
  InvitationNotFound,
  PlanLimitReached,
  PlatformUnreachable,
  PostContentInvalid,
  PostNotFound,
  PostStatusConflict,
  TargetStatusConflict,
  TooManyInvitations,
  TooManyWebhookEndpoints,
  Unauthenticated,
  UnknownChannels,
  UnknownMedia,
  WebhookDeliveryNotFound,
  WebhookEndpointDisabled,
  WebhookEndpointNotFound,
  WebhooksNotConfigured,
  WebhookUrlRefused,
  WorkspaceNotFound,
} from "peal-contract";

import { requestFailed } from "#api-request-failed.ts";
import type { ApiRequestFailed } from "#api-request-failed.ts";
import { Refused } from "#refused.ts";
import { SignInExpired } from "#sign-in-expired.ts";

/** Whatever a signed-in command's request may fail with. */
export type ApiFailure =
  | AlreadyMember
  | ChannelCannotPost
  | ChannelNotFound
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
  | PostStatusConflict
  | Schema.SchemaError
  | TargetStatusConflict
  | TooManyInvitations
  | TooManyWebhookEndpoints
  | Unauthenticated
  | UnknownChannels
  | UnknownMedia
  | WebhookDeliveryNotFound
  | WebhookEndpointDisabled
  | WebhookEndpointNotFound
  | WebhooksNotConfigured
  | WebhookUrlRefused
  | WorkspaceNotFound;

const limits: Readonly<Record<PlanLimitReached["limit"], string>> = {
  assistantRequests: "assistant requests a day",
  channels: "channels",
  mediaStorage: "bytes of media stored, uploads in progress included",
  members: "members, pending invitations included",
  scheduledPosts: "posts going out a month",
};

// Why Peal delivers nothing to an address, and what would make it one.
const urlRefusals: Readonly<Record<WebhookUrlRefused["reason"], string>> = {
  credentials:
    "The address carries a user name or a password: leave them out, and check each delivery's signature instead.",
  malformed:
    "The address is not a URL: give it whole, such as https://hooks.example.com/peal.",
  notHttps:
    "The address must be HTTPS, on the default port (443): Peal delivers nowhere else.",
  notPublic:
    "The address's host is not a public address (loopback, private or link-local): Peal delivers only to hosts anyone on the internet can reach.",
  tooLong: "The address is longer than 2048 characters.",
  unknownHost:
    "The address's host name does not resolve: check its spelling, and that its DNS record exists.",
};

// What breaks a rule, with the option field it names and its channel.
const violationOf = (violation: ContentViolation): string => {
  const field = "field" in violation ? ` (${violation.field})` : "";

  return "channelId" in violation
    ? `${violation._tag}${field} on channel ${violation.channelId}`
    : `${violation._tag}${field}`;
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
      TooManyWebhookEndpoints: ({ allowed }) =>
        refused(
          `The workspace has ${String(allowed)} webhook endpoints, the most it may, whatever its plan: delete one first, with peal webhooks delete.`
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
      WebhookDeliveryNotFound: () =>
        refused(
          "The endpoint has no delivery with that id: it never existed, or its log no longer keeps it. peal webhooks deliveries lists them."
        ),
      WebhookEndpointDisabled: () =>
        refused(
          "The endpoint is off, so Peal sends it nothing: turn it on first, with peal webhooks update --enable."
        ),
      WebhookEndpointNotFound: () =>
        refused(
          "The workspace has no webhook endpoint with that id: peal webhooks list shows them."
        ),
      WebhookUrlRefused: ({ reason }) => refused(urlRefusals[reason]),
      WebhooksNotConfigured: () =>
        refused(
          "This server cannot keep a signing secret: its operator must set PEAL_TOKEN_KEYS, the keys that encrypt them, before it has webhooks."
        ),
      WorkspaceNotFound: () =>
        refused("You do not belong to this workspace, or it no longer exists."),
    });
