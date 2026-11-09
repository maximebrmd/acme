import { Schema } from "effect";

/** The languages the assistant translates posts into, as BCP 47 tags. */
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
]);

export type TranslationLanguage = typeof TranslationLanguageSchema.Type;

/** Each language, as the instructions name it to the model. */
export const languageNames: Readonly<Record<TranslationLanguage, string>> = {
  de: "German",
  en: "English",
  es: "Spanish",
  fr: "French",
  it: "Italian",
  ja: "Japanese",
  nl: "Dutch",
  pl: "Polish",
  pt: "Portuguese",
  "zh-Hans": "Simplified Chinese",
};
