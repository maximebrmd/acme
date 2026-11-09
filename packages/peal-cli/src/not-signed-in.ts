import { Data } from "effect";
import { CliError } from "effect/cli";

// No sign-in is saved for the server the command points at.
export class NotSignedIn extends Data.TaggedError("NotSignedIn")<{
  readonly url: string;
}> {
  override get [CliError.userMessage]() {
    return `You are not signed in to ${this.url}. Run peal login first.`;
  }
}
