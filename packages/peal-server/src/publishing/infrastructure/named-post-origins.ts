import { Effect, Layer, Option } from "effect";

import { PostOrigins } from "#publishing/application/post-origins.ts";
import { originOf } from "#publishing/domain/post-origin.ts";
import { CredentialNames } from "#workspace/application/credential-names.ts";

/**
 * PostOrigins that names an actor's API key or OAuth application as the
 * workspace context does when they act.
 */
export const NamedPostOrigins = Layer.effect(
  PostOrigins,
  Effect.gen(function* NamedPostOrigins() {
    const names = yield* CredentialNames;

    return PostOrigins.of({
      of: (actor) => {
        const { subject } = actor;

        if (subject._tag === "apiKey") {
          return names
            .apiKey(actor.workspaceId, subject.apiKeyId)
            .pipe(Effect.map((name) => originOf(actor, name)));
        }

        return subject.clientId === undefined
          ? Effect.succeed(originOf(actor, Option.none()))
          : names
              .application(subject.clientId)
              .pipe(Effect.map((name) => originOf(actor, name)));
      },
    });
  })
);
