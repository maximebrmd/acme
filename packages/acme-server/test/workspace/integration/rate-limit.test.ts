// Better Auth's sign-in rate limit, as production runs it, on the database
// DATABASE_URL names: it counts attempts by the address the configured
// headers carry, whatever else the client sends.
import { randomBytes } from "node:crypto";

import { assert, describe, it } from "@effect/vitest";
import { ConfigProvider, Effect, Layer } from "effect";

import { BillingLive } from "#billing/container.ts";
import { SendAuthEmail } from "#notifications/application/send-auth-email.ts";
import { DatabaseLive } from "#shared/infrastructure/database.ts";
import { MigrationsLive } from "#shared/infrastructure/migrations.ts";
import {
  BetterAuth,
  BetterAuthLive,
} from "#workspace/infrastructure/auth/better-auth.ts";
import {
  AuthSettings,
  authSettingsConfig,
} from "#workspace/infrastructure/auth/settings.ts";

import { newEmail, origin } from "./harness.ts";

const production = {
  BETTER_AUTH_SECRET: "rate-limit-test-only-0123456789abcdef",
  NODE_ENV: "production",
  PUBLIC_URL: origin,
};

const authWith = (env: Record<string, string>) =>
  BetterAuthLive.pipe(
    Layer.provide(
      Layer.effect(
        AuthSettings,
        authSettingsConfig.parse(
          ConfigProvider.fromUnknown({ ...production, ...env })
        )
      )
    ),
    Layer.provide(
      Layer.succeed(
        SendAuthEmail,
        SendAuthEmail.of({ send: () => Effect.void })
      )
    ),
    Layer.provide(
      Layer.mergeAll(BillingLive, MigrationsLive).pipe(
        Layer.provide(DatabaseLive)
      )
    )
  );

const hex = () => randomBytes(2).toString("hex");

// A fresh client in its own /64, as Better Auth counts IPv6 clients by /64:
// runs and parallel tests never share a count.
const newClient = () => `2001:db8:${hex()}:${hex()}::1`;

// Any address at all, as a client would make one up.
const madeUp = () => [...randomBytes(4)].join(".");

const signIn = Effect.fn("signIn")(function* signIn(
  headers: Readonly<Record<string, string>>
) {
  const auth = yield* BetterAuth;

  return yield* Effect.promise(async () => {
    const response = await auth.handler(
      new Request(`${origin}/api/auth/sign-in/email`, {
        body: JSON.stringify({
          email: newEmail("nobody"),
          password: "not the password at all",
        }),
        headers: { "content-type": "application/json", origin, ...headers },
        method: "POST",
      })
    );

    return response.status;
  });
});

interface Case {
  readonly env: Readonly<Record<string, string>>;
  readonly from: (client: string) => Readonly<Record<string, string>>;
  readonly name: string;
}

const cases: readonly Case[] = [
  {
    env: { AUTH_IP_HEADERS: "cf-connecting-ip" },
    from: (client) => ({
      "cf-connecting-ip": client,
      "x-forwarded-for": madeUp(),
    }),
    name: "the edge's own header, ignoring x-forwarded-for",
  },
  {
    env: {
      AUTH_IP_HEADERS: "x-forwarded-for",
      AUTH_TRUSTED_PROXIES: "10.0.0.0/8",
    },
    from: (client) => ({
      "x-forwarded-for": `${madeUp()}, ${client}, 10.0.0.1`,
    }),
    name: "x-forwarded-for read from the right, past trusted proxies",
  },
];

describe("the sign-in rate limit", () => {
  for (const { env, from, name } of cases) {
    it.live(`counts attempts by ${name}`, () =>
      Effect.gen(function* limits() {
        const client = newClient();
        const statuses: number[] = [];

        // A new made-up address on every attempt changes nothing.
        for (let attempt = 0; attempt < 4; attempt += 1) {
          statuses.push(yield* signIn(from(client)));
        }

        assert.deepStrictEqual(statuses, [401, 401, 401, 429]);

        // Another client keeps its own count.
        assert.strictEqual(yield* signIn(from(newClient())), 401);
      }).pipe(Effect.provide(authWith(env)))
    );
  }
});
