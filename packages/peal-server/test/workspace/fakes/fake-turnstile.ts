// Cloudflare Turnstile's siteverify endpoint, as it answers the test keys
// Cloudflare documents, on a loopback port: tests never reach the network.
import { Context, Effect, Layer, Option, Schema } from "effect";

import { fakeHttpServer, json } from "#test/channels/fakes/fake-http-server.ts";
import type { FakeHttpServer } from "#test/channels/fakes/fake-http-server.ts";
import { TestApp } from "#test/workspace/integration/harness.ts";

/** The site key whose widget always passes. */
export const passingSiteKey = "1x00000000000000000000AA";

/** The secret key whose checks always pass. */
export const passingSecretKey = "1x0000000000000000000000000000000AA";

/** The secret key whose checks always fail. */
export const failingSecretKey = "2x0000000000000000000000000000000AA";

/** The token the test widgets hand out, which only test secrets accept. */
export const dummyToken = "XXXX.DUMMY.TOKEN.XXXX";

const VerificationSchema = Schema.fromJsonString(
  Schema.Struct({ response: Schema.String, secret: Schema.String })
);

const decodeVerification = Schema.decodeUnknownOption(VerificationSchema);

/**
 * Answers as Cloudflare does for its test secrets: `1x…` passes the dummy
 * token, `2x…` fails every token, and any other secret is invalid.
 */
export const fakeTurnstile = fakeHttpServer((request) => {
  const asked = decodeVerification(request.body);

  if (request.path !== "/turnstile/v0/siteverify" || Option.isNone(asked)) {
    return { status: 404 };
  }

  const { response, secret } = asked.value;

  if (secret === passingSecretKey && response === dummyToken) {
    return json({
      action: "",
      cdata: "",
      challenge_ts: "2026-11-09T07:00:00.000Z",
      "error-codes": [],
      hostname: "example.com",
      metadata: { interactive: false },
      success: true,
    });
  }

  return json({
    "error-codes": [
      secret === failingSecretKey
        ? "invalid-input-response"
        : "invalid-input-secret",
    ],
    messages: [],
    success: false,
  });
});

/** The fake the server checks tokens with, to read what it was sent. */
export class FakeTurnstile extends Context.Service<
  FakeTurnstile,
  FakeHttpServer
>()("peal-server/test/FakeTurnstile") {}

/** The server with Turnstile's keys, checking tokens with the fake. */
export const appWithTurnstile = (secretKey: string) =>
  Layer.unwrap(
    Effect.gen(function* withTurnstile() {
      const turnstile: FakeHttpServer = yield* fakeTurnstile;

      return Layer.merge(
        TestApp.layerWith({
          AUTH_REQUIRE_EMAIL_VERIFICATION: "false",
          TURNSTILE_SECRET_KEY: secretKey,
          TURNSTILE_SITE_KEY: passingSiteKey,
          TURNSTILE_VERIFY_URL: `${turnstile.url}/turnstile/v0/siteverify`,
        }),
        Layer.succeed(FakeTurnstile, turnstile)
      );
    })
  );
