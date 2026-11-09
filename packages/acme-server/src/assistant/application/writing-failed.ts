import { Schema } from "effect";

/**
 * The language model gave no answer the assistant can use:
 *
 * - `unreachable`: the provider could not be reached, refused the server's
 *   credentials, was rate limited or failed. The request did not run, so it
 *   does not count toward the quota.
 * - `declined`: the provider refused the content under its policies.
 * - `invalidAnswer`: the model answered, but not in the shape asked for.
 *
 * It carries no cause: provider errors can quote the prompt or the answer,
 * which are never logged.
 */
export class WritingFailed extends Schema.TaggedError<WritingFailed>()(
  "WritingFailed",
  { reason: Schema.Literals(["unreachable", "declined", "invalidAnswer"]) }
) {
  override get message(): string {
    return `The language model gave no usable answer: ${this.reason}`;
  }
}
