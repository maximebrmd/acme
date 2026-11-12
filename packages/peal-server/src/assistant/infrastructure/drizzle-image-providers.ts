import { eq } from "drizzle-orm";
import { DateTime, Effect, Layer, Option } from "effect";

import { ImageProviders } from "#assistant/application/ports/image-providers.ts";
import type {
  OpenedImageProvider,
  StoredImageProvider,
} from "#assistant/application/ports/image-providers.ts";
import { ProviderSecrets } from "#assistant/application/ports/provider-secrets.ts";
import {
  ImageProviderSettings,
  originOfProvider,
  ProviderAddressSchema,
  ProviderModelSchema,
} from "#assistant/domain/image-provider.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { imageProviders } from "./schema.ts";

type Row = typeof imageProviders.$inferSelect;

const settingsOf = (row: Row) =>
  new ImageProviderSettings({
    baseUrl: ProviderAddressSchema.make(row.baseUrl),
    model: ProviderModelSchema.make(row.model),
    updatedAt: DateTime.fromDateUnsafe(row.updatedAt),
  });

/**
 * ImageProviders in Postgres (`assistant.image_providers`), the keys
 * sealed through ProviderSecrets: bound to the workspace and to the origin
 * of the address in the same row, so a row whose address moved, or that
 * was copied to another workspace, opens as none. A database failure is a
 * defect, as the quota's are.
 */
export const DrizzleImageProvidersLive = Layer.effect(
  ImageProviders,
  Effect.gen(function* DrizzleImageProviders() {
    const db = yield* Drizzle;
    const secrets = yield* ProviderSecrets;

    const rowOf = (workspaceId: WorkspaceId) =>
      db
        .select()
        .from(imageProviders)
        .where(eq(imageProviders.workspaceId, workspaceId))
        .pipe(
          Effect.map(([row]) => Option.fromUndefinedOr(row)),
          Effect.orDie
        );

    // The row's key, opened for the workspace and the row's own origin.
    const keyOf = (workspaceId: WorkspaceId, row: Row) =>
      secrets.open(
        row.sealedKey,
        workspaceId,
        originOfProvider(ProviderAddressSchema.make(row.baseUrl))
      );

    const open = Effect.fn("ImageProviders.open")(function* open(
      workspaceId: WorkspaceId
    ) {
      const row = yield* rowOf(workspaceId);

      if (Option.isNone(row)) {
        return Option.none<OpenedImageProvider>();
      }

      const key = yield* keyOf(workspaceId, row.value);

      return key.pipe(
        Option.map((apiKey): OpenedImageProvider => ({
          apiKey,
          settings: settingsOf(row.value),
        }))
      );
    });

    const find = Effect.fn("ImageProviders.find")(function* find(
      workspaceId: WorkspaceId
    ) {
      const row = yield* rowOf(workspaceId);

      if (Option.isNone(row)) {
        return Option.none<StoredImageProvider>();
      }

      const key = yield* keyOf(workspaceId, row.value);

      return Option.some<StoredImageProvider>({
        keyUnreadable: Option.isNone(key),
        settings: settingsOf(row.value),
      });
    });

    return ImageProviders.of({
      find,
      open,
      remove: (workspaceId) =>
        db
          .delete(imageProviders)
          .where(eq(imageProviders.workspaceId, workspaceId))
          .pipe(
            Effect.asVoid,
            Effect.orDie,
            Effect.withSpan("ImageProviders.remove")
          ),
      save: Effect.fn("ImageProviders.save")(
        function* save(workspaceId, settings, key, by) {
          // Sealed first: without a keyring, nothing is stored.
          const { keyId, sealed } = yield* secrets.seal(
            key,
            workspaceId,
            originOfProvider(settings.baseUrl)
          );

          const values = {
            baseUrl: settings.baseUrl,
            keyId,
            model: settings.model,
            sealedKey: sealed,
            setBy: Option.getOrNull(by),
            updatedAt: DateTime.toDateUtc(settings.updatedAt),
          };

          yield* db
            .insert(imageProviders)
            .values({ ...values, workspaceId })
            .onConflictDoUpdate({
              set: values,
              target: imageProviders.workspaceId,
            })
            .pipe(Effect.orDie);
        }
      ),
    });
  })
);
