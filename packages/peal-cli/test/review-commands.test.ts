import { assert, describe, it } from "@effect/vitest";
import { Effect, Ref } from "effect";

import { filesLayer, signedIn } from "./signed-in.ts";
import { awaitingId, draftId, scheduledId } from "./studio.ts";
import type { Studio } from "./studio.ts";

// The commands for reviews and approvals, against the in-memory studio:
// what they ask the server, what they print, and how they explain a
// refusal.

const changes = (studio: Studio) =>
  Ref.get(studio.state).pipe(Effect.map(({ changes: made }) => made));

const inStudio = ["--workspace", "studio"];

describe("peal approvals", () => {
  it.effect("lists the posts that wait, and who asked", () =>
    Effect.gen(function* lists() {
      const session = yield* signedIn();
      const listed = yield* session.printed(["approvals", "list", ...inStudio]);

      assert.include(listed, "Posts of Studio waiting for an approval");
      assert.include(listed, awaitingId);
      assert.include(listed, "2026-11-21T09:00:00Z");
      assert.include(listed, "asked by Synthetic Contributor");
      assert.include(
        yield* session.printed(["approvals", "list", "--workspace", "shop"]),
        "No post of Shop waits for an approval."
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("approves a post that waits, once", () =>
    Effect.gen(function* approves() {
      const session = yield* signedIn();

      assert.include(
        yield* session.printed([
          "approvals",
          "approve",
          awaitingId,
          ...inStudio,
        ]),
        `Approved post ${awaitingId}: it is scheduled for 2026-11-21T09:00:00Z.`
      );
      assert.include(
        yield* session.refused([
          "approvals",
          "approve",
          awaitingId,
          ...inStudio,
        ]),
        "The post does not wait for an approval"
      );
      assert.include(
        yield* session.refused([
          "approvals",
          "approve",
          scheduledId,
          ...inStudio,
        ]),
        "The post does not wait for an approval"
      );
      assert.deepStrictEqual(yield* changes(session.studio), [
        `approve:${awaitingId}`,
      ]);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("sends a post back with the comment that says why", () =>
    Effect.gen(function* sendsBack() {
      const session = yield* signedIn();

      assert.include(
        yield* session.refused([
          "approvals",
          "request-changes",
          awaitingId,
          ...inStudio,
        ]),
        "comment"
      );
      assert.include(
        yield* session.printed([
          "approvals",
          "request-changes",
          awaitingId,
          "--comment",
          "Say Thursday, not Friday.",
          ...inStudio,
        ]),
        `Asked for changes to post ${awaitingId}: it is a draft again`
      );
      assert.deepStrictEqual(yield* changes(session.studio), [
        `requestChanges:${awaitingId}:Say Thursday, not Friday.`,
      ]);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("shows the workspace's policy, and changes it for who may", () =>
    Effect.gen(function* policy() {
      const session = yield* signedIn();

      assert.include(
        yield* session.printed(["approvals", "policy", ...inStudio]),
        "In Studio, posts by contributors and applications wait for an approval"
      );
      assert.include(
        yield* session.printed([
          "approvals",
          "policy",
          "--set",
          "always",
          ...inStudio,
        ]),
        "In Studio, every post waits for an approval"
      );
      assert.include(
        yield* session.refused([
          "approvals",
          "policy",
          "--set",
          "never",
          "--workspace",
          "shop",
        ]),
        "Peal refused: your role in this workspace does not allow it"
      );
      assert.deepStrictEqual(yield* changes(session.studio), ["policy:always"]);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});

describe("peal review", () => {
  it.effect("shows a post's comments and approvals, as plain text", () =>
    Effect.gen(function* shows() {
      const session = yield* signedIn();

      const shown = yield* session.printed([
        "review",
        "show",
        awaitingId,
        ...inStudio,
      ]);

      assert.include(shown, "Approvals, newest first:");
      assert.include(shown, "pending");
      assert.include(shown, "Comments:");
      assert.include(shown, "Ada Lovelace (reviewer)");
      assert.include(shown, "on “Friday”");
      // What a visitor typed never reaches the terminal as control codes.
      assert.include(shown, "Could this be \uFFFD[31mThursday?");
      assert.notInclude(shown, "\u001B");
      assert.include(
        yield* session.printed(["review", "show", draftId, ...inStudio]),
        "Nobody commented on this post yet"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("comments and answers", () =>
    Effect.gen(function* comments() {
      const session = yield* signedIn();

      const commented = yield* session.printed([
        "review",
        "comment",
        draftId,
        "--text",
        "A synthetic note.",
        ...inStudio,
      ]);

      const id = /Commented on post \S+: comment (?<id>\S+)\./u.exec(commented)
        ?.groups?.["id"];

      assert.isDefined(id);

      yield* session.printed([
        "review",
        "comment",
        draftId,
        "--text",
        "A synthetic answer.",
        "--reply-to",
        id ?? "",
        ...inStudio,
      ]);

      assert.deepStrictEqual(yield* changes(session.studio), [
        `comment:${draftId}:A synthetic note.`,
        `comment:${draftId}:A synthetic answer.:${id ?? ""}`,
      ]);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("makes a link, prints its address once, lists and revokes it", () =>
    Effect.gen(function* links() {
      const session = yield* signedIn();

      const made = yield* session.printed([
        "review",
        "link",
        draftId,
        "--access",
        "approve",
        "--hours",
        "48",
        ...inStudio,
      ]);

      assert.include(made, "https://peal.example.test/review#synthetic-token");
      assert.include(made, "lets whoever opens it approve");
      assert.include(made, "It is not shown again");

      const id = /Review link (?<id>\S+)/u.exec(made)?.groups?.["id"];

      const listed = yield* session.printed([
        "review",
        "links",
        draftId,
        ...inStudio,
      ]);

      assert.include(listed, id ?? "missing");
      assert.include(listed, "approve");
      assert.notInclude(listed, "synthetic-token");

      assert.include(
        yield* session.printed(["review", "revoke", id ?? "", ...inStudio]),
        "Revoked"
      );
      assert.include(
        yield* session.refused([
          "review",
          "revoke",
          "0190f3a0-0000-7000-8000-00000000ffff",
          ...inStudio,
        ]),
        "The workspace has no such review link"
      );
      assert.deepStrictEqual(yield* changes(session.studio), [
        `link:${draftId}:approve:48`,
        `revoke:${id ?? ""}`,
      ]);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});
