import { createServer } from "node:http";
import type { Server } from "node:http";

import { assert, describe, it } from "@effect/vitest";
import { ConfigProvider, Effect, Option, Schema } from "effect";

import { currentUserEffect } from "#auth/session.ts";

const Address = Schema.Struct({ port: Schema.Number });

const me = {
  impersonatedBy: null,
  user: {
    email: "ada@example.test",
    emailVerified: true,
    id: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    image: null,
    locale: "fr",
    name: "Ada",
  },
  workspaces: [],
};

// A stand-in for the server's GET /api/me: it knows one session cookie.
const fakeApi = Effect.acquireRelease(
  Effect.callback<Server>((resume) => {
    const server = createServer((request, response) => {
      const signedIn =
        request.url === "/api/me" &&
        request.headers.cookie === "acme.session_token=valid";

      response.statusCode = signedIn ? 200 : 401;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify(signedIn ? me : { _tag: "Unauthenticated" }));
    });

    server.listen(0, "127.0.0.1", () => {
      resume(Effect.succeed(server));
    });
  }),
  (server) =>
    Effect.callback<undefined>((resume) => {
      server.close(() => {
        resume(Effect.succeed(undefined));
      });
    })
);

const userWith = (cookie: string) =>
  Effect.gen(function* user() {
    const server = yield* fakeApi;

    const { port } = yield* Schema.decodeUnknownEffect(Address)(
      server.address()
    );

    return yield* currentUserEffect(cookie).pipe(
      Effect.provide(
        ConfigProvider.layer(
          ConfigProvider.fromUnknown({
            ACME_API_URL: `http://127.0.0.1:${port}`,
          })
        )
      )
    );
  });

describe("the current user", () => {
  it.live("comes from GET /api/me with the visitor's cookies", () =>
    Effect.gen(function* signedIn() {
      const user = yield* userWith("acme.session_token=valid");

      assert.deepStrictEqual(
        user.pipe(
          Option.map(({ user: { email, locale } }) => ({ email, locale }))
        ),
        Option.some({ email: "ada@example.test", locale: "fr" })
      );
    })
  );

  it.live("is none without a session", () =>
    Effect.gen(function* signedOut() {
      assert.isTrue(Option.isNone(yield* userWith("acme.session_token=gone")));
    })
  );
});
