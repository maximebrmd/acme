import { assert, describe, it } from "@effect/vitest";
import { Effect, Ref, Schema } from "effect";

import { filesLayer, signedIn } from "./signed-in.ts";
import { image, readyMediaId } from "./studio.ts";

// The ids of a page as --json printed it.
const MediaPage = {
  decode: Schema.decodeUnknownSync(
    Schema.fromJsonString(
      Schema.Struct({
        items: Schema.Array(Schema.Struct({ id: Schema.String })),
      })
    )
  ),
};

const inStudio = ["--workspace", "studio"];

describe("peal media list", () => {
  it.effect("finds media by name or description, and by kind", () =>
    Effect.gen(function* lists() {
      const session = yield* signedIn();

      yield* Ref.update(session.studio.state, (current) => ({
        ...current,
        media: [
          image("f-video", {
            contentType: "video/mp4",
            fileName: "Catalogue teaser.mp4",
            kind: "video",
          }),
          image("f-other", { fileName: "beach.png" }),
          ...current.media,
        ],
      }));

      const printed = yield* session.printed([
        "media",
        "list",
        "--search",
        "CATALOGUE",
        ...inStudio,
      ]);

      assert.include(printed, "Catalogue teaser.mp4");
      assert.include(printed, readyMediaId);
      assert.notInclude(printed, "beach.png");
      assert.include(printed, 'matching "CATALOGUE"');

      const videos = yield* session.printed([
        "media",
        "list",
        "--search",
        "catalogue",
        "--kind",
        "video",
        "--json",
        ...inStudio,
      ]);

      assert.deepStrictEqual(
        MediaPage.decode(videos).items.map(({ id }) => id),
        ["f-video"]
      );

      assert.include(
        yield* session.refused([
          "media",
          "list",
          "--search",
          "  ",
          ...inStudio,
        ]),
        "--search takes 1 to 100 characters, without a NUL"
      );
      assert.include(
        yield* session.refused([
          "media",
          "list",
          "--search",
          "a\u0000b",
          ...inStudio,
        ]),
        "without a NUL"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("prints a file's name as text, whatever it holds", () =>
    Effect.gen(function* printsNames() {
      const session = yield* signedIn();

      yield* Ref.update(session.studio.state, (current) => ({
        ...current,
        media: [
          image("f-odd", {
            fileName: `odd${String.fromCodePoint(0x1b)}[31m.png`,
          }),
        ],
      }));

      const printed = yield* session.printed(["media", "list", ...inStudio]);

      assert.notInclude(printed, String.fromCodePoint(0x1b));
      assert.include(printed, "[31m.png");
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});

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
