import { assert, layer } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import { Api } from "peal-contract";
import type { Member, Permission, TextProviderChange } from "peal-contract";

import { AssistantApiLive } from "#assistant/container.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import {
  assistantTest,
  DatabaseTest,
  FakeOwnWritingModel,
  freshWorkspace,
} from "#test/assistant/support.ts";
import { memberOf } from "#test/channels/support.ts";
import { securityTest } from "#workspace/api/security.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// The workspace's text provider endpoints on their real use cases,
// Postgres, the synthetic keyring and the real outbound guard on a static
// resolver (`providerHosts`), with a fake provider behind them that no
// request leaves.

const syntheticKey = "synthetic-workspace-text-key";

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

const provider: TextProviderChange = {
  apiKey: syntheticKey,
  baseUrl: "https://images.example.com/v1/",
  kind: "openai-compatible",
  model: "synthetic-text-model",
};

const refusalOf = <A, E extends { readonly _tag: string }>(
  effect: Effect.Effect<A, E>
) => effect.pipe(Effect.flip);

layer(DatabaseTest, { timeout: "60 seconds" })(
  "the workspace's text provider endpoints",
  (it) => {
    it.effect("lets owners and admins set it, and nobody else", () =>
      Effect.gen(function* roles() {
        const workspaceId = yield* freshWorkspace;
        const params = { workspaceId };

        for (const role of ["editor", "contributor", "viewer"]) {
          const client = yield* as(workspaceId, role);

          const refusals = yield* Effect.all([
            refusalOf(client.assistant.textProvider({ params })),
            refusalOf(
              client.assistant.setTextProvider({ params, payload: provider })
            ),
            refusalOf(client.assistant.removeTextProvider({ params })),
            refusalOf(client.assistant.testTextProvider({ params })),
          ]);

          assert.deepStrictEqual(
            refusals.map((refusal) => refusal._tag),
            ["Forbidden", "Forbidden", "Forbidden", "Forbidden"]
          );
        }

        const admin = yield* as(workspaceId, "admin");

        const saved = yield* admin.assistant.setTextProvider({
          params,
          payload: provider,
        });

        assert.deepInclude(saved, {
          baseUrl: "https://images.example.com/v1",
          keySet: true,
          keyUnreadable: false,
          kind: "openai-compatible",
          model: "synthetic-text-model",
        });

        const owner = yield* as(workspaceId, "owner");
        const read = yield* owner.assistant.textProvider({ params });

        assert.deepStrictEqual(read.provider, saved);
      }).pipe(Effect.provide(assistantTest()))
    );

    it.effect("takes an API key given assistant:configure, and no other", () =>
      Effect.gen(function* keys() {
        const workspaceId = yield* freshWorkspace;
        const params = { workspaceId };

        const without = yield* keyWith(workspaceId, ["assistant:use"]);

        assert.strictEqual(
          (yield* refusalOf(
            without.assistant.setTextProvider({ params, payload: provider })
          ))._tag,
          "Forbidden"
        );

        const configuring = yield* keyWith(workspaceId, [
          "assistant:configure",
        ]);

        const saved = yield* configuring.assistant.setTextProvider({
          params,
          payload: provider,
        });

        assert.isTrue(saved.keySet);
      }).pipe(Effect.provide(assistantTest()))
    );

    it.effect("never answers the key, and says in the status who writes", () =>
      Effect.gen(function* noKey() {
        const workspaceId = yield* freshWorkspace;
        const params = { workspaceId };
        const admin = yield* as(workspaceId, "admin");

        assert.strictEqual(
          (yield* admin.assistant.status({ params })).source,
          "server"
        );

        const saved = yield* admin.assistant.setTextProvider({
          params,
          payload: provider,
        });

        const read = yield* admin.assistant.textProvider({ params });
        const status = yield* admin.assistant.status({ params });

        for (const answer of [saved, read, status]) {
          assert.notInclude(JSON.stringify(answer), syntheticKey);
        }

        assert.deepInclude(status, { available: true, source: "workspace" });
      }).pipe(Effect.provide(assistantTest()))
    );

    it.effect("keeps the stored key for the same address only", () =>
      Effect.gen(function* origins() {
        const workspaceId = yield* freshWorkspace;
        const params = { workspaceId };
        const admin = yield* as(workspaceId, "admin");
        const { apiKey: _key, ...withoutKey } = provider;

        assert.strictEqual(
          (yield* refusalOf(
            admin.assistant.setTextProvider({ params, payload: withoutKey })
          ))._tag,
          "TextProviderKeyRequired"
        );

        yield* admin.assistant.setTextProvider({ params, payload: provider });

        const remodelled = yield* admin.assistant.setTextProvider({
          params,
          payload: { ...withoutKey, model: "synthetic-text-model-2" },
        });

        assert.strictEqual(remodelled.model, "synthetic-text-model-2");

        assert.strictEqual(
          (yield* refusalOf(
            admin.assistant.setTextProvider({
              params,
              payload: {
                ...withoutKey,
                baseUrl: "https://other-images.example.com/v1",
              },
            })
          ))._tag,
          "TextProviderKeyRequired"
        );
      }).pipe(Effect.provide(assistantTest()))
    );

    it.effect("refuses an address Peal sends nothing to, in words", () =>
      Effect.gen(function* addresses() {
        const workspaceId = yield* freshWorkspace;
        const params = { workspaceId };
        const admin = yield* as(workspaceId, "admin");

        const reasons = yield* Effect.forEach(
          [
            "https://images.internal.example/v1",
            "https://unknown-images.invalid/v1",
            "https://images.example.com:8443/v1",
            "https://user:pass@images.example.com/v1",
            "not an address",
          ],
          (baseUrl) =>
            refusalOf(
              admin.assistant.setTextProvider({
                params,
                payload: { ...provider, baseUrl },
              })
            ).pipe(
              Effect.map((refusal) =>
                refusal._tag === "TextProviderAddressRefused"
                  ? refusal.reason
                  : refusal._tag
              )
            )
        );

        assert.deepStrictEqual(reasons, [
          "notPublic",
          "unknownHost",
          "notHttps",
          "credentials",
          "malformed",
        ]);
        assert.isNull(
          (yield* admin.assistant.textProvider({ params })).provider
        );
      }).pipe(Effect.provide(assistantTest()))
    );

    it.effect(
      "tests it, and answers the provider's refusal as a suggestion would",
      () =>
        Effect.gen(function* tests() {
          const workspaceId = yield* freshWorkspace;
          const params = { workspaceId };
          const admin = yield* as(workspaceId, "admin");

          assert.strictEqual(
            (yield* refusalOf(admin.assistant.testTextProvider({ params })))
              ._tag,
            "TextProviderNotFound"
          );

          yield* admin.assistant.setTextProvider({ params, payload: provider });
          yield* FakeOwnWritingModel.use((model) =>
            model.replyWith({ _tag: "answer", value: { text: "It works." } })
          );
          yield* admin.assistant.testTextProvider({ params });

          yield* FakeOwnWritingModel.use((model) =>
            model.replyWith({ _tag: "settingsRefused", status: 401 })
          );

          const refused = yield* refusalOf(
            admin.assistant.testTextProvider({ params })
          );

          assert.deepInclude(refused, {
            _tag: "TextProviderRefused",
            reason: "settingsRefused",
            status: 401,
          });

          // A member's suggestion meets the same refusal.
          const member = yield* as(workspaceId, "contributor");

          const suggested = yield* refusalOf(
            member.assistant.suggest({
              params,
              payload: { action: { _tag: "hashtags" }, text: "We shipped." },
            })
          );

          assert.strictEqual(suggested._tag, "TextProviderRefused");
        }).pipe(Effect.provide(assistantTest()))
    );

    it.effect("removes it, and the server's model writes again", () =>
      Effect.gen(function* removes() {
        const workspaceId = yield* freshWorkspace;
        const params = { workspaceId };
        const admin = yield* as(workspaceId, "admin");

        yield* admin.assistant.setTextProvider({ params, payload: provider });
        yield* admin.assistant.removeTextProvider({ params });

        assert.isNull(
          (yield* admin.assistant.textProvider({ params })).provider
        );
        assert.strictEqual(
          (yield* admin.assistant.status({ params })).source,
          "server"
        );
      }).pipe(Effect.provide(assistantTest()))
    );
  }
);
