import { Data } from "effect";
import { CliError } from "effect/cli";

import type { JsonObject } from "#api-error.ts";

// The saved sign-in no longer works: it was revoked, the user signed out
// elsewhere, or it ran out and could not be renewed.
export class SignInExpired extends Data.TaggedError("SignInExpired")<{
  readonly url: string;
}> {
  override get [CliError.userMessage]() {
    return `Your sign-in to ${this.url} no longer works. Run peal login again.`;
  }

  /** What --json prints for it. */
  get jsonFailure(): JsonObject {
    return { code: "sign_in_expired", message: this[CliError.userMessage] };
  }
}
