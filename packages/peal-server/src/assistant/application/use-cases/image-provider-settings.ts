import { DateTime, Effect, Option, Redacted } from "effect";

import { ImageProviderKeyRequired } from "#assistant/application/image-provider-key-required.ts";
import { ImageProviders } from "#assistant/application/ports/image-providers.ts";
import type { StoredImageProvider } from "#assistant/application/ports/image-providers.ts";
import { ProviderAddressCheck } from "#assistant/application/ports/provider-address-check.ts";
import {
  checkProviderKey,
  checkProviderModel,
  ImageProviderSettings,
  originOfProvider,
} from "#assistant/domain/image-provider.ts";
import type {
  ProviderAddress,
  ProviderModel,
} from "#assistant/domain/image-provider.ts";
import type { Actor } from "#shared/domain/access.ts";
import type { UserId } from "#shared/domain/ids.ts";

/** A workspace's provider as its members read it: never its key. */
export interface ImageProviderView {
  readonly baseUrl: ProviderAddress;
  /** A key is stored; it is never shown again. */
  readonly keySet: true;
  /** The stored key no longer decrypts: type it again. */
  readonly keyUnreadable: boolean;
  readonly model: ProviderModel;
  readonly updatedAt: DateTime.Utc;
}

/** What a member saves: the address and the model, and the key if typed. */
export interface ImageProviderChange {
  /** Left out, the stored key is kept, when its origin stays the same. */
  readonly apiKey?: string;
  readonly baseUrl: string;
  readonly model: string;
}

const viewOf = ({
  keyUnreadable,
  settings,
}: StoredImageProvider): ImageProviderView => ({
  baseUrl: settings.baseUrl,
  keySet: true,
  keyUnreadable,
  model: settings.model,
  updatedAt: settings.updatedAt,
});

// The member who saved it; none for a key, which belongs to no one.
const savedBy = ({ subject }: Actor): Option.Option<UserId> =>
  subject._tag === "user" ? Option.some(subject.userId) : Option.none();

/** The actor's workspace's provider, without its key; none when it has none. */
export const viewImageProvider = Effect.fn("ImageProviderSettings.view")(
  function* viewImageProvider(actor: Actor) {
    const stored = yield* ImageProviders.use((providers) =>
      providers.find(actor.workspaceId)
    );

    return stored.pipe(Option.map(viewOf));
  }
);

/**
 * Saves the workspace's provider: the address checked (the domain's rules,
 * then the outbound guard, once now), the model one line, and the key,
 * required unless the workspace has one stored that opens and the address
 * keeps its origin, in which case it is kept, sealed again for the same
 * origin. The provider is not called: the first image tells whether the
 * settings work.
 */
export const saveImageProvider = Effect.fn("ImageProviderSettings.save")(
  function* saveImageProvider(actor: Actor, change: ImageProviderChange) {
    const { workspaceId } = actor;
    const providers = yield* ImageProviders;

    const baseUrl = yield* ProviderAddressCheck.use((addresses) =>
      addresses.check(change.baseUrl)
    );

    const model = yield* Effect.fromResult(checkProviderModel(change.model));

    const key =
      change.apiKey === undefined
        ? yield* providers.open(workspaceId).pipe(
            Effect.map((stored) =>
              stored.pipe(
                Option.filter(
                  ({ settings }) =>
                    originOfProvider(settings.baseUrl) ===
                    originOfProvider(baseUrl)
                ),
                Option.flatMap(({ apiKey }) => apiKey)
              )
            ),
            Effect.flatMap(
              Option.match({
                onNone: () => Effect.fail(new ImageProviderKeyRequired()),
                onSome: Effect.succeed,
              })
            )
          )
        : Redacted.make(
            yield* Effect.fromResult(checkProviderKey(change.apiKey))
          );

    const settings = new ImageProviderSettings({
      baseUrl,
      model,
      updatedAt: yield* DateTime.now,
    });

    yield* providers.save(workspaceId, settings, key, savedBy(actor));

    const view: ImageProviderView = viewOf({ keyUnreadable: false, settings });

    return view;
  }
);

/**
 * Removes the workspace's provider and its key: its images are made by the
 * server's model again, if it has one.
 */
export const removeImageProvider = Effect.fn("ImageProviderSettings.remove")(
  function* removeImageProvider(actor: Actor) {
    yield* ImageProviders.use((providers) =>
      providers.remove(actor.workspaceId)
    );
  }
);
