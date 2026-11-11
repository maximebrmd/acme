import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";
import { FetchHttpClient } from "effect/http";

import { OutboundGuard } from "#shared/infrastructure/platforms/outbound-guard.ts";
import { OutboundRequestRefused } from "#shared/infrastructure/platforms/outbound-request-refused.ts";
import { OpenOutboundGuard } from "#test/channels/support.ts";
import {
  empty,
  headerOf,
  json,
  rawJson,
  textOf,
} from "#test/publishing/fakes/platform-server.ts";
import { fakeReceiver } from "#test/webhooks/fakes/fake-receiver.ts";
import { WebhookTransport } from "#webhooks/application/ports/webhook-transport.ts";
import { WebhookUrlSchema } from "#webhooks/domain/webhook-url.ts";
import { httpWebhookTransport } from "#webhooks/infrastructure/http-webhook-transport.ts";

const transportWith = <E, R>(guard: Layer.Layer<OutboundGuard, E, R>) =>
  httpWebhookTransport({ timeout: "400 millis" }).pipe(
    Layer.provide(guard),
    Layer.provide(FetchHttpClient.layer)
  );

const Open = transportWith(OpenOutboundGuard);

// A guard that refuses every host for `reason`, as the real one would a
// host that is not public.
const refusing = (reason: OutboundRequestRefused["reason"]) =>
  transportWith(
    Layer.succeed(
      OutboundGuard,
      OutboundGuard.of({
        check: (url) =>
          Effect.fail(new OutboundRequestRefused({ host: url.host, reason })),
      })
    )
  );

const body = '{"type":"webhook.test","data":{}}';

const headers = {
  // An endpoint's own, as a gateway in front of the receiver asks.
  Authorization: "Bearer synthetic-gateway-token",
  "content-type": "application/json",
  "webhook-id": "00000000-0000-7000-8000-000000000041",
  "webhook-signature": "v1,c3ludGhldGlj",
  "webhook-timestamp": "1794301200",
};

const send = (url: string) =>
  WebhookTransport.use((transport) =>
    transport.send({ body, headers, url: WebhookUrlSchema.make(url) })
  );

describe("the webhook transport", () => {
  it.live("posts the body and the headers as given", () =>
    Effect.gen(function* posts() {
      const receiver = yield* fakeReceiver();
      const response = yield* send(receiver.url);
      const [request] = receiver.deliveries();

      assert(request !== undefined);
      assert.deepStrictEqual(response.outcome, {
        _tag: "answered",
        excerpt: Option.none(),
        status: 204,
      });
      assert.isAtLeast(response.durationMs, 0);
      assert.strictEqual(request.method, "POST");
      assert.strictEqual(textOf(request), body);
      assert.strictEqual(
        headerOf(request, "webhook-id"),
        headers["webhook-id"]
      );
      assert.strictEqual(
        headerOf(request, "webhook-signature"),
        headers["webhook-signature"]
      );
      assert.strictEqual(
        headerOf(request, "authorization"),
        headers.Authorization
      );
      // Receivers get none of Peal's trace context.
      assert.strictEqual(headerOf(request, "traceparent"), "");
      assert.strictEqual(headerOf(request, "b3"), "");
    }).pipe(Effect.scoped, Effect.provide(Open))
  );

  it.live("keeps nothing of an answer that takes the delivery", () =>
    Effect.gen(function* taken() {
      const receiver = yield* fakeReceiver();

      receiver.next(json({ received: "synthetic receipt" }, 200));

      const response = yield* send(receiver.url);

      assert.deepStrictEqual(response.outcome, {
        _tag: "answered",
        excerpt: Option.none(),
        status: 200,
      });
    }).pipe(Effect.scoped, Effect.provide(Open))
  );

  it.live("keeps a short, cleaned excerpt of a refusal", () =>
    Effect.gen(function* refusal() {
      const receiver = yield* fakeReceiver();

      receiver.next(
        rawJson(
          `{"error":\n"signature\u0000 mismatch"}${"x".repeat(5000)}`,
          400
        )
      );

      const { outcome } = yield* send(receiver.url);

      assert(outcome._tag === "answered");
      assert.strictEqual(outcome.status, 400);

      const excerpt = Option.getOrThrow(outcome.excerpt);

      assert.lengthOf(excerpt, 256);
      assert.isTrue(excerpt.startsWith('{"error": "signature mismatch"}xxx'));
    }).pipe(Effect.scoped, Effect.provide(Open))
  );

  it.live("answers a redirect as it comes, following none", () =>
    Effect.gen(function* redirect() {
      const receiver = yield* fakeReceiver();
      const elsewhere = yield* fakeReceiver();

      receiver.next(empty(302, { location: elsewhere.url }));

      const { outcome } = yield* send(receiver.url);

      assert(outcome._tag === "answered");
      assert.strictEqual(outcome.status, 302);
      assert.lengthOf(elsewhere.deliveries(), 0);
    }).pipe(Effect.scoped, Effect.provide(Open))
  );

  it.live("gives up on a receiver that does not answer in time", () =>
    Effect.gen(function* timeout() {
      const receiver = yield* fakeReceiver();

      receiver.next({ _tag: "stall" });

      const response = yield* send(receiver.url);

      assert.deepStrictEqual(response.outcome, {
        _tag: "unanswered",
        reason: "timeout",
      });
      assert.isAtLeast(response.durationMs, 350);
      assert.isBelow(response.durationMs, 5000);
    }).pipe(Effect.scoped, Effect.provide(Open))
  );

  it.live("says when the connection broke", () =>
    Effect.gen(function* dropped() {
      const receiver = yield* fakeReceiver();

      receiver.next({ _tag: "drop" });

      const { outcome } = yield* send(receiver.url);

      assert.deepStrictEqual(outcome, {
        _tag: "unanswered",
        reason: "connection",
      });
    }).pipe(Effect.scoped, Effect.provide(Open))
  );

  it.live("sends nothing to a host the guard refuses", () =>
    Effect.gen(function* refused() {
      const receiver = yield* fakeReceiver();
      const { outcome } = yield* send(receiver.url);

      assert.deepStrictEqual(outcome, {
        _tag: "unanswered",
        reason: "refused",
      });
      assert.lengthOf(receiver.deliveries(), 0);
    }).pipe(Effect.scoped, Effect.provide(refusing("notPublic")))
  );

  it.effect("tells a member which hosts it would not deliver to", () =>
    Effect.gen(function* checks() {
      const url = WebhookUrlSchema.make("https://hooks.example.com/peal");

      const check = (reason: OutboundRequestRefused["reason"]) =>
        WebhookTransport.use((transport) => transport.check(url)).pipe(
          Effect.match({
            onFailure: (failure) => failure.reason,
            onSuccess: () => "deliverable",
          }),
          Effect.provide(refusing(reason))
        );

      assert.strictEqual(yield* check("notPublic"), "notPublic");
      assert.strictEqual(yield* check("notHttps"), "notPublic");
      assert.strictEqual(yield* check("unknownHost"), "unknownHost");
      // For the moment only: each delivery checks again.
      assert.strictEqual(yield* check("lookupFailed"), "deliverable");
    })
  );
});
