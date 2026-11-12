import { Context } from "effect";
import type { Effect, Option, Redacted } from "effect";

import type { ProviderSecretsNotConfigured } from "#assistant/application/provider-secrets-not-configured.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/**
 * A workspace's provider key as it is kept: encrypted
 * (`<keyId>.<iv>.<ciphertext>`), and the id of the key that encrypted
 * it, for a rotation.
 */
export interface SealedProviderKey {
  readonly keyId: string;
  readonly sealed: string;
}

/**
 * Seals the key a workspace gave for its own image provider, bound to the
 * workspace and to the origin of the provider's address, and opens it
 * again for a call. The assistant keeps no crypto of its own: the adapter
 * uses the server's one cipher.
 */
export class ProviderSecrets extends Context.Service<
  ProviderSecrets,
  {
    readonly seal: (
      key: Redacted.Redacted,
      workspaceId: WorkspaceId,
      origin: string
    ) => Effect.Effect<SealedProviderKey, ProviderSecretsNotConfigured>;
    /**
     * The key, or none when it does not decrypt: its key left the
     * keyring, or the row was moved to another workspace or origin.
     */
    readonly open: (
      sealed: string,
      workspaceId: WorkspaceId,
      origin: string
    ) => Effect.Effect<Option.Option<Redacted.Redacted>>;
  }
>()("peal-server/assistant/application/ProviderSecrets") {}
