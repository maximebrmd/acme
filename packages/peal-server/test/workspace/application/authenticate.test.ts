import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Option, Redacted, Ref } from "effect";

import { UserIdSchema } from "#shared/domain/ids.ts";
import { AuthGateway } from "#workspace/application/auth-gateway.ts";
import { Authenticate } from "#workspace/application/authenticate.ts";
import { UserPrincipal } from "#workspace/domain/user-principal.ts";

const userId = UserIdSchema.make("7c9e6679-7425-40de-944b-e07fc1f90ae7");

// A gateway that knows one session, and counts the calls it gets.
const gateway = Effect.gen(function* makeGateway() {
  const calls = yield* Ref.make(0);
  const counted = Ref.update(calls, (count) => count + 1);

  const layer = Authenticate.layer.pipe(
    Layer.provide(
      Layer.succeed(
        AuthGateway,
        AuthGateway.of({
          apiKey: () => counted.pipe(Effect.as(Option.none())),
          apiToken: () => counted.pipe(Effect.andThen(Effect.die("unused"))),
          isTrustedOrigin: (origin) => origin === "https://app.example.test",
          mcpToken: () => counted.pipe(Effect.andThen(Effect.die("unused"))),
          session: (cookies) =>
            counted.pipe(
              Effect.as(
                Redacted.value(cookies).includes("acme.session_token=valid")
                  ? Option.some(
                      new UserPrincipal({
                        impersonatedBy: Option.none(),
                        userId,
                      })
                    )
                  : Option.none()
              )
            ),
        })
      )
    )
  );

  return { calls, layer };
});

describe(Authenticate, () => {
  it.effect("finds the session the cookies carry", () =>
    Effect.gen(function* session() {
      const { layer } = yield* gateway;

      const principal = yield* Authenticate.use((authenticate) =>
        authenticate.session(Redacted.make("acme.session_token=valid"), {
          fresh: false,
        })
      ).pipe(Effect.provide(layer));

      assert.strictEqual(principal.userId, userId);
    })
  );

  it.effect("refuses empty credentials without asking Better Auth", () =>
    Effect.gen(function* empty() {
      const { calls, layer } = yield* gateway;

      const failures = yield* Effect.all([
        Authenticate.use((authenticate) =>
          authenticate.apiKey(Redacted.make(""))
        ).pipe(Effect.flip),
        Authenticate.use((authenticate) =>
          authenticate.session(Redacted.make(" "), { fresh: true })
        ).pipe(Effect.flip),
      ]).pipe(Effect.provide(layer));

      assert.deepStrictEqual(
        failures.map((failure) => failure._tag),
        ["NotSignedIn", "NotSignedIn"]
      );
      assert.strictEqual(yield* Ref.get(calls), 0);
    })
  );

  it.effect("refuses an unknown API key", () =>
    Effect.gen(function* unknownKey() {
      const { layer } = yield* gateway;

      const failure = yield* Authenticate.use((authenticate) =>
        authenticate.apiKey(Redacted.make("acme_unknown"))
      ).pipe(Effect.provide(layer), Effect.flip);

      assert.strictEqual(failure._tag, "NotSignedIn");
    })
  );

  it.effect("trusts only the origins it is given, and never no origin", () =>
    Effect.gen(function* origins() {
      const { layer } = yield* gateway;

      const trusted = yield* Authenticate.use((authenticate) =>
        Effect.succeed([
          authenticate.isTrustedOrigin(Option.some("https://app.example.test")),
          authenticate.isTrustedOrigin(
            Option.some("https://elsewhere.example")
          ),
          authenticate.isTrustedOrigin(Option.none()),
        ])
      ).pipe(Effect.provide(layer));

      assert.deepStrictEqual(trusted, [true, false, false]);
    })
  );
});
