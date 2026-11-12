import { Effect, Layer, Option, Schema } from "effect";

import { ProviderSecrets } from "#assistant/application/ports/provider-secrets.ts";
import type { SealedProviderKey } from "#assistant/application/ports/provider-secrets.ts";
import { ProviderSecretsNotConfigured } from "#assistant/application/provider-secrets-not-configured.ts";
import {
  EncryptedTokenSchema,
  imageProviderContext,
  TokenCipher,
  tokenKeyIdOf,
} from "#channels/application/token-cipher.ts";

const isEncryptedToken = Schema.is(EncryptedTokenSchema);

/**
 * Workspaces' provider keys on the channels context's token cipher:
 * encrypted with the server's keyring (`PEAL_TOKEN_KEYS`), bound to
 * `assistant:<workspace id>:<origin>`. Peal keeps one cipher, so a
 * rotation reaches these keys too: nothing here encrypts on its own. A
 * key that does not decrypt opens as none, and is never logged.
 */
export const CipherProviderSecrets = Layer.effect(
  ProviderSecrets,
  Effect.gen(function* CipherProviderSecrets() {
    const cipher = yield* TokenCipher;

    return ProviderSecrets.of({
      open: (sealed, workspaceId, origin) =>
        isEncryptedToken(sealed)
          ? cipher
              .decryptSecret(sealed, imageProviderContext(workspaceId, origin))
              .pipe(
                Effect.map(Option.some),
                Effect.catch(() => Effect.succeedNone)
              )
          : Effect.succeedNone,
      seal: (key, workspaceId, origin) =>
        cipher
          .encryptSecret(key, imageProviderContext(workspaceId, origin))
          .pipe(
            Effect.map((sealed): SealedProviderKey => ({
              keyId: tokenKeyIdOf(sealed),
              sealed,
            })),
            Effect.mapError(() => new ProviderSecretsNotConfigured())
          ),
    });
  })
);
