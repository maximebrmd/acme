import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Option, Result } from "effect";
import { TestClock } from "effect/testing";

import { EngagementInbox } from "#engagement/application/engagement-inbox.ts";
import { EngagementReplies } from "#engagement/application/engagement-replies.ts";
import { PurgeEngagement } from "#engagement/application/purge-engagement.ts";
import { SendReply } from "#engagement/application/send-reply.ts";
import { forgetComment, markAnswered } from "#engagement/domain/comment.ts";
import type { CommentReading } from "#engagement/domain/comment.ts";
import { beginSending } from "#engagement/domain/reply.ts";
import { endCollection } from "#engagement/domain/thread.ts";
import { Actor } from "#shared/domain/access.ts";
import type { Permission } from "#shared/domain/access.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { makeWorld } from "#test/engagement/fakes/world.ts";
import type { World } from "#test/engagement/fakes/world.ts";
import {
  channelId,
  comment,
  commentId,
  memberId,
  publishedAt,
  replyId,
  thread,
  workspaceId,
} from "#test/engagement/support.ts";

const actorWith = (
  permissions: readonly Permission[],
  workspace = workspaceId
) =>
  new Actor({
    permissions: [...permissions],
    subject: { _tag: "user", impersonatedBy: Option.none(), userId: memberId },
    workspaceId: workspace,
  });

const editor = actorWith(["engagement:read", "engagement:reply"]);
const viewer = actorWith(["engagement:read"]);

const mastodon = {
  platform: "mastodon" as const,
  scopes: ["read:statuses", "write:statuses", "write:favourites"],
};

// A world with one thread on a Mastodon channel, and comments 101, 102…
const worldWith = (
  comments: readonly Partial<CommentReading>[] = [{}]
): World => {
  const world = makeWorld();
  const post = thread(50);

  world.state.threads.set(post.id, post);
  world.state.channels.set(channelId(1), mastodon);

  for (const [index, changed] of comments.entries()) {
    const kept = comment(101 + index, changed, post);

    world.state.comments.set(kept.id, kept);
  }

  return world;
};

const now = DateTime.addDuration(publishedAt, "1 hour");

const at = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  TestClock.setTime(DateTime.toEpochMillis(now)).pipe(Effect.andThen(effect));

const replying = (text: string, actor = editor, to = commentId(101)) =>
  EngagementReplies.use((replies) => replies.reply(actor, to, text));

const sending = (id = replyId(1)) => SendReply.use((send) => send.run(id));

