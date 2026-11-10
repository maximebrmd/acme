import { Cause, Exit, Option, Schema } from "effect";
import { TooManyWebhookEndpoints, WebhookUrlRefused } from "peal-contract";
import type { WebhookUrlRefusal } from "peal-contract";

// Why a webhook action failed, as the Webhooks.errors catalogue explains
// it, from the API's errors.

/** A failure the catalogue explains without anything more. */
export const WebhookErrorKeySchema = Schema.Literals([
  "deliveryNotFound",
  "endpointDisabled",
  "forbidden",
  "notConfigured",
  "notFound",
  "tooManySends",
  "unknown",
]);

export type WebhookErrorKey = typeof WebhookErrorKeySchema.Type;

export type WebhookError =
  | { readonly key: WebhookErrorKey }
  // The workspace has as many endpoints as it may: `allowed`.
  | { readonly allowed: number; readonly key: "tooMany" }
  | { readonly key: "urlRefused"; readonly reason: WebhookUrlRefusal };

// The API's errors that need nothing more to be explained, by tag.
const reasons = new Map<string, WebhookErrorKey>([
  ["Forbidden", "forbidden"],
  ["WebhookDeliveryNotFound", "deliveryNotFound"],
  ["WebhookEndpointDisabled", "endpointDisabled"],
  ["TooManyWebhookSends", "tooManySends"],
  ["WebhookEndpointNotFound", "notFound"],
  ["WebhooksNotConfigured", "notConfigured"],
]);

const isTooMany = Schema.is(TooManyWebhookEndpoints);

const isUrlRefused = Schema.is(WebhookUrlRefused);

const explain = (error: { readonly _tag: string }): WebhookError => {
  if (isTooMany(error)) {
    return { allowed: error.allowed, key: "tooMany" };
  }

  if (isUrlRefused(error)) {
    return { key: "urlRefused", reason: error.reason };
  }

  return { key: reasons.get(error._tag) ?? "unknown" };
};

/**
 * How a webhook call ended, for the catalogue to explain, or none if it
 * worked. Anything but the API's own errors, such as the server being down,
 * is unknown.
 */
export const webhookErrorOf = <A, E extends { readonly _tag: string }>(
  exit: Exit.Exit<A, E>
): Option.Option<WebhookError> =>
  Exit.isSuccess(exit)
    ? Option.none()
    : Option.some(
        Cause.findErrorOption(exit.cause).pipe(
          Option.map(explain),
          Option.getOrElse((): WebhookError => ({ key: "unknown" }))
        )
      );
