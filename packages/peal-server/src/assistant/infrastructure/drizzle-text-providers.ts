import { eq } from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";

import { ProviderSecrets } from "#assistant/application/ports/provider-secrets.ts";
import { TextProviders } from "#assistant/application/ports/text-providers.ts";
import type {
  OpenedTextProvider,
  StoredTextProvider,
} from "#assistant/application/ports/text-providers.ts";
import {
  ProviderAddressSchema,
  ProviderModelSchema,
} from "#assistant/domain/image-provider.ts";
import {
  TextProviderKindSchema,
  TextProviderSettings,
} from "#assistant/domain/text-provider.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { textProviders } from "./schema.ts";

type Row = typeof textProviders.$inferSelect;

// The table's check keeps every row's kind one of these.
const kindOf = Schema.decodeUnknownSync(TextProviderKindSchema);

const settingsOf = (row: Row) =>
  new TextProviderSettings({
    baseUrl: ProviderAddressSchema.make(row.baseUrl),
    kind: kindOf(row.kind),
    model: ProviderModelSchema.make(row.model),
    updatedAt: DateTime.fromDateUnsafe(row.updatedAt),
  });

/**
 * TextProviders in Postgres (`assistant.text_providers`), the keys sealed
 * through ProviderSecrets for text: bound to the workspace and to the
 * address in the same row, so a row whose address moved, or that was
 * copied to another workspace or from the image provider's, opens without
 * its key. A database failure is a defect, as the quota's are.
 */
export const DrizzleTextProvidersLive = Layer.effect(
  TextProviders,
  Effect.gen(function* DrizzleTextProviders() {
    const db = yield* Drizzle;
    const secrets = yield* ProviderSecrets;

    const rowOf = (workspaceId: WorkspaceId) =>
      db
        .select()
        .from(textProviders)
        .where(eq(textProviders.workspaceId, workspaceId))
        .pipe(
          Effect.map(([row]) => Option.fromUndefinedOr(row)),
          Effect.orDie
        );

    const open = Effect.fn("TextProviders.open")(function* open(
      workspaceId: WorkspaceId
    ) {
      const row = yield* rowOf(workspaceId);

      if (Option.isNone(row)) {
        return Option.none<OpenedTextProvider>();
      }

      const provider: OpenedTextProvider = {
        apiKey: yield* secrets.open(
          row.value.sealedKey,
          workspaceId,
          row.value.baseUrl,
          "text"
        ),
        settings: settingsOf(row.value),
      };

      return Option.some(provider);
    });

    // What the settings page reads: whether the key opens, never the key.
    const find = (workspaceId: WorkspaceId) =>
      open(workspaceId).pipe(
        Effect.map(
          Option.map(({ apiKey, settings }): StoredTextProvider => ({
            keyUnreadable: Option.isNone(apiKey),
            settings,
          }))
        )
      );

    return TextProviders.of({
      find,
      open,
      remove: (workspaceId) =>
        db
          .delete(textProviders)
          .where(eq(textProviders.workspaceId, workspaceId))
          .pipe(
            Effect.asVoid,
            Effect.orDie,
            Effect.withSpan("TextProviders.remove")
          ),
      save: Effect.fn("TextProviders.save")(
        function* save(workspaceId, settings, key) {
          // Sealed first: without a keyring, nothing is stored.
          const { keyId, sealed } = yield* secrets.seal(
            key,
            workspaceId,
            settings.baseUrl,
            "text"
          );

          const values = {
            baseUrl: settings.baseUrl,
            keyId,
            kind: settings.kind,
            model: settings.model,
            sealedKey: sealed,
            updatedAt: DateTime.toDateUtc(settings.updatedAt),
          };

          yield* db
            .insert(textProviders)
            .values({ ...values, workspaceId })
            .onConflictDoUpdate({
              set: values,
              target: textProviders.workspaceId,
            })
            .pipe(Effect.orDie);
        }
      ),
    });
  })
);
