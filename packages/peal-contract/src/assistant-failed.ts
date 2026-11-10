import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/**
 * The language model gave nothing the assistant can offer:
 *
 * - `unreachable`: the model's provider could not be reached or failed. The
 *   request does not count toward the quota.
 * - `timedOut`: the model took too long to answer. It may have worked on
 *   the request all the same, so the request counts.
 * - `declined`: the provider refused the text under its policies.
 * - `invalidAnswer`: the model answered with something the assistant cannot
 *   use. Trying again usually works.
 */
export class AssistantFailed extends Schema.TaggedError<AssistantFailed>()(
  "AssistantFailed",
  {
    ...errorEnvelope,
    reason: Schema.Literals([
      "unreachable",
      "timedOut",
      "declined",
      "invalidAnswer",
    ]),
  },
  {
    description:
      "The language model gave no answer the assistant can offer (`reason`). Trying again may work, unless the provider declined the text.",
    httpApiStatus: 502,
  }
) {}