describe("answering a comment", () => {
  it.effect(
    "journals the reply with the start of its job, and sends nothing itself",
    () => {
      const world = worldWith();

      return at(
        Effect.gen(function* answering() {
          const reply = yield* replying("  Thank you!  ");

          assert.deepStrictEqual(reply.status, {
            _tag: "sending",
            attemptedAt: Option.none(),
          });
          assert.deepStrictEqual(reply.authorId, Option.some(memberId));
          assert.deepStrictEqual(world.state.jobs, [reply.id]);
          assert.lengthOf(world.state.sent, 0);
          assert.strictEqual(
            world.state.replies.get(reply.id)?.text,
            reply.text
          );
        })
      ).pipe(Effect.provide(world.layer));
    }
  );

  it.effect(
    "mentions the comment's author first on Mastodon, unless the member did",
    () => {
      const world = worldWith();

      return at(
        Effect.gen(function* answering() {
          const reply = yield* replying("Thank you!");

          assert.strictEqual(
            reply.text,
            "@reader101@social.example Thank you!"
          );
        })
      ).pipe(Effect.provide(world.layer));
    }
  );

  it.effect("writes the text as it is on Bluesky", () => {
    const world = worldWith();

    world.state.channels.set(channelId(1), {
      platform: "bluesky",
      scopes: [
        "atproto",
        "repo:app.bsky.feed.post?action=create&action=delete",
      ],
    });

    return at(
      Effect.gen(function* answering() {
        assert.strictEqual((yield* replying("Thank you!")).text, "Thank you!");
      })
    ).pipe(Effect.provide(world.layer));
  });

  it.effect("needs the permission to answer", () => {
    const world = worldWith();

    return at(
      Effect.gen(function* answering() {
        const refused = yield* replying("Hello", viewer).pipe(Effect.flip);

        assert.strictEqual(refused._tag, "MissingPermission");
        assert.lengthOf(world.state.jobs, 0);
      })
    ).pipe(Effect.provide(world.layer));
  });

  it.effect("finds no comment of another workspace", () => {
    const world = worldWith();

    const stranger = actorWith(
      ["engagement:read", "engagement:reply"],
      WorkspaceIdSchema.make("33333333-3333-4333-8333-333333333333")
    );

    return at(
      Effect.gen(function* answering() {
        const refused = yield* replying("Hello", stranger).pipe(Effect.flip);

        assert.strictEqual(refused._tag, "CommentNotFound");
      })
    ).pipe(Effect.provide(world.layer));
  });

  it.effect(
    "refuses a reply that says nothing, or more than the platform takes, before journalling it",
    () => {
      const world = worldWith();

      return at(
        Effect.gen(function* answering() {
          const empty = yield* replying("   ").pipe(Effect.flip);
          const long = yield* replying("a".repeat(480)).pipe(Effect.flip);

          assert.strictEqual(empty._tag, "ReplyEmpty");
          // 480 characters and the mention pass Mastodon's 500.
          assert.deepStrictEqual(
            long._tag === "ReplyTooLong" ? long.maximum : long._tag,
            500
          );
          assert.strictEqual(world.state.replies.size, 0);
          assert.lengthOf(world.state.jobs, 0);
        })
      ).pipe(Effect.provide(world.layer));
    }
  );

  it.effect(
    "refuses on a channel that cannot answer: gone, or its platform unread",
    () => {
      const world = worldWith();

      world.state.channels.set(channelId(1), { platform: "x", scopes: [] });

      return at(
        Effect.gen(function* answering() {
          const unsupported = yield* replying("Hello").pipe(Effect.flip);

          world.state.channels.delete(channelId(1));

          const gone = yield* replying("Hello").pipe(Effect.flip);

          assert.deepStrictEqual(
            [unsupported, gone].map((refused) =>
              refused._tag === "AbilityUnavailable"
                ? refused.standing
                : refused._tag
            ),
            ["unsupported", "reconnect"]
          );
        })
      ).pipe(Effect.provide(world.layer));
    }
  );

  it.effect("refuses a comment its platform no longer shows", () => {
    const world = worldWith();

    return at(
      Effect.gen(function* answering() {
        const kept = world.state.comments.get(commentId(101));

        assert.isDefined(kept);
        world.state.comments.set(kept.id, forgetComment(kept));

        const refused = yield* replying("Hello").pipe(Effect.flip);

        assert.strictEqual(refused._tag, "CommentGone");
      })
    ).pipe(Effect.provide(world.layer));
  });

  it.effect(
    "writes no second reply to a comment while one is on its way or unconfirmed",
    () => {
      const world = worldWith();

      world.state.sending = { _tag: "unconfirmed", reason: "noResponse" };

      return at(
        Effect.gen(function* answering() {
          const first = yield* replying("Thank you!");
          const second = yield* replying("Thank you!").pipe(Effect.flip);

          assert.strictEqual(second._tag, "ReplyPending");

          yield* sending(first.id);

          const third = yield* replying("Thank you!").pipe(Effect.flip);

          assert.strictEqual(third._tag, "ReplyPending");
          assert.lengthOf(world.state.sent, 1);
        })
      ).pipe(Effect.provide(world.layer));
    }
  );
});

