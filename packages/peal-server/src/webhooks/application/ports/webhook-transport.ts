import { Context } from "effect";
import type { Effect } from "effect";

import type { UrlNotDeliverable } from "#webhooks/application/url-not-deliverable.ts";
import type { AttemptOutcome } from "#webhooks/domain/delivery-attempt.ts";
import type { WebhookUrl } from "#webhooks/domain/webhook-url.ts";

/** One signed request to a receiver. */
export interface WebhookRequest {
  readonly body: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly url: WebhookUrl;
}

/** How a request ended, and how long it took. */
export interface WebhookResponse {
  readonly durationMs: number;
  readonly outcome: AttemptOutcome;
}

/**
 * Sends deliveries to receivers, which members chose: only over HTTPS, to
 * hosts whose every address is public, checked before each request,
 * following no redirect, waiting `requestTimeout` at most, and keeping of
 * the answer only its status and a short excerpt.
 */
export class WebhookTransport extends Context.Service<
  WebhookTransport,
  {
    /**
     * Whether the address names a host Peal would send to now, for a member
     * to hear while they type it. A host that cannot be looked up for the
     * moment passes: each delivery checks again.
     */
    readonly check: (url: WebhookUrl) => Effect.Effect<void, UrlNotDeliverable>;
    /** Sends the request. Never fails: a failure is an outcome. */
    readonly send: (request: WebhookRequest) => Effect.Effect<WebhookResponse>;
  }
>()("peal-server/webhooks/application/WebhookTransport") {}
