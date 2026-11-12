import { Schema } from "effect";

/**
 * The file PEAL_PRIVACY_DECLARATION_FILE names is missing or does not
 * decode as a privacy declaration: the server does not start.
 */
export class PrivacyDeclarationUnreadable extends Schema.TaggedError<PrivacyDeclarationUnreadable>()(
  "PrivacyDeclarationUnreadable",
  { cause: Schema.Defect(), file: Schema.String }
) {
  override get message(): string {
    return `PEAL_PRIVACY_DECLARATION_FILE names ${this.file}, which could not be read as a privacy declaration`;
  }
}
