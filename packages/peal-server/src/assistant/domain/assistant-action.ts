import { Schema } from "effect";

import { PlatformSchema } from "#shared/domain/platform.ts";

import { ToneSchema } from "./tone.ts";
import { TranslationLanguageSchema } from "./translation-language.ts";

/**
 * What the writing assistant can do with a post's text:
 *
 * - `rewrite`: the same post in another tone.
 * - `shorten`: the post cut down to fit a platform's limit.
 * - `translate`: the post in another language.
 * - `hashtags`: hashtags that suit the post, to add to it.
 * - `write`: a first post from a subject, the text given being what the
 *   post should say; in a `tone`, in a `language` (else the subject's) and
 *   within a `platform`'s limits when the action names them.
 */
export const AssistantActionSchema = Schema.Union([
  Schema.TaggedStruct("rewrite", { tone: ToneSchema }),
  Schema.TaggedStruct("shorten", { platform: PlatformSchema }),
  Schema.TaggedStruct("translate", { language: TranslationLanguageSchema }),
  Schema.TaggedStruct("hashtags", {}),
  Schema.TaggedStruct("write", {
    language: Schema.optionalKey(TranslationLanguageSchema),
    platform: Schema.optionalKey(PlatformSchema),
    tone: Schema.optionalKey(ToneSchema),
  }),
]);

export type AssistantAction = typeof AssistantActionSchema.Type;
