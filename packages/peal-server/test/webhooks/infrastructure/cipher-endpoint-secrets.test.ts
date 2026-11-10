import { createHmac } from "node:crypto";

import { assert, describe, it } from "@effect/vitest";
import { ConfigProvider, Effect, Layer, Redacted } from "effect";

import { TokenCipherLive } from "#channels/infrastructure/web-crypto-token-cipher.ts";
import { syntheticKeyring } from "#test/channels/support.ts";
import { EndpointSecrets } from "#webhooks/application/ports/endpoint-secrets.ts";
import { signedContent } from "#webhooks/domain/signature.ts";
import { WebhookEndpointIdSchema } from "#webhooks/domain/webhook-endpoint-id.ts";
import { CipherEndpointSecrets } from "#webhooks/infrastructure/cipher-endpoint-secrets.ts";

const endpointId = WebhookEndpointIdSchema.make(
  "00000000-0000-7000-8000-000000000031"
);

const otherEndpointId = WebhookEndpointIdSchema.make(
  "00000000-0000-7000-8000-000000000032"
);

const secretsWith = (settings: Record<string, string>) =>
  CipherEndpointSecrets.pipe(
    Layer.provide(TokenCipherLive),
    Layer.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(settings)))
  );

const Configured = secretsWith({ PEAL_TOKEN_KEYS: syntheticKeyring });

const content = signedContent({
  body: '{"type":"webhook.test"}',
  id: "00000000-0000-7000-8000-000000000033",
  timestamp: 1_794_301_200,
});

// The signature as the Standard Webhooks libraries compute it: HMAC-SHA256
// keyed with the bytes the secret encodes in base64 after `whsec_`.
const reference = (secret: string) =>
  createHmac("sha256", Buffer.from(secret.slice("whsec_".length), "base64"))
    .update(content)
    .digest("base64");

describe("endpoint secrets", () => {
  it.effect("issues a secret as the specification writes one", () =>
    Effect.gen(function* issues() {
      const secrets = yield* EndpointSecrets;
      const first = yield* secrets.issue(endpointId);
      const second = yield* secrets.issue(endpointId);
      const secret = Redacted.value(first.secret);

      assert.match(secret, /^whsec_[A-Za-z0-9+/]{43}=$/u);
      assert.lengthOf(Buffer.from(secret.slice("whsec_".length), "base64"), 32);
      assert.notStrictEqual(secret, Redacted.value(second.secret));
      // Stored encrypted: nothing of the secret shows.
      assert.notInclude(first.sealed, secret.slice("whsec_".length));
      assert.isTrue(first.sealed.startsWith("test-key."));
    }).pipe(Effect.provide(Configured))
  );

  it.effect("signs as the specification's libraries verify", () =>
    Effect.gen(function* signs() {
      const secrets = yield* EndpointSecrets;
      const current = yield* secrets.issue(endpointId);
      const previous = yield* secrets.issue(endpointId);

      const macs = yield* secrets.sign(
        endpointId,
        [current.sealed, previous.sealed],
        content
      );

      assert.deepStrictEqual(macs, [
        reference(Redacted.value(current.secret)),
        reference(Redacted.value(previous.secret)),
      ]);
    }).pipe(Effect.provide(Configured))
  );

  it.effect("does not read a secret moved to another endpoint", () =>
    Effect.gen(function* bound() {
      const secrets = yield* EndpointSecrets;
      const { sealed } = yield* secrets.issue(endpointId);

      const failure = yield* Effect.flip(
        secrets.sign(otherEndpointId, [sealed], content)
      );

      assert.strictEqual(failure._tag, "SecretsNotConfigured");
    }).pipe(Effect.provide(Configured))
  );

  it.effect("issues nothing on a server without keys", () =>
    Effect.gen(function* withoutKeys() {
      const secrets = yield* EndpointSecrets;
      const failure = yield* Effect.flip(secrets.issue(endpointId));

      assert.strictEqual(failure._tag, "SecretsNotConfigured");
    }).pipe(Effect.provide(secretsWith({})))
  );
});
