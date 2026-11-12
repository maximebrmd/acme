import { assert, describe, it } from "@effect/vitest";
import { Effect, Ref } from "effect";

import { filesLayer, signedIn } from "./signed-in.ts";
import { readyMediaId } from "./studio.ts";

const inStudio = ["--workspace", "studio"];

describe("peal media describe and delete", () => {
  it.effect("sets and removes a media's description", () =>
    Effect.gen(function* describes() {
      const session = yield* signedIn();

      assert.include(
        yield* session.printed([
          "media",
          "describe",
          readyMediaId,
          "--text",
          "A synthetic catalogue, open",
          ...inStudio,
        ]),
        "Described media"
      );

      const described = (yield* Ref.get(session.studio.state)).media.find(
        ({ id }) => id === readyMediaId
      );

      assert.strictEqual(described?.altText, "A synthetic catalogue, open");

      assert.include(
        yield* session.printed([
          "media",
          "describe",
          readyMediaId,
          "--clear",
          ...inStudio,
        ]),
        "has no description now"
      );
      assert.include(
        yield* session.refused([
          "media",
          "describe",
          readyMediaId,
          ...inStudio,
        ]),
        "--text, or --clear"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("deletes a media once confirmed, and asks first", () =>
    Effect.gen(function* deletes() {
      const session = yield* signedIn();
      const remove = ["media", "delete", readyMediaId, ...inStudio];

      // Nobody at a terminal to ask: nothing is deleted.
      assert.include(yield* session.refused(remove), "needs a confirmation");
      assert.include(
        yield* session.refused([...remove, "--json"]),
        "--yes is required with --json"
      );

      const media = () =>
        Ref.get(session.studio.state).pipe(
          Effect.map((state) => state.media.map(({ id }) => id))
        );

      assert.include(yield* media(), readyMediaId);

      assert.include(
        yield* session.answering(["yes"]).printed(remove),
        `Deleted media ${readyMediaId}.`
      );
      assert.notInclude(yield* media(), readyMediaId);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});
