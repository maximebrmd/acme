import { Match } from "effect";
import type {
  AssistantFailed,
  AssistantInputRejected,
  AssistantQuotaExceeded,
  AssistantUnavailable,
  Forbidden,
  MediaImportBusy,
  MediaStoreUnavailable,
  PlanLimitReached,
  TooManyRequests,
  Unauthenticated,
  WorkspaceNotFound,
} from "peal-contract";

/** Why an image was not made, as the API declares it. */
export type ImageFailure =
  | AssistantFailed
  | AssistantInputRejected
  | AssistantQuotaExceeded
  | AssistantUnavailable
  | Forbidden
  | MediaImportBusy
  | MediaStoreUnavailable
  | PlanLimitReached
  | TooManyRequests
  | Unauthenticated
  | WorkspaceNotFound
  // The request failed in a way the API does not declare.
  | { readonly _tag: "Unexpected" };

/** The message of `Assistant.images.errors` that says why. */
export type ImageFailureKey =
  | "busy"
  | "declined"
  | "empty"
  | "forbidden"
  | "generic"
  | "invalidAnswer"
  | "quota"
  | "storage"
  | "storeDown"
  | "timedOut"
  | "tooLong"
  | "unavailable"
  | "unreachable";

/**
 * Which message tells the person why no image was made. A quota or a full
 * storage opens the upgrade dialog as well.
 */
export const imageFailureKey = (failure: ImageFailure): ImageFailureKey =>
  Match.valueTags(failure, {
    AssistantFailed: ({ reason }): ImageFailureKey => reason,
    AssistantInputRejected: ({ reason }): ImageFailureKey => reason,
    AssistantQuotaExceeded: (): ImageFailureKey => "quota",
    AssistantUnavailable: (): ImageFailureKey => "unavailable",
    Forbidden: (): ImageFailureKey => "forbidden",
    MediaImportBusy: (): ImageFailureKey => "busy",
    MediaStoreUnavailable: (): ImageFailureKey => "storeDown",
    PlanLimitReached: (): ImageFailureKey => "storage",
    TooManyRequests: (): ImageFailureKey => "generic",
    Unauthenticated: (): ImageFailureKey => "generic",
    Unexpected: (): ImageFailureKey => "generic",
    WorkspaceNotFound: (): ImageFailureKey => "generic",
  });

/**
 * Whether trying again may make the image: the provider was out of reach
 * or slow, the store down, too many at once, or the request failed on the
 * way.
 */
export const isImageRetryable = (failure: ImageFailure): boolean =>
  [
    "busy",
    "generic",
    "invalidAnswer",
    "storeDown",
    "timedOut",
    "unreachable",
  ].includes(imageFailureKey(failure));
