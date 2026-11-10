import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Ref } from "effect";

import { ReviewOutcomes } from "#review/application/ports/review-outcomes.ts";
import { ReviewLinkIdSchema } from "#review/domain/review-ids.ts";
import { webhookReviewOutcomes } from "#review/infrastructure/webhook-review-outcomes.ts";
import {
  PostIdSchema,
  UserIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import { WebhookEvents } from "#webhooks/application/webhook-events.ts";
import type { EventToPublish } from "#webhooks/application/webhook-events.ts";

const workspaceId = WorkspaceIdSchema.make(
  "3f1d2c4b-5a69-4788-9a0b-1c2d3e4f5a6b"
);

const postId = PostIdSchema.make("01900000-0000-7000-8000-0000000000a1");
const memberId = UserIdSchema.make("8d0f7780-8536-41ef-a55c-f18fd2a01bf8");
const scheduledAt = DateTime.makeUnsafe("2026-11-21T09:00:00Z");

const about = {
  authorId: Option.some(memberId),
  postId,
  requestedBy: Option.some(memberId),
  workspaceId,
};

// The outcomes as the review context tells them, over endpoints that keep
// what they are sent (or `publish`), and notices that keep what they are
// told.
const told = (
  test: (outcomes: ReviewOutcomes["Service"]) => Effect.Effect<void>,
  publish?: WebhookEvents["Service"]["publish"]
) =>
  Effect.gen(function* run() {
    const sent = yield* Ref.make<readonly EventToPublish[]>([]);
    const notices = yield* Ref.make<readonly string[]>([]);

    const notice =
      (kind: string) =>
      ({ key }: { readonly key: string }) =>
        Ref.update(notices, (before) => [...before, `${kind}:${key}`]);

    const outcomes = yield* ReviewOutcomes.pipe(
      Effect.provide(
        webhookReviewOutcomes(
          Layer.succeed(
            ReviewOutcomes,
            ReviewOutcomes.of({
              approvalRequested: notice("approvalRequested"),
              approved: notice("approved"),
              changesRequested: notice("changesRequested"),
              commented: notice("commented"),
              settled: (key) => notice("settled")({ key }),
            })
          )
        ).pipe(
          Layer.provide(
            Layer.succeed(
              WebhookEvents,
              WebhookEvents.of({
                publish:
                  publish ??
                  ((request) =>
                    Ref.update(sent, (before) => [...before, request])),
              })
            )
          )
        )
      )
    );

    yield* test(outcomes);

    return { notices: yield* Ref.get(notices), sent: yield* Ref.get(sent) };
  });

describe("a review's outcomes, for the workspace's webhook endpoints", () => {
  it.effect("say a post waits, with the time it was asked for", () =>
    Effect.gen(function* requested() {
      const { notices, sent } = yield* told((outcomes) =>
        outcomes
          .approvalRequested({ ...about, key: "approval:1", scheduledAt })
          .pipe(Effect.orDie)
      );

      assert.deepStrictEqual(sent, [
        {
          event: {
            data: { postId, scheduledAt, workspaceId },
            type: "post.approval_requested",
          },
          key: `review:approval:1:${String(scheduledAt.epochMilliseconds)}`,
        },
      ]);
      // Members are told as before.
      assert.deepStrictEqual(notices, ["approvalRequested:approval:1"]);
    })
  );

  it.effect("say it again when the post that waits is moved", () =>
    Effect.gen(function* moved() {
      const later = DateTime.makeUnsafe("2026-11-22T09:00:00Z");

      const { sent } = yield* told((outcomes) =>
        Effect.forEach(
          [scheduledAt, later],
          (at) =>
            outcomes.approvalRequested({
              ...about,
              key: "approval:1",
              scheduledAt: at,
            }),
          { discard: true }
        ).pipe(Effect.orDie)
      );

      // The same request, at two times: two events, each under its own
      // key, so the same time told twice is sent once.
      assert.deepStrictEqual(
        sent.map(({ event, key }) => [
          event.type,
          event.type === "post.approval_requested"
            ? event.data.scheduledAt
            : undefined,
          key,
        ]),
        [
          [
            "post.approval_requested",
            scheduledAt,
            `review:approval:1:${String(scheduledAt.epochMilliseconds)}`,
          ],
          [
            "post.approval_requested",
            later,
            `review:approval:1:${String(later.epochMilliseconds)}`,
          ],
        ]
      );
    })
  );

  it.effect(
    "say who decided by kind only, and whether an approval came late",
    () =>
      Effect.gen(function* decided() {
        const { notices, sent } = yield* told((outcomes) =>
          Effect.all([
            outcomes.approved({
              ...about,
              by: {
                _tag: "visitor",
                linkId: ReviewLinkIdSchema.make(
                  "01900000-0000-7000-8000-0000000000b1"
                ),
                name: Option.some("A synthetic client"),
              },
              key: "approval-decision:1",
              late: true,
            }),
            outcomes.changesRequested({
              ...about,
              by: { _tag: "apiKey" },
              key: "approval-decision:2",
            }),
          ]).pipe(Effect.orDie, Effect.asVoid)
        );

        assert.deepStrictEqual(sent, [
          {
            event: {
              data: { by: "visitor", late: true, postId, workspaceId },
              type: "post.approved",
            },
            key: "review:approval-decision:1",
          },
          {
            event: {
              data: { by: "application", postId, workspaceId },
              type: "post.changes_requested",
            },
            key: "review:approval-decision:2",
          },
        ]);
        // Never the name a visitor gave.
        assert.notInclude(JSON.stringify(sent), "A synthetic client");
        assert.lengthOf(notices, 2);
      })
  );

  it.effect("send nothing for a comment, nor for a request that stops", () =>
    Effect.gen(function* silent() {
      const { notices, sent } = yield* told((outcomes) =>
        Effect.all([
          outcomes.commented({
            ...about,
            by: { _tag: "apiKey" },
            key: "review-comment:1",
            participants: [],
          }),
          outcomes.settled("approval:1"),
        ]).pipe(Effect.orDie, Effect.asVoid)
      );

      assert.deepStrictEqual(sent, []);
      assert.deepStrictEqual(notices, [
        "commented:review-comment:1",
        "settled:approval:1",
      ]);
    })
  );

  it.effect("never undo a decision for a bug in telling the endpoints", () =>
    Effect.gen(function* buggy() {
      const { notices } = yield* told(
        (outcomes) =>
          outcomes
            .changesRequested({
              ...about,
              by: { _tag: "apiKey" },
              key: "approval-decision:3",
            })
            .pipe(Effect.orDie),
        () => Effect.die("A synthetic bug")
      );

      assert.deepStrictEqual(notices, ["changesRequested:approval-decision:3"]);
    })
  );
});
