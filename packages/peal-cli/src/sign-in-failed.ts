import { Data } from "effect";
import { CliError } from "effect/cli";

// The device sign-in did not end with tokens: the user denied it, the code
// ran out before they approved it, or the server refused the request.
export class SignInFailed extends Data.TaggedError("SignInFailed")<{
  readonly detail: string;
  readonly reason: "denied" | "expired" | "refused";
  readonly url: string;
}> {
  override get [CliError.userMessage]() {
    const messages: Readonly<Record<typeof this.reason, string>> = {
      denied: `The sign-in to ${this.url} was denied.`,
      expired: `The code expired before the sign-in to ${this.url} was approved. Run peal login again.`,
      refused: `${this.url} refused the sign-in (${this.detail}).`,
    };

    return messages[this.reason];
  }
}
