import { createServer } from "node:http";
import type { Server } from "node:http";

import { assert, describe, it } from "@effect/vitest";
import { ConfigProvider, Effect, Exit, Option, Schema } from "effect";

import { currentUserEffect, orSignedOut } from "#auth/session.ts";

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
    twoStepEnabled: false,
  },
  workspaces: [],
};

// A stand-in for the server's GET /api/me: it knows one session cookie, and
// fails on another as a server whose database is down would.
const fakeApi = Effect.acquireRelease(
  Effect.callback<Server>((resume) => {
    const server = createServer((request, response) => {
      const signedIn =
        request.url === "/api/me" &&
        request.headers.cookie === "peal.session_token=valid";

      const broken = request.headers.cookie === "peal.session_token=broken";

      response.setHeader("content-type", "application/json");

      if (broken) {
        response.statusCode = 500;
        response.end(JSON.stringify({ _tag: "InternalServerError" }));

        return;
      }

      response.statusCode = signedIn ? 200 : 401;
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

const portOf = (server: Server) =>
  Schema.decodeUnknownEffect(Address)(server.address()).pipe(
    Effect.map(({ port }) => port)
  );

const at = (port: number) =>
  Effect.provide(
    ConfigProvider.layer(
      ConfigProvider.fromUnknown({ PEAL_API_URL: `http://127.0.0.1:${port}` })
    )
  );

const userWith = (cookie: string) =>
  Effect.gen(function* user() {
    const port = yield* portOf(yield* fakeApi);

    return yield* currentUserEffect(cookie).pipe(at(port));
  });

// A port nothing listens on any more: the fake API's, once it closed.
const closedPort = Effect.scoped(
  Effect.gen(function* closed() {
    return yield* portOf(yield* fakeApi);
  })
);

describe("the current user", () => {
  it.live("comes from GET /api/me with the visitor's cookies", () =>
    Effect.gen(function* signedIn() {
      const user = yield* userWith("peal.session_token=valid");

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
      assert.isTrue(Option.isNone(yield* userWith("peal.session_token=gone")));
    })
  );

  it.live("fails when the server does", () =>
    Effect.gen(function* fails() {
      const exit = yield* userWith("peal.session_token=broken").pipe(
        Effect.exit
      );

      assert.isTrue(Exit.isFailure(exit));
    })
  );

  // The header shows on every page, which an API outage must not take down.
  it.live("is none for the header when the server fails", () =>
    Effect.gen(function* broken() {
      const user = yield* orSignedOut(userWith("peal.session_token=broken"));

      assert.isTrue(Option.isNone(user));
    })
  );

  it.live("is none for the header when the server is unreachable", () =>
    Effect.gen(function* unreachable() {
      const port = yield* closedPort;

      const user = yield* orSignedOut(
        currentUserEffect("peal.session_token=valid").pipe(at(port))
      );

      assert.isTrue(Option.isNone(user));
    })
  );
});
