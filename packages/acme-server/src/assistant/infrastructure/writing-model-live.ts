import { AnthropicClient, AnthropicLanguageModel } from "@effect/ai-anthropic";
import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai-compat";
import { Effect, Layer, Match, Option } from "effect";
import { FetchHttpClient, HttpClient } from "effect/http";

import type { WritingModel } from "#assistant/application/ports/writing-model.ts";
import { assistantProviderConfig } from "#assistant/infrastructure/assistant-settings.ts";
import type { AssistantProvider } from "#assistant/infrastructure/assistant-settings.ts";
import { languageModelWritingModel } from "#assistant/infrastructure/language-model-writing-model.ts";
import { UnavailableWritingModelLive } from "#assistant/infrastructure/unavailable-writing-model.ts";

/**
 * The most tokens an answer may take: a translated LinkedIn post, the
 * longest the assistant writes, in a JSON object, with room. It bounds what
 * each request costs.
 */
const maxOutputTokens = 4096;

// The provider is not sent Acme's trace context. Its requests time out in
// languageModelWritingModel, which tells a timeout from an unreachable
// provider: the provider may have run a request that timed out.
const transformClient = (
  client: HttpClient.HttpClient
): HttpClient.HttpClient =>
  client.pipe(
    HttpClient.transform((response) =>
      response.pipe(
        Effect.provideService(HttpClient.TracerPropagationEnabled, false)
      )
    )
  );

const anthropic = ({
  apiKey,
  baseUrl,
  model,
}: Extract<AssistantProvider, { readonly _tag: "Anthropic" }>) =>
  languageModelWritingModel({ model, provider: "anthropic" }).pipe(
    Layer.provide(
      AnthropicLanguageModel.layer({
        config: { max_tokens: maxOutputTokens },
        model,
      })
    ),
    Layer.provide(
      AnthropicClient.layer({
        apiKey,
        apiUrl: Option.getOrUndefined(baseUrl),
        transformClient,
      })
    ),
    Layer.provide(FetchHttpClient.layer)
  );

const openAiCompatible = ({
  apiKey,
  baseUrl,
  model,
}: Extract<AssistantProvider, { readonly _tag: "OpenAiCompatible" }>) =>
  languageModelWritingModel({ model, provider: "openai-compatible" }).pipe(
    Layer.provide(
      OpenAiLanguageModel.layer({
        config: { max_output_tokens: maxOutputTokens },
        model,
      })
    ),
    Layer.provide(
      OpenAiClient.layer({
        apiKey: Option.getOrUndefined(apiKey),
        apiUrl: baseUrl,
        transformClient,
      })
    ),
    Layer.provide(FetchHttpClient.layer)
  );

/** The WritingModel for a provider's settings. */
export const writingModelFor = (
  provider: AssistantProvider
): Layer.Layer<WritingModel> =>
  Match.valueTags(provider, {
    Anthropic: anthropic,
    Off: () => UnavailableWritingModelLive,
    OpenAiCompatible: openAiCompatible,
  });

/** The language model the environment names, or none (see assistant-settings.ts). */
export const WritingModelLive = Layer.unwrap(
  assistantProviderConfig.pipe(Effect.map(writingModelFor))
);
