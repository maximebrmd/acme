import { Effect } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import {
  Api,
  AssistantFailed,
  AssistantInputRejected,
  AssistantQuotaExceeded,
  AssistantUnavailable,
  CurrentMember,
  Forbidden,
} from "peal-contract";

import { WritingAssistant } from "#assistant/application/writing-assistant.ts";
import { actorOf } from "#shared/api/actor.ts";

const forbidden = () => Effect.fail(new Forbidden());

// The answers say what went wrong by kind only: neither the text nor what
// the model answered ever reaches an error or a log.
export const AssistantHandlers = HttpApiBuilder.group(
  Api,
  "assistant",
  Effect.fn(function* assistantHandlers(handlers) {
    const assistant = yield* WritingAssistant;

    return handlers.handleAll({
      status: () =>
        Effect.gen(function* status() {
          const actor = actorOf(yield* CurrentMember);

          return yield* assistant
            .status(actor)
            .pipe(Effect.catchTag("MissingPermission", forbidden));
        }),
      suggest: ({ payload }) =>
        Effect.gen(function* suggest() {
          const actor = actorOf(yield* CurrentMember);

          return yield* assistant.suggest(actor, payload).pipe(
            Effect.catchTags({
              AnswerRejected: () =>
                Effect.fail(new AssistantFailed({ reason: "invalidAnswer" })),
              AssistantQuotaExceeded: ({ dailyLimit, resetsAt }) =>
                Effect.fail(
                  new AssistantQuotaExceeded({ dailyLimit, resetsAt })
                ),
              AssistantUnavailable: () =>
                Effect.fail(new AssistantUnavailable()),
              DraftRejected: ({ maxLength, reason }) =>
                Effect.fail(new AssistantInputRejected({ maxLength, reason })),
              MissingPermission: forbidden,
              WritingFailed: ({ reason }) =>
                Effect.fail(new AssistantFailed({ reason })),
            })
          );
        }),
    });
  })
);
