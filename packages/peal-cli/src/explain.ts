import { Effect, Match, Option } from "effect";
import type { Schema } from "effect";
import type { HttpClientError } from "effect/http";
import type { HttpApiError } from "effect/http-api";
import type {
  AlreadyMember,
  AltTextTooLong,
  ApprovalChanged,
  ApprovalNotPending,
  ChannelCannotPost,
  ChannelNotFound,
  CommentInvalid,
  CommentNotFound,
  ContentViolation,
  Forbidden,
  IdempotencyKeyReused,
  InboxActionFailed,
  InboxActionUnavailable,
  InboxCommentGone,
  InboxCommentNotFound,
  InboxReplyNotFound,
  InboxThreadNotFound,
  InvalidDateRange,
  InvalidTimeZone,
  InvitationNotFound,
  LookupInputInvalid,
  LookupNotFound,
  MediaNotFound,
  MediaSourceFailure,
  MediaImportBusy,
  MediaSourceNotPublic,
  MediaSourceUnreachable,
  MediaStoreUnavailable,
  MediaTooLarge,
  PlanLimitReached,
  PlatformRateLimited,
  PlatformUnreachable,
  PostContentInvalid,
  PostNotFound,
  PostNotReviewable,
  PostStatusConflict,
  ReplyInvalid,
  ReplyPending,
  ReplyStatusConflict,
  ReviewLinkNotFound,
  ScheduleInPast,
  TargetStatusConflict,
  TooManyInvitations,
  TooManyReviewLinks,
  TooManyWebhookEndpoints,
  TooManyWebhookSends,
  Unauthenticated,
  UnknownChannels,
  UnknownMedia,
  UnsupportedMediaType,
  UploadIncomplete,
  UploadRejected,
  WebhookDeliveryNotFound,
  WebhookEndpointDisabled,
  WebhookEndpointNotFound,
  WebhooksNotConfigured,
  WebhookUrlRefused,
  WorkspaceNotFound,
} from "peal-contract";
import type { TextUnit } from "peal-contract/post-text";

import { requestFailed } from "#api-request-failed.ts";
import type { ApiRequestFailed } from "#api-request-failed.ts";
import { PealApi } from "#api.ts";
import { CredentialStore } from "#credentials.ts";
import { planLimitReason } from "#plan-limit.ts";
import { Refused } from "#refused.ts";
import { SignInExpired } from "#sign-in-expired.ts";

/** Whatever a signed-in command's request may fail with. */
export type ApiFailure =
  | AlreadyMember
  | AltTextTooLong
  | ApprovalChanged
  | ApprovalNotPending
  | ChannelCannotPost
  | ChannelNotFound
  | CommentInvalid
  | CommentNotFound
  | Forbidden
  | HttpApiError.BadRequest
  | HttpClientError.HttpClientError
  | IdempotencyKeyReused
  | InboxActionFailed
  | InboxActionUnavailable
  | InboxCommentGone
  | InboxCommentNotFound
  | InboxReplyNotFound
  | InboxThreadNotFound
  | InvalidDateRange
  | InvalidTimeZone
  | InvitationNotFound
  | LookupInputInvalid
  | LookupNotFound
  | MediaNotFound
  | MediaImportBusy
  | MediaSourceNotPublic
  | MediaSourceUnreachable
  | MediaStoreUnavailable
  | MediaTooLarge
  | PlanLimitReached
  | PlatformRateLimited
  | PlatformUnreachable
  | PostContentInvalid
  | PostNotFound
  | PostNotReviewable
  | PostStatusConflict
  | ReplyInvalid
  | ReplyPending
  | ReplyStatusConflict
  | ReviewLinkNotFound
  | ScheduleInPast
  | Schema.SchemaError
  | TargetStatusConflict
  | TooManyInvitations
  | TooManyReviewLinks
  | TooManyWebhookEndpoints
  | TooManyWebhookSends
  | Unauthenticated
  | UnknownChannels
  | UnknownMedia
  | UnsupportedMediaType
  | UploadIncomplete
  | UploadRejected
  | WebhookDeliveryNotFound
  | WebhookEndpointDisabled
  | WebhookEndpointNotFound
  | WebhooksNotConfigured
  | WebhookUrlRefused
  | WorkspaceNotFound;

