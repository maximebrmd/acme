import { Effect, Layer, Redacted } from "effect";
import { Mac, SecureRandom } from "effect/crypto";
import { Base64 } from "effect/encoding";

import {
  EncryptedTokenSchema,
  TokenCipher,
  webhookSecretContext,
} from "#channels/application/token-cipher.ts";
import { EndpointSecrets } from "#webhooks/application/ports/endpoint-secrets.ts";
import { SecretsNotConfigured } from "#webhooks/application/secrets-not-configured.ts";
import type { SealedHeader } from "#webhooks/domain/endpoint-headers.ts";
import { SealedSecretSchema } from "#webhooks/domain/sealed-secret.ts";
import type { SealedSecret } from "#webhooks/domain/sealed-secret.ts";
import { secretBytes, secretPrefix } from "#webhooks/domain/signature.ts";
import type { WebhookEndpointId } from "#webhooks/domain/webhook-endpoint-id.ts";

const encoder = new TextEncoder();

const notConfigured = () => Effect.fail(new SecretsNotConfigured());

// A header's value is bound to its endpoint and its name: moved to another
// endpoint, or under another name, it does not decrypt.
const headerContext = (endpointId: WebhookEndpointId, name: string) =>
  webhookSecretContext(`${endpointId}:header:${name.toLowerCase()}`);

// The HMAC key a secret holds: the bytes after its prefix.
const keyOf = (secret: Redacted.Redacted) =>
  Effect.fromResult(
    Base64.decode(Redacted.value(secret).slice(secretPrefix.length))
  ).pipe(
    Effect.flatMap((bytes) => Mac.key(Mac.hmacSha256, bytes)),
    // What this adapter sealed is a prefix and 32 bytes in base64.
    Effect.orDie
  );

/**
 * Signing secrets on the channels context's token cipher: random bytes from
 * Web Crypto, written `whsec_<base64>`, encrypted with the server's keyring
 * (`PEAL_TOKEN_KEYS`) and bound to `webhook:<endpoint id>`. A server
 * without a key issues none, and a secret whose key left the keyring, or
 * that was moved to another endpoint, signs nothing. Header values are
 * sealed and opened on the same cipher, bound to
 * `webhook:<endpoint id>:header:<name>`.
 */
export const CipherEndpointSecrets = Layer.effect(
  EndpointSecrets,
  Effect.gen(function* CipherEndpointSecrets() {
    const cipher = yield* TokenCipher;
    const random = yield* SecureRandom.SecureRandom;
    const mac = yield* Mac.Mac;

    const signWith = Effect.fn("EndpointSecrets.signWith")(function* signWith(
      endpointId: WebhookEndpointId,
      sealed: SealedSecret,
      content: Uint8Array
    ) {
      const secret = yield* cipher
        .decryptSecret(
          EncryptedTokenSchema.make(sealed),
          webhookSecretContext(endpointId)
        )
        .pipe(Effect.catch(notConfigured));

      const tag = yield* mac
        .sign(yield* keyOf(secret), content)
        .pipe(Effect.orDie);

      return Base64.encode(tag);
    });

    return EndpointSecrets.of({
      issue: Effect.fn("EndpointSecrets.issue")(function* issue(endpointId) {
        const bytes = yield* random.randomBytes(secretBytes);
        const secret = Redacted.make(`${secretPrefix}${Base64.encode(bytes)}`);

        const sealed = yield* cipher
          .encryptSecret(secret, webhookSecretContext(endpointId))
          .pipe(Effect.catch(notConfigured));

        return { sealed: SealedSecretSchema.make(sealed), secret };
      }),
      openHeaders: (endpointId, headers) =>
        Effect.all(
          headers.map(({ name, sealed }) =>
            cipher
              .decryptSecret(
                EncryptedTokenSchema.make(sealed),
                headerContext(endpointId, name)
              )
              .pipe(
                Effect.map((value) => ({ name, value })),
                Effect.catch(notConfigured)
              )
          )
        ),
      sealHeaders: (endpointId, headers) =>
        Effect.all(
          headers.map(({ name, value }) =>
            cipher
              .encryptSecret(
                Redacted.make(value),
                headerContext(endpointId, name)
              )
              .pipe(
                Effect.map((sealed): SealedHeader => ({
                  name,
                  sealed: SealedSecretSchema.make(sealed),
                })),
                Effect.catch(notConfigured)
              )
          )
        ),
      sign: (endpointId, secrets, content) =>
        Effect.all(
          secrets.map((sealed) =>
            signWith(endpointId, sealed, encoder.encode(content))
          )
        ),
    });
  })
).pipe(
  Layer.provide(
    Mac.layerWebCrypto.pipe(Layer.provideMerge(SecureRandom.layerWebCrypto))
  )
);
