import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";

import { ReviewOutcomes } from "#engagement/application/ports/review-outcomes.ts";
import { ToldReviewOutcomes } from "#engagement/infrastructure/told-review-outcomes.ts";
import { review, reviewThread } from "#test/engagement/support.ts";
import { WebhookEvents } from "#webhooks/application/webhook-events.ts";
import type { EventToPublish } from "#webhooks/application/webhook-events.ts";

// What a workspace's endpoints are told of its reviews: ids only. A
// review's stars and words are content Google gave, kept 29 days at most:
// an event, kept with its deliveries, may hold none of it.

describe("the reviews' webhook events", () => {
  it.effect(
    "tell of a new review by ids and when it was read, nothing more",
    () =>
      Effect.gen(function* tells() {
        const events: EventToPublish[] = [];

        const secret = "A synthetic review nobody outside the inbox may read.";

        const read = review(1, {
          rating: 1,
          reviewerName: Option.some("Synthetic Visitor"),
          text: secret,
        });

        yield* ReviewOutcomes.use((outcomes) =>
          outcomes.received(reviewThread(), [read])
        ).pipe(
          Effect.provide(
            ToldReviewOutcomes.pipe(
              Layer.provide(
                Layer.succeed(
                  WebhookEvents,
                  WebhookEvents.of({
                    publish: (request) =>
                      Effect.sync(() => {
                        events.push(request);
                      }),
                  })
                )
              )
            )
          )
        );

        const [told] = events;

        assert.deepStrictEqual(Object.keys(told?.event.data ?? {}).toSorted(), [
          "channelId",
          "receivedAt",
          "reviewId",
          "threadId",
          "workspaceId",
        ]);
        assert.notInclude(JSON.stringify(told), secret);
        assert.notInclude(JSON.stringify(told), "Synthetic Visitor");
      })
  );
});
