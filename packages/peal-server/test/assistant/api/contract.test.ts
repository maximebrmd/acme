import { describe, expect, it } from "@effect/vitest";
import {
  AssistantActionSchema as ContractActionSchema,
  AssistantToneSchema,
  TranslationLanguageSchema,
} from "peal-contract";

import { AssistantActionSchema } from "#assistant/domain/assistant-action.ts";
import { ToneSchema } from "#assistant/domain/tone.ts";
import { TranslationLanguageSchema as DomainLanguageSchema } from "#assistant/domain/translation-language.ts";

// Each action's tag with the names of its fields.
const fieldsByAction = (
  schema: typeof AssistantActionSchema | typeof ContractActionSchema
) =>
  schema.members.map((member) => [
    member.fields._tag.ast.literal,
    Object.keys(member.fields).toSorted(),
  ]);

describe("the contract", () => {
  it("lists the tones and languages the assistant knows", () => {
    expect(AssistantToneSchema.literals).toStrictEqual(ToneSchema.literals);
    expect(TranslationLanguageSchema.literals).toStrictEqual(
      DomainLanguageSchema.literals
    );
  });

  it("lists the actions the assistant takes, with their fields", () => {
    expect(fieldsByAction(ContractActionSchema)).toStrictEqual(
      fieldsByAction(AssistantActionSchema)
    );
  });
});
