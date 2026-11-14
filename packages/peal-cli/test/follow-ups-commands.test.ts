import { assert, describe, it } from "@effect/vitest";
import { Effect, Ref } from "effect";

import { filesLayer, signedIn } from "./signed-in.ts";
import { finishedId, mastodonId } from "./studio.ts";

// peal follow-ups against the in-memory studio: what each command asks
// the server, what it prints, and what it refuses before asking.

const inStudio = ["--workspace", "studio"];

const ruleId = "0190f3a0-0000-7000-8000-0000000f0001";

describe("peal follow-ups", () => {
  it.effect(
    "starts a rule on a post, lists, pauses, resumes, approves and stops it",
    () =>
      Effect.gen(function* lifecycle() {
        const session = yield* signedIn();

        const started = yield* session.printed([
          "follow-ups",
          "start",
          "--post",
          finishedId,
          "--likes",
          "50",
          "--comment",
          "Thank you all!",
          "--repost",
          ...inStudio,
        ]);

        assert.include(
          started,
          `Following up post ${finishedId} (at 50 likes, comment, repost, active): ${ruleId}.`
        );
        assert.include(started, "comment: Thank you all!");

        assert.include(
          yield* session.printed(["follow-ups", "list", ...inStudio]),
          `  ${ruleId}  post ${finishedId}  at 50 likes, comment, repost, active`
        );
        assert.include(
          yield* session.printed(["follow-ups", "pause", ruleId, ...inStudio]),
          "Paused rule"
        );
        assert.include(
          yield* session.printed(["follow-ups", "resume", ruleId, ...inStudio]),
          "Resumed rule"
        );
        assert.include(
          yield* session.printed([
            "follow-ups",
            "approve",
            ruleId,
            ...inStudio,
          ]),
          "Approved rule"
        );
        assert.strictEqual(
          yield* session.printed(["follow-ups", "stop", ruleId, ...inStudio]),
          `Stopped rule ${ruleId}: it sends nothing more, and what it sent stays on the platforms.`
        );
        assert.include(
          (yield* Ref.get(session.studio.state)).changes,
          `followUps.delete ${ruleId}`
        );
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "refuses a rule that does nothing, or acts on two things, before asking",
    () =>
      Effect.gen(function* refuses() {
        const session = yield* signedIn();

        const nothing = yield* session.refused([
          "follow-ups",
          "start",
          "--post",
          finishedId,
          "--likes",
          "5",
          ...inStudio,
        ]);

        assert.include(nothing, "Give --comment, --repost or both");

        const both = yield* session.refused([
          "follow-ups",
          "start",
          "--post",
          finishedId,
          "--channel",
          mastodonId,
          "--likes",
          "5",
          "--repost",
          ...inStudio,
        ]);

        assert.include(both, "Give --post or --channel, one of them");
        assert.deepStrictEqual(
          (yield* Ref.get(session.studio.state)).changes.filter((change) =>
            change.startsWith("followUps.")
          ),
          []
        );
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});
