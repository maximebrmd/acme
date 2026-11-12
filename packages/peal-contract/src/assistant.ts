import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

import { AssistantFailed } from "./assistant-failed.ts";
import { AssistantInputRejected } from "./assistant-input-rejected.ts";
import { AssistantQuotaExceeded } from "./assistant-quota-exceeded.ts";
import { AssistantSecretsNotConfigured } from "./assistant-secrets-not-configured.ts";
import { AssistantUnavailable } from "./assistant-unavailable.ts";
import { Authentication } from "./authentication.ts";
import { Forbidden } from "./forbidden.ts";
import { ImageProviderAddressRefused } from "./image-provider-address-refused.ts";
import { ImageProviderKeyRequired } from "./image-provider-key-required.ts";
import { ImageProviderRefused } from "./image-provider-refused.ts";
import { MediaImportBusy } from "./media-import-busy.ts";
import { MediaStoreUnavailable } from "./media-store-unavailable.ts";
import { MediaSchema } from "./media.ts";
import { OwnImageLimitReached } from "./own-image-limit-reached.ts";
import { PlanLimitReached } from "./plan-limit-reached.ts";
import { PlatformSchema } from "./platform.ts";
import { maxPostTextLength } from "./post-text.ts";
import { WorkspaceAccess } from "./workspace-access.ts";

/**
 * The tones the assistant rewrites a post in. The server's list
 * (src/assistant/domain/tone.ts) is the source; a test keeps the two equal.
 */
export const AssistantToneSchema = Schema.Literals([
  "professional",
  "friendly",
  "casual",
  "enthusiastic",
  "witty",
]).annotate({ identifier: "AssistantTone" });

export type AssistantTone = typeof AssistantToneSchema.Type;

/**
 * The languages the assistant translates into, as BCP 47 tags. The server's
 * list (src/assistant/domain/translation-language.ts) is the source.
 */
export const TranslationLanguageSchema = Schema.Literals([
  "en",
  "fr",
  "de",
  "es",
  "it",
  "pt",
  "nl",
  "pl",
  "ja",
  "zh-Hans",
]).annotate({ identifier: "TranslationLanguage" });

export type TranslationLanguage = typeof TranslationLanguageSchema.Type;

/**
 * What the assistant does with the text:
 *
 * - `rewrite`: the same post in another `tone`.
 * - `shorten`: the post cut down to fit `platform`'s limits.
 * - `translate`: the post in another `language`.
 * - `hashtags`: hashtags that suit the post, to add to it.
 * - `write`: a first post from a subject: the request's `text` says what
 *   the post is about, in the person's words. Optionally in a `tone`, in a
 *   `language` (else the subject's own), and within the limits of a
 *   `platform`.
 */
export const AssistantActionSchema = Schema.Union([
  Schema.TaggedStruct("rewrite", { tone: AssistantToneSchema }),
  Schema.TaggedStruct("shorten", { platform: PlatformSchema }),
  Schema.TaggedStruct("translate", { language: TranslationLanguageSchema }),
  Schema.TaggedStruct("hashtags", {}),
  Schema.TaggedStruct("write", {
    language: Schema.optionalKey(TranslationLanguageSchema),
    platform: Schema.optionalKey(PlatformSchema),
    tone: Schema.optionalKey(AssistantToneSchema),
  }),
]).annotate({ identifier: "AssistantAction" });

export type AssistantAction = typeof AssistantActionSchema.Type;

export const SuggestionRequestSchema = Schema.Struct({
  action: AssistantActionSchema,
  // The post's text, as plain text, or for `write` the post's subject. The
  // assistant takes at most the status's `maxTextLength`; this bounds what
  // the request can carry.
  text: Schema.String.check(Schema.isMaxLength(maxPostTextLength)),
}).annotate({ identifier: "SuggestionRequest" });

export type SuggestionRequest = typeof SuggestionRequestSchema.Type;

/**
 * What the assistant offers, for the person to accept or discard: a `text`
 * that replaces the post's, or `hashtags` to add to it, each with its #.
 */
export const SuggestionSchema = Schema.Union([
  Schema.TaggedStruct("text", { text: Schema.String }),
  Schema.TaggedStruct("hashtags", { hashtags: Schema.Array(Schema.String) }),
]).annotate({ identifier: "Suggestion" });

export type Suggestion = typeof SuggestionSchema.Type;

/**
 * The aspects the assistant makes images in: `square`, `landscape` (wider
 * than tall) or `portrait` (taller than wide). The server's list
 * (src/assistant/domain/image-aspect.ts) is the source.
 */
export const ImageAspectSchema = Schema.Literals([
  "square",
  "landscape",
  "portrait",
]).annotate({ identifier: "ImageAspect" });

export type ImageAspect = typeof ImageAspectSchema.Type;

/**
 * How many of the day's assistant requests an image costs, and the longest
 * description one is made from. The server's values
 * (src/assistant/domain/) are the source.
 */
export const imageRequestCost = 5;

export const maxImagePromptLength = 1000;

