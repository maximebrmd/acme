import { Data } from "effect";
import { CliError } from "effect/cli";

import type { JsonObject } from "#api-error.ts";

// peal doctor found checks that fail: it printed each one, then exits
// with 1, so a script stops there.
export class DoctorFailed extends Data.TaggedError("DoctorFailed")<{
  readonly failed: readonly string[];
}> {
  override get [CliError.userMessage]() {
    return `${String(this.failed.length)} ${this.failed.length === 1 ? "check fails" : "checks fail"}: ${this.failed.join(", ")}.`;
  }

  /** What --json prints for it, on stderr, after the checks on stdout. */
  get jsonFailure(): JsonObject {
    return {
      code: "checks_failed",
      failed: this.failed,
      message: this[CliError.userMessage],
    };
  }
}
