import { Result, Schema } from "effect";

import { InvalidWebhookUrl } from "./invalid-webhook-url.ts";

export const maxWebhookUrlLength = 2048;

/**
 * Where an endpoint's deliveries go: an HTTPS URL on the default port,
 * without credentials, as `parseWebhookUrl` checked it. Its path and query
 * may hold a secret of the receiver's, so it is shown to those who manage
 * webhooks only, and never logged.
 */
export const WebhookUrlSchema = Schema.NonEmptyString.pipe(
  Schema.brand("WebhookUrl")
);

export type WebhookUrl = typeof WebhookUrlSchema.Type;

const refused = (reason: InvalidWebhookUrl["reason"]) =>
  Result.fail(new InvalidWebhookUrl({ reason }));

/**
 * The address as an endpoint keeps it, written as given but for its
 * fragment, which no request carries. Whether its host is public is the
 * outbound guard's to say, before every request.
 */
export const parseWebhookUrl = (
  input: string
): Result.Result<WebhookUrl, InvalidWebhookUrl> => {
  if (input.length > maxWebhookUrlLength) {
    return refused("tooLong");
  }

  if (!URL.canParse(input)) {
    return refused("malformed");
  }

  const url = new URL(input);

  if (url.protocol !== "https:" || url.port !== "") {
    return refused("notHttps");
  }

  if (url.username !== "" || url.password !== "") {
    return refused("credentials");
  }

  url.hash = "";

  return Result.succeed(WebhookUrlSchema.make(url.href));
};

/** The host deliveries go to: what logs, notices and staff may see of it. */
export const hostOf = (url: WebhookUrl): string => new URL(url).host;
