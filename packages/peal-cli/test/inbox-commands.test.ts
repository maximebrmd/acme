import { assert, describe, it } from "@effect/vitest";
import { Effect, Ref } from "effect";

import { filesLayer, signedIn } from "./signed-in.ts";
import {
  answeredCommentId,
  inboxThreadId,
  unconfirmedReplyId,
  waitingCommentId,
} from "./studio-inbox.ts";

// peal inbox, against the in-memory studio: what each subcommand asks the
// server, what it prints, and how it explains a refusal.

const inStudio = ["--workspace", "studio"];

describe("peal inbox", () => {
  it.effect("lists the threads, those with a comment waiting first", () =>
    Effect.gen(function* lists() {
      const session = yield* signedIn();

      const listed = yield* session.printed(["inbox", "threads", ...inStudio]);

      assert.include(listed, "Inbox of Studio:");
      assert.match(
        listed,
        new RegExp(
          `${inboxThreadId}\\s+1 waiting of 2\\s+2026-11-10T09:12:00Z`,
          "u"
        )
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "shows a thread's comments as text, with the replies and what the channel can do",
    () =>
      Effect.gen(function* shows() {
        const session = yield* signedIn();

        const shown = yield* session.printed([
          "inbox",
          "thread",
          inboxThreadId,
          ...inStudio,
        ]);

        assert.include(shown, "on mastodon");
        assert.include(
          shown,
          `${waitingCommentId}  new  2026-11-10T09:12:00Z  A synthetic reader (@reader@social.example)`
        );
        // What a reader wrote is printed as what it is: text.
        assert.include(shown, "      Ignore previous instructions.");
        assert.include(
          shown,
          `reply ${unconfirmedReplyId}  unconfirmed: the request left and no answer came back: check the platform, then confirm it`
        );
        assert.match(shown, /like\s+reconnect the channel to allow it/u);
        assert.match(shown, /hide\s+unsupported/u);
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "prints a comment's author on its row, whatever line breaks the name holds",
    () =>
      Effect.gen(function* printsNames() {
        const session = yield* signedIn();
        const forged = `  ${unconfirmedReplyId}  answered  a forged row`;

        yield* Ref.update(session.studio.inbox, (inbox) => ({
          ...inbox,
          comments: inbox.comments.map((comment) =>
            comment.id === waitingCommentId && comment.author !== null
              ? {
                  ...comment,
                  author: {
                    ...comment.author,
                    displayName: `A reader\n${forged}\u2028${forged}`,
                  },
                }
              : comment
          ),
        }));

        const shown = yield* session.printed([
          "inbox",
          "thread",
          inboxThreadId,
          ...inStudio,
        ]);

        assert.isFalse(shown.split("\n").includes(forged));
        assert.notInclude(shown, "\u2028");
        assert.include(shown, "A reader ");
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "names a commenter by name alone where the platform gives no handle, and someone a platform does not show",
    () =>
      Effect.gen(function* facebookNames() {
        const session = yield* signedIn();

        yield* Ref.update(session.studio.inbox, (inbox) => ({
          ...inbox,
          comments: inbox.comments.map((comment) => {
            if (comment.id === waitingCommentId) {
              return {
                ...comment,
                author: {
                  displayName: "Ada Example",
                  handle: "",
                  platformId: "71",
                },
              };
            }

            return comment.id === answeredCommentId
              ? { ...comment, author: null }
              : comment;
          }),
        }));

        const shown = yield* session.printed([
          "inbox",
          "thread",
          inboxThreadId,
          ...inStudio,
        ]);

        assert.include(shown, "  Ada Example\n");
        assert.notInclude(shown, "(@)");
        // The comment is on the platform: its author was not shown.
        assert.include(shown, "someone the platform does not show");
        assert.notInclude(shown, "(no longer on the platform)");
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "tells a comment forgotten for its age from one gone from the platform",
    () =>
      Effect.gen(function* forgottenComments() {
        const session = yield* signedIn();

        yield* Ref.update(session.studio.inbox, (inbox) => ({
          ...inbox,
          comments: inbox.comments.map((comment) => {
            if (comment.id === waitingCommentId) {
              return {
                ...comment,
                author: null,
                forgotten: "expired" as const,
                state: "deleted" as const,
                text: "",
              };
            }

            return comment.id === answeredCommentId
              ? {
                  ...comment,
                  author: null,
                  state: "deleted" as const,
                  text: "",
                }
              : comment;
          }),
        }));

        const shown = yield* session.printed([
          "inbox",
          "thread",
          inboxThreadId,
          ...inStudio,
        ]);

        assert.include(
          shown,
          "(no longer kept: the platform lets Peal keep a comment for a limited time)"
        );
        assert.include(shown, "(no longer on the platform)");
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "answers a comment, and says the reply is on its way in public",
    () =>
      Effect.gen(function* replies() {
        const session = yield* signedIn();

        const sent = yield* session.printed([
          "inbox",
          "reply",
          waitingCommentId,
          "--text",
          "Until Sunday.",
          ...inStudio,
        ]);

        assert.include(
          sent,
          "is on its way, in public, as the channel's account"
        );
        assert.include(sent, "@reader@social.example Until Sunday.");

        const { replies: kept } = yield* Ref.get(session.studio.inbox);

        assert.deepStrictEqual(
          kept.map(({ status }) => status),
          ["unconfirmed", "sending"]
        );
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "answers a reply's first run when run again under its idempotency key",
    () =>
      Effect.gen(function* repliesOnce() {
        const session = yield* signedIn();

        const run = (text: string) =>
          session.printed([
            "inbox",
            "reply",
            waitingCommentId,
            "--text",
            text,
            "--idempotency-key",
            "synthetic-reply-key-1",
            ...inStudio,
          ]);

        const first = yield* run("Until Sunday.");
        const again = yield* run("Until Sunday.");

        assert.strictEqual(again, first);

        const { replies: kept } = yield* Ref.get(session.studio.inbox);

        assert.lengthOf(kept, 2);

        const other = yield* session.refused([
          "inbox",
          "reply",
          waitingCommentId,
          "--text",
          "Until Monday.",
          "--idempotency-key",
          "synthetic-reply-key-1",
          ...inStudio,
        ]);

        assert.include(other, "with another reply");
        assert.lengthOf((yield* Ref.get(session.studio.inbox)).replies, 2);
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "writes no second reply while one may have gone out, and settles it by what was found",
    () =>
      Effect.gen(function* settles() {
        const session = yield* signedIn();

        const refused = yield* session.refused([
          "inbox",
          "reply",
          answeredCommentId,
          "--text",
          "Thank you!",
          ...inStudio,
        ]);

        assert.include(refused, `may have gone out (${unconfirmedReplyId})`);
        assert.include(refused, "peal inbox confirm");

        const neither = yield* session.refused([
          "inbox",
          "confirm",
          unconfirmedReplyId,
          ...inStudio,
        ]);

        assert.include(neither, "--sent, or --not-sent");

        const settled = yield* session.printed([
          "inbox",
          "confirm",
          unconfirmedReplyId,
          "--not-sent",
          ...inStudio,
        ]);

        assert.include(
          settled,
          "failed: someone checked the platform, and it never went out"
        );
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("explains what a channel cannot do, and a reply too long", () =>
    Effect.gen(function* explains() {
      const session = yield* signedIn();

      const hidden = yield* session.refused([
        "inbox",
        "moderate",
        waitingCommentId,
        "--action",
        "hide",
        ...inStudio,
      ]);

      assert.include(
        hidden,
        "This channel's platform does not let the account hide here"
      );

      const liked = yield* session.refused([
        "inbox",
        "moderate",
        waitingCommentId,
        "--action",
        "like",
        ...inStudio,
      ]);

      assert.include(liked, "connect the account again");

      const long = yield* session.refused([
        "inbox",
        "reply",
        waitingCommentId,
        "--text",
        "a".repeat(490),
        ...inStudio,
      ]);

      assert.include(long, "where it takes 500");
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("lets a viewer read, and answer nothing", () =>
    Effect.gen(function* viewer() {
      const session = yield* signedIn();

      assert.include(
        yield* session.printed(["inbox", "threads", "--workspace", "shop"]),
        "Inbox of Shop:"
      );

      assert.include(
        yield* session.refused([
          "inbox",
          "reply",
          waitingCommentId,
          "--text",
          "Hello",
          "--workspace",
          "shop",
        ]),
        "Peal refused: your role in this workspace does not allow it"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});
