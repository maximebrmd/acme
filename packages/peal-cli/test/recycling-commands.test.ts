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
        "Give --count, --no-count, --until, --no-until, --variant, --no-variants or several"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "refuses a count, a day or a number of variants out of range before asking",
    () =>
      Effect.gen(function* outOfRange() {
        const session = yield* signedIn();

        const startWith = (more: readonly string[]) =>
          session.refused([
            "recycling",
            "start",
            scheduledId,
            "--every",
            "2w",
            ...more,
            ...inStudio,
          ]);

        assert.include(
          yield* startWith(["--count", "1"]),
          "--count takes 2 to 100 posts"
        );
        assert.include(
          yield* startWith(["--until", "2026-02-30"]),
          "--until takes a day as YYYY-MM-DD"
        );
        assert.include(
          yield* startWith(
            Array.from({ length: 11 }, (_none, place) => [
              "--variant",
              `Variant ${String(place)}`,
            ]).flat()
          ),
          "10 --variant at most"
        );
        assert.notInclude(
          (yield* Ref.get(session.studio.state)).changes.join(" "),
          "recycling:start"
        );
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "resumes with other variants, clears them, and pages the list",
    () =>
      Effect.gen(function* variantsAndPages() {
        const session = yield* signedIn();

        yield* session.printed([
          "recycling",
          "start",
          scheduledId,
          "--every",
          "1w",
          "--variant",
          "Teh first.",
          ...inStudio,
        ]);

        yield* session.printed([
          "recycling",
          "resume",
          ruleId,
          "--variant",
          "The first.",
          ...inStudio,
        ]);

        const resumed = (yield* Ref.get(session.studio.state)).recyclingRules;

        assert.deepStrictEqual(
          resumed.map(({ variants }) => variants.map(({ text }) => text)),
          [["The first."]]
        );

        yield* session.printed([
          "recycling",
          "update",
          ruleId,
          "--no-variants",
          ...inStudio,
        ]);

        assert.deepStrictEqual(
          (yield* Ref.get(session.studio.state)).recyclingRules.map(
            ({ variants }) => variants.length
          ),
          [0]
        );

        // A second rule, then the list a page of one at a time.
        yield* Ref.update(session.studio.state, (state) => ({
          ...state,
          recyclingRules: [
            ...state.recyclingRules,
            ...state.recyclingRules.map((rule) => ({
              ...rule,
              id: "0190f3a0-0000-7000-8000-0000000ec002",
            })),
          ],
        }));

        const first = yield* session.printed([
          "recycling",
          "list",
          "--limit",
          "1",
          ...inStudio,
        ]);

        assert.include(
          first,
          `More: peal recycling list --workspace studio --limit 1 --cursor ${ruleId}`
        );

        const second = yield* session.printed([
          "recycling",
          "list",
          "--limit",
          "1",
          "--cursor",
          ruleId,
          ...inStudio,
        ]);

        assert.include(second, "0190f3a0-0000-7000-8000-0000000ec002");
        assert.notInclude(second, "More:");
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});