export const ImageRequestSchema = Schema.Struct({
  aspect: ImageAspectSchema,
  // What the image should show, as plain text, sent to the image provider
  // as it is. The assistant takes 1 to the status's
  // `images.maxPromptLength` characters; this bounds what the request can
  // carry.
  prompt: Schema.String.check(Schema.isMaxLength(maxPostTextLength)),
}).annotate({ identifier: "ImageRequest" });

export type ImageRequest = typeof ImageRequestSchema.Type;

/**
 * Who makes the workspace's images: `workspace`, the image provider the
 * workspace brought (its own key, outside Peal's allowance), or `server`,
 * the image model the server's operator set up.
 */
export const AssistantImageSourceSchema = Schema.Literals([
  "workspace",
  "server",
]).annotate({ identifier: "AssistantImageSource" });

export type AssistantImageSource = typeof AssistantImageSourceSchema.Type;

export const AssistantImagesStatusSchema = Schema.Struct({
  // The aspects an image can be made in.
  aspects: Schema.Array(ImageAspectSchema),
  // Whether images can be made: the workspace brought its own image
  // provider, or the server has an image model. Clients hide images
  // otherwise.
  available: Schema.Boolean,
  // How many of the day's requests images of the server's model may take:
  // the day's limit, but none while the workspace's plan is on trial.
  // Under `requestCost`, the workspace makes no image with it (the request
  // is refused with AssistantQuotaExceeded). It bounds nothing while
  // `source` is `workspace`.
  dailyLimit: Schema.Int,
  // The longest description an image is made from, in UTF-16 code units.
  maxPromptLength: Schema.Int,
  // How many of the day's requests an image costs: 0 when `source` is
  // `workspace`.
  requestCost: Schema.Int,
  // Who makes the images, or null when nobody does (`available` false).
  source: Schema.NullOr(AssistantImageSourceSchema),
}).annotate({ identifier: "AssistantImagesStatus" });

export type AssistantImagesStatus = typeof AssistantImagesStatusSchema.Type;

export const AssistantStatusSchema = Schema.Struct({
  // Whether the server has a language model. Clients hide the assistant
  // when it does not.
  available: Schema.Boolean,
  // How many requests the workspace may send each UTC day, and how many
  // are left today.
  dailyLimit: Schema.Int,
  // Whether the assistant makes images, and on what terms.
  images: AssistantImagesStatusSchema,
  // The longest text the assistant takes, in UTF-16 code units.
  maxTextLength: Schema.Int,
  remaining: Schema.Int,
  // Midnight UTC, when the day's count starts again.
  resetsAt: Schema.DateTimeUtc,
}).annotate({ identifier: "AssistantStatus" });

export type AssistantStatus = typeof AssistantStatusSchema.Type;

/** The longest address, model and key a workspace's image provider takes. */
export const maxImageProviderAddressLength = 2048;

export const maxImageProviderModelLength = 200;

export const maxImageProviderKeyLength = 500;

/**
 * The image provider a workspace brought: where its prompts go and which
 * model is asked. Its key is never shown again: `keySet` says one is
 * stored, `keyUnreadable` that it can no longer be read (the server's
 * keys changed), and must be typed again.
 */
export const ImageProviderSchema = Schema.Struct({
  baseUrl: Schema.String,
  keySet: Schema.Literal(true),
  keyUnreadable: Schema.Boolean,
  model: Schema.String,
  updatedAt: Schema.DateTimeUtc,
}).annotate({ identifier: "ImageProvider" });

export type ImageProvider = typeof ImageProviderSchema.Type;

/** The workspace's image provider, or null when it brought none. */
export const ImageProviderSettingSchema = Schema.Struct({
  provider: Schema.NullOr(ImageProviderSchema),
}).annotate({ identifier: "ImageProviderSetting" });

export type ImageProviderSetting = typeof ImageProviderSettingSchema.Type;

/**
 * What a model name may hold: one line, without control or format
 * characters, not blank. The server's rule
 * (src/assistant/domain/image-provider.ts) is the source; a test keeps the
 * two equal.
 */
export const imageProviderModelPattern =
  /^(?=.*\S)[^\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]+$/u;

/** What a key may hold: visible ASCII, as an HTTP header does. */
export const imageProviderKeyPattern = /^[!-~]+$/u;

export const ImageProviderChangeSchema = Schema.Struct({
  // The provider's key, visible ASCII without spaces: required unless the
  // workspace has one stored and `baseUrl` stays exactly the same, when it
  // is kept.
  apiKey: Schema.optionalKey(
    Schema.String.check(
      Schema.isMinLength(1),
      Schema.isMaxLength(maxImageProviderKeyLength),
      Schema.isPattern(imageProviderKeyPattern)
    )
  ),
  // The API's base address, which `/images/generations` follows, such as
  // `https://images.example.com/v1`. This bounds what the request can
  // carry; the address itself is at most 2048 characters.
  baseUrl: Schema.String.check(Schema.isMaxLength(8192)),
  // The model the provider is asked for, one line.
  model: Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(maxImageProviderModelLength),
    Schema.isPattern(imageProviderModelPattern)
  ),
}).annotate({ identifier: "ImageProviderChange" });

export type ImageProviderChange = typeof ImageProviderChangeSchema.Type;

