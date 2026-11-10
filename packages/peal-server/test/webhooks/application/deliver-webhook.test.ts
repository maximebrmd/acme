import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Option } from "effect";
import { TestClock } from "effect/testing";

import type { Actor } from "#shared/domain/access.ts";
import {
  answered,
  FakeTransport,
} from "#test/webhooks/fakes/fake-transport.ts";
import { ToldNotices } from "#test/webhooks/fakes/told-notices.ts";
import {
  freshEndpoint,
  freshOwner,
  referenceSignature,
  WebhooksTest,
} from "#test/webhooks/support.ts";
import { DeliverWebhook } from "#webhooks/application/deliver-webhook.ts";
import { DeliveryStore } from "#webhooks/application/ports/delivery-store.ts";
import { WebhookEndpoints } from "#webhooks/application/webhook-endpoints.ts";
import { maxAttempts } from "#webhooks/domain/delivery-policy.ts";
import type { WebhookDeliveryId } from "#webhooks/domain/webhook-delivery-id.ts";

const attempt = (deliveryId: WebhookDeliveryId, number: number) =>
  DeliverWebhook.use((delivering) => delivering.attempt(deliveryId, number));

const stored = (deliveryId: WebhookDeliveryId) =>
  DeliveryStore.use((store) => store.get(deliveryId)).pipe(
    Effect.map(Option.getOrThrow)
  );

// A delivery to the endpoint, not yet attempted.
const pending = (actor: Actor, endpointId: string) =>
  WebhookEndpoints.use((endpoints) => endpoints.sendTest(actor, endpointId));

const unanswered = { _tag: "unanswered", reason: "timeout" } as const;

