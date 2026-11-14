import { assert, describe, it } from "@effect/vitest";
import { Effect, Ref } from "effect";

import { filesLayer, signedIn } from "./signed-in.ts";
import {
  failedArticleId,
  publishedArticleId,
  siteChannelId,
} from "./studio-articles.ts";

const inStudio = ["--workspace", "studio"];

describe("peal articles", () => {
  it.effect("lists the articles with where each stands", () =>
    Effect.gen(function* lists() {
      const session = yield* signedIn();

      const printed = yield* session.printed(["articles", "list", ...inStudio]);

      assert.include(printed, publishedArticleId);
      assert.include(
        printed,
        "on the site at https://garden.example/2026/11/spring-sowing/"
      );
      assert.include(printed, "failed (contentRejected, rest_cannot_create)");
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("writes an article from plain text, its paragraphs kept", () =>
    Effect.gen(function* writes() {
      const session = yield* signedIn();

      const printed = yield* session.printed([
        "articles",
        "create",
        "--channel",
        siteChannelId,
        "--title",
        "Winter mulch",
        "--text",
        "First paragraph.\n\nSecond one,\non two lines.",
        "--tag",
        "mulch",
        ...inStudio,
      ]);

      assert.include(printed, "draft");

      const { articles } = yield* Ref.get(session.studio.articles);
      const made = articles.find(({ title }) => title === "Winter mulch");

      assert.deepStrictEqual(made?.tags, ["mulch"]);
      assert.deepStrictEqual(made?.body, {
        content: [
          {
            content: [{ text: "First paragraph.", type: "text" }],
            type: "paragraph",
          },
          {
            content: [
              { text: "Second one,", type: "text" },
              { type: "hardBreak" },
              { text: "on two lines.", type: "text" },
            ],
            type: "paragraph",
          },
        ],
        type: "doc",
      });
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("sends a failed article again", () =>
    Effect.gen(function* retries() {
      const session = yield* signedIn();

      const printed = yield* session.printed([
        "articles",
        "retry",
        failedArticleId,
        ...inStudio,
      ]);

      assert.include(printed, "scheduled for");

      const { changes } = yield* Ref.get(session.studio.articles);

      assert.include(changes, `article:retry:${failedArticleId}`);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("unpublishes only once agreed, and never asks with --json", () =>
    Effect.gen(function* unpublishes() {
      const session = yield* signedIn();

      const refused = yield* session.refused([
        "articles",
        "unpublish",
        publishedArticleId,
        "--json",
        ...inStudio,
      ]);

      assert.include(refused, "confirmation_required");

      const printed = yield* session.printed([
        "articles",
        "unpublish",
        publishedArticleId,
        "--yes",
        ...inStudio,
      ]);

      assert.include(printed, "moved to the site's trash");
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});
