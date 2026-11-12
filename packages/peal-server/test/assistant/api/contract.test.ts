import { describe, expect, it } from "@effect/vitest";
import {
  AssistantActionSchema as ContractActionSchema,
  AssistantToneSchema,
  ImageAspectSchema as ContractAspectSchema,
  imageProviderKeyPattern,
  imageProviderModelPattern,
  imageRequestCost as contractImageCost,
  maxImageProviderAddressLength,
  maxImageProviderKeyLength,
  maxImageProviderModelLength,
  maxImagePromptLength as contractPromptLength,
  TranslationLanguageSchema,
} from "peal-contract";

import { AssistantActionSchema } from "#assistant/domain/assistant-action.ts";
import { ImageAspectSchema } from "#assistant/domain/image-aspect.ts";
import { imageRequestCost } from "#assistant/domain/image-limits.ts";
import { maxImagePromptLength } from "#assistant/domain/image-prompt.ts";
import {
  maxProviderAddressLength,
  maxProviderKeyLength,
  maxProviderModelLength,
  providerKeyPattern,
  providerModelPattern,
} from "#assistant/domain/image-provider.ts";
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

  it("lists the aspects of images, their cost and the longest prompt", () => {
    expect(ContractAspectSchema.literals).toStrictEqual(
      ImageAspectSchema.literals
    );
    expect([contractImageCost, contractPromptLength]).toStrictEqual([
      imageRequestCost,
      maxImagePromptLength,
    ]);
  });

  it("takes a workspace's image provider by the domain's rules", () => {
    expect([
      maxImageProviderAddressLength,
      maxImageProviderModelLength,
      maxImageProviderKeyLength,
    ]).toStrictEqual([
      maxProviderAddressLength,
      maxProviderModelLength,
      maxProviderKeyLength,
    ]);
    expect([
      imageProviderModelPattern.source,
      imageProviderKeyPattern.source,
    ]).toStrictEqual([providerModelPattern.source, providerKeyPattern.source]);
  });
});
