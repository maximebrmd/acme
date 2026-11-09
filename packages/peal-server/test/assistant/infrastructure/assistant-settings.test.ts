import { assert, describe, it } from "@effect/vitest";
import { ConfigProvider, Effect, Option, Redacted } from "effect";

import {
  assistantProviderConfig,
  dailyRequestsConfig,
  defaultAnthropicModel,
} from "#assistant/infrastructure/assistant-settings.ts";

const providerFrom = (env: Record<string, string>) =>
  assistantProviderConfig.parse(ConfigProvider.fromUnknown(env));

const dailyRequestsFrom = (env: Record<string, string>) =>
  dailyRequestsConfig.parse(ConfigProvider.fromUnknown(env));

describe("the assistant's settings", () => {
  it.effect("leave the assistant off when nothing is set", () =>
    Effect.gen(function* off() {
      assert.strictEqual((yield* providerFrom({}))._tag, "Off");
      assert.strictEqual(
        (yield* providerFrom({ ACME_AI_API_KEY: "sk-ant-test-key" }))._tag,
        "Off"
      );
      assert.strictEqual(
        (yield* providerFrom({ ACME_AI_PROVIDER: "" }))._tag,
        "Off"
      );
    })
  );

  it.effect(
    "ask Anthropic's default model, unless ACME_AI_MODEL names one",
    () =>
      Effect.gen(function* anthropic() {
        const provider = yield* providerFrom({
          ACME_AI_API_KEY: "sk-ant-test-key",
          ACME_AI_PROVIDER: "anthropic",
        });

        assert.strictEqual(defaultAnthropicModel, "claude-opus-5-5");
        assert.deepStrictEqual(
          provider._tag === "Anthropic"
            ? {
                baseUrl: provider.baseUrl,
                key: Redacted.value(provider.apiKey),
                model: provider.model,
              }
            : null,
          {
            baseUrl: Option.none(),
            key: "sk-ant-test-key",
            model: "claude-opus-5-5",
          }
        );

        const other = yield* providerFrom({
          ACME_AI_API_KEY: "sk-ant-test-key",
          ACME_AI_MODEL: "claude-haiku-5-0",
          ACME_AI_PROVIDER: "anthropic",
        });

        assert.strictEqual(
          other._tag === "Anthropic" ? other.model : null,
          "claude-haiku-5-0"
        );
      })
  );

  it.effect("keep the key redacted", () =>
    Effect.gen(function* redacted() {
      const provider = yield* providerFrom({
        ACME_AI_API_KEY: "sk-ant-test-key",
        ACME_AI_PROVIDER: "anthropic",
      });

      assert.notInclude(JSON.stringify(provider), "sk-ant-test-key");
      assert.isTrue(
        provider._tag === "Anthropic" && Redacted.isRedacted(provider.apiKey)
      );
    })
  );

  it.effect("need a key for Anthropic", () =>
    Effect.gen(function* key() {
      const missing = yield* providerFrom({
        ACME_AI_PROVIDER: "anthropic",
      }).pipe(Effect.flip);

      assert.include(missing.message, "ACME_AI_API_KEY");

      yield* providerFrom({
        ACME_AI_API_KEY: "",
        ACME_AI_PROVIDER: "anthropic",
      }).pipe(Effect.flip);
    })
  );

  it.effect(
    "reach an OpenAI-compatible endpoint at its base URL, with its model",
    () =>
      Effect.gen(function* compatible() {
        const provider = yield* providerFrom({
          ACME_AI_BASE_URL: "http://127.0.0.1:8000/v1/",
          ACME_AI_MODEL: "synthetic-model-8b",
          ACME_AI_PROVIDER: "openai-compatible",
        });

        assert.deepStrictEqual(
          provider._tag === "OpenAiCompatible"
            ? {
                apiKey: provider.apiKey,
                baseUrl: provider.baseUrl,
                model: provider.model,
              }
            : null,
          {
            apiKey: Option.none(),
            baseUrl: "http://127.0.0.1:8000/v1",
            model: "synthetic-model-8b",
          }
        );

        const keyed = yield* providerFrom({
          ACME_AI_API_KEY: "sk-test-key",
          ACME_AI_BASE_URL: "https://models.example.test/v1",
          ACME_AI_MODEL: "synthetic-model-8b",
          ACME_AI_PROVIDER: "openai-compatible",
        });

        assert.isTrue(
          keyed._tag === "OpenAiCompatible" && Option.isSome(keyed.apiKey)
        );
      })
  );

  it.effect.each([
    {
      env: { ACME_AI_MODEL: "synthetic-model-8b" },
      missing: "ACME_AI_BASE_URL",
    },
    {
      env: { ACME_AI_BASE_URL: "http://127.0.0.1:8000/v1" },
      missing: "ACME_AI_MODEL",
    },
  ])("need $missing for an OpenAI-compatible endpoint", ({ env, missing }) =>
    Effect.gen(function* required() {
      const failure = yield* providerFrom({
        ...env,
        ACME_AI_PROVIDER: "openai-compatible",
      }).pipe(Effect.flip);

      assert.include(failure.message, missing);
    })
  );

  it.effect("refuse a provider they do not know", () =>
    Effect.gen(function* unknown() {
      const failure = yield* providerFrom({
        ACME_AI_PROVIDER: "elsewhere",
      }).pipe(Effect.flip);

      assert.include(failure.message, "ACME_AI_PROVIDER");
    })
  );

  it.effect("give each workspace 100 requests a day unless set", () =>
    Effect.gen(function* daily() {
      assert.strictEqual(yield* dailyRequestsFrom({}), 100);
      assert.strictEqual(
        yield* dailyRequestsFrom({ ACME_AI_DAILY_REQUESTS: "25" }),
        25
      );
      assert.strictEqual(
        yield* dailyRequestsFrom({ ACME_AI_DAILY_REQUESTS: "0" }),
        0
      );

      yield* dailyRequestsFrom({ ACME_AI_DAILY_REQUESTS: "-1" }).pipe(
        Effect.flip
      );
      yield* dailyRequestsFrom({ ACME_AI_DAILY_REQUESTS: "1.5" }).pipe(
        Effect.flip
      );
    })
  );
});
