import { Effect, Layer } from "effect";

import { AssistantUnavailable } from "#assistant/application/assistant-unavailable.ts";
import { WritingModel } from "#assistant/application/ports/writing-model.ts";

/** No language model: the assistant is off, and every request says so. */
export const UnavailableWritingModelLive = Layer.succeed(
  WritingModel,
  WritingModel.of({
    available: false,
    write: () => Effect.fail(new AssistantUnavailable()),
  })
);