describe("sending a reply", () => {
  it.effect(
    "records the attempt before the call, then the outcome, the answer and the telling",
    () => {
      const world = worldWith();

      return at(
        Effect.gen(function* answering() {
          const reply = yield* replying("Thank you!");

          // What the platform's adapter finds in the journal when called.
          world.state.sending = {
            _tag: "sent",
            permalink: Option.none(),
            platformCommentId: "3001",
          };

          const result = yield* sending(reply.id);
          const settled = world.state.replies.get(reply.id);

          assert.strictEqual(result, "settled");
          assert.deepStrictEqual(settled?.status, {
            _tag: "sent",
            at: now,
            permalink: Option.none(),
            platformCommentId: Option.some("3001"),
          });
          assert.strictEqual(
            world.state.comments.get(commentId(101))?.state,
            "answered"
          );
          assert.deepStrictEqual(
            world.state.replied.map(({ status }) => status._tag),
            ["sent"]
          );
        })
      ).pipe(Effect.provide(world.layer));
    }
  );

  it.effect(
    "never sends twice: a run that finds the attempt recorded looks the reply up",
    () => {
      const world = worldWith();

      return at(
        Effect.gen(function* answering() {
          const reply = yield* replying("Thank you!");

          // The server stopped after recording the attempt.
          world.state.replies.set(
            reply.id,
            Result.getOrThrow(beginSending(reply, now))
          );

          yield* sending(reply.id);

          assert.lengthOf(world.state.sent, 0);
          assert.lengthOf(world.state.resumed, 1);
          assert.deepStrictEqual(world.state.replies.get(reply.id)?.status, {
            _tag: "unconfirmed",
            at: now,
            reason: "interrupted",
          });
          // It may be out: the comment counts as answered until a member says.
          assert.strictEqual(
            world.state.comments.get(commentId(101))?.state,
            "answered"
          );
        })
      ).pipe(Effect.provide(world.layer));
    }
  );

  it.effect("leaves the comment waiting when nothing went out", () => {
    const world = worldWith();

    world.state.sending = { _tag: "failed", reason: "rateLimited" };

    return at(
      Effect.gen(function* answering() {
        const reply = yield* replying("Thank you!");

        yield* sending(reply.id);

        assert.deepStrictEqual(world.state.replies.get(reply.id)?.status, {
          _tag: "failed",
          at: now,
          reason: "rateLimited",
        });
        assert.strictEqual(
          world.state.comments.get(commentId(101))?.state,
          "new"
        );

        // A failed reply is over: another may be written.
        assert.strictEqual(
          (yield* replying("Thank you!")).status._tag,
          "sending"
        );
      })
    ).pipe(Effect.provide(world.layer));
  });

  it.effect(
    "hands a reply still on its way an hour later to a person, and never sends it",
    () => {
      const world = worldWith([{}, {}]);

      return at(
        Effect.gen(function* stranded() {
          // Two replies journalled; the job of each was lost before it
          // settled, one after its call set out.
          const never = yield* replying("Thank you!");
          const begun = yield* replying("And you!", editor, commentId(102));

          world.state.replies.set(
            begun.id,
            Result.getOrThrow(beginSending(begun, now))
          );

          const send = yield* SendReply;

          // Within the hour a job may still be waiting its turn.
          yield* TestClock.adjust("59 minutes");
          assert.strictEqual(yield* send.settleStranded, 0);
          assert.strictEqual(
            world.state.replies.get(never.id)?.status._tag,
            "sending"
          );

          yield* TestClock.adjust("2 minutes");
          assert.strictEqual(yield* send.settleStranded, 2);

          const later = DateTime.addDuration(now, "61 minutes");

          for (const id of [never.id, begun.id]) {
            assert.deepStrictEqual(world.state.replies.get(id)?.status, {
              _tag: "unconfirmed",
              at: later,
              reason: "interrupted",
            });
          }

          // Nothing was sent, or looked up, on anyone's behalf.
          assert.lengthOf(world.state.sent, 0);
          assert.lengthOf(world.state.resumed, 0);

          // A person says what they found: the comment waits again, and
          // can be answered.
          const replies = yield* EngagementReplies;

          yield* replies.confirm(editor, never.id, false);

          assert.strictEqual(
            world.state.comments.get(commentId(101))?.state,
            "new"
          );
          assert.strictEqual(
            (yield* replying("Thank you, again!")).status._tag,
            "sending"
          );

          // Settled once: the next run finds none left.
          assert.strictEqual(yield* send.settleStranded, 0);
        })
      ).pipe(Effect.provide(world.layer));
    }
  );

  it.effect(
    "does nothing for a reply already settled, or gone with its workspace",
    () => {
      const world = worldWith();

      return at(
        Effect.gen(function* answering() {
          const reply = yield* replying("Thank you!");

          yield* sending(reply.id);

          assert.strictEqual(yield* sending(reply.id), "superseded");
          assert.strictEqual(yield* sending(replyId(999)), "superseded");
          assert.lengthOf(world.state.sent, 1);
        })
      ).pipe(Effect.provide(world.layer));
    }
  );
});

