import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Redacted, Ref } from "effect";

import { Actor } from "#shared/domain/access.ts";
import type { Permission } from "#shared/domain/access.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { ApiKeyIssuer } from "#workspace/application/api-key-issuer.ts";
import type { ApiKeyRequest } from "#workspace/application/api-key-issuer.ts";
import { ApiKeys } from "#workspace/application/api-keys.ts";
import { ApiKey } from "#workspace/domain/api-key.ts";

const workspaceId = WorkspaceIdSchema.make(
  "5b0c6e64-5d0f-4a7e-9a52-3f1c2d4e5f60"
);

const userId = UserIdSchema.make("7c9e6679-7425-40de-944b-e07fc1f90ae7");

const member = (permissions: readonly Permission[]) =>
  new Actor({
    permissions,
    subject: { _tag: "user", impersonatedBy: Option.none(), userId },
    workspaceId,
  });

const createdAt = DateTime.makeUnsafe("2026-11-09T12:00:00Z");

// An issuer that keeps keys in memory, and the requests it received.
const inMemoryIssuer = Effect.gen(function* makeIssuer() {
  const requests = yield* Ref.make<readonly ApiKeyRequest[]>([]);
  const keys = yield* Ref.make<readonly ApiKey[]>([]);

  const layer = Layer.succeed(
    ApiKeyIssuer,
    ApiKeyIssuer.of({
      issue: (request) =>
        Effect.gen(function* issue() {
          yield* Ref.update(requests, (all) => [...all, request]);

          const apiKey = new ApiKey({
            createdAt,
            expiresAt: Option.none(),
            id: `key-${String((yield* Ref.get(keys)).length + 1)}`,
            name: request.name,
            permissions: request.permissions,
            start: Option.some("peal_x"),
            workspaceId: request.workspaceId,
          });

          yield* Ref.update(keys, (all) => [...all, apiKey]);

          return { apiKey, key: Redacted.make("peal_secret") };
        }),
      list: () => Ref.get(keys),
      revoke: (_workspace, apiKeyId) =>
        Ref.modify(keys, (all) => [
          all.some((key) => key.id === apiKeyId),
          all.filter((key) => key.id !== apiKeyId),
        ]),
    })
  );

  return { layer, requests };
});

const withIssuer = <A, E>(
  test: (issuer: {
    readonly requests: Ref.Ref<readonly ApiKeyRequest[]>;
  }) => Effect.Effect<A, E, ApiKeys>
) =>
  Effect.gen(function* run() {
    const issuer = yield* inMemoryIssuer;

    return yield* test(issuer).pipe(
      Effect.provide(ApiKeys.layer.pipe(Layer.provide(issuer.layer)))
    );
  });

const newKey = {
  expiresInDays: Option.some(30),
  name: "deploy",
  permissions: ["post:read"] as const,
};

describe(ApiKeys, () => {
  it.effect("issues a key for the workspace, in the creator's name", () =>
    withIssuer(({ requests }) =>
      Effect.gen(function* issues() {
        const keys = yield* ApiKeys;

        yield* keys.create(member(["apiKey:create", "post:read"]), newKey);

        const [request] = yield* Ref.get(requests);

        assert.strictEqual(request?.createdBy, userId);
        assert.strictEqual(request?.workspaceId, workspaceId);
        assert.deepStrictEqual(request?.permissions, ["post:read"]);
        assert.isTrue(Option.isSome(request?.expiresIn ?? Option.none()));
      })
    )
  );

  it.effect("needs apiKey:create", () =>
    withIssuer(() =>
      Effect.gen(function* needsPermission() {
        const keys = yield* ApiKeys;

        const failure = yield* keys
          .create(member(["post:read"]), newKey)
          .pipe(Effect.flip);

        assert.deepStrictEqual(failure._tag, "MissingPermission");
      })
    )
  );

  it.effect("gives a key no more than its creator may do", () =>
    withIssuer(({ requests }) =>
      Effect.gen(function* noEscalation() {
        const keys = yield* ApiKeys;

        const failure = yield* keys
          .create(member(["apiKey:create", "post:read"]), {
            ...newKey,
            permissions: ["post:read", "post:publish"],
          })
          .pipe(Effect.flip);

        assert.strictEqual(failure._tag, "MissingPermission");
        assert.lengthOf(yield* Ref.get(requests), 0);
      })
    )
  );

  it.effect(
    "puts the direct messages' permissions on a key for an owner in person, never through an application",
    () =>
      withIssuer(({ requests }) =>
        Effect.gen(function* messages() {
          const keys = yield* ApiKeys;

          const owner: readonly Permission[] = [
            "apiKey:create",
            "organization:secure",
            "engagement:readMessages",
          ];

          const asked = {
            ...newKey,
            permissions: ["engagement:readMessages"] as const,
          };

          const throughApp = new Actor({
            permissions: owner,
            subject: {
              _tag: "user",
              clientId: "synthetic-client",
              impersonatedBy: Option.none(),
              userId,
            },
            workspaceId,
          });

          const refused = yield* keys
            .create(throughApp, asked)
            .pipe(Effect.flip);

          assert.strictEqual(refused._tag, "PermissionNotGrantable");
          assert.lengthOf(yield* Ref.get(requests), 0);

          yield* keys.create(member(owner), asked);

          assert.deepStrictEqual(
            (yield* Ref.get(requests)).map(({ permissions }) => permissions),
            [["engagement:readMessages"]]
          );
        })
      )
  );

  it.effect("refuses an API key creating keys", () =>
    withIssuer(() =>
      Effect.gen(function* keysMintNoKeys() {
        const keys = yield* ApiKeys;

        const failure = yield* keys
          .create(
            new Actor({
              permissions: ["apiKey:create", "post:read"],
              subject: { _tag: "apiKey", apiKeyId: "key-0" },
              workspaceId,
            }),
            newKey
          )
          .pipe(Effect.flip);

        assert.strictEqual(failure._tag, "UserRequired");
      })
    )
  );

  it.effect("lists with apiKey:read and revokes with apiKey:delete", () =>
    withIssuer(() =>
      Effect.gen(function* listsAndRevokes() {
        const keys = yield* ApiKeys;

        const owner = member([
          "apiKey:create",
          "apiKey:delete",
          "apiKey:read",
          "post:read",
        ]);

        const { apiKey } = yield* keys.create(owner, newKey);

        assert.lengthOf(yield* keys.list(owner), 1);

        const unreadable = yield* keys
          .list(member(["post:read"]))
          .pipe(Effect.flip);

        assert.strictEqual(unreadable._tag, "MissingPermission");

        yield* keys.revoke(owner, apiKey.id);

        const missing = yield* keys.revoke(owner, apiKey.id).pipe(Effect.flip);

        assert.strictEqual(missing._tag, "ApiKeyNotFound");
      })
    )
  );
});
