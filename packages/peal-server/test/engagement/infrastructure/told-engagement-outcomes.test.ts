import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Result, Schema } from "effect";

import { EngagementOutcomes } from "#engagement/application/ports/engagement-outcomes.ts";
import { settleReply, writeReply } from "#engagement/domain/reply.ts";
import type { SendOutcome } from "#engagement/domain/reply.ts";
import { ToldEngagementOutcomes } from "#engagement/infrastructure/told-engagement-outcomes.ts";
import type { NoticeRequest } from "#notifications/application/notify.ts";
import { Notify } from "#notifications/application/notify.ts";
import { RecipientsUnavailable } from "#notifications/application/recipients-unavailable.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import {
  comment,
  memberId,
  publishedAt,
  replyId,
  thread,
} from "#test/engagement/support.ts";
import { WebhookEvents } from "#webhooks/application/webhook-events.ts";
import type { EventToPublish } from "#webhooks/application/webhook-events.ts";
import { WebhookEventSchema } from "#webhooks/domain/webhook-event.ts";

// What the workspace is told of its comments: the events its endpoints get
// and the notice its members get, over ports that keep what they are
// handed. Comments are other people's words: nothing told may hold them.

const post = thread(50);

const secret = "A synthetic comment nobody outside the inbox may read.";

const commentOf = (n: number) =>
  comment(
    n,
    {
      author: Option.some({
        displayName: Option.some("Synthetic Reader"),
        handle: "synthetic.reader@social.example",
        platformId: "7001",
      }),
      text: secret,
    },
    post
  );

const first = commentOf(101);
const kept = [first, commentOf(102)];

interface Told {
  readonly events: EventToPublish[];
  readonly notices: NoticeRequest[];
}

const telling = <A, E>(
  test: (outcomes: EngagementOutcomes["Service"]) => Effect.Effect<A, E>,
  ports: {
    readonly notify?: Notify["Service"]["notify"];
    readonly publish?: WebhookEvents["Service"]["publish"];
  } = {}
) =>
  Effect.gen(function* run() {
    const told: Told = { events: [], notices: [] };

    const result = yield* EngagementOutcomes.use(test).pipe(
      Effect.provide(
        ToldEngagementOutcomes.pipe(
          Layer.provide(
            Layer.mergeAll(
              Layer.succeed(
                WebhookEvents,
                WebhookEvents.of({
                  publish:
                    ports.publish ??
                    ((request) =>
                      Effect.sync(() => {
                        told.events.push(request);
                      })),
                })
              ),
              Layer.succeed(
                Notify,
                Notify.of({
                  notify:
                    ports.notify ??
                    ((request) =>
                      Effect.sync(() => {
                        told.notices.push(request);
                      })),
                  resolve: () => Effect.void,
                })
              )
            )
          )
        )
      )
    );

    return { result, told };
  });

const replyWith = (outcome: SendOutcome) =>
  Result.getOrThrow(
    settleReply(
      writeReply(
        replyId(1),
        first,
        Option.some(memberId),
        "A synthetic reply.",
        publishedAt
      ),
      outcome,
      DateTime.addDuration(publishedAt, "20 minutes")
    )
  );

describe("what a workspace is told of its comments", () => {
  it.effect(
    "is one event a comment and one notice a thread and day, with ids and counts only",
    () =>
      Effect.gen(function* received() {
        const { told } = yield* telling((outcomes) =>
          outcomes.received(post, kept)
        );

        assert.deepStrictEqual(
          told.events.map(({ event, key }) => [event.type, key]),
          kept.map(({ id }) => ["comment.received", `comment:${id}:received`])
        );
        assert.deepStrictEqual(told.notices, [
          {
            author: memberId,
            event: {
              _tag: "CommentsReceived",
              count: 2,
              postId: post.postId,
              threadId: post.id,
            },
            key: `comments:${post.id}:2026-11-10`,
            workspaceId: post.workspaceId,
          },
        ]);

        // Neither what a comment says nor who wrote it leaves the inbox.
        const everything = JSON.stringify(told);

        for (const personal of [
          secret,
          "Synthetic Reader",
          "synthetic.reader",
          "7001",
        ]) {
          assert.notInclude(everything, personal);
        }

        // And each event is one the endpoints' contract knows.
        for (const { event } of told.events) {
          assert.isTrue(Schema.is(WebhookEventSchema)(event));
        }
      })
  );

  it.effect("tells nobody of a read that found nothing new", () =>
    Effect.gen(function* nothing() {
      const { told } = yield* telling((outcomes) =>
        outcomes.received(post, [])
      );

      assert.deepStrictEqual(told, { events: [], notices: [] });
    })
  );

  it.effect(
    "tells every member who answers comments when the post has no author",
    () =>
      Effect.gen(function* noAuthor() {
        const orphan = thread(51, { authorId: Option.none() });

        const { told } = yield* telling((outcomes) =>
          outcomes.received(orphan, kept)
        );

        assert.lengthOf(told.notices, 1);
        assert.notProperty(told.notices[0], "author");
      })
  );

  it.effect(
    "sends an event for a reply that went out, and none for one that failed or may have",
    () =>
      Effect.gen(function* replied() {
        const { told } = yield* telling((outcomes) =>
          Effect.all([
            outcomes.replied(
              post,
              replyWith({
                _tag: "sent",
                permalink: Option.some("https://social.example/@studio/3001"),
                platformCommentId: "3001",
              })
            ),
            outcomes.replied(
              post,
              replyWith({ _tag: "failed", reason: "rateLimited" })
            ),
            outcomes.replied(
              post,
              replyWith({ _tag: "unconfirmed", reason: "noResponse" })
            ),
          ])
        );

        assert.deepStrictEqual(told.events, [
          {
            event: {
              data: {
                channelId: post.channelId,
                commentId: first.id,
                permalink: "https://social.example/@studio/3001",
                postId: post.postId,
                repliedAt: DateTime.addDuration(publishedAt, "20 minutes"),
                replyId: replyId(1),
                threadId: post.id,
                workspaceId: post.workspaceId,
              },
              type: "comment.replied",
            },
            key: `reply:${replyId(1)}:sent`,
          },
        ]);
        assert.notInclude(JSON.stringify(told), "A synthetic reply.");
        assert.deepStrictEqual(told.notices, []);
      })
  );

  it.effect(
    "keeps the comments when the members cannot be listed, or telling breaks",
    () =>
      Effect.gen(function* survives() {
        const unlisted = yield* telling(
          (outcomes) => outcomes.received(post, kept),
          {
            notify: () =>
              Effect.fail(new RecipientsUnavailable({ cause: "down" })),
          }
        );

        // The endpoints were told; the notice waits for nobody.
        assert.lengthOf(unlisted.told.events, 2);

        // A bug in telling is logged, and never undoes the read.
        yield* telling((outcomes) => outcomes.received(post, kept), {
          publish: () => Effect.die(new Error("synthetic bug")),
        });
      })
  );

  it.effect("fails with the database, so the read is taken again", () =>
    Effect.gen(function* databaseDown() {
      const { result } = yield* telling(
        (outcomes) => Effect.result(outcomes.received(post, kept)),
        { publish: () => Effect.fail(new DatabaseError({ cause: "down" })) }
      );

      assert.isTrue(Result.isFailure(result));
    })
  );
});