describe("settling and taking back a reply", () => {
  it.effect("records what a member found for an unconfirmed reply", () => {
    const world = worldWith([{}, {}]);

    world.state.sending = { _tag: "unconfirmed", reason: "noResponse" };

    return at(
      Effect.gen(function* answering() {
        const first = yield* replying("One");
        const second = yield* replying("Two", editor, commentId(102));

        yield* sending(first.id);
        yield* sending(second.id);

        const found = yield* EngagementReplies.use((replies) =>
          replies.confirm(editor, first.id, true)
        );

        const absent = yield* EngagementReplies.use((replies) =>
          replies.confirm(editor, second.id, false)
        );

        assert.strictEqual(found.status._tag, "sent");
        assert.deepStrictEqual(absent.status, {
          _tag: "failed",
          at: now,
          reason: "notSent",
        });
        assert.strictEqual(
          world.state.comments.get(commentId(101))?.state,
          "answered"
        );
        assert.strictEqual(
          world.state.comments.get(commentId(102))?.state,
          "new"
        );

        const again = yield* EngagementReplies.use((replies) =>
          replies.confirm(editor, first.id, true)
        ).pipe(Effect.flip);

        assert.strictEqual(again._tag, "InvalidReplyTransition");
      })
    ).pipe(Effect.provide(world.layer));
  });

  it.effect(
    "deletes a sent reply from its platform, and only a sent one",
    () => {
      const world = worldWith();

      return at(
        Effect.gen(function* answering() {
          const reply = yield* replying("Thank you!");

          const early = yield* EngagementReplies.use((replies) =>
            replies.withdraw(editor, reply.id)
          ).pipe(Effect.flip);

          assert.strictEqual(early._tag, "InvalidReplyTransition");
          assert.lengthOf(world.state.withdrawn, 0);

          yield* sending(reply.id);

          const withdrawn = yield* EngagementReplies.use((replies) =>
            replies.withdraw(editor, reply.id)
          );

          assert.deepStrictEqual(withdrawn.status, {
            _tag: "withdrawn",
            at: now,
          });
          assert.lengthOf(world.state.withdrawn, 1);
        })
      ).pipe(Effect.provide(world.layer));
    }
  );

  it.effect(
    "keeps the reply as it was when the platform did not delete it",
    () => {
      const world = worldWith();

      return at(
        Effect.gen(function* answering() {
          const reply = yield* replying("Thank you!");

          yield* sending(reply.id);

          world.state.moderation = {
            _tag: "failed",
            reason: "platformUnavailable",
          };

          const refused = yield* EngagementReplies.use((replies) =>
            replies.withdraw(editor, reply.id)
          ).pipe(Effect.flip);

          assert.strictEqual(refused._tag, "ModerationFailed");
          assert.strictEqual(
            world.state.replies.get(reply.id)?.status._tag,
            "sent"
          );
        })
      ).pipe(Effect.provide(world.layer));
    }
  );
});

