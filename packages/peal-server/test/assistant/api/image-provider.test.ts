import { assert, layer } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import { Api } from "peal-contract";
import type { ImageProviderChange, Member, Permission } from "peal-contract";

import { AssistantApiLive } from "#assistant/container.ts";
import { DrizzleMediaAssetsLive } from "#media/infrastructure/drizzle-media-assets.ts";
import { S3MediaStorageLive } from "#media/infrastructure/s3-media-storage.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import {
  DatabaseTest,
  freshWorkspace,
  imagesTest,
} from "#test/assistant/support.ts";
import { memberOf } from "#test/channels/support.ts";
import { storageSettings } from "#test/media/support.ts";
import { securityTest } from "#workspace/api/security.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// The workspace's image provider endpoints on their real use cases,
// Postgres, the synthetic keyring and the real outbound guard on a static
// resolver (`providerHosts`). Nothing here reaches a provider: saving
// calls none.

const syntheticKey = "synthetic-workspace-image-key";

const clientAs = (member: Member) =>
  HttpApiTest.groups(Api, ["assistant"]).pipe(
    Effect.provide(
      Layer.mergeAll(
        AssistantApiLive.pipe(Layer.provideMerge(securityTest(member))),
        HttpServer.layerServices
      )
    )
  );

const as = (workspaceId: WorkspaceId, role: string) =>
  clientAs(memberOf(workspaceId, permissionsFor(role)));

// An API key of the workspace, with these permissions only.
const keyWith = (
  workspaceId: WorkspaceId,
  permissions: readonly Permission[]
) =>
  clientAs({
    permissions,
    principal: {
      _tag: "apiKey",
      apiKeyId: "synthetic-key",
      permissions,
      workspaceId,
    },
    workspaceId,
  });

const StoreTest = Layer.mergeAll(
  S3MediaStorageLive,
  DrizzleMediaAssetsLive
).pipe(Layer.provideMerge(DatabaseTest), Layer.provide(storageSettings));

const provider: ImageProviderChange = {
  apiKey: syntheticKey,
  baseUrl: "https://images.example.com/v1/",
  model: "synthetic-image-model",
};

// The tag and the fields an answer failed with.
const refusalOf = <A, E extends { readonly _tag: string }>(
  effect: Effect.Effect<A, E>
) => effect.pipe(Effect.flip);

