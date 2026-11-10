import { assert, describe, it } from "@effect/vitest";
import { Effect, Schema } from "effect";

import { filesLayer, signedIn } from "./signed-in.ts";
import { mastodonId } from "./studio.ts";

// A post of several parts from the command line: `--then` adds a part after
// the first, in the order given, and `--then-delay` the wait before each.

const inStudio = ["--workspace", "studio"];

const answerOf = Schema.decodeUnknownSync(
  Schema.fromJsonString(
    Schema.Struct({
      content: Schema.Struct({
        followUps: Schema.Array(
          Schema.Struct({ delaySeconds: Schema.Int, text: Schema.String })
        ),
        text: Schema.String,
      }),
      id: Schema.String,
    })
  )
);

describe("peal post and peal drafts save, with parts", () => {
  it.effect("send a thread, each --then a part after the first", () =>
    Effect.gen(function* sendsThread() {
      const session = yield* signedIn();

      const sent = answerOf(
        yield* session.printed([
          "post",
          "A first part",
          "--then",
          "A second part",
          "--then",
          "A third part",
          "--then-delay",
          "120",
          "--channel",
          mastodonId,
          "--now",
          "--json",
          ...inStudio,
        ])
      );

      assert.deepStrictEqual(sent.content, {
        followUps: [
          { delaySeconds: 120, text: "A second part" },
          { delaySeconds: 120, text: "A third part" },
        ],
        text: "A first part",
      });
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("refuse a wait longer than a day, before anything is sent", () =>
    Effect.gen(function* refusesDelay() {
      const session = yield* signedIn();

      assert.include(
        yield* session.refused([
          "post",
          "A first part",
          "--then",
          "A second part",
          "--then-delay",
          "86401",
          "--channel",
          mastodonId,
          "--now",
          ...inStudio,
        ]),
        "--then-delay"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "keep a draft's parts when it is changed without --then, and replace them with it",
    () =>
      Effect.gen(function* keepsParts() {
        const session = yield* signedIn();

        const saved = answerOf(
          yield* session.printed([
            "drafts",
            "save",
            "--text",
            "A first part",
            "--then",
            "A second part",
            "--json",
            ...inStudio,
          ])
        );

        assert.deepStrictEqual(saved.content.followUps, [
          { delaySeconds: 0, text: "A second part" },
        ]);

        const rewritten = answerOf(
          yield* session.printed([
            "drafts",
            "save",
            "--post",
            saved.id,
            "--text",
            "A better first part",
            "--json",
            ...inStudio,
          ])
        );

        assert.deepStrictEqual(rewritten.content, {
          followUps: [{ delaySeconds: 0, text: "A second part" }],
          text: "A better first part",
        });

        const replaced = answerOf(
          yield* session.printed([
            "drafts",
            "save",
            "--post",
            saved.id,
            "--then",
            "Another second part",
            "--json",
            ...inStudio,
          ])
        );

        assert.deepStrictEqual(replaced.content.followUps, [
          { delaySeconds: 0, text: "Another second part" },
        ]);
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});
