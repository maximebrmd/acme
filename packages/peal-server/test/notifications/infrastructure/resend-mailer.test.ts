import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Redacted, Schema } from "effect";
import { FetchHttpClient } from "effect/http";

import { Mailer } from "#notifications/application/mailer.ts";
import { resendMailer } from "#notifications/infrastructure/resend-mailer.ts";

const message = {
  html: "<p>Hello</p>",
  idempotencyKey: "00000000-0000-7000-8000-000000000001",
  subject: "Hello",
  text: "Hello",
  to: "ada@example.test",
};

// Resend, answering every request with `status`, and the requests it got.
const resendAnswering = (status: number) => {
  const requests: Request[] = [];

  const fetch = Object.assign(
    async (input: string | URL | Request, init?: RequestInit) => {
      requests.push(
        input instanceof Request
          ? new Request(input, init)
          : new Request(input.toString(), init)
      );

      return await Promise.resolve(
        Response.json({ id: "email-1" }, { status })
      );
    },
    {
      preconnect: () => {
        // These requests never leave the process.
      },
    }
  );

  const layer = resendMailer({
    apiKey: Redacted.make("re_test_key"),
    from: "Acme <noreply@example.test>",
  }).pipe(
    Layer.provide(FetchHttpClient.layer),
    Layer.provide(Layer.succeed(FetchHttpClient.Fetch, fetch))
  );

  return { layer, requests };
};

const BodySchema = Schema.fromJsonString(
  Schema.Struct({
    from: Schema.String,
    html: Schema.String,
    subject: Schema.String,
    text: Schema.String,
    to: Schema.Array(Schema.String),
  })
);

describe("the Resend mailer", () => {
  it.effect("posts the email with the API key and its idempotency key", () => {
    const { layer, requests } = resendAnswering(200);

    return Effect.gen(function* posts() {
      yield* Mailer.use((mailer) => mailer.send(message));

      const [request] = requests;

      assert.isDefined(request);
      assert.strictEqual(request?.url, "https://api.resend.com/emails");
      assert.strictEqual(request?.method, "POST");
      assert.strictEqual(
        request?.headers.get("authorization"),
        "Bearer re_test_key"
      );
      assert.strictEqual(
        request?.headers.get("idempotency-key"),
        message.idempotencyKey
      );

      const body = yield* Schema.decodeUnknownEffect(BodySchema)(
        yield* Effect.promise(async () => (await request?.text()) ?? "")
      );

      assert.deepStrictEqual(body, {
        from: "Acme <noreply@example.test>",
        html: message.html,
        subject: message.subject,
        text: message.text,
        to: [message.to],
      });
    }).pipe(Effect.provide(layer));
  });

  it.effect.each([
    { retryable: true, status: 429 },
    { retryable: true, status: 503 },
    { retryable: false, status: 422 },
  ])("fails on $status, retryable: $retryable", ({ retryable, status }) =>
    Effect.gen(function* fails() {
      const failure = yield* Mailer.use((mailer) => mailer.send(message)).pipe(
        Effect.flip
      );

      assert.strictEqual(failure.retryable, retryable);
    }).pipe(Effect.provide(resendAnswering(status).layer))
  );
});
