import { assert, describe, it } from "@effect/vitest";
import { Effect, Schema } from "effect";

import { filesLayer, signedIn } from "./signed-in.ts";
import { mastodonId } from "./studio.ts";

// A poll from the command line: `--poll-choice` adds a choice, in order,
// `--poll-minutes` how long it stays open, `--poll-multiple` several picks.

const inStudio = ["--workspace", "studio"];

const answerOf = Schema.decodeUnknownSync(
  Schema.fromJsonString(
    Schema.Struct({
      content: Schema.Struct({
        poll: Schema.optionalKey(
          Schema.Struct({
            choices: Schema.Array(Schema.String),
            durationMinutes: Schema.Int,
            multipleChoice: Schema.optionalKey(Schema.Boolean),
          })
        ),
        text: Schema.String,
      }),
    })
  )
);

describe("peal post and peal drafts save, with a poll", () => {
  it.effect("send a post asking a poll", () =>
    Effect.gen(function* sendsPoll() {
      const session = yield* signedIn();

      const sent = answerOf(
        yield* session.printed([
          "post",
          "Which one?",
          "--poll-choice",
          "Tea",
          "--poll-choice",
          "Coffee",
          "--poll-minutes",
          "60",
          "--poll-multiple",
          "--channel",
          mastodonId,
          "--now",
          "--json",
          ...inStudio,
        ])
      );

      assert.deepStrictEqual(sent.content.poll, {
        choices: ["Tea", "Coffee"],
        durationMinutes: 60,
        multipleChoice: true,
      });
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("keep a poll open a day unless told otherwise", () =>
    Effect.gen(function* aDay() {
      const session = yield* signedIn();

      const saved = answerOf(
        yield* session.printed([
          "drafts",
          "save",
          "--text",
          "Ready?",
          "--poll-choice",
          "Yes",
          "--poll-choice",
          "No",
          "--channel",
          mastodonId,
          "--json",
          ...inStudio,
        ])
      );

      assert.deepStrictEqual(saved.content.poll, {
        choices: ["Yes", "No"],
        durationMinutes: 1440,
      });
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "refuse a poll's time with no choice, before anything is sent",
    () =>
      Effect.gen(function* refusesTime() {
        const session = yield* signedIn();

        assert.include(
          yield* session.refused([
            "post",
            "No question",
            "--poll-minutes",
            "60",
            "--channel",
            mastodonId,
            "--now",
            ...inStudio,
          ]),
          "--poll-choice"
        );
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("refuse more choices than any platform takes", () =>
    Effect.gen(function* refusesChoices() {
      const session = yield* signedIn();

      assert.include(
        yield* session.refused([
          "post",
          "Too many",
          ...["A", "B", "C", "D", "E"].flatMap((choice) => [
            "--poll-choice",
            choice,
          ]),
          "--channel",
          mastodonId,
          "--now",
          ...inStudio,
        ]),
        "4 choices at most"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});