const workspace = { workspaceId: Schema.String };

const imageProviderDescription =
  "an endpoint that speaks the OpenAI images API (`POST {baseUrl}/images/generations`), whose images then spend none of the workspace's daily assistant requests";

/**
 * The writing assistant: suggestions on a post's text from the language
 * model the server is configured with, and images, kept in the media
 * library, from the image provider the workspace brought or else the
 * server's image model. Nothing of a suggestion is saved; the person
 * accepts it or discards it. Each workspace sends a limited number of
 * requests per UTC day, an image of the server's model costing several.
 */
export class AssistantApi extends HttpApiGroup.make("assistant")
  .add(
    HttpApiEndpoint.get("status", "/", {
      error: Forbidden,
      params: workspace,
      success: AssistantStatusSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Tells whether the server has a language model, so clients show the assistant or hide it, who makes the workspace's images (`images.source`: the workspace's own provider, the server's image model, or nobody) and what one costs, and how many requests the workspace has left today. Needs assistant:use.",
        summary: "Get the assistant's status",
      })
    ),
    HttpApiEndpoint.post("suggest", "/suggestions", {
      error: [
        Forbidden,
        AssistantUnavailable,
        AssistantInputRejected,
        AssistantQuotaExceeded,
        AssistantFailed,
      ],
      params: workspace,
      payload: SuggestionRequestSchema,
      success: SuggestionSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Asks the language model to rewrite, shorten or translate a post's text, to suggest hashtags for it, or to write a first post from a subject (`write`), and answers once the whole suggestion is checked. The text is sent to the model as data, never as instructions. Each request counts toward the workspace's daily quota, unless the model's provider could not be reached. Needs assistant:use.",
        summary: "Suggest a change to a post's text",
      })
    ),
    HttpApiEndpoint.post("generateImage", "/images", {
      error: [
        Forbidden,
        AssistantUnavailable,
        AssistantInputRejected,
        AssistantQuotaExceeded,
        AssistantFailed,
        ImageProviderRefused,
        OwnImageLimitReached,
        PlanLimitReached,
        MediaStoreUnavailable,
        MediaImportBusy,
      ],
      params: workspace,
      payload: ImageRequestSchema,
      success: MediaSchema.pipe(HttpApiSchema.status(201)),
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Asks for one image from the prompt, in the aspect asked for, and answers with it as a new file of the media library, ready to attach, marked `aiGenerated` and without a description. When the workspace brought its own image provider, the prompt goes there, with the workspace's key, and the image costs none of the workspace's daily requests, on any plan, a trial and the free plan included, within a number of such images a day (OwnImageLimitReached past it); if that provider refuses, the answer is ImageProviderRefused and the server's model is never asked instead. Otherwise the prompt goes to the image provider the server's operator chose, and an image costs the status's `images.requestCost` of the workspace's daily requests, given back only when the provider could not be reached. Neither the prompt nor the image is logged. Either way the image takes room in the plan's media storage, which must hold the largest image before anything is asked. The file is stored as the provider gave it. Peal sets no platform's AI label on its own: set it in the post's options (YouTube `containsSyntheticMedia`, TikTok `aiGenerated`, X `madeWithAi`). Needs assistant:use and media:upload. Off unless the workspace brought a provider or the server has an image model (`images.source`).",
        summary: "Make an image into the media library",
      })
    ),
    HttpApiEndpoint.get("imageProvider", "/image-provider", {
      error: Forbidden,
      params: workspace,
      success: ImageProviderSettingSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Reads the image provider the workspace brought, ${imageProviderDescription}: its address and model, never its key, or null. Needs assistant:configure.`,
        summary: "Get the workspace's image provider",
      })
    ),
    HttpApiEndpoint.put("setImageProvider", "/image-provider", {
      error: [
        Forbidden,
        ImageProviderAddressRefused,
        ImageProviderKeyRequired,
        AssistantSecretsNotConfigured,
      ],
      params: workspace,
      payload: ImageProviderChangeSchema,
      success: ImageProviderSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Sets the image provider the workspace brings, ${imageProviderDescription}. The workspace's image prompts then go to \`baseUrl\` with \`apiKey\` as a bearer token; the images still take room in the plan's media storage. Peal keeps the key encrypted for this workspace and this address, never shows it again, and never sends it to another address: \`apiKey\` may be left out to keep the stored one only while \`baseUrl\` stays exactly the same (to change the model alone). The address must be public HTTPS; it is checked now, and before every call. The provider is not called: the first image tells whether the settings work. Needs assistant:configure.`,
        summary: "Set the workspace's image provider",
      })
    ),
    HttpApiEndpoint.delete("removeImageProvider", "/image-provider", {
      error: Forbidden,
      params: workspace,
      success: HttpApiSchema.NoContent,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Removes the workspace's image provider and its key: images are made by the server's image model again, if it has one, and cost the workspace's daily requests. Needs assistant:configure.",
        summary: "Remove the workspace's image provider",
      })
    )
  )
  .middleware(WorkspaceAccess)
  .middleware(Authentication)
  .prefix("/api/workspaces/:workspaceId/assistant") {}
