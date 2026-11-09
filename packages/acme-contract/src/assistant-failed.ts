import { Schema } from "effect";

/**
 * The language model gave nothing the assistant can offer:
 *
 * - `unreachable`: the model's provider could not be reached or failed. The
 *   request does not count toward the quota.
 * - `declined`: the provider refused the text under its policies.
 * - `invalidAnswer`: the model answered with something the assistant cannot
 *   use. Trying again usually works.
 */
export class AssistantFailed extends Schema.TaggedError<AssistantFailed>()(
  "AssistantFailed",
  { reason: Schema.Literals(["unreachable", "declined", "invalidAnswer"]) },
  {
    description:
      "The language model gave no answer the assistant can offer. Try again.",
    httpApiStatus: 502,
  }
) {}
