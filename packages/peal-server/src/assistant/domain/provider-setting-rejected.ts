import { Schema } from "effect";

/**
 * The model or the key given for a workspace's image or text provider is
 * not one the assistant takes: blank, too long, or more than one line (a
 * key holds visible ASCII only, as an HTTP header does).
 */
export class ProviderSettingRejected extends Schema.TaggedError<ProviderSettingRejected>()(
  "ProviderSettingRejected",
  { field: Schema.Literals(["model", "apiKey"]) }
) {
  override get message(): string {
    return `The provider's ${this.field} is refused`;
  }
}
