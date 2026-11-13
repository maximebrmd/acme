import { Match } from "effect";
import type {
  AssistantFailed,
  AssistantImagesStatus,
  AssistantInputRejected,
  AssistantQuotaExceeded,
  AssistantUnavailable,
  Forbidden,
  ImageProviderRefused,
  MediaImportBusy,
  MediaStoreUnavailable,
  OwnImageLimitReached,
  PlanLimitReached,
  TooManyRequests,
  Unauthenticated,
  UsageAllowanceReached,
  WorkspaceNotFound,
} from "peal-contract";

/** Why an image was not made, as the API declares it. */
export type ImageFailure =
  | AssistantFailed
  | AssistantInputRejected
  | AssistantQuotaExceeded
  | AssistantUnavailable
  | Forbidden
  | ImageProviderRefused
  | MediaImportBusy
  | MediaStoreUnavailable
  | OwnImageLimitReached
  | PlanLimitReached
  | TooManyRequests
  | Unauthenticated
  | UsageAllowanceReached
  | WorkspaceNotFound
  // The request failed in a way the API does not declare.
  | { readonly _tag: "Unexpected" };

// The workspace's own provider's refusals: its settings are to fix, by
// those who may change them.
const providerKeys = {
  addressRefused: "providerAddress",
  keyUnreadable: "providerKey",
  redirected: "providerRedirected",
  settingsRefused: "providerRefused",
} as const;

/** The message of `Assistant.images.errors` that says why. */
export type ImageFailureKey =
  | "allowance"
  | "busy"
  | "declined"
  | "empty"
  | "forbidden"
  | "generic"
  | "invalidAnswer"
  | "ownLimit"
  | "paymentFailed"
  | "paymentMethod"
  | "providerAddress"
  | "providerKey"
  | "providerRedirected"
  | "providerRefused"
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
    ImageProviderRefused: ({ reason }): ImageFailureKey => providerKeys[reason],
    MediaImportBusy: (): ImageFailureKey => "busy",
    MediaStoreUnavailable: (): ImageFailureKey => "storeDown",
    OwnImageLimitReached: (): ImageFailureKey => "ownLimit",
    PlanLimitReached: (): ImageFailureKey => "storage",
    TooManyRequests: (): ImageFailureKey => "generic",
    Unauthenticated: (): ImageFailureKey => "generic",
    Unexpected: (): ImageFailureKey => "generic",
    UsageAllowanceReached: ({ reason }): ImageFailureKey => {
      if (reason === "paymentMethodRequired") {
        return "paymentMethod";
      }

      return reason === "paymentFailed" ? "paymentFailed" : "allowance";
    },
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

/** Whether the refusal is the workspace's own provider's, to fix in its settings. */
export const isProviderRefusal = (failure: ImageFailure): boolean =>
  failure._tag === "ImageProviderRefused";

/**
 * What the dialog says before an image is asked for: the plan's day holds
 * fewer requests than an image costs (as on the free plan, or during a
 * trial), or today's are spent. Either way the request may still be sent:
 * its refusal opens the upgrade dialog. Nothing, when the workspace's own
 * provider makes its images, which cost none of them.
 */
export const imageAllowanceHint = ({
  images,
  remaining,
}: {
  readonly images: Pick<
    AssistantImagesStatus,
    "dailyLimit" | "month" | "requestCost" | "source"
  >;
  readonly remaining: number;
}): "noImagesOnPlan" | "notEnoughToday" | null => {
  if (images.source === "workspace") {
    return null;
  }

  // On a server that bills, images have a month of their own.
  if (images.month !== null) {
    if (images.month.most === 0) {
      return "noImagesOnPlan";
    }

    return images.month.used >= images.month.most ? "notEnoughToday" : null;
  }

  if (images.dailyLimit < images.requestCost) {
    return "noImagesOnPlan";
  }

  return remaining < images.requestCost ? "notEnoughToday" : null;
};
