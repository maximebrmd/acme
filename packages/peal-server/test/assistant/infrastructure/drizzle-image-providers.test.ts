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
import {
  ImageProviderSettings,
  ProviderAddressSchema,
  ProviderModelSchema,
} from "#assistant/domain/image-provider.ts";
import { CipherProviderSecrets } from "#assistant/infrastructure/cipher-provider-secrets.ts";
import { DrizzleImageProvidersLive } from "#assistant/infrastructure/drizzle-image-providers.ts";
import type { TokenCipher } from "#channels/application/token-cipher.ts";
import { TokenCipherLive } from "#channels/infrastructure/web-crypto-token-cipher.ts";
import { Ids } from "#shared/application/ids.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { DatabaseTest } from "#test/assistant/support.ts";
import { TokenCipherTest } from "#test/channels/support.ts";

// Workspaces' image providers on Postgres, their keys sealed with the
// synthetic keyring. Nothing here reaches a provider.

const syntheticKey = "synthetic-workspace-image-key";

const by = UserIdSchema.make("5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f");

const settings = new ImageProviderSettings({
  baseUrl: ProviderAddressSchema.make("https://images.example.com/v1"),
  model: ProviderModelSchema.make("synthetic-image-model"),
  updatedAt: DateTime.makeUnsafe("2026-11-12T09:00:00Z"),
});

// A workspace no other test uses, whose provider goes when the test ends.
const freshWorkspace = Effect.gen(function* freshWorkspace() {
  const workspaceId = WorkspaceIdSchema.make(yield* Ids.use((ids) => ids.next));
  const sql = yield* SqlClient.SqlClient;

  yield* Effect.addFinalizer(() =>
    sql`DELETE FROM assistant.image_providers WHERE workspace_id = ${workspaceId}`.pipe(
      Effect.ignore
    )
  );

  return workspaceId;
});

const providersOn = <E>(cipher: Layer.Layer<TokenCipher, E>) =>
  DrizzleImageProvidersLive.pipe(
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
  "workspaces' image providers on Postgres",
  (it) => {
    it.effect(
      "gives the key back once saved, and never stores it as typed",
      () =>
        Effect.gen(function* saved() {
          const workspaceId = yield* freshWorkspace;
          const providers = yield* ImageProviders;
          const sql = yield* SqlClient.SqlClient;

          assert.isTrue(Option.isNone(yield* providers.find(workspaceId)));
          assert.isTrue(Option.isNone(yield* providers.open(workspaceId)));

          yield* providers.save(
            workspaceId,
            settings,
            Redacted.make(syntheticKey),
            Option.some(by)
          );

          const opened = yield* providers.open(workspaceId);

          assert.deepStrictEqual(keyOf(opened), Option.some(syntheticKey));
          assert.deepStrictEqual(
            opened.pipe(Option.map(({ settings: kept }) => kept)),
            Option.some(settings)
          );
          assert.deepStrictEqual(
            yield* providers.find(workspaceId),
            Option.some({
              keyUnreadable: false,
              settings,
            })
          );

          const [row] = yield* sql<{
            readonly keyId: string;
            readonly sealedKey: string;
            readonly setBy: string | null;
          }>`SELECT key_id AS "keyId", sealed_key AS "sealedKey", set_by AS "setBy" FROM assistant.image_providers WHERE workspace_id = ${workspaceId}`;

          assert.notInclude(row?.sealedKey ?? "", syntheticKey);
          assert.isTrue(row?.sealedKey.startsWith("test-key."));
          assert.strictEqual(row?.keyId, "test-key");
          assert.strictEqual(row?.setBy, by);
        })
    );

    it.effect("replaces the provider it had, and removes it", () =>
      Effect.gen(function* replaced() {
        const workspaceId = yield* freshWorkspace;
        const providers = yield* ImageProviders;

        yield* providers.save(
          workspaceId,
          settings,
          Redacted.make(syntheticKey),
          Option.some(by)
        );

        const moved = new ImageProviderSettings({
          baseUrl: settings.baseUrl,
          model: ProviderModelSchema.make("synthetic-image-model-2"),
          updatedAt: settings.updatedAt,
        });

        yield* providers.save(
          workspaceId,
          moved,
          Redacted.make(`${syntheticKey}-2`),
          Option.none()
        );

        assert.deepStrictEqual(
          keyOf(yield* providers.open(workspaceId)),
          Option.some(`${syntheticKey}-2`)
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
          const providers = yield* ImageProviders;
          const sql = yield* SqlClient.SqlClient;

          yield* providers.save(
            workspaceId,
            settings,
            Redacted.make(syntheticKey),
            Option.some(by)
          );

          // The key was typed for images.example.com: it never goes to
          // another origin, whoever changed the row.
          yield* sql`UPDATE assistant.image_providers SET base_url = 'https://elsewhere.example.com/v1' WHERE workspace_id = ${workspaceId}`;

          assert.isTrue(
            Option.isNone(keyOf(yield* providers.open(workspaceId)))
          );

          const found = yield* providers.find(workspaceId);

          assert.deepStrictEqual(
            found.pipe(
              Option.map(({ keyUnreadable, settings: kept }) => ({
                baseUrl: kept.baseUrl,
                keyUnreadable,
              }))
            ),
            Option.some({
              baseUrl: ProviderAddressSchema.make(
                "https://elsewhere.example.com/v1"
              ),
              keyUnreadable: true,
            })
          );
        })
    );

    it.effect("opens no key for a row copied to another workspace", () =>
      Effect.gen(function* copied() {
        const workspaceId = yield* freshWorkspace;
        const other = yield* freshWorkspace;
        const providers = yield* ImageProviders;
        const sql = yield* SqlClient.SqlClient;

        yield* providers.save(
          workspaceId,
          settings,
          Redacted.make(syntheticKey),
          Option.some(by)
        );

        yield* sql`INSERT INTO assistant.image_providers (workspace_id, base_url, model, sealed_key, key_id, set_by, updated_at)
          SELECT ${other}, base_url, model, sealed_key, key_id, set_by, updated_at
          FROM assistant.image_providers WHERE workspace_id = ${workspaceId}`;

        assert.isTrue(Option.isNone(keyOf(yield* providers.open(other))));
        assert.isTrue(
          Option.exists(
            yield* providers.find(other),
            ({ keyUnreadable }) => keyUnreadable
          )
        );
        assert.isTrue(Option.isSome(keyOf(yield* providers.open(workspaceId))));
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
  "workspaces' image providers on a server without a keyring",
  (it) => {
    it.effect("refuses to save, and stores nothing", () =>
      Effect.gen(function* unconfigured() {
        const workspaceId = yield* freshWorkspace;
        const providers = yield* ImageProviders;

        const refused = yield* providers
          .save(
            workspaceId,
            settings,
            Redacted.make(syntheticKey),
            Option.some(by)
          )
          .pipe(Effect.flip);

        assert.strictEqual(refused._tag, "ProviderSecretsNotConfigured");
        assert.isTrue(Option.isNone(yield* providers.find(workspaceId)));
      })
    );
  }
);