layer(WebhooksTest)("a delivery's attempts", (it) => {
  it.effect("send the event signed as the specification says", () =>
    Effect.gen(function* signs() {
      const owner = yield* freshOwner;
      const transport = yield* FakeTransport;
      const { endpoint, host, secret } = yield* freshEndpoint(owner);
      const delivery = yield* pending(owner, endpoint.id);

      yield* TestClock.adjust("90 seconds");

      const now = yield* DateTime.now;
      const result = yield* attempt(delivery.id, 1);
      const [request] = yield* transport.sentTo(host);

      assert(request !== undefined);
      assert.strictEqual(result, "settled");
      assert.strictEqual(request.url, endpoint.url);
      assert.deepStrictEqual(request.headers, {
        "content-type": "application/json",
        "user-agent": "Peal-Webhooks",
        "webhook-id": delivery.eventId,
        "webhook-signature": referenceSignature(secret, request),
        // The attempt's time, in seconds: the event's own is in the body.
        "webhook-timestamp": String(
          Math.floor(DateTime.toEpochMillis(now) / 1000)
        ),
      });

      const after = yield* stored(delivery.id);

      assert.deepStrictEqual(after.status, { _tag: "succeeded", at: now });
      assert.strictEqual(after.attempts, 1);
      assert.deepStrictEqual(
        after.lastAttempt,
        Option.some({
          at: now,
          durationMs: 42,
          outcome: answered(204),
        })
      );
    })
  );

  it.effect("try again on the schedule, with the same id and a new time", () =>
    Effect.gen(function* retries() {
      const owner = yield* freshOwner;
      const transport = yield* FakeTransport;
      const { endpoint, host } = yield* freshEndpoint(owner);
      const delivery = yield* pending(owner, endpoint.id);

      yield* transport.next(
        host,
        answered(500, "synthetic failure"),
        unanswered,
        answered(302)
      );

      const first = yield* DateTime.now;

      assert.strictEqual(yield* attempt(delivery.id, 1), "retry");

      const waiting = yield* stored(delivery.id);

      assert.deepStrictEqual(waiting.status, {
        _tag: "pending",
        nextAttemptAt: Option.some(DateTime.addDuration(first, "5 seconds")),
      });
      assert.deepStrictEqual(
        waiting.lastAttempt,
        Option.some({
          at: first,
          durationMs: 42,
          outcome: answered(500, "synthetic failure"),
        })
      );

      yield* TestClock.adjust("5 seconds");

      assert.strictEqual(yield* attempt(delivery.id, 2), "retry");
      assert.deepStrictEqual((yield* stored(delivery.id)).status, {
        _tag: "pending",
        nextAttemptAt: Option.some(
          DateTime.addDuration(yield* DateTime.now, "5 minutes")
        ),
      });

      yield* TestClock.adjust("5 minutes");

      // A redirect is a failure: it is not followed.
      assert.strictEqual(yield* attempt(delivery.id, 3), "retry");

      yield* TestClock.adjust("30 minutes");

      assert.strictEqual(yield* attempt(delivery.id, 4), "settled");

      const requests = yield* transport.sentTo(host);
      const done = yield* stored(delivery.id);

      assert.lengthOf(requests, 4);
      assert.deepStrictEqual(
        requests.map(({ headers }) => headers["webhook-id"]),
        requests.map(() => delivery.eventId)
      );
      assert.deepStrictEqual(
        requests.map(({ body }) => body),
        requests.map(() => requests[0]?.body)
      );
      assert.lengthOf(
        new Set(requests.map(({ headers }) => headers["webhook-timestamp"])),
        4
      );
      assert.strictEqual(done.status._tag, "succeeded");
      assert.strictEqual(done.attempts, 4);
    })
  );

  it.effect("fail for good once the schedule is used up", () =>
    Effect.gen(function* exhausts() {
      const owner = yield* freshOwner;
      const transport = yield* FakeTransport;
      const { endpoint, host } = yield* freshEndpoint(owner);
      const delivery = yield* pending(owner, endpoint.id);

      yield* transport.next(
        host,
        ...Array.from({ length: maxAttempts }, () => answered(503))
      );

      for (let number = 1; number < maxAttempts; number += 1) {
        assert.strictEqual(yield* attempt(delivery.id, number), "retry");
        yield* TestClock.adjust("1 minute");
      }

      assert.strictEqual(yield* attempt(delivery.id, maxAttempts), "settled");

      const failed = yield* stored(delivery.id);

      assert.deepStrictEqual(failed.status, {
        _tag: "failed",
        at: yield* DateTime.now,
        reason: "exhausted",
      });
      assert.strictEqual(failed.attempts, maxAttempts);

      // Over: a job that woke again sends nothing more.
      assert.strictEqual(
        yield* attempt(delivery.id, maxAttempts + 1),
        "settled"
      );
      assert.lengthOf(yield* transport.sentTo(host), maxAttempts);
    })
  );

  it.effect(
    "turn the endpoint off once its attempts have failed for five days, and say so once",
    () =>
      Effect.gen(function* turnsOff() {
        const owner = yield* freshOwner;
        const endpoints = yield* WebhookEndpoints;
        const transport = yield* FakeTransport;
        const notices = yield* ToldNotices;
        const { endpoint, host } = yield* freshEndpoint(owner);
        const failingSince = yield* DateTime.now;

        yield* transport.next(
          host,
          answered(500),
          answered(500),
          answered(500)
        );

        const first = yield* pending(owner, endpoint.id);

        yield* attempt(first.id, 1);

        assert.deepStrictEqual(
          (yield* endpoints.get(owner, endpoint.id)).failingSince,
          Option.some(failingSince)
        );

        yield* TestClock.adjust("4 days");

        const second = yield* pending(owner, endpoint.id);

        yield* attempt(second.id, 1);

        // Four days in: still on, failing since the first failure.
        const stillOn = yield* endpoints.get(owner, endpoint.id);

        assert.deepStrictEqual(stillOn.status, { _tag: "enabled" });
        assert.deepStrictEqual(stillOn.failingSince, Option.some(failingSince));

        yield* TestClock.adjust("1 day");

        const third = yield* pending(owner, endpoint.id);
        const turnedOffAt = yield* DateTime.now;

        assert.strictEqual(yield* attempt(third.id, 1), "retry");

        const off = yield* endpoints.get(owner, endpoint.id);

        assert.deepStrictEqual(off.status, {
          _tag: "disabled",
          at: turnedOffAt,
          reason: "failing",
        });
        assert.deepStrictEqual(yield* notices.about(endpoint.id), [
          { at: turnedOffAt, endpointId: endpoint.id, reason: "failing" },
        ]);

        // What still waited fails without another request, and tells
        // nobody again.
        yield* TestClock.adjust("5 seconds");

        assert.strictEqual(yield* attempt(third.id, 2), "settled");
        assert.strictEqual(yield* attempt(first.id, 2), "settled");
        assert.deepStrictEqual((yield* stored(third.id)).status, {
          _tag: "failed",
          at: yield* DateTime.now,
          reason: "endpointDisabled",
        });
        assert.lengthOf(yield* transport.sentTo(host), 3);
        assert.lengthOf(yield* notices.about(endpoint.id), 1);

        // Turned back on, it gets its days again.
        const on = yield* endpoints.update(owner, endpoint.id, {
          enabled: true,
        });

        assert.deepStrictEqual(on.failingSince, Option.none());
      })
  );

  it.effect("forget an endpoint's failures once an attempt succeeds", () =>
    Effect.gen(function* recovers() {
      const owner = yield* freshOwner;
      const endpoints = yield* WebhookEndpoints;
      const transport = yield* FakeTransport;
      const notices = yield* ToldNotices;
      const { endpoint, host } = yield* freshEndpoint(owner);

      yield* transport.next(host, answered(500), answered(200), answered(500));

      yield* attempt((yield* pending(owner, endpoint.id)).id, 1);
      yield* TestClock.adjust("4 days");
      yield* attempt((yield* pending(owner, endpoint.id)).id, 1);

      assert.deepStrictEqual(
        (yield* endpoints.get(owner, endpoint.id)).failingSince,
        Option.none()
      );

      // Failing again two days later counts from then, not from before.
      yield* TestClock.adjust("2 days");

      const again = yield* DateTime.now;

      yield* attempt((yield* pending(owner, endpoint.id)).id, 1);

      const after = yield* endpoints.get(owner, endpoint.id);

      assert.deepStrictEqual(after.failingSince, Option.some(again));
      assert.deepStrictEqual(after.status, { _tag: "enabled" });
      assert.lengthOf(yield* notices.about(endpoint.id), 0);
    })
  );

  it.effect(
    "turn the endpoint off at once when its receiver answers 410 Gone",
    () =>
      Effect.gen(function* gone() {
        const owner = yield* freshOwner;
        const endpoints = yield* WebhookEndpoints;
        const transport = yield* FakeTransport;
        const notices = yield* ToldNotices;
        const { endpoint, host } = yield* freshEndpoint(owner);
        const delivery = yield* pending(owner, endpoint.id);
        const now = yield* DateTime.now;

        yield* transport.next(host, answered(410));

        assert.strictEqual(yield* attempt(delivery.id, 1), "settled");
        assert.deepStrictEqual((yield* stored(delivery.id)).status, {
          _tag: "failed",
          at: now,
          reason: "gone",
        });
        assert.deepStrictEqual(
          (yield* endpoints.get(owner, endpoint.id)).status,
          { _tag: "disabled", at: now, reason: "gone" }
        );
        assert.deepStrictEqual(yield* notices.about(endpoint.id), [
          { at: now, endpointId: endpoint.id, reason: "gone" },
        ]);
      })
  );

  it.effect("leave alone a delivery deleted with its endpoint", () =>
    Effect.gen(function* deleted() {
      const owner = yield* freshOwner;
      const endpoints = yield* WebhookEndpoints;
      const transport = yield* FakeTransport;
      const { endpoint, host } = yield* freshEndpoint(owner);
      const delivery = yield* pending(owner, endpoint.id);

      yield* endpoints.remove(owner, endpoint.id);

      assert.strictEqual(yield* attempt(delivery.id, 1), "settled");
      assert.lengthOf(yield* transport.sentTo(host), 0);
      assert.isTrue(
        Option.isNone(
          yield* DeliveryStore.use((store) => store.get(delivery.id))
        )
      );
    })
  );
});
