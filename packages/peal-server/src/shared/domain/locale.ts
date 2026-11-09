import { Schema } from "effect";

/**
 * A language Acme speaks: English, the default, and French. Users keep theirs
 * on their account, and emails and notices are rendered in it.
 */
export const LocaleSchema = Schema.Literals(["en", "fr"]);

export type Locale = typeof LocaleSchema.Type;

export const defaultLocale: Locale = "en";
