import { Data } from "effect";
import { CliError } from "effect/cli";

import type { JsonObject } from "#api-error.ts";

// The file the sign-in is saved in could not be found, read or written.
export class CredentialStoreFailed extends Data.TaggedError(
  "CredentialStoreFailed"
)<{
  readonly detail: string;
  readonly file: string;
}> {
  override get [CliError.userMessage]() {
    return `Cannot use the saved sign-in at ${this.file} (${this.detail}).`;
  }

  /** What --json prints for it. */
  get jsonFailure(): JsonObject {
    return {
      code: "credential_store_failed",
      message: this[CliError.userMessage],
    };
  }
}
