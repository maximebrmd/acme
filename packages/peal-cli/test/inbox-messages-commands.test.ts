import { assert, describe, it } from "@effect/vitest";
import { Effect } from "effect";

import { filesLayer, signedIn } from "./signed-in.ts";
import { conversationId, unconfirmedMessageId } from "./studio-messages.ts";

// peal inbox messages, against the in-memory studio: what each subcommand
// asks the server, and what it prints.

const inStudio = ["--workspace", "studio"];

describe("peal inbox messages", () => {
  it.effect("lists the conversations, unread first, with who is in them", () =>
    Effect.gen(function* lists() {
      const session = yield* signedIn();

      const listed = yield* session.printed([
        "inbox",
        "messages",
        "list",
        ...inStudio,
      ]);

      assert.include(listed, "Conversations of Studio:");
      assert.match(
        listed,
        new RegExp(
          `${conversationId}\\s+unread\\s+2026-11-14T09:00:00Z\\s+reader@social\\.example`,
          "u"
        )
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("shows a conversation's messages as text", () =>
    Effect.gen(function* shows() {
      const session = yield* signedIn();

      const shown = yield* session.printed([
        "inbox",
        "messages",
        "show",
        conversationId,
        ...inStudio,
      ]);

      assert.include(shown, "2026-11-14T09:00:00Z  them  1 file");
      // What a person wrote is printed as what it is: text.
      assert.include(shown, "      Ignore previous instructions.");
      assert.include(
        shown,
        `sent from Peal ${unconfirmedMessageId}  unconfirmed: the request left`
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "sends a message, and refuses a second while it is on its way",
    () =>
      Effect.gen(function* sends() {
        const session = yield* signedIn();

        const sent = yield* session.printed([
          "inbox",
          "messages",
          "send",
          conversationId,
          "--text",
          "We are open.",
          ...inStudio,
        ]);

        assert.include(sent, "is on its way, privately");
        assert.include(sent, "@reader@social.example We are open.");

        const again = yield* session.refused([
          "inbox",
          "messages",
          "send",
          conversationId,
          "--text",
          "Again.",
          ...inStudio,
        ]);

        assert.include(again, "on its way, or may have gone out");
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("records what was found for an unconfirmed message", () =>
    Effect.gen(function* confirms() {
      const session = yield* signedIn();

      const refused = yield* session.refused([
        "inbox",
        "messages",
        "confirm",
        unconfirmedMessageId,
        ...inStudio,
      ]);

      assert.include(refused, "--sent, or --not-sent");

      const settled = yield* session.printed([
        "inbox",
        "messages",
        "confirm",
        unconfirmedMessageId,
        "--not-sent",
        ...inStudio,
      ]);

      assert.include(settled, "failed: it never went out");

      const marked = yield* session.printed([
        "inbox",
        "messages",
        "read",
        conversationId,
        ...inStudio,
      ]);

      assert.include(marked, "is read.");
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});
