import { assert, describe, it } from "@effect/vitest";
import { ConfigProvider, Effect, Option, Redacted } from "effect";

import { imageProviderConfig } from "#assistant/infrastructure/assistant-settings.ts";

const imageProviderFrom = (env: Record<string, string>) =>
  imageProviderConfig.parse(ConfigProvider.fromUnknown(env));

const compatible = {
  PEAL_AI_IMAGE_BASE_URL: "http://127.0.0.1:8100/v1/",
  PEAL_AI_IMAGE_MODEL: "synthetic-image-model",
  PEAL_AI_IMAGE_PROVIDER: "openai-compatible",
};

describe("the image model's settings", () => {
  it.effect("leave images off unless a provider is named", () =>
    Effect.gen(function* off() {
      assert.strictEqual((yield* imageProviderFrom({}))._tag, "Off");
      assert.strictEqual(
        (yield* imageProviderFrom({ PEAL_AI_IMAGE_PROVIDER: "" }))._tag,
        "Off"
      );
      // The writing model's settings never turn images on.
      assert.strictEqual(
        (yield* imageProviderFrom({
          PEAL_AI_BASE_URL: "http://127.0.0.1:8000/v1",
          PEAL_AI_MODEL: "synthetic-model-8b",
          PEAL_AI_PROVIDER: "openai-compatible",
        }))._tag,
        "Off"
      );
    })
  );

  it.effect("reach an OpenAI-compatible endpoint, with or without a key", () =>
    Effect.gen(function* reach() {
      const plain = yield* imageProviderFrom(compatible);

      assert.deepStrictEqual(
        plain._tag === "OpenAiCompatible"
          ? { apiKey: plain.apiKey, baseUrl: plain.baseUrl, model: plain.model }
          : null,
        {
          apiKey: Option.none(),
          baseUrl: "http://127.0.0.1:8100/v1",
          model: "synthetic-image-model",
        }
      );

      const keyed = yield* imageProviderFrom({
        ...compatible,
        PEAL_AI_IMAGE_API_KEY: "sk_test_synthetic_image_key",
      });

      assert.isTrue(
        keyed._tag === "OpenAiCompatible" &&
          Option.exists(
            keyed.apiKey,
            (key) => Redacted.value(key) === "sk_test_synthetic_image_key"
          )
      );
      assert.notInclude(JSON.stringify(keyed), "sk_test_synthetic_image_key");
    })
  );

  it.effect.each([
    {
      env: {
        PEAL_AI_IMAGE_MODEL: compatible.PEAL_AI_IMAGE_MODEL,
        PEAL_AI_IMAGE_PROVIDER: compatible.PEAL_AI_IMAGE_PROVIDER,
      },
      missing: "PEAL_AI_IMAGE_BASE_URL",
    },
    {
      env: {
        PEAL_AI_IMAGE_BASE_URL: compatible.PEAL_AI_IMAGE_BASE_URL,
        PEAL_AI_IMAGE_PROVIDER: compatible.PEAL_AI_IMAGE_PROVIDER,
      },
      missing: "PEAL_AI_IMAGE_MODEL",
    },
  ])("stop the server without $missing", ({ env, missing }) =>
    Effect.gen(function* required() {
      const failure = yield* imageProviderFrom(env).pipe(Effect.flip);

      assert.include(failure.message, missing);
    })
  );

  it.effect("refuse a provider they do not know", () =>
    Effect.gen(function* unknown() {
      const failure = yield* imageProviderFrom({
        ...compatible,
        PEAL_AI_IMAGE_PROVIDER: "anthropic",
      }).pipe(Effect.flip);

      assert.include(failure.message, "PEAL_AI_IMAGE_PROVIDER");
    })
  );
});
