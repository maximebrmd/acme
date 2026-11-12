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
import { AssistantUnavailable } from "./assistant-unavailable.ts";
import { Authentication } from "./authentication.ts";
import { Forbidden } from "./forbidden.ts";
import { MediaImportBusy } from "./media-import-busy.ts";
import { MediaStoreUnavailable } from "./media-store-unavailable.ts";
import { MediaSchema } from "./media.ts";
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

export const AssistantImagesStatusSchema = Schema.Struct({
  // The aspects an image can be made in.
  aspects: Schema.Array(ImageAspectSchema),
  // Whether the server has an image model. Clients hide images when it
  // does not; it is off unless the operator set one up.
  available: Schema.Boolean,
  // How many of the day's requests images may take: the day's limit, but
  // none while the workspace's plan is on trial. Under `requestCost`, the
  // workspace makes no image (the request is refused with
  // AssistantQuotaExceeded).
  dailyLimit: Schema.Int,
  // The longest description an image is made from, in UTF-16 code units.
  maxPromptLength: Schema.Int,
  // How many of the day's requests an image costs.
  requestCost: Schema.Int,
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

const workspace = { workspaceId: Schema.String };

/**
 * The writing assistant: suggestions on a post's text from the language
 * model the server is configured with, and images from its image model,
 * kept in the media library. Nothing of a suggestion is saved; the person
 * accepts it or discards it. Each workspace sends a limited number of
 * requests per UTC day, an image costing several.
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
          "Tells whether the server has a language model, so clients show the assistant or hide it, whether it has an image model (`images`), and how many requests the workspace has left today. Needs assistant:use.",
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
          "Asks the server's image model for one image from the prompt, in the aspect asked for, and answers with it as a new file of the media library, ready to attach, marked `aiGenerated` and without a description. The prompt is sent to the image provider the server's operator chose; neither it nor the image is logged. An image costs the status's `images.requestCost` of the workspace's daily requests, given back only when the provider could not be reached, and takes room in the plan's media storage, which must hold the largest image before anything is spent. The file is stored as the provider gave it. Peal sets no platform's AI label on its own: set it in the post's options (YouTube `containsSyntheticMedia`, TikTok `aiGenerated`, X `madeWithAi`). Needs assistant:use and media:upload. Off unless the server has an image model.",
        summary: "Make an image into the media library",
      })
    )
  )
  .middleware(WorkspaceAccess)
  .middleware(Authentication)
  .prefix("/api/workspaces/:workspaceId/assistant") {}
