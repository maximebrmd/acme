import { assert, layer } from "@effect/vitest";
import {
  ConfigProvider,
  DateTime,
  Effect,
  Layer,
  Option,
  Redacted,
} from "effect";
import { SqlClient } from "effect/sql";

import { ImageProviders } from "#assistant/application/ports/image-providers.ts";
import { TextProviders } from "#assistant/application/ports/text-providers.ts";
import {
  ImageProviderSettings,
  ProviderAddressSchema,
  ProviderModelSchema,
} from "#assistant/domain/image-provider.ts";
import { TextProviderSettings } from "#assistant/domain/text-provider.ts";
import { CipherProviderSecrets } from "#assistant/infrastructure/cipher-provider-secrets.ts";
import { DrizzleImageProvidersLive } from "#assistant/infrastructure/drizzle-image-providers.ts";
import { DrizzleTextProvidersLive } from "#assistant/infrastructure/drizzle-text-providers.ts";
import type { TokenCipher } from "#channels/application/token-cipher.ts";
import { TokenCipherLive } from "#channels/infrastructure/web-crypto-token-cipher.ts";
import { Ids } from "#shared/application/ids.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { DatabaseTest } from "#test/assistant/support.ts";
import { TokenCipherTest } from "#test/channels/support.ts";

// Workspaces' text providers on Postgres, their keys sealed with the
// synthetic keyring. Nothing here reaches a provider.

const syntheticKey = "synthetic-workspace-text-key";

const settings = new TextProviderSettings({
  baseUrl: ProviderAddressSchema.make("https://text.example.com/v1"),
  kind: "openai-compatible",
  model: ProviderModelSchema.make("synthetic-text-model"),
  updatedAt: DateTime.makeUnsafe("2026-11-13T09:00:00Z"),
});

// A workspace no other test uses, whose providers go when the test ends.
const freshWorkspace = Effect.gen(function* freshWorkspace() {
  const workspaceId = WorkspaceIdSchema.make(yield* Ids.use((ids) => ids.next));
  const sql = yield* SqlClient.SqlClient;

  yield* Effect.addFinalizer(() =>
    sql`DELETE FROM assistant.text_providers WHERE workspace_id = ${workspaceId}`.pipe(
      Effect.andThen(
        sql`DELETE FROM assistant.image_providers WHERE workspace_id = ${workspaceId}`
      ),
      Effect.ignore
    )
  );

  return workspaceId;
});

const providersOn = <E>(cipher: Layer.Layer<TokenCipher, E>) =>
  Layer.mergeAll(DrizzleTextProvidersLive, DrizzleImageProvidersLive).pipe(
    Layer.provide(CipherProviderSecrets.pipe(Layer.provide(cipher))),
    Layer.provideMerge(DatabaseTest)
  );

const keyOf = (
  opened: Option.Option<{ readonly apiKey: Option.Option<Redacted.Redacted> }>
) =>
  opened.pipe(
    Option.flatMap(({ apiKey }) => apiKey),
    Option.map(Redacted.value)
  );

