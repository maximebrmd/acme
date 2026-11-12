import { Context } from "effect";
import type { Effect, Option, Redacted } from "effect";

import type { ProviderSecretsNotConfigured } from "#assistant/application/provider-secrets-not-configured.ts";
import type { ImageProviderSettings } from "#assistant/domain/image-provider.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/** A workspace's provider as its settings page reads it: never its key. */
export interface StoredImageProvider {
  /**
   * The stored key no longer decrypts (its key left the keyring, or the
   * row moved): no image is made with it until the key is typed again.
   */
  readonly keyUnreadable: boolean;
  readonly settings: ImageProviderSettings;
}

/**
 * A workspace's provider ready for a call: its settings and its key, none
 * when the stored key no longer decrypts (its key left the keyring, or the
 * row moved to another workspace or address).
 */
export interface OpenedImageProvider {
  readonly apiKey: Option.Option<Redacted.Redacted>;
  readonly settings: ImageProviderSettings;
}

/**
 * The image provider each workspace brought, one at most, its key sealed
 * for that workspace and its address. A database failure is
 * a defect. Exports, erasures and closed accounts reach the rows through
 * UsageRecords.
 */
export class ImageProviders extends Context.Service<
  ImageProviders,
  {
    /** The workspace's provider, without its key; none when it has none. */
    readonly find: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<Option.Option<StoredImageProvider>>;
    /**
     * The workspace's provider with its key, for a call; none when it has
     * none. A provider whose key does not decrypt is still the
     * workspace's: images are never made with Peal's model instead.
     */
    readonly open: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<Option.Option<OpenedImageProvider>>;
    /** Keeps these settings and this key, sealed, in place of any. */
    readonly save: (
      workspaceId: WorkspaceId,
      settings: ImageProviderSettings,
      key: Redacted.Redacted
    ) => Effect.Effect<void, ProviderSecretsNotConfigured>;
    readonly remove: (workspaceId: WorkspaceId) => Effect.Effect<void>;
  }
>()("peal-server/assistant/application/ImageProviders") {}
