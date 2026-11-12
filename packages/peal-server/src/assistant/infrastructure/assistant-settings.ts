import { Config, Option, Redacted, Schema } from "effect";

/** The model the assistant asks on Anthropic's API, unless PEAL_AI_MODEL names another. */
export const defaultAnthropicModel = "claude-opus-5-5";

/**
 * How many requests a workspace may send the assistant each UTC day, unless
 * PEAL_AI_DAILY_REQUESTS says otherwise.
 */
export const defaultDailyRequests = 100;

/** The language model the assistant writes with, if any. */
export type AssistantProvider =
  | { readonly _tag: "Off" }
  | {
      readonly _tag: "Anthropic";
      readonly apiKey: Redacted.Redacted;
      /** Where Anthropic's API is reached, for a proxy; its own by default. */
      readonly baseUrl: Option.Option<string>;
      readonly model: string;
    }
  | {
      readonly _tag: "OpenAiCompatible";
      /** None for an endpoint that takes requests without a key. */
      readonly apiKey: Option.Option<Redacted.Redacted>;
      /** The API's base URL, which `/chat/completions` follows. */
      readonly baseUrl: string;
      readonly model: string;
    };

// Without the slashes that end it, so the API's paths can follow.
const urlConfig = (name: string) =>
  Config.URL(name).pipe(Config.map((url) => url.href.replace(/\/+$/u, "")));

const anthropic = Config.all({
  apiKey: Config.schema(
    Schema.Redacted(Schema.NonEmptyString),
    "PEAL_AI_API_KEY"
  ),
  baseUrl: Config.option(urlConfig("PEAL_AI_BASE_URL")),
  model: Config.NonEmptyString("PEAL_AI_MODEL").pipe(
    Config.withDefault(defaultAnthropicModel)
  ),
}).pipe(
  Config.map((settings): AssistantProvider => ({
    _tag: "Anthropic",
    ...settings,
  }))
);

// A self-hosted endpoint names its own models, and is reached at its own
// address: both must be given, so drafts never go to a host nobody named.
const openAiCompatible = Config.all({
  apiKey: Config.option(Config.Redacted("PEAL_AI_API_KEY")).pipe(
    Config.map(Option.filter((key) => Redacted.value(key) !== ""))
  ),
  baseUrl: urlConfig("PEAL_AI_BASE_URL"),
  model: Config.NonEmptyString("PEAL_AI_MODEL"),
}).pipe(
  Config.map((settings): AssistantProvider => ({
    _tag: "OpenAiCompatible",
    ...settings,
  }))
);

const off = Config.succeed<AssistantProvider>({ _tag: "Off" });

const providers = {
  "": off,
  anthropic,
  "openai-compatible": openAiCompatible,
};

/**
 * The assistant's language model, read from the environment:
 *
 * - `PEAL_AI_PROVIDER`: `anthropic` or `openai-compatible`. Unset or empty,
 *   the assistant is off: its endpoints answer AssistantUnavailable and the
 *   web app hides it.
 * - `PEAL_AI_API_KEY`: the provider's key, required for Anthropic and
 *   optional for an OpenAI-compatible endpoint.
 * - `PEAL_AI_MODEL`: the model; `claude-opus-5-5` by default on Anthropic,
 *   required for an OpenAI-compatible endpoint.
 * - `PEAL_AI_BASE_URL`: the API's base URL, such as
 *   `http://127.0.0.1:8000/v1`; required for an OpenAI-compatible endpoint,
 *   and for Anthropic only behind a proxy.
 */
export const assistantProviderConfig = Config.Literals(
  ["", "anthropic", "openai-compatible"],
  "PEAL_AI_PROVIDER"
).pipe(
  Config.withDefault(""),
  Config.flatMap((name) => providers[name])
);

/**
 * `PEAL_AI_DAILY_REQUESTS`: how many requests each workspace may send the
 * assistant per UTC day, 100 unless set. 0 lets none through.
 */
export const dailyRequestsConfig = Config.schema(
  Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  "PEAL_AI_DAILY_REQUESTS"
).pipe(Config.withDefault(defaultDailyRequests));

/** The model the assistant makes images with, if any. */
export type ImageProvider =
  | { readonly _tag: "Off" }
  | {
      readonly _tag: "OpenAiCompatible";
      /** None for an endpoint that takes requests without a key. */
      readonly apiKey: Option.Option<Redacted.Redacted>;
      /** The API's base URL, which `/images/generations` follows. */
      readonly baseUrl: string;
      readonly model: string;
    };

// Like a self-hosted writing model, an image endpoint is reached at the
// address the operator names, with the model it names: both must be given.
const openAiCompatibleImages = Config.all({
  apiKey: Config.option(Config.Redacted("PEAL_AI_IMAGE_API_KEY")).pipe(
    Config.map(Option.filter((key) => Redacted.value(key) !== ""))
  ),
  baseUrl: urlConfig("PEAL_AI_IMAGE_BASE_URL"),
  model: Config.NonEmptyString("PEAL_AI_IMAGE_MODEL"),
}).pipe(
  Config.map((settings): ImageProvider => ({
    _tag: "OpenAiCompatible",
    ...settings,
  }))
);

const imageProviders = {
  "": Config.succeed<ImageProvider>({ _tag: "Off" }),
  "openai-compatible": openAiCompatibleImages,
};

/**
 * The assistant's image model, read from the environment when the server
 * starts, apart from the writing model, which may make no images:
 *
 * - `PEAL_AI_IMAGE_PROVIDER`: `openai-compatible`. Unset or empty, images
 *   are off: the endpoint answers AssistantUnavailable and clients hide it.
 * - `PEAL_AI_IMAGE_BASE_URL`: the API's base URL, required.
 * - `PEAL_AI_IMAGE_API_KEY`: the provider's key, optional.
 * - `PEAL_AI_IMAGE_MODEL`: the model, required.
 *
 * A provider named without its base URL or its model stops the server.
 */
export const imageProviderConfig = Config.Literals(
  ["", "openai-compatible"],
  "PEAL_AI_IMAGE_PROVIDER"
).pipe(
  Config.withDefault(""),
  Config.flatMap((name) => imageProviders[name])
);
