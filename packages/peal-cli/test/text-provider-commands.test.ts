import { assert, describe, it } from "@effect/vitest";
import { Effect, Ref } from "effect";

import { filesLayer, signedIn } from "./signed-in.ts";

const inStudio = ["--workspace", "studio"];

const syntheticKey = "synthetic-workspace-text-key";

// peal assistant text-provider, in the studio.
const textProvider = (...rest: readonly string[]) => [
  "assistant",
  "text-provider",
  ...rest,
  ...inStudio,
];

// peal assistant text-provider set, for an OpenAI-compatible endpoint.
const at = (baseUrl: string, ...rest: readonly string[]) =>
  textProvider(
    "set",
    "--kind",
    "openai-compatible",
    "--base-url",
    baseUrl,
    "--model",
    "synthetic-text-model",
    ...rest
  );

describe("peal assistant text-provider", () => {
  it.effect(
    "sets an Anthropic provider at Anthropic's address, the key piped in",
    () =>
      Effect.gen(function* sets() {
        const session = yield* signedIn();

        const printed = yield* session
          .piping(`  ${syntheticKey} \n`)
          .printed(
            textProvider(
              "set",
              "--kind",
              "anthropic",
              "--model",
              "synthetic-text-model"
            )
          );

        assert.include(
          printed,
          "Saved the text provider of Studio. The drafts its members ask the assistant about now go to https://api.anthropic.com"
        );
        assert.notInclude(printed, syntheticKey);

        const { changes, textProvider: brought } = yield* Ref.get(
          session.studio.state
        );

        assert.strictEqual(brought?.apiKey, syntheticKey);
        assert.include(
          changes,
          "text-provider:set:anthropic:https://api.anthropic.com"
        );

        const shown = yield* session.printed(textProvider("show"));

        assert.include(shown, "API:     Anthropic's Messages API");
        assert.include(shown, "Model:   synthetic-text-model");
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
          .printed(at("https://text.example.com/v1"));
        yield* session.printed(at("https://text.example.com/v1", "--keep-key"));

        assert.strictEqual(
          (yield* Ref.get(session.studio.state)).textProvider?.apiKey,
          syntheticKey
        );

        assert.include(
          yield* session.refused(
            at("https://text.example.com/v2", "--keep-key")
          ),
          "Peal never sends a key to another address"
        );
        assert.include(
          yield* session
            .piping(syntheticKey)
            .refused(at("https://text.internal.example/v1")),
          "Peal sends drafts only to hosts anyone on the internet can reach"
        );
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("tests the provider, and says why it refused", () =>
    Effect.gen(function* tests() {
      const session = yield* signedIn();

      assert.include(
        yield* session.refused(textProvider("test")),
        "has no text provider of its own to test"
      );

      yield* session
        .piping(syntheticKey)
        .printed(
          textProvider("set", "--kind", "anthropic", "--model", "synthetic")
        );

      assert.include(
        yield* session.printed(textProvider("test")),
        "answered with a suggestion the assistant can use"
      );

      yield* session
        .piping("synthetic-refused-key")
        .printed(
          textProvider("set", "--kind", "anthropic", "--model", "synthetic")
        );

      assert.include(
        yield* session.refused(textProvider("test")),
        "refused its key, its account, its model or its address"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("clears the provider once confirmed, and asks first", () =>
    Effect.gen(function* clears() {
      const session = yield* signedIn();

      yield* session
        .piping(syntheticKey)
        .printed(
          textProvider("set", "--kind", "anthropic", "--model", "synthetic")
        );

      assert.include(
        yield* session.refused(textProvider("clear")),
        "needs a confirmation"
      );
      assert.isNotNull((yield* Ref.get(session.studio.state)).textProvider);

      assert.include(
        yield* session.answering(["yes"]).printed(textProvider("clear")),
        "Removed the text provider of Studio."
      );
      assert.isNull((yield* Ref.get(session.studio.state)).textProvider);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});
