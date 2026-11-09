import { Schema } from "effect";

/**
 * The server has no language model configured, so the assistant is off:
 * ACME_AI_PROVIDER is not set.
 */
export class AssistantUnavailable extends Schema.TaggedError<AssistantUnavailable>()(
  "AssistantUnavailable",
  {}
) {}
