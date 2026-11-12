import { assert, describe, it } from "@effect/vitest";
import { Effect, Ref } from "effect";

import { filesLayer, signedIn } from "./signed-in.ts";
import { mastodonId } from "./studio.ts";
import type { Studio } from "./studio.ts";

// peal short-links, and --shorten-links, against the in-memory studio.

const inStudio = ["--workspace", "studio"];

const postsOf = (studio: Studio) =>
  Ref.get(studio.state).pipe(Effect.map(({ posts }) => posts));

describe("peal short-links", () => {
  it.effect("says what the server offers and sets the default", () =>
    Effect.gen(function* status() {
      const session = yield* signedIn();

      assert.include(
        yield* session.printed(["short-links", "status", ...inStudio]),
        "This server shortens links under https://go.example.test/ (31 characters)"
      );
      assert.include(
        yield* session.printed([
          "short-links",
          "set-default",
          "on",
          ...inStudio,
        ]),
        "New posts ask for short links unless their author says not."
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("lists links with their clicks, and shows one by day", () =>
    Effect.gen(function* listed() {
      const session = yield* signedIn();

      const list = yield* session.printed(["short-links", "list", ...inStudio]);

      assert.include(list, "https://go.example.test/AbC1234");
      assert.include(list, "https://example.test/spring-catalogue");
      assert.include(list, "Counts are approximate");

      const shown = yield* session.printed([
        "short-links",
        "show",
        "0190f3a0-0000-7000-8000-0000000005a1",
        "--from",
        "2026-11-01",
        "--to",
        "2026-11-03",
        ...inStudio,
      ]);

      assert.include(shown, "5 clicks from 2026-11-01 to 2026-11-03 (UTC):");
      assert.match(shown, /2026-11-02\s+4/u);
      assert.notInclude(shown, "2026-11-01  0");

      assert.include(
        yield* session.refused([
          "short-links",
          "show",
          "0190f3a0-0000-7000-8000-0000000005ff",
          ...inStudio,
        ]),
        "The workspace has no short link with that id"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("asks for short links on a post and a draft with the flag", () =>
    Effect.gen(function* flagged() {
      const session = yield* signedIn();

      yield* session.printed([
        "post",
        "Read https://example.test/a/long/landing/page",
        "--channel",
        mastodonId,
        "--now",
        "--shorten-links",
        ...inStudio,
      ]);
      yield* session.printed([
        "drafts",
        "save",
        "--text",
        "A synthetic draft.",
        "--shorten-links",
        ...inStudio,
      ]);
      yield* session.printed([
        "drafts",
        "save",
        "--text",
        "Another synthetic draft.",
        ...inStudio,
      ]);

      const posts = yield* postsOf(session.studio);

      const asked = (text: string) =>
        posts.find(({ content }) => content.text === text)?.shortenLinks;

      assert.isTrue(asked("Read https://example.test/a/long/landing/page"));
      assert.isTrue(asked("A synthetic draft."));
      assert.isFalse(asked("Another synthetic draft."));
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});
