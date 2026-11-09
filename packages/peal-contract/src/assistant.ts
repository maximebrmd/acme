import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/http-api";

import { AssistantFailed } from "./assistant-failed.ts";
import { AssistantInputRejected } from "./assistant-input-rejected.ts";
import { AssistantQuotaExceeded } from "./assistant-quota-exceeded.ts";
import { AssistantUnavailable } from "./assistant-unavailable.ts";
import { Authentication } from "./authentication.ts";
import { Forbidden } from "./forbidden.ts";
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
 */
export const AssistantActionSchema = Schema.Union([
  Schema.TaggedStruct("rewrite", { tone: AssistantToneSchema }),
  Schema.TaggedStruct("shorten", { platform: PlatformSchema }),
  Schema.TaggedStruct("translate", { language: TranslationLanguageSchema }),
  Schema.TaggedStruct("hashtags", {}),
]).annotate({ identifier: "AssistantAction" });

export type AssistantAction = typeof AssistantActionSchema.Type;

export const SuggestionRequestSchema = Schema.Struct({
  action: AssistantActionSchema,
  // The post's text, as plain text. The assistant takes at most the
  // status's `maxTextLength`; this bounds what the request can carry.
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

export const AssistantStatusSchema = Schema.Struct({
  // Whether the server has a language model. Clients hide the assistant
  // when it does not.
  available: Schema.Boolean,
  // How many requests the workspace may send each UTC day, and how many
  // are left today.
  dailyLimit: Schema.Int,
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
 * model the server is configured with. Nothing is saved; the person
 * accepts a suggestion or discards it. Each workspace sends a limited
 * number of requests per UTC day.
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
          "Tells whether the server has a language model, so clients show the assistant or hide it, and how many requests the workspace has left today. Needs assistant:use.",
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
          "Asks the language model to rewrite, shorten or translate a post's text, or to suggest hashtags for it, and answers once the whole suggestion is checked. The text is sent to the model as data, never as instructions. Each request counts toward the workspace's daily quota, unless the model's provider could not be reached. Needs assistant:use.",
        summary: "Suggest a change to a post's text",
      })
    )
  )
  .middleware(WorkspaceAccess)
  .middleware(Authentication)
  .prefix("/api/workspaces/:workspaceId/assistant") {}
