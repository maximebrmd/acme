import { Option, Schema } from "effect";
import {
  AlreadyMember,
  AltTextTooLong,
  ChannelCannotPost,
  ChannelNotFound,
  DuplicatePost,
  Forbidden,
  IdempotencyKeyReused,
  ImportUnreadable,
  InvalidDateRange,
  InvalidTimeRange,
  InvalidTimeZone,
  InvitationNotFound,
  MediaImportBusy,
  MediaNotFound,
  MediaSourceNotPublic,
  MediaSourceUnreachable,
  MediaStoreUnavailable,
  MediaTooLarge,
  PlanLimitReached,
  PlatformUnreachable,
  PostContentInvalid,
  PostNotFound,
  PostStatusConflict,
  ScheduleInPast,
  TargetStatusConflict,
  TooManyInvitations,
  TooManyRequests,
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
  WebhookUrlRefused,
  WebhooksNotConfigured,
  WorkspaceNotFound,
} from "peal-contract";
import { errorCatalogue, errorCodeOf } from "peal-contract/errors";

/** A JSON object, as `--json` prints a failure. */
export const JsonObjectSchema = Schema.Record(Schema.String, Schema.Unknown);

export type JsonObject = typeof JsonObjectSchema.Type;

/**
 * The errors the API answers the command line's requests with, as the
 * contract declares them: `explain` has a sentence for each, and --json
 * prints each as the server sent it.
 */
export const ApiErrorSchema = Schema.Union([
  AlreadyMember,
  AltTextTooLong,
  ChannelCannotPost,
  ChannelNotFound,
  DuplicatePost,
  Forbidden,
  IdempotencyKeyReused,
  ImportUnreadable,
  InvalidDateRange,
  InvalidTimeRange,
  InvalidTimeZone,
  InvitationNotFound,
  MediaImportBusy,
  MediaNotFound,
  MediaSourceNotPublic,
  MediaSourceUnreachable,
  MediaStoreUnavailable,
  MediaTooLarge,
  PlanLimitReached,
  PlatformUnreachable,
  PostContentInvalid,
  PostNotFound,
  PostStatusConflict,
  ScheduleInPast,
  TargetStatusConflict,
  TooManyInvitations,
  TooManyRequests,
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
  WebhookUrlRefused,
  WebhooksNotConfigured,
  WorkspaceNotFound,
]);

export type ApiError = typeof ApiErrorSchema.Type;

const isApiError = Schema.is(ApiErrorSchema);

const encode = Schema.encodeOption(Schema.toCodecJson(ApiErrorSchema));

const decodeObject = Schema.decodeUnknownOption(JsonObjectSchema);

const hasText = Schema.is(Schema.NonEmptyString);

/**
 * An API error as the server sent it, in the contract's encoding: its
 * `_tag`, `code`, `message`, `requestId` and its own fields. A server
 * older than `code` and `message` sent neither: they are filled from the
 * contract, where a tag's code never changes.
 */
export const apiErrorJson = (failure: {
  readonly _tag: string;
}): JsonObject => {
  const sent = (isApiError(failure) ? encode(failure) : Option.none()).pipe(
    Option.flatMap(decodeObject),
    Option.getOrElse((): JsonObject => ({ _tag: failure._tag }))
  );

  const code = errorCodeOf(failure._tag);

  return {
    ...sent,
    code: hasText(sent["code"]) ? sent["code"] : code,
    message: hasText(sent["message"])
      ? sent["message"]
      : (errorCatalogue().find((entry) => entry.code === code)?.message ??
        "The request was refused."),
  };
};
