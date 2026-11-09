import { Context, Duration, Effect, Layer, Option } from "effect";

import type { Actor, Permission } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import { ApiKeyNotFound } from "#workspace/domain/api-key-not-found.ts";
import type { ApiKey } from "#workspace/domain/api-key.ts";
import { grantableBy } from "#workspace/domain/api-key.ts";
import { UserRequired } from "#workspace/domain/user-required.ts";

import { ApiKeyIssuer } from "./api-key-issuer.ts";
import type { IssuedApiKey } from "./api-key-issuer.ts";
import type { AuthUnavailable } from "./auth-unavailable.ts";

export interface NewApiKey {
  readonly expiresInDays: Option.Option<number>;
  readonly name: string;
  readonly permissions: readonly Permission[];
}

/** A workspace's API keys: created by members, used by scripts. */
export class ApiKeys extends Context.Service<
  ApiKeys,
  {
    readonly create: (
      actor: Actor,
      key: NewApiKey
    ) => Effect.Effect<
      IssuedApiKey,
      AuthUnavailable | MissingPermission | UserRequired
    >;
    readonly list: (
      actor: Actor
    ) => Effect.Effect<readonly ApiKey[], AuthUnavailable | MissingPermission>;
    readonly revoke: (
      actor: Actor,
      apiKeyId: string
    ) => Effect.Effect<
      void,
      ApiKeyNotFound | AuthUnavailable | MissingPermission
    >;
  }
>()("peal-server/workspace/application/ApiKeys") {
  static readonly layer = Layer.effect(
    ApiKeys,
    Effect.gen(function* apiKeys() {
      const issuer = yield* ApiKeyIssuer;

      const create = Effect.fn("ApiKeys.create")(function* create(
        actor: Actor,
        key: NewApiKey
      ) {
        yield* Effect.fromResult(authorize(actor, "apiKey:create"));

        const { subject } = actor;

        if (subject._tag !== "user") {
          return yield* new UserRequired();
        }

        const permissions = yield* Effect.fromResult(
          grantableBy(actor, key.permissions)
        );

        return yield* issuer.issue({
          createdBy: subject.userId,
          expiresIn: key.expiresInDays.pipe(Option.map(Duration.days)),
          name: key.name,
          permissions,
          workspaceId: actor.workspaceId,
        });
      });

      const list = Effect.fn("ApiKeys.list")(function* list(actor: Actor) {
        yield* Effect.fromResult(authorize(actor, "apiKey:read"));

        return yield* issuer.list(actor.workspaceId);
      });

      const revoke = Effect.fn("ApiKeys.revoke")(function* revoke(
        actor: Actor,
        apiKeyId: string
      ) {
        yield* Effect.fromResult(authorize(actor, "apiKey:delete"));

        const revoked = yield* issuer.revoke(actor.workspaceId, apiKeyId);

        if (!revoked) {
          yield* new ApiKeyNotFound({
            apiKeyId,
            workspaceId: actor.workspaceId,
          });
        }
      });

      return ApiKeys.of({ create, list, revoke });
    })
  );
}
