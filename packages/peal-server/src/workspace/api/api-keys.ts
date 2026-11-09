import { Effect, Option, Redacted } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import { Api, ApiKeyNotFound, CurrentMember, Forbidden } from "peal-contract";
import type { ApiKey as ApiKeyView } from "peal-contract";

import { actorOf } from "#shared/api/actor.ts";
import { ApiKeys } from "#workspace/application/api-keys.ts";
import type { ApiKey } from "#workspace/domain/api-key.ts";

const toView = (apiKey: ApiKey): ApiKeyView => ({
  createdAt: apiKey.createdAt,
  expiresAt: Option.getOrNull(apiKey.expiresAt),
  id: apiKey.id,
  name: apiKey.name,
  permissions: apiKey.permissions,
  start: Option.getOrNull(apiKey.start),
});

const forbidden = () => Effect.fail(new Forbidden());

export const ApiKeysHandlers = HttpApiBuilder.group(
  Api,
  "apiKeys",
  Effect.fn(function* apiKeysHandlers(handlers) {
    const apiKeys = yield* ApiKeys;

    return handlers.handleAll({
      create: ({ payload }) =>
        Effect.gen(function* create() {
          const actor = actorOf(yield* CurrentMember);

          const issued = yield* apiKeys
            .create(actor, {
              expiresInDays: Option.fromUndefinedOr(payload.expiresInDays),
              name: payload.name,
              permissions: payload.permissions,
            })
            .pipe(
              Effect.catchTags({
                AuthUnavailable: Effect.die,
                MissingPermission: forbidden,
                UserRequired: forbidden,
              })
            );

          return {
            apiKey: toView(issued.apiKey),
            key: Redacted.value(issued.key),
          };
        }),
      list: () =>
        Effect.gen(function* list() {
          const actor = actorOf(yield* CurrentMember);

          const keys = yield* apiKeys.list(actor).pipe(
            Effect.catchTags({
              AuthUnavailable: Effect.die,
              MissingPermission: forbidden,
            })
          );

          return keys.map(toView);
        }),
      revoke: ({ params }) =>
        Effect.gen(function* revoke() {
          const actor = actorOf(yield* CurrentMember);

          yield* apiKeys.revoke(actor, params.apiKeyId).pipe(
            Effect.catchTags({
              ApiKeyNotFound: () => Effect.fail(new ApiKeyNotFound()),
              AuthUnavailable: Effect.die,
              MissingPermission: forbidden,
            })
          );
        }),
    });
  })
);
