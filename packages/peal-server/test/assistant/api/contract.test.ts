import { describe, expect, it } from "@effect/vitest";
import { AssistantToneSchema, TranslationLanguageSchema } from "acme-contract";

import { ToneSchema } from "#assistant/domain/tone.ts";
import { TranslationLanguageSchema as DomainLanguageSchema } from "#assistant/domain/translation-language.ts";

describe("the contract", () => {
  it("lists the tones and languages the assistant knows", () => {
    expect(AssistantToneSchema.literals).toStrictEqual(ToneSchema.literals);
    expect(TranslationLanguageSchema.literals).toStrictEqual(
      DomainLanguageSchema.literals
    );
  });
});
