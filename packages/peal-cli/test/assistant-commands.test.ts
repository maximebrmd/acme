import { assert, describe, it } from "@effect/vitest";
import { Effect, Ref } from "effect";

import { filesLayer, signedIn } from "./signed-in.ts";

const inStudio = ["--workspace", "studio"];

const syntheticKey = "synthetic-workspace-image-key";

// peal assistant image-provider set, in the studio.
const setting = (baseUrl: string, ...rest: readonly string[]) => [
  "assistant",
  "image-provider",
  "set",
  "--base-url",
  baseUrl,
  "--model",
  "synthetic-image-model",
  ...rest,
  ...inStudio,
];

describe("peal assistant image-provider", () => {
  it.effect(
    "sets the provider with the key piped in, never as an argument",
    () =>
      Effect.gen(function* sets() {
        const session = yield* signedIn();

        const printed = yield* session
          .piping(`${syntheticKey}\n`)
          .printed(setting("https://images.example.com/v1/"));

        assert.include(
          printed,
          "Saved the image provider of Studio. Its image prompts now go to https://images.example.com/v1"
        );
        assert.notInclude(printed, syntheticKey);

        const { changes, imageProvider } = yield* Ref.get(session.studio.state);

        // The key went to the server as it was piped, without its line break.
        assert.strictEqual(imageProvider?.apiKey, syntheticKey);
        assert.include(
          changes,
          "image-provider:set:https://images.example.com/v1"
        );

        const shown = yield* session.printed([
          "assistant",
          "image-provider",
          "show",
          ...inStudio,
        ]);

        assert.include(shown, "Address: https://images.example.com/v1");
        assert.include(shown, "Model:   synthetic-image-model");
        assert.include(shown, "saved (never shown)");
        assert.notInclude(shown, syntheticKey);
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "keeps the saved key for the same address, and asks it for another",
    () =>
      Effect.gen(function* keeps() {
        const session = yield* signedIn();

        yield* session
          .piping(syntheticKey)
          .printed(setting("https://images.example.com/v1"));

        yield* session.printed(
          setting("https://images.example.com/v1", "--keep-key")
        );

        const { imageProvider } = yield* Ref.get(session.studio.state);

        assert.strictEqual(imageProvider?.apiKey, syntheticKey);

        // Another path on the same host is another address.
        const refused = yield* session.refused(
          setting("https://images.example.com/v2", "--keep-key")
        );

        assert.include(refused, "Peal never sends a key to another address");
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "refuses an empty key and an address that is not public, in words",
    () =>
      Effect.gen(function* refuses() {
        const session = yield* signedIn();

        assert.include(
          yield* session
            .piping("\n")
            .refused(setting("https://images.example.com/v1")),
          "The key is empty"
        );
        assert.include(
          yield* session
            .piping(syntheticKey)
            .refused(setting("https://images.internal.example/v1")),
          "is not a public address"
        );

        const { imageProvider } = yield* Ref.get(session.studio.state);

        assert.isNull(imageProvider);
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("clears the provider once confirmed, and asks first", () =>
    Effect.gen(function* clears() {
      const session = yield* signedIn();
      const clear = ["assistant", "image-provider", "clear", ...inStudio];

      yield* session
        .piping(syntheticKey)
        .printed(setting("https://images.example.com/v1"));

      // Nobody at a terminal to ask: nothing is removed.
      assert.include(yield* session.refused(clear), "needs a confirmation");
      assert.isNotNull((yield* Ref.get(session.studio.state)).imageProvider);

      assert.include(
        yield* session.answering(["yes"]).printed(clear),
        "Removed the image provider of Studio."
      );
      assert.isNull((yield* Ref.get(session.studio.state)).imageProvider);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});
