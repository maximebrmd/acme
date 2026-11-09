import { Data } from "effect";
import { CliError } from "effect/cli";

// The server answered, and refused what the command asked: the command
// line prints why, and exits with 1.
export class Refused extends Data.TaggedError("Refused")<{
  readonly reason: string;
}> {
  override get [CliError.userMessage]() {
    return this.reason;
  }
}