describe("moderating a comment", () => {
  it.effect("likes on a channel that allowed it, and records it", () => {
    const world = worldWith();

    return at(
      Effect.gen(function* moderating() {
        const liked = yield* EngagementReplies.use((replies) =>
          replies.moderate(editor, commentId(101), "like")
        );

        assert.isTrue(liked.liked);
        assert.deepStrictEqual(world.state.moderated, [
          {
            action: "like",
            channelId: channelId(1),
            commentId: commentId(101),
          },
        ]);
        assert.isTrue(world.state.comments.get(commentId(101))?.liked);
      })
    ).pipe(Effect.provide(world.layer));
  });

  it.effect("asks the platform nothing it does not offer the account", () => {
    const world = worldWith();

    return at(
      Effect.gen(function* moderating() {
        const hide = yield* EngagementReplies.use((replies) =>
          replies.moderate(editor, commentId(101), "hide")
        ).pipe(Effect.flip);

        const remove = yield* EngagementReplies.use((replies) =>
          replies.moderate(editor, commentId(101), "delete")
        ).pipe(Effect.flip);

        assert.deepStrictEqual(
          [hide, remove].map((refused) =>
            refused._tag === "AbilityUnavailable"
              ? [refused.ability, refused.standing]
              : refused._tag
          ),
          [
            ["hide", "unsupported"],
            ["delete", "unsupported"],
          ]
        );
        assert.lengthOf(world.state.moderated, 0);
      })
    ).pipe(Effect.provide(world.layer));
  });

  it.effect(
    "says when the account must be connected again to answer, and that a like is not offered",
    () => {
      const world = worldWith();

      // Connected before Peal asked to post statuses.
      world.state.channels.set(channelId(1), {
        platform: "mastodon",
        scopes: ["read:statuses"],
      });

      return at(
        Effect.gen(function* moderating() {
          const reply = yield* replying("Thank you!").pipe(Effect.flip);

          const like = yield* EngagementReplies.use((replies) =>
            replies.moderate(editor, commentId(101), "like")
          ).pipe(Effect.flip);

          assert.deepStrictEqual(
            [reply, like].map((refused) =>
              refused._tag === "AbilityUnavailable" ? refused.standing : ""
            ),
            // The sign-in does not ask for likes: reconnecting changes nothing.
            ["reconnect", "unsupported"]
          );
        })
      ).pipe(Effect.provide(world.layer));
    }
  );

  it.effect("changes nothing in Peal when the platform refused", () => {
    const world = worldWith();

    world.state.moderation = { _tag: "failed", reason: "rateLimited" };

    return at(
      Effect.gen(function* moderating() {
        const refused = yield* EngagementReplies.use((replies) =>
          replies.moderate(editor, commentId(101), "like")
        ).pipe(Effect.flip);

        assert.strictEqual(refused._tag, "ModerationFailed");
        assert.isFalse(world.state.comments.get(commentId(101))?.liked);
      })
    ).pipe(Effect.provide(world.layer));
  });

  it.effect(
    "lets a member say a comment needs no answer, and take that back",
    () => {
      const world = worldWith();

      return at(
        Effect.gen(function* moderating() {
          const answered = yield* EngagementReplies.use((replies) =>
            replies.setAnswered(editor, commentId(101), true)
          );

          const reopened = yield* EngagementReplies.use((replies) =>
            replies.setAnswered(editor, commentId(101), false)
          );

          const refused = yield* EngagementReplies.use((replies) =>
            replies.setAnswered(viewer, commentId(101), true)
          ).pipe(Effect.flip);

          assert.strictEqual(answered.state, "answered");
          assert.strictEqual(reopened.state, "new");
          assert.strictEqual(refused._tag, "MissingPermission");
          assert.lengthOf(world.state.moderated, 0);
        })
      ).pipe(Effect.provide(world.layer));
    }
  );
});

