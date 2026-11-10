import { Schema } from "effect";

/** The workspace already has a signature of this name, whatever its case. */
export class SignatureNameTaken extends Schema.TaggedError<SignatureNameTaken>()(
  "SignatureNameTaken",
  { name: Schema.String }
) {
  override get message(): string {
    return `The workspace already has a signature named ${this.name}`;
  }
}
