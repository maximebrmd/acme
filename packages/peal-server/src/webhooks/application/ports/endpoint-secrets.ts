import { Context } from "effect";
import type { Effect, Redacted } from "effect";

import type { SecretsNotConfigured } from "#webhooks/application/secrets-not-configured.ts";
import type {
  EndpointHeader,
  SealedHeader,
} from "#webhooks/domain/endpoint-headers.ts";
import type { SealedSecret } from "#webhooks/domain/sealed-secret.ts";
import type { WebhookEndpointId } from "#webhooks/domain/webhook-endpoint-id.ts";
import type { WebhookUrl } from "#webhooks/domain/webhook-url.ts";

/** A new signing secret: as its endpoint's owner reads it once, and stored. */
export interface IssuedSecret {
  readonly sealed: SealedSecret;
  /** `whsec_` and the key in base64, as the specification writes one. */
  readonly secret: Redacted.Redacted;
}

/** A header a delivery carries, its value still a secret. */
export interface OpenedHeader {
  readonly name: string;
  readonly value: Redacted.Redacted;
}

/**
 * The secrets deliveries are signed with: random, made here, encrypted at
 * rest and bound to their endpoint. The plain secret leaves only once, when
 * it is issued; signing happens behind the port. The values of the headers
 * an endpoint's managers chose are sealed the same way, each bound to its
 * endpoint, its name and the origin of the address it goes to (`url`'s),
 * and opened only to send a delivery to that origin.
 */
export class EndpointSecrets extends Context.Service<
  EndpointSecrets,
  {
    readonly issue: (
      endpointId: WebhookEndpointId
    ) => Effect.Effect<IssuedSecret, SecretsNotConfigured>;
    /**
     * The HMAC-SHA256 of `content` under each secret, in base64, in the
     * order given.
     */
    readonly sign: (
      endpointId: WebhookEndpointId,
      secrets: readonly SealedSecret[],
      content: string
    ) => Effect.Effect<readonly string[], SecretsNotConfigured>;
    readonly sealHeaders: (
      endpointId: WebhookEndpointId,
      url: WebhookUrl,
      headers: readonly EndpointHeader[]
    ) => Effect.Effect<readonly SealedHeader[], SecretsNotConfigured>;
    readonly openHeaders: (
      endpointId: WebhookEndpointId,
      url: WebhookUrl,
      headers: readonly SealedHeader[]
    ) => Effect.Effect<readonly OpenedHeader[], SecretsNotConfigured>;
  }
>()("peal-server/webhooks/application/EndpointSecrets") {}