describe("reading the inbox", () => {
  it.effect(
    "lists the threads that have comments, those waiting for an answer first",
    () => {
      const world = worldWith();
      const quiet = thread(51);
      const answered = thread(52);

      world.state.threads.set(quiet.id, quiet);
      world.state.threads.set(answered.id, answered);

      const kept = comment(
        201,
        { writtenAt: DateTime.addDuration(publishedAt, "3 hours") },
        answered
      );

      world.state.comments.set(kept.id, markAnswered(kept, publishedAt));

      const filter = {
        channelId: Option.none(),
        postId: Option.none(),
        unanswered: false,
      };

      return Effect.gen(function* reading() {
        const page = yield* EngagementInbox.use((inbox) =>
          inbox.threads(viewer, filter, { after: Option.none(), limit: 1 })
        );

        assert.deepStrictEqual(
          page.threads.map(({ thread: listed, unanswered }) => [
            listed.id,
            unanswered,
          ]),
          [[thread(50).id, 1]]
        );
        assert.isTrue(Option.isSome(page.next));

        const rest = yield* EngagementInbox.use((inbox) =>
          inbox.threads(viewer, filter, { after: page.next, limit: 10 })
        );

        assert.deepStrictEqual(
          rest.threads.map(({ thread: listed }) => listed.id),
          [answered.id]
        );
        assert.isTrue(Option.isNone(rest.next));

        const waiting = yield* EngagementInbox.use((inbox) =>
          inbox.threads(
            viewer,
            { ...filter, unanswered: true },
            { after: Option.none(), limit: 10 }
          )
        );

        assert.lengthOf(waiting.threads, 1);
      }).pipe(Effect.provide(world.layer));
    }
  );

  it.effect("shows a thread whole, with what its channel can do", () => {
    const world = worldWith([{}, {}]);

    return at(
      Effect.gen(function* reading() {
        const reply = yield* replying("Thank you!");

        const detail = yield* EngagementInbox.use((inbox) =>
          inbox.thread(viewer, thread(50).id)
        );

        assert.lengthOf(detail.comments, 2);
        assert.deepStrictEqual(
          detail.replies.map(({ id }) => id),
          [reply.id]
        );
        assert.strictEqual(detail.abilities.reply, "available");
        assert.strictEqual(detail.abilities.hide, "unsupported");
        assert.deepStrictEqual(detail.platform, Option.some("mastodon"));
      })
    ).pipe(Effect.provide(world.layer));
  });

  it.effect(
    "needs the permission to read, in the thread's own workspace",
    () => {
      const world = worldWith();

      return Effect.gen(function* reading() {
        const refused = yield* EngagementInbox.use((inbox) =>
          inbox.thread(actorWith(["post:read"]), thread(50).id)
        ).pipe(Effect.flip);

        const elsewhere = yield* EngagementInbox.use((inbox) =>
          inbox.thread(
            actorWith(
              ["engagement:read"],
              WorkspaceIdSchema.make("33333333-3333-4333-8333-333333333333")
            ),
            thread(50).id
          )
        ).pipe(Effect.flip);

        assert.strictEqual(refused._tag, "MissingPermission");
        assert.strictEqual(elsewhere._tag, "ThreadNotFound");
      }).pipe(Effect.provide(world.layer));
    }
  );
});

describe("the retention of comments", () => {
  it.effect(
    "deletes a thread, its comments and its replies 30 days after its collection ended",
    () => {
      const world = worldWith();
      const ended = endCollection(thread(50), "window", now);

      world.state.threads.set(ended.id, ended);

      const purgingAt = (duration: "29 days" | "30 days") =>
        TestClock.setTime(
          DateTime.toEpochMillis(DateTime.addDuration(now, duration))
        ).pipe(Effect.andThen(PurgeEngagement.use((purging) => purging.purge)));

      return Effect.gen(function* expiring() {
        assert.strictEqual(yield* purgingAt("29 days"), 0);
        assert.strictEqual(world.state.comments.size, 1);

        assert.strictEqual(yield* purgingAt("30 days"), 1);
        assert.strictEqual(world.state.threads.size, 0);
        assert.strictEqual(world.state.comments.size, 0);
      }).pipe(Effect.provide(world.layer));
    }
  );

  it.effect("keeps every thread still read", () => {
    const world = worldWith();

    return Effect.gen(function* keeping() {
      yield* TestClock.setTime(
        DateTime.toEpochMillis(DateTime.addDuration(now, "400 days"))
      );

      assert.strictEqual(
        yield* PurgeEngagement.use((purging) => purging.purge),
        0
      );
    }).pipe(Effect.provide(world.layer));
  });
});
