import { assert, describe, it } from "@effect/vitest";
import { Effect, Ref } from "effect";

import { intervalOf } from "#commands/recycling.ts";

import { filesLayer, signedIn } from "./signed-in.ts";
import { draftId, scheduledId } from "./studio.ts";

// peal recycling against the in-memory studio: what each command asks the
// server, what it prints, and how it explains a refusal.

const inStudio = ["--workspace", "studio"];

const ruleId = "0190f3a0-0000-7000-8000-0000000ec001";

describe("peal recycling", () => {
  it.effect("reads an interval as a count and a unit", () =>
    Effect.gen(function* intervals() {
      assert.deepStrictEqual(yield* intervalOf("2w"), {
        count: 2,
        unit: "weeks",
      });
      assert.deepStrictEqual(yield* intervalOf("12M"), {
        count: 12,
        unit: "months",
      });
      assert.strictEqual(
        (yield* intervalOf("13m").pipe(Effect.flip))._tag,
        "Refused"
      );
    })
  );

  it.effect(
    "starts a rule on a scheduled post, lists it, pauses, resumes and ends it",
    () =>
      Effect.gen(function* lifecycle() {
        const session = yield* signedIn();

        const started = yield* session.printed([
          "recycling",
          "start",
          scheduledId,
          "--every",
          "2w",
          "--count",
          "5",
          "--variant",
          "Open all summer, as before.",
          ...inStudio,
        ]);

        assert.include(
          started,
          `Post ${scheduledId} now repeats every 2 weeks (every 2 weeks, 1 of 5, active): ${ruleId}.`
        );
        assert.include(started, "post 2, variant 1");

        assert.include(
          yield* session.printed(["recycling", "list", ...inStudio]),
          `  ${ruleId}  post ${scheduledId}  every 2 weeks, 1 of 5, active`
        );

        assert.include(
          yield* session.printed(["recycling", "pause", ruleId, ...inStudio]),
          "Paused rule"
        );
        assert.include(
          yield* session.printed(["recycling", "resume", ruleId, ...inStudio]),
          "Resumed rule"
        );
        assert.strictEqual(
          yield* session.printed(["recycling", "end", ruleId, ...inStudio]),
          `Ended rule ${ruleId}: it makes no more posts, and those it made stay as they are.`
        );
        assert.include(
          (yield* Ref.get(session.studio.state)).changes,
          `recycling:stop:${ruleId}`
        );
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("explains why a draft cannot repeat, and asks for a change", () =>
    Effect.gen(function* refusals() {
      const session = yield* signedIn();

      assert.include(
        yield* session.refused([
          "recycling",
          "start",
          draftId,
          "--every",
          "1w",
          ...inStudio,
        ]),
        "The post is a draft: schedule it first, then make it repeat."
      );
      assert.include(
        yield* session.refused(["recycling", "update", ruleId, ...inStudio]),
        "Give --count, --no-count, --until, --no-until, --variant or several"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});
