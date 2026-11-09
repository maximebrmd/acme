import { describe, expect, it } from "@effect/vitest";
import { DateTime, Duration, Option, Result } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { AttemptOutcome } from "#webhooks/domain/delivery-attempt.ts";
import {
  maxAttempts,
  retryDelayAfter,
  retryDelays,
} from "#webhooks/domain/delivery-policy.ts";
import { WebhookDeliveryIdSchema } from "#webhooks/domain/webhook-delivery-id.ts";
import {
  abandonDelivery,
  createDelivery,
  recordAttempt,
} from "#webhooks/domain/webhook-delivery.ts";
import { WebhookEndpointIdSchema } from "#webhooks/domain/webhook-endpoint-id.ts";
import { createEndpoint } from "#webhooks/domain/webhook-endpoint.ts";
import { WebhookEventIdSchema } from "#webhooks/domain/webhook-event-id.ts";
import { parseWebhookUrl } from "#webhooks/domain/webhook-url.ts";

const now = DateTime.makeUnsafe("2026-11-10T09:00:00Z");

const endpoint = createEndpoint(
  WebhookEndpointIdSchema.make("00000000-0000-7000-8000-000000000001"),
  WorkspaceIdSchema.make("11111111-1111-4111-8111-111111111111"),
  {
    description: "",
    enabled: true,
    eventTypes: ["post.published"],
    url: Result.getOrThrow(parseWebhookUrl("https://hooks.example.com/peal")),
  },
  now
);

const delivery = createDelivery(
  WebhookDeliveryIdSchema.make("00000000-0000-7000-8000-000000000003"),
  endpoint,
  {
    id: WebhookEventIdSchema.make("00000000-0000-7000-8000-000000000002"),
    type: "post.published",
  },
  now
);

const attempt = (outcome: AttemptOutcome) => ({
  at: now,
  durationMs: 120,
  outcome,
});

const answered = (status: number): AttemptOutcome => ({
  _tag: "answered",
  excerpt: Option.none(),
  status,
});

describe("the retry schedule", () => {
  it("spreads eight attempts over about a day", () => {
    let total = Duration.zero;

    for (const delay of retryDelays) {
      total = Duration.sum(total, delay);
    }

    expect(maxAttempts).toBe(8);
    expect(Duration.toHours(total)).toBeGreaterThan(22);
    expect(Duration.toHours(total)).toBeLessThan(26);
  });

  it("waits longer after each attempt, and not at all after the last", () => {
    expect(retryDelayAfter(1)).toStrictEqual(Option.some(Duration.seconds(5)));
    expect(retryDelayAfter(7)).toStrictEqual(Option.some(Duration.hours(8)));
    expect(retryDelayAfter(maxAttempts)).toStrictEqual(Option.none());
  });
});

describe(recordAttempt, () => {
  it.each([200, 201, 204, 299])("takes a %d answer as delivered", (status) => {
    const recorded = Result.getOrThrow(
      recordAttempt(delivery, 1, attempt(answered(status)), retryDelayAfter(1))
    );

    expect(recorded.status).toStrictEqual({ _tag: "succeeded", at: now });
    expect(recorded.attempts).toBe(1);
    expect(recorded.lastAttempt).toStrictEqual(
      Option.some(attempt(answered(status)))
    );
  });

  it.each([
    answered(301),
    answered(404),
    answered(500),
    { _tag: "unanswered", reason: "timeout" } as const,
    { _tag: "unanswered", reason: "refused" } as const,
  ])("tries again after %j", (outcome) => {
    const recorded = Result.getOrThrow(
      recordAttempt(delivery, 1, attempt(outcome), retryDelayAfter(1))
    );

    expect(recorded.status).toStrictEqual({
      _tag: "pending",
      nextAttemptAt: Option.some(DateTime.addDuration(now, "5 seconds")),
    });
  });

  it("fails for good once no attempt is left", () => {
    const recorded = Result.getOrThrow(
      recordAttempt(
        delivery,
        maxAttempts,
        attempt(answered(503)),
        retryDelayAfter(maxAttempts)
      )
    );

    expect(recorded.status).toStrictEqual({
      _tag: "failed",
      at: now,
      reason: "exhausted",
    });
    expect(recorded.attempts).toBe(maxAttempts);
  });

  it("stops at once when the receiver answers 410 Gone", () => {
    const recorded = Result.getOrThrow(
      recordAttempt(delivery, 1, attempt(answered(410)), retryDelayAfter(1))
    );

    expect(recorded.status).toStrictEqual({
      _tag: "failed",
      at: now,
      reason: "gone",
    });
  });

  it("counts an attempt recorded twice once", () => {
    const once = Result.getOrThrow(
      recordAttempt(delivery, 1, attempt(answered(500)), retryDelayAfter(1))
    );

    const twice = Result.getOrThrow(
      recordAttempt(once, 1, attempt(answered(500)), retryDelayAfter(1))
    );

    expect(twice.attempts).toBe(1);
  });

  it("leaves a delivery that is over as it ended", () => {
    const delivered = Result.getOrThrow(
      recordAttempt(delivery, 1, attempt(answered(200)), retryDelayAfter(1))
    );

    expect(
      Result.isFailure(
        recordAttempt(delivered, 2, attempt(answered(500)), retryDelayAfter(2))
      )
    ).toBeTruthy();
    expect(
      Result.isFailure(abandonDelivery(delivered, "endpointDisabled", now))
    ).toBeTruthy();
  });
});

describe(abandonDelivery, () => {
  it("fails a pending delivery without counting an attempt", () => {
    const abandoned = Result.getOrThrow(
      abandonDelivery(delivery, "endpointDisabled", now)
    );

    expect(abandoned.status).toStrictEqual({
      _tag: "failed",
      at: now,
      reason: "endpointDisabled",
    });
    expect(abandoned.attempts).toBe(0);
  });
});