layer(StoreTest, { timeout: "60 seconds" })(
  "the workspace's image provider endpoints",
  (it) => {
    it.effect("lets owners and admins set it, and nobody else", () =>
      Effect.gen(function* roles() {
        const workspaceId = yield* freshWorkspace;
        const params = { workspaceId };

        for (const role of ["editor", "contributor", "viewer"]) {
          const client = yield* as(workspaceId, role);

          const refusals = yield* Effect.all([
            refusalOf(client.assistant.imageProvider({ params })),
            refusalOf(
              client.assistant.setImageProvider({ params, payload: provider })
            ),
            refusalOf(client.assistant.removeImageProvider({ params })),
          ]);

          assert.deepStrictEqual(
            refusals.map((refusal) => refusal._tag),
            ["Forbidden", "Forbidden", "Forbidden"]
          );
        }

        const admin = yield* as(workspaceId, "admin");

        const saved = yield* admin.assistant.setImageProvider({
          params,
          payload: provider,
        });

        assert.deepInclude(saved, {
          baseUrl: "https://images.example.com/v1",
          keySet: true,
          keyUnreadable: false,
          model: "synthetic-image-model",
        });

        const owner = yield* as(workspaceId, "owner");
        const read = yield* owner.assistant.imageProvider({ params });

        assert.deepStrictEqual(read.provider, saved);
      }).pipe(Effect.provide(imagesTest()))
    );

    it.effect("refuses an API key without assistant:configure", () =>
      Effect.gen(function* keys() {
        const workspaceId = yield* freshWorkspace;
        const params = { workspaceId };

        const without = yield* keyWith(workspaceId, ["assistant:use"]);

        const refused = yield* refusalOf(
          without.assistant.setImageProvider({ params, payload: provider })
        );

        assert.strictEqual(refused._tag, "Forbidden");

        const configuring = yield* keyWith(workspaceId, [
          "assistant:configure",
        ]);

        const saved = yield* configuring.assistant.setImageProvider({
          params,
          payload: provider,
        });

        assert.isTrue(saved.keySet);
      }).pipe(Effect.provide(imagesTest()))
    );

    it.effect("never answers the key, in any view", () =>
      Effect.gen(function* noKey() {
        const workspaceId = yield* freshWorkspace;
        const params = { workspaceId };
        const admin = yield* as(workspaceId, "admin");

        const saved = yield* admin.assistant.setImageProvider({
          params,
          payload: provider,
        });

        const read = yield* admin.assistant.imageProvider({ params });
        const status = yield* admin.assistant.status({ params });

        for (const answer of [saved, read, status]) {
          assert.notInclude(JSON.stringify(answer), syntheticKey);
        }

        assert.deepInclude(status.images, {
          requestCost: 0,
          source: "workspace",
        });
      }).pipe(Effect.provide(imagesTest()))
    );

    it.effect(
      "keeps the stored key on the same origin, and asks it again on another",
      () =>
        Effect.gen(function* origins() {
          const workspaceId = yield* freshWorkspace;
          const params = { workspaceId };
          const admin = yield* as(workspaceId, "admin");

          // No key stored yet: it is required.
          const first = yield* refusalOf(
            admin.assistant.setImageProvider({
              params,
              payload: { baseUrl: provider.baseUrl, model: provider.model },
            })
          );

          assert.strictEqual(first._tag, "ImageProviderKeyRequired");

          yield* admin.assistant.setImageProvider({
            params,
            payload: provider,
          });

          // Another path and model on the same origin keep the key.
          const moved = yield* admin.assistant.setImageProvider({
            params,
            payload: {
              baseUrl: "https://images.example.com/v2",
              model: "synthetic-image-model-2",
            },
          });

          assert.deepInclude(moved, {
            baseUrl: "https://images.example.com/v2",
            keyUnreadable: false,
            model: "synthetic-image-model-2",
          });

          // Another origin does not, and nothing changes.
          const elsewhere = yield* refusalOf(
            admin.assistant.setImageProvider({
              params,
              payload: {
                baseUrl: "https://other-images.example.com/v1",
                model: provider.model,
              },
            })
          );

          assert.strictEqual(elsewhere._tag, "ImageProviderKeyRequired");

          const kept = yield* admin.assistant.imageProvider({ params });

          assert.strictEqual(
            kept.provider?.baseUrl,
            "https://images.example.com/v2"
          );
        }).pipe(Effect.provide(imagesTest()))
    );

    it.effect("refuses an address Peal sends nothing to, in words", () =>
      Effect.gen(function* addresses() {
        const workspaceId = yield* freshWorkspace;
        const params = { workspaceId };
        const admin = yield* as(workspaceId, "admin");

        const reasons = yield* Effect.forEach(
          [
            "https://images.internal.example/v1",
            "https://10.0.0.8/v1",
            "https://unknown-images.invalid/v1",
            "https://images.example.com:8443/v1",
            "https://user:pass@images.example.com/v1",
            "https://images.example.com/v1?key=synthetic",
            "not an address",
          ],
          (baseUrl) =>
            refusalOf(
              admin.assistant.setImageProvider({
                params,
                payload: { ...provider, baseUrl },
              })
            ).pipe(
              Effect.map((refusal) =>
                refusal._tag === "ImageProviderAddressRefused"
                  ? refusal.reason
                  : refusal._tag
              )
            )
        );

        assert.deepStrictEqual(reasons, [
          "notPublic",
          "notPublic",
          "unknownHost",
          "notHttps",
          "credentials",
          "queryOrFragment",
          "malformed",
        ]);

        const none = yield* admin.assistant.imageProvider({ params });

        assert.isNull(none.provider);
      }).pipe(Effect.provide(imagesTest()))
    );

    // The contract holds the rule: a client built on it refuses to send
    // such a request (the server answers InvalidRequest to one sent
    // anyway), and test/assistant/api/contract.test.ts keeps it equal to
    // the domain's.
    it.effect("refuses a model or a key that is not one line", () =>
      Effect.gen(function* lines() {
        const workspaceId = yield* freshWorkspace;
        const params = { workspaceId };
        const admin = yield* as(workspaceId, "admin");

        const refusals = yield* Effect.forEach(
          [
            { ...provider, model: "synthetic\nmodel" },
            { ...provider, model: "   " },
            { ...provider, apiKey: "synthetic key" },
          ],
          (payload) =>
            refusalOf(
              admin.assistant.setImageProvider({ params, payload })
            ).pipe(Effect.map((refusal) => refusal._tag))
        );

        assert.deepStrictEqual(refusals, [
          "SchemaError",
          "SchemaError",
          "SchemaError",
        ]);
      }).pipe(Effect.provide(imagesTest()))
    );

    it.effect("removes it, and the server's model makes images again", () =>
      Effect.gen(function* removes() {
        const workspaceId = yield* freshWorkspace;
        const params = { workspaceId };
        const admin = yield* as(workspaceId, "admin");

        yield* admin.assistant.setImageProvider({ params, payload: provider });
        yield* admin.assistant.removeImageProvider({ params });

        const status = yield* admin.assistant.status({ params });
        const read = yield* admin.assistant.imageProvider({ params });

        assert.isNull(read.provider);
        assert.deepInclude(status.images, {
          requestCost: 5,
          source: "server",
        });
      }).pipe(Effect.provide(imagesTest()))
    );
  }
);