layer(providersOn(TokenCipherTest), { timeout: "60 seconds" })(
  "workspaces' text providers on Postgres",
  (it) => {
    it.effect(
      "gives the key back once saved, and never stores it as typed",
      () =>
        Effect.gen(function* saved() {
          const workspaceId = yield* freshWorkspace;
          const providers = yield* TextProviders;
          const sql = yield* SqlClient.SqlClient;

          assert.isTrue(Option.isNone(yield* providers.find(workspaceId)));
          assert.isTrue(Option.isNone(yield* providers.open(workspaceId)));

          yield* providers.save(
            workspaceId,
            settings,
            Redacted.make(syntheticKey)
          );

          const opened = yield* providers.open(workspaceId);

          assert.deepStrictEqual(keyOf(opened), Option.some(syntheticKey));
          assert.deepStrictEqual(
            opened.pipe(Option.map(({ settings: kept }) => kept)),
            Option.some(settings)
          );
          assert.deepStrictEqual(
            yield* providers.find(workspaceId),
            Option.some({ keyUnreadable: false, settings })
          );

          const [row] = yield* sql<{
            readonly keyId: string;
            readonly kind: string;
            readonly sealedKey: string;
          }>`SELECT key_id AS "keyId", kind, sealed_key AS "sealedKey" FROM assistant.text_providers WHERE workspace_id = ${workspaceId}`;

          assert.notInclude(row?.sealedKey ?? "", syntheticKey);
          assert.isTrue(row?.sealedKey.startsWith("test-key."));
          assert.strictEqual(row?.keyId, "test-key");
          assert.strictEqual(row?.kind, "openai-compatible");
        })
    );

    it.effect("replaces the provider it had, and removes it", () =>
      Effect.gen(function* replaced() {
        const workspaceId = yield* freshWorkspace;
        const providers = yield* TextProviders;

        yield* providers.save(
          workspaceId,
          settings,
          Redacted.make(syntheticKey)
        );

        const anthropic = new TextProviderSettings({
          baseUrl: ProviderAddressSchema.make("https://api.anthropic.com"),
          kind: "anthropic",
          model: ProviderModelSchema.make("synthetic-claude-model"),
          updatedAt: settings.updatedAt,
        });

        yield* providers.save(
          workspaceId,
          anthropic,
          Redacted.make(`${syntheticKey}-2`)
        );

        const opened = yield* providers.open(workspaceId);

        assert.deepStrictEqual(keyOf(opened), Option.some(`${syntheticKey}-2`));
        assert.deepStrictEqual(
          opened.pipe(Option.map(({ settings: kept }) => kept.kind)),
          Option.some("anthropic" as const)
        );

        yield* providers.remove(workspaceId);

        assert.isTrue(Option.isNone(yield* providers.find(workspaceId)));
      })
    );

    it.effect(
      "opens no key for an address moved by hand, and says it is unreadable",
      () =>
        Effect.gen(function* moved() {
          const workspaceId = yield* freshWorkspace;
          const providers = yield* TextProviders;
          const sql = yield* SqlClient.SqlClient;

          yield* providers.save(
            workspaceId,
            settings,
            Redacted.make(syntheticKey)
          );

          yield* sql`UPDATE assistant.text_providers SET base_url = 'https://text.example.com/other-account/v1' WHERE workspace_id = ${workspaceId}`;

          assert.isTrue(
            Option.isNone(keyOf(yield* providers.open(workspaceId)))
          );
          assert.isTrue(
            Option.exists(
              yield* providers.find(workspaceId),
              ({ keyUnreadable }) => keyUnreadable
            )
          );
        })
    );

    it.effect("opens no key for a row copied to another workspace", () =>
      Effect.gen(function* copied() {
        const workspaceId = yield* freshWorkspace;
        const other = yield* freshWorkspace;
        const providers = yield* TextProviders;
        const sql = yield* SqlClient.SqlClient;

        yield* providers.save(
          workspaceId,
          settings,
          Redacted.make(syntheticKey)
        );

        yield* sql`INSERT INTO assistant.text_providers (workspace_id, kind, base_url, model, sealed_key, key_id, updated_at)
          SELECT ${other}, kind, base_url, model, sealed_key, key_id, updated_at
          FROM assistant.text_providers WHERE workspace_id = ${workspaceId}`;

        assert.isTrue(Option.isNone(keyOf(yield* providers.open(other))));
        assert.isTrue(Option.isSome(keyOf(yield* providers.open(workspaceId))));
      })
    );

    it.effect(
      "opens no key copied from the image provider's row, at the same address",
      () =>
        Effect.gen(function* fromImages() {
          const workspaceId = yield* freshWorkspace;
          const images = yield* ImageProviders;
          const providers = yield* TextProviders;
          const sql = yield* SqlClient.SqlClient;

          yield* images.save(
            workspaceId,
            new ImageProviderSettings({
              baseUrl: settings.baseUrl,
              model: ProviderModelSchema.make("synthetic-image-model"),
              updatedAt: settings.updatedAt,
            }),
            Redacted.make(syntheticKey)
          );

          yield* sql`INSERT INTO assistant.text_providers (workspace_id, kind, base_url, model, sealed_key, key_id, updated_at)
            SELECT workspace_id, 'openai-compatible', base_url, model, sealed_key, key_id, updated_at
            FROM assistant.image_providers WHERE workspace_id = ${workspaceId}`;

          assert.isTrue(
            Option.isNone(keyOf(yield* providers.open(workspaceId)))
          );
        })
    );

    it.effect("keeps no kind of API but those the assistant speaks", () =>
      Effect.gen(function* kinds() {
        const workspaceId = yield* freshWorkspace;
        const sql = yield* SqlClient.SqlClient;

        const refused =
          yield* sql`INSERT INTO assistant.text_providers (workspace_id, kind, base_url, model, sealed_key, key_id, updated_at)
          VALUES (${workspaceId}, 'other', 'https://text.example.com/v1', 'synthetic-text-model', 'test-key.synthetic', 'test-key', now())`.pipe(
            Effect.flip
          );

        assert.strictEqual(refused._tag, "SqlError");
      })
    );
  }
);

// A server whose operator set no keyring keeps no key.
const NoKeyring = TokenCipherLive.pipe(
  Layer.provide(
    ConfigProvider.layer(ConfigProvider.fromUnknown({ PEAL_TOKEN_KEYS: "" }))
  )
);

layer(providersOn(NoKeyring), { timeout: "60 seconds" })(
  "workspaces' text providers on a server without a keyring",
  (it) => {
    it.effect("refuses to save, and stores nothing", () =>
      Effect.gen(function* unconfigured() {
        const workspaceId = yield* freshWorkspace;
        const providers = yield* TextProviders;

        const refused = yield* providers
          .save(workspaceId, settings, Redacted.make(syntheticKey))
          .pipe(Effect.flip);

        assert.strictEqual(refused._tag, "ProviderSecretsNotConfigured");
        assert.isTrue(Option.isNone(yield* providers.find(workspaceId)));
      })
    );
  }
);