const mebibyte = 1024 * 1024;

// A size as people compare it with a limit: in MiB, to one decimal.
const size = (bytes: number): string => `${(bytes / mebibyte).toFixed(1)} MiB`;

const seconds = (milliseconds: number): string =>
  `${String(milliseconds / 1000)} s`;

// What a platform counts a text in.
const units: Readonly<Record<TextUnit, string>> = {
  codePoints: "characters",
  emojiBytes: "characters, an emoji counting for its bytes",
  graphemes: "characters",
  utf16Units: "UTF-16 units",
  utf8Bytes: "bytes",
  weighted: "weighted characters",
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

// What breaks a platform's rule, as the author fixes it.
const brokenRule = (violation: ContentViolation): string =>
  Match.valueTags(violation, {
    altTextTooLong: ({ length, maximum }) =>
      `its description has ${String(length)} characters, and the platform keeps ${String(maximum)}`,
    aspectRatioUnsupported: ({ height, maximum, minimum, width }) =>
      `it is ${String(width)}×${String(height)}, and the platform takes a width over height from ${String(minimum)} to ${String(maximum)}`,
    empty: () => "the post would go out with no text and no media",
    forbiddenCharacters: ({ characters }) =>
      `the text holds characters the platform refuses: ${characters.join(" ")}`,
    mediaRequired: () =>
      "the platform publishes nothing without an image or a video",
    mediaTooLarge: ({ byteSize, maximum }) =>
      `it weighs ${size(byteSize)}, and the platform takes ${size(maximum)}`,
    mediaTooSmall: ({ byteSize, minimum }) =>
      `it weighs ${String(byteSize)} bytes, and the platform takes ${String(minimum)} at least`,
    mediaTypeUnsupported: ({ contentType }) =>
      `the platform takes no ${contentType} file`,
    mixedMedia: () => "the platform never shows images and videos in one post",
    noChannels: () => "the post is for no channel",
    optionInvalid: () => "the platform refuses this value",
    optionMissing: () =>
      "the platform needs this option, and the post has none",
    optionTooLong: ({ length, maximum }) =>
      `it has ${String(length)} characters, and the platform takes ${String(maximum)}`,
    optionsForOtherPlatform: ({ optionsPlatform }) =>
      `its options are ${optionsPlatform}'s, not this channel's platform's`,
    optionsWithoutChannel: () =>
      "options are given for a channel the post is not for",
    overrideWithoutChannel: () =>
      "a text is given for a channel the post is not for",
    sideOutOfRange: ({ height, maximum, minimum, width }) =>
      `it is ${String(width)}×${String(height)}, and the platform takes sides from ${String(minimum)} to ${String(maximum)} pixels`,
    textTooLong: ({ length, maximum, unit }) =>
      `the text has ${String(length)} ${units[unit]}, and the platform takes ${String(maximum)}`,
    tooManyHashtags: ({ count, maximum }) =>
      `${String(count)} hashtags, and the platform takes ${String(maximum)}`,
    tooManyLinks: ({ count, maximum }) =>
      `${String(count)} different links, and the platform takes ${String(maximum)}`,
    tooManyMedia: ({ count, maximum }) =>
      `${String(count)} images and videos, and the platform takes ${String(maximum)}`,
    tooManyMentions: ({ count, maximum }) =>
      `${String(count)} mentions, and the platform takes ${String(maximum)}`,
    tooManyPixels: ({ height, maximum, width }) =>
      `it is ${String(width)}×${String(height)}, and the platform takes ${String(maximum)} pixels in all`,
    tooManyVideos: ({ count, maximum }) =>
      `${String(count)} videos, and the platform takes ${String(maximum)}`,
    videoTooLong: ({ durationMs, maximumMs }) =>
      `it lasts ${seconds(durationMs)}, and the platform takes ${seconds(maximumMs)}`,
    videoTooShort: ({ durationMs, minimumMs }) =>
      `it lasts ${seconds(durationMs)}, and the platform takes ${seconds(minimumMs)} at least`,
  });

// Where a violation is: its channel and platform, then the option or the
// media it names.
const placeOf = (violation: ContentViolation): string =>
  [
    "channelId" in violation
      ? `channel ${violation.channelId}${"platform" in violation ? ` (${violation.platform})` : ""}`
      : [],
    "field" in violation ? `option ${violation.field}` : [],
    "mediaId" in violation ? `media ${violation.mediaId}` : [],
  ]
    .flat()
    .join(", ");

// One violation on its line: its name, as the API gives it, where it is,
// and what it means.
const violationOf = (violation: ContentViolation): string => {
  const place = placeOf(violation);

  return `  ${violation._tag}${place === "" ? "" : ` on ${place}`}: ${brokenRule(violation)}`;
};

const sourceFailures: Readonly<Record<MediaSourceFailure, string>> = {
  badStatus: "its host answered something else than the file",
  noAnswer: "its host did not answer, or broke off",
  tooManyRedirects: "it redirects more than three times",
  tooSlow:
    "the file did not arrive within 90 seconds: download it, then upload it with peal media upload",
  unknownHost: "its host has no address",
};

// What is wrong with a comment, as the user fixes it.
const commentProblems: Readonly<Record<CommentInvalid["problem"], string>> = {
  anchor:
    "it is about a channel the post does not go to, or it is an answer, which is about what its thread is about",
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
      AltTextTooLong: ({ maxLength }) =>
        refused(
          `The description is longer than Peal keeps: ${String(maxLength)} characters at most.`
        ),
      ApprovalChanged: () =>
        refused(
          "The post changed since you read it: it was asked again, or says something else. Nothing was decided. Read it again with peal review show, then decide with the --approval and --subject it prints."
        ),
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
      IdempotencyKeyReused: () =>
        refused(
          "This idempotency key was sent in the last 24 hours with another post: nothing was made. Send this one under a new --idempotency-key."
        ),
      InboxActionFailed: ({ reason }) =>
        refused(
          `The platform did not do it (${reason}), and nothing changed in Peal: asking again is safe.`
        ),
      InboxActionUnavailable: ({ ability, standing }) =>
        refused(
          standing === "reconnect"
            ? `This channel may not ${ability} yet: disconnect it and connect the account again, which asks for what it takes, or the channel was disconnected or turned off. Nothing was asked of the platform.`
            : `This channel's platform does not let the account ${ability} here. Nothing was asked of it.`
        ),
      InboxCommentGone: () =>
        refused(
          "The comment is no longer on its platform: it can be neither answered nor moderated."
        ),
      InboxCommentNotFound: () =>
        refused(
          "The workspace has no such comment: peal inbox thread shows a thread's."
        ),
      InboxReplyNotFound: () =>
        refused(
          "The workspace has no such reply: peal inbox thread shows a thread's."
        ),
      InboxThreadNotFound: () =>
        refused(
          "The workspace has no such thread: peal inbox threads lists them."
        ),
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
      LookupInputInvalid: () =>
        refused(
          "The lookup refused its input: peal channels lookup <channel-id> lists what each lookup takes, and a cursor must be one a page before named."
        ),
      LookupNotFound: () =>
        refused(
          "This channel's platform has no such lookup: peal channels lookup <channel-id> lists those it has."
        ),
      MediaImportBusy: () =>
        refused(
          "The workspace already imports two files at once, or the server as many as it runs together: nothing was fetched. Try again in a moment."
        ),
      MediaNotFound: () => refused("The workspace has no such media."),
      MediaSourceNotPublic: () =>
        refused(
          "Peal does not fetch this address: it takes https URLs on the default port whose host is public, redirects included. Nothing was fetched: download the file, then upload it with peal media upload."
        ),
      MediaSourceUnreachable: ({ reason, status }) =>
        refused(
          `Peal could not fetch the file: ${sourceFailures[reason]}${status === null ? "" : ` (HTTP ${String(status)})`}. Nothing was stored.`
        ),
      MediaStoreUnavailable: () =>
        refused(
          "The server cannot reach its media store right now: try again later."
        ),
      MediaTooLarge: ({ byteSize, kind, maxByteSize }) =>
        refused(
          `The ${kind} weighs ${size(byteSize)}, and Peal stores ${kind}s up to ${size(maxByteSize)}.`
        ),
      PlanLimitReached: (reached) => refused(planLimitReason(reached)),
      PlatformRateLimited: ({ retryAfterSeconds }) =>
        refused(
          retryAfterSeconds === null
            ? "The platform asked to slow down, or its allowance for today is spent: try again later."
            : `The platform asked to slow down: try again in ${String(retryAfterSeconds)} seconds.`
        ),
      PlatformUnreachable: () =>
        refused(
          "The platform did not answer, or asked to slow down: try again in a few minutes."
        ),
      PostContentInvalid: ({ violations }) =>
        refused(
          [
            "Peal refused the post, and made nothing:",
            ...violations.map(violationOf),
          ].join("\n")
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
      ReplyInvalid: ({ length, maximum, reason, unit }) =>
        refused(
          reason === "empty" || length === null || maximum === null
            ? "The reply says nothing: nothing was sent."
            : `The reply is too long for its platform: ${String(length)} ${unit ?? "characters"}, where it takes ${String(maximum)} (on Mastodon, the mention of the person answered counts). Nothing was sent.`
        ),
      ReplyPending: ({ replyId }) =>
        refused(
          `A reply to this comment is on its way, or may have gone out (${replyId}): nothing more was sent. If it is unconfirmed, check the platform, then run peal inbox confirm.`
        ),
      ReplyStatusConflict: ({ status }) =>
        refused(
          `The reply is ${status}, which does not allow this: only an unconfirmed reply is confirmed, and only a sent one is withdrawn.`
        ),
      ReviewLinkNotFound: () =>
        refused(
          "The workspace has no such review link: peal review links lists a post's."
        ),
      ScheduleInPast: () =>
        refused("That time has passed: give a later --at, or publish it now."),
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
      TooManyWebhookEndpoints: ({ allowed }) =>
        refused(
          `The workspace has ${String(allowed)} webhook endpoints, the most it may, whatever its plan: delete one first, with peal webhooks delete.`
        ),
      TooManyWebhookSends: ({ allowed }) =>
        refused(
          `The workspace sent ${String(allowed)} test events and deliveries again within an hour, the most it may: nothing was sent. Try again later.`
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
      UnsupportedMediaType: ({ contentType }) =>
        refused(
          `Peal does not store ${contentType} files: it takes JPEG, PNG, GIF and WebP images, and MP4 and QuickTime videos.`
        ),
      UploadIncomplete: () =>
        refused(
          "The file has not reached the media store whole: upload it again."
        ),
      UploadRejected: ({ reason }) =>
        refused(
          reason === "sizeMismatch"
            ? "The stored file does not have the size declared: Peal deleted it. Upload it again."
            : "The file is not of the type its name says: Peal deleted it. Give it the extension of what it holds, then upload it again."
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

/** The scope a sign-in needs to schedule, publish, move or cancel posts. */
export const publishScope = "workspace:publish";

// Whether the saved sign-in was approved without the scope. One that
// keeps no scope, or cannot be read, does not say.
const signedInWithoutPublishing = Effect.gen(function* withoutPublishing() {
  const { baseUrl } = yield* PealApi;
  const store = yield* CredentialStore;
  const saved = yield* store.read(baseUrl);

  return Option.match(saved, {
    onNone: () => false,
    onSome: ({ scope }) => {
      const scopes = scope.split(/\s+/u).filter((name) => name !== "");

      return scopes.length > 0 && !scopes.includes(publishScope);
    },
  });
}).pipe(Effect.orElseSucceed(() => false));

/**
 * `explain`, for the requests that schedule, publish, move, cancel or
 * follow up a post: refused to a sign-in approved without the permission
 * to schedule and publish, the user signs in again; otherwise their role
 * is why.
 */
export const explainingPublishing =
  (url: string) =>
  <A, R>(request: Effect.Effect<A, ApiFailure, R>) =>
    request.pipe(
      Effect.mapError((failure) =>
        failure._tag === "Forbidden" ? failure : explain(url)(failure)
      ),
      Effect.catchTag("Forbidden", (forbidden) =>
        signedInWithoutPublishing.pipe(
          Effect.flatMap((without) =>
            Effect.fail(
              without
                ? refused(
                    "This sign-in was made without the permission to schedule and publish posts: run peal login again and approve it."
                  )
                : explain(url)(forbidden)
            )
          )
        )
      )
    );
